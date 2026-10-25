import {randomUUID} from 'node:crypto';
import type {Diagnostic, ExternalKey, MatchSnapshot} from '@afk/dbu/model';
import {appearanceFromEvidence, record, validateImport, validateMatch} from '@afk/sports/validation';
import {fingerprint, reconcile} from './reconcile.ts';
import {SyncError, type Document, type Plan} from './model.ts';

const reference = (id: string) => ({_type: 'reference', _ref: id});
const equalIdentity = (value: unknown, key: ExternalKey) => {
  const v = record(value);
  return v.source === key.source && v.id === key.id && v.scope === key.scope;
};
const published = (id: string) => !id.startsWith('drafts.') && !id.startsWith('versions.');

/** Detail imports require schedule records; never create Player identities from names. */
export function planMatchDetails(source: MatchSnapshot, documents: Document[], now: string, diagnostics: Diagnostic[] = []): Plan {
  if (!Number.isFinite(Date.parse(now)) || source.external.source !== 'dbu' || !/^\d+$/.test(source.external.id)) throw new SyncError('Invalid detail identity or timestamp.');
  if (new Set(documents.map(d => d._id)).size !== documents.length) throw new SyncError('Duplicate stored document IDs.');
  function resolve(type: string, key: ExternalKey): Document {
    const found = documents.filter(d => d._type === type && equalIdentity(d.external, key));
    if (found.length !== 1 || !published(found[0]._id)) throw new SyncError(`Resolve missing, duplicate or unpublished ${type} identity before importing details.`);
    const result = found[0];
    if (documents.some(d => d._id === `drafts.${result._id}` || (d._id.startsWith('versions.') && d._id.split('.').slice(2).join('.') === result._id))) throw new SyncError('Resolve draft or release versions before importing details.');
    return result;
  }
  const match = resolve('match', source.external);
  const competition = resolve('competition', source.competition);
  const home = resolve('team', source.homeTeam.external), away = resolve('team', source.awayTeam.external);
  if (record(match.competition)._ref !== competition._id || record(match.homeTeam)._ref !== home._id || record(match.awayTeam)._ref !== away._id) throw new SyncError('Detail fixture relationships disagree with stored schedule; review the schedule first.');
  if (!match._rev || validateMatch(match) !== true || validateImport(match.import) !== true) throw new SyncError('Existing match or import metadata is invalid; resolve it before importing details.');
  function team(key: ExternalKey) {
    if (equalIdentity(key, source.homeTeam.external)) return reference(home._id);
    if (equalIdentity(key, source.awayTeam.external)) return reference(away._id);
    throw new SyncError('Detail item belongs to an unexpected team.');
  }
  const plan: Plan = {operations: [], review: []};
  const warn = (field: string, reason: string) => plan.review.push({documentId: match._id, field, reason});
  // Status is evidence from the detail page, never inferred from the clock/score.
  const statusResult = reconcile({...match, status: source.status}, match, ['status'], now, 'detail');
  const merged = statusResult.document;
  plan.review.push(...statusResult.review);
  for (const diagnostic of diagnostics) warn(diagnostic.path, diagnostic.message);
  const currentMeta = record(match.import);
  const nextKeys = new Set<string>();
  let participantsProtected = false;
  function array(field: 'participants' | 'events', incoming: Record<string, unknown>[] | undefined) {
    const local: Record<string, unknown>[] = Array.isArray(match[field]) ? structuredClone(match[field]).map(record) : [];
    for (const item of local) if (validateImport(item.import) !== true) throw new SyncError('Invalid embedded import metadata.');
    for (const item of local) nextKeys.add(`${field}:${item._key}`);
    if (match[field] !== undefined) merged[field] = local;
    if (incoming === undefined) { warn(field, 'Source section missing; existing items retained.'); return; }
    const overrides = Array.isArray(currentMeta.overrides) ? currentMeta.overrides : [];
    const removed = Array.isArray(currentMeta.detailKeys) && currentMeta.detailKeys.some(key => typeof key === 'string' && key.startsWith(`${field}:`) && !nextKeys.has(key));
    if (removed || overrides.some(path => typeof path === 'string' && (path === field || path.startsWith(`${field}.`)))) {
      if (field === 'participants') participantsProtected = true;
      warn(field, 'Array protected by a manual removal or explicit override; retained for review.');
      if (removed) {
        const metadata = record(merged.import);
        metadata.overrides = [...new Set([...(Array.isArray(metadata.overrides) ? metadata.overrides : []), field])];
      }
      return;
    }
    const signature = (item: Record<string, unknown>) => fingerprint(field === 'participants'
      ? {team: item.team, sourceName: item.sourceName}
      : Object.fromEntries(Object.entries(item).filter(([key]) => !['_key', 'import'].includes(key))));
    const incomingGroups = new Map<string, Record<string, unknown>[]>();
    for (const item of incoming) {
      const key = signature(item);
      incomingGroups.set(key, [...(incomingGroups.get(key) ?? []), item]);
    }
    const imported = local.filter(item => record(item.import).origin === 'imported');
    const unmatched = imported.filter(item => !incomingGroups.has(String(record(item.import).detailSignature)));
    if (unmatched.length) warn(field, 'Imported items changed or disappeared; retained. Unmatched new items require review.');
    const result = [...local];
    for (const [key, items] of incomingGroups) {
      const candidates = imported.filter(item => record(item.import).detailSignature === key);
      if (candidates.length !== items.length && candidates.length > 0) {
        warn(field, 'Repeated source observations have ambiguous multiplicity; retained without adding or removing items.'); continue;
      }
      if (items.length > 1) warn(field, 'Identical source observations have no individual identity; existing keys retained by occurrence.');
      if (!candidates.length && (unmatched.length || local.some(item => record(item.import).origin !== 'imported' && items.some(incoming => item._type === incoming._type && fingerprint(item.team) === fingerprint(incoming.team) && item.sourceName === incoming.sourceName && (field === 'participants' || item.minute === incoming.minute))))) {
        warn(field, 'New observation may overlap an existing item; retained for review without duplication.'); continue;
      }
      items.forEach((item, index) => {
        const current = candidates[index];
        const id = typeof current?._key === 'string' ? current._key : randomUUID().replaceAll('-', '');
        const proposed: Document = {...item, _id: id, _type: String(item._type), _key: id};
        const stored = current ? {...current, _id: id, _type: String(current._type), _rev: match._rev} : undefined;
        const fields = field === 'participants' ? ['team', 'sourceName', 'shirtNumber', 'lineupStatus', 'appearance'] : ['team', 'sourceName', 'minute', 'method', 'assist'];
        const reconciled = reconcile(proposed, stored, fields, now, 'detail');
        const accepted: Record<string, unknown> = {...reconciled.document};
        delete accepted._id; delete accepted._rev;
        accepted.import = {...record(accepted.import), detailSignature: key, lastSeenAt: now};
        plan.review.push(...reconciled.review.map(review => ({...review, documentId: match._id, field: `${field}[${id}].${review.field}`})));
        if (current) result[result.indexOf(current)] = accepted; else result.push(accepted);
        nextKeys.add(`${field}:${id}`);
      });
    }
    merged[field] = result;
  }
  array('events', source.events?.flatMap(event => {
    if (event.type === 'matchMarker') return [];
    if (event.type === 'unsupported' || !event.sourceName) {
      warn('events', 'Unsupported or unnamed source event retained in the source fixture for review; no sporting fact invented.'); return [];
    }
    return [{_type: event.type, team: team(event.team), sourceName: event.sourceName,
      ...(event.minute !== undefined ? {minute: event.minute} : {}),
      ...(event.type === 'goal' ? {method: event.method, assist: {_type: 'assist', status: 'unknown'}} : {})}];
  }));
  array('participants', source.participants?.map(item => ({_type: 'participant', team: team(item.team), sourceName: item.sourceName,
    ...(item.shirtNumber !== undefined ? {shirtNumber: item.shirtNumber} : {}), lineupStatus: item.lineupStatus,
    appearance: merged.status === 'completed' && item.lineupStatus === 'starter' ? 'played' : item.appearance})));
  for (const item of Array.isArray(merged.participants) ? merged.participants : []) {
    // Only confirmed Player references establish identity across arrays.
    const participant = record(item);
    const evidence = appearanceFromEvidence(merged, participant);
    if (!participantsProtected && participant.appearance === 'unknown' && evidence === 'played' && !(Array.isArray(record(participant.import).overrides) && (record(participant.import).overrides as unknown[]).includes('appearance'))) {
      participant.appearance = evidence;
      const metadata = record(participant.import);
      if (Array.isArray(metadata.detailBaseline)) metadata.detailBaseline = metadata.detailBaseline.map(entry => record(entry).path === 'appearance' ? {...record(entry), fingerprint: fingerprint(evidence)} : entry);
    }
    if (!participant.player) warn(`participants[${participant._key}]`, 'Player identity unresolved; source name preserved.');
    if (participant.lineupStatus === 'substitute' && participant.appearance === 'unknown') warn(`participants[${participant._key}]`, 'Substitute appearance remains unknown.');
  }
  for (const item of Array.isArray(merged.events) ? merged.events : []) {
    const event = record(item);
    if (!event.player) warn(`events[${event._key}]`, 'Player identity unresolved; source name preserved.');
    if (event._type === 'goal' && record(event.assist).status === 'unknown') warn(`events[${event._key}].assist`, 'Assist remains unknown.');
  }
  if (source.score && match.score && (record(match.score).home !== source.score.home || record(match.score).away !== source.score.away)) warn('score', 'Detail score differs from stored schedule score; run and review schedule synchronization.');
  if (source.status === 'completed' && source.score && source.events !== undefined) {
    for (const [side, id] of [['home', home._id], ['away', away._id]] as const) {
      const goals = (Array.isArray(merged.events) ? merged.events : []).map(record).filter(e => e._type === 'goal' && record(e.team)._ref === id).length;
      if (goals !== source.score[side]) warn('events', 'Known goal coverage differs from official source score; no events invented.');
    }
  }
  const previousReasons = typeof currentMeta.reviewReason === 'string' ? currentMeta.reviewReason.split('\n') : [];
  merged.import = {...record(merged.import), detailKeys: [...nextKeys].sort(), ...(plan.review.length ? {needsReview: true,
    reviewReason: [...new Set([...previousReasons, ...plan.review.map(r => `${r.field}: ${r.reason}`)])].filter(Boolean).join('\n')} : {})};
  const failure = validateMatch(merged);
  if (failure !== true) throw new SyncError(`Invalid reconciled match: ${failure}`);
  const set = Object.fromEntries(['status', 'participants', 'events', 'import'].filter(field => fingerprint(match[field]) !== fingerprint(merged[field])).map(field => [field, merged[field]]));
  if (Object.keys(set).length) plan.operations.push({kind: 'patch', id: match._id, revision: match._rev, set});
  return plan;
}
