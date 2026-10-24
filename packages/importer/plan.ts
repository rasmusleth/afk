import type {ExternalKey, ScheduleSnapshot} from '@afk/dbu/model';
import {record, validateExternal, validateImport, validateMatch, validateName, validateSeason, validateTeamIdentity} from '@afk/sports/validation';
import {canonicalKickoff} from './time.ts';
import {reconcile} from './reconcile.ts';
import {SyncError, type Document, type Plan, type SyncOptions} from './model.ts';

const reference = (id: string) => ({_type: 'reference', _ref: id});
export function reservedIds(schedule: ScheduleSnapshot): string[] {
  return [...new Set([
    `dbu-competition-${schedule.external.id}`,
    ...schedule.matches.flatMap(match => [`dbu-match-${match.external.id}`, `dbu-team-${match.homeTeam.external.scope}-${match.homeTeam.external.id}`, `dbu-team-${match.awayTeam.external.scope}-${match.awayTeam.external.id}`]),
  ])];
}
const publishedId = (id: string) => id.startsWith('drafts.') ? id.slice(7) : id.startsWith('versions.') ? id.split('.').slice(2).join('.') : id;
function externalEqual(value: unknown, key: ExternalKey): boolean {
  const v = record(value);
  return v.source === key.source && v.id === key.id && v.scope === key.scope;
}
function validate(document: Document) {
  const checks = [validateExternal(document.external), validateImport(document.import)];
  if (document._type === 'team') checks.push(validateName(document.name), validateTeamIdentity(document.external));
  if (document._type === 'competition') checks.push(validateName(document.name), typeof record(document.season)._ref === 'string' || 'Competition needs a Season reference.');
  if (document._type === 'match') checks.push(validateMatch(document));
  const failure = checks.find(check => check !== true);
  if (failure) throw new SyncError(`Invalid proposed ${document._type} ${document._id}: ${failure}`);
}
export function planSchedule(schedule: ScheduleSnapshot, documents: Document[], options: SyncOptions): Plan {
  if (!/^\d+$/.test(schedule.external.id) || schedule.external.source !== 'dbu' || !schedule.matches.length) throw new SyncError('A non-empty DBU competition schedule is required.');
  if (!Number.isFinite(Date.parse(options.now))) throw new SyncError('Invalid synchronization timestamp.');
  try { new Intl.DateTimeFormat('en', {timeZone: options.timeZone}); } catch { throw new SyncError('Invalid IANA time zone.'); }
  const ids = new Map<string, Document>();
  for (const document of documents) {
    if (!document._id || !document._type || ids.has(document._id)) throw new SyncError('Invalid or duplicate stored document identity.');
    ids.set(document._id, document);
  }
  const season = ids.get(options.seasonId);
  if (!season || season._type !== 'season' || publishedId(season._id) !== season._id) throw new SyncError('Select an existing published Season document.');
  if (documents.some(document => document._id !== options.seasonId && publishedId(document._id) === options.seasonId)) throw new SyncError('The selected Season has a draft or release version; resolve it first.');
  if (validateName(season.name) !== true || validateSeason(season) !== true) throw new SyncError('The selected Season needs a name and valid dates.');
  const plan: Plan = {operations: [], review: []};
  function resolve(type: string, key: ExternalKey, fallback: string): Document | undefined {
    const matches = documents.filter(document => document._type === type && externalEqual(document.external, key));
    const published = matches.filter(document => publishedId(document._id) === document._id);
    if (published.length > 1) throw new SyncError(`Ambiguous ${type} source identity ${key.id}; resolve duplicates first.`);
    const chosen = published[0];
    const target = chosen?._id ?? fallback;
    if (matches.some(document => publishedId(document._id) !== document._id) || documents.some(document => document._id !== target && publishedId(document._id) === target)) throw new SyncError(`Draft or release version exists for ${target}; resolve it before live synchronization.`);
    const collision = ids.get(fallback);
    if (collision && collision._id !== chosen?._id) throw new SyncError(`Reserved ID ${fallback} already belongs to another document.`);
    return chosen;
  }
  function add(proposed: Document, current: Document | undefined, fields: string[]) {
    const result = reconcile(proposed, current, fields, options.now);
    validate(result.document);
    if (result.operation.kind === 'create' || Object.keys(result.operation.set).length) plan.operations.push(result.operation);
    plan.review.push(...result.review);
  }
  const pool = schedule.external.id;
  const competition = resolve('competition', schedule.external, `dbu-competition-${pool}`);
  if (competition && record(competition.season)._ref !== options.seasonId) throw new SyncError('Existing competition belongs to a different Season; resolve the assignment first.');
  const competitionId = competition?._id ?? `dbu-competition-${pool}`;
  add({_id: competitionId, _type: 'competition', name: schedule.name, season: reference(options.seasonId), external: {_type: 'externalIdentity', ...schedule.external, sourceUrl: schedule.sourceUrl}}, competition, ['name', 'season']);
  const teams = new Map<string, {id: string; name: string}>();
  const matchIds = new Set<string>();
  for (const match of schedule.matches) {
    if (!/^\d+$/.test(match.external.id) || match.external.source !== 'dbu' || !externalEqual(match.competition, schedule.external) || matchIds.has(match.external.id)) throw new SyncError('Invalid, duplicate or wrong-competition fixture identity.');
    matchIds.add(match.external.id);
    for (const team of [match.homeTeam, match.awayTeam]) {
      if (team.external.source !== 'dbu' || !/^\d+$/.test(team.external.id) || team.external.scope !== pool) throw new SyncError('Missing or conflicting scoped team identity.');
      const existing = teams.get(team.external.id);
      if (existing && existing.name !== team.name) throw new SyncError('A scoped team has conflicting names within one scrape.');
      if (existing) continue;
      const current = resolve('team', team.external, `dbu-team-${pool}-${team.external.id}`);
      const id = current?._id ?? `dbu-team-${pool}-${team.external.id}`;
      teams.set(team.external.id, {id, name: team.name});
      add({_id: id, _type: 'team', name: team.name, external: {_type: 'externalIdentity', ...team.external}}, current, ['name']);
    }
    const current = resolve('match', match.external, `dbu-match-${match.external.id}`);
    const proposed: Document = {
      _id: current?._id ?? `dbu-match-${match.external.id}`, _type: 'match',
      competition: reference(competitionId),
      homeTeam: reference(teams.get(match.homeTeam.external.id)!.id),
      awayTeam: reference(teams.get(match.awayTeam.external.id)!.id),
      kickoff: canonicalKickoff(match.kickoff, options.timeZone),
      status: match.status,
      ...(match.score ? {score: {_type: 'score', ...match.score}} : {}),
      ...(match.venue ? {venue: match.venue} : {}),
      external: {_type: 'externalIdentity', ...match.external, sourceUrl: match.sourceUrl},
    };
    const result = reconcile(proposed, current, ['competition', 'homeTeam', 'awayTeam', 'kickoff', 'venue', 'status', 'score'], options.now);
    // Unknown source status is represented explicitly on new documents.
    if (!current && !result.document.status) result.document.status = 'unknown';
    validate(result.document);
    if (result.operation.kind === 'create' || Object.keys(result.operation.set).length) plan.operations.push(result.operation);
    plan.review.push(...result.review);
  }
  return plan;
}
