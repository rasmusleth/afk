import {isDeepStrictEqual} from 'node:util';
import type {FixtureSnapshot, MatchSnapshot, Normalized, ScheduleSnapshot} from '@afk/dbu/model';
import {record, validateImport, validateMatch, validateScore} from '@afk/sports/validation';
import {planSchedule} from './plan.ts';
import {planMatchDetails} from './details.ts';
import {SyncError, type Document, type Plan, type ReviewItem, type SyncOptions} from './model.ts';

export interface BatchScope {details: 'club' | 'all' | 'none'; clubTeamEntryId?: string}
export interface BatchCandidate {matchNumber: string; includeDetails: boolean}
export interface BatchObservation {matchNumber: string; result: Normalized<MatchSnapshot>}
export const batchMatchLimit = 100;
const published = (id: string) => !id.startsWith('drafts.') && !id.startsWith('versions.');
const identity = (value: unknown, key: {source: string; id: string; scope?: string}) => {
  const source = record(value);
  return source.source === key.source && source.id === key.id && source.scope === key.scope;
};
const storedMatch = (documents: Document[], fixture: FixtureSnapshot) => documents.find(doc => doc._type === 'match' && published(doc._id) && identity(doc.external, fixture.external));
const detailDiagnostics = new Set(['unsupported-event', 'unknown-event-player', 'invalid-minute', 'invalid-shirt-number']);
export function assertBatchSource(result: Normalized<MatchSnapshot>) {
  if (result.diagnostics.some(item => !detailDiagnostics.has(item.code))) throw new SyncError('Match source normalization requires review; the batch was not written.');
}

/** Selection uses source identities and explicit club designation, never names or the clock. */
export function selectBatchMatches(schedule: ScheduleSnapshot, documents: Document[], scope: BatchScope): BatchCandidate[] {
  if (!['club', 'all', 'none'].includes(scope.details)) throw new SyncError('Choose club, all or none for detailed imports.');
  if (scope.clubTeamEntryId && (scope.details !== 'club' || !/^\d+$/.test(scope.clubTeamEntryId))) throw new SyncError('An explicit club team entry is supported only with club details.');
  const entries = new Set(schedule.matches.flatMap(match => [match.homeTeam.external.id, match.awayTeam.external.id]));
  const club = scope.clubTeamEntryId ? new Set([scope.clubTeamEntryId]) : new Set(documents.filter(doc => doc._type === 'team' && published(doc._id) && doc.isClubTeam === true && record(doc.external).source === 'dbu' && record(doc.external).scope === schedule.external.id).map(doc => String(record(doc.external).id)));
  if (scope.details === 'club' && (![...club].some(id => entries.has(id)) || [...club].some(id => !entries.has(id)))) throw new SyncError('Select an Aalborg Team entry present in this schedule: enable its Studio Aalborg team flag or supply --club-team-entry.');
  const selected = schedule.matches.filter(match => {
    const local = storedMatch(documents, match);
    return match.score !== undefined || match.status === 'completed' || local?.score != null || local?.status === 'completed';
  }).map(match => ({matchNumber: match.external.id, includeDetails: scope.details === 'all' || (scope.details === 'club' && [match.homeTeam.external.id, match.awayTeam.external.id].some(id => club.has(id)))}));
  if (selected.length > batchMatchLimit) throw new SyncError('Batch exceeds the 100-match verification limit; no partial selection was made.');
  return selected;
}
function project(documents: Map<string, Document>, plan: Plan) {
  for (const operation of plan.operations) {
    if (operation.kind === 'create') {
      if (documents.has(operation.document._id)) throw new SyncError('Conflicting staged create.');
      // Only in memory. Never persist this revision: final creates omit _rev.
      documents.set(operation.document._id, {...structuredClone(operation.document), _rev: 'uncommitted-batch-document'});
    } else {
      const current = documents.get(operation.id);
      if (!current || current._rev !== operation.revision) throw new SyncError('Staged revision conflict.');
      documents.set(operation.id, {...current, ...structuredClone(operation.set)});
    }
  }
}
function markReview(documents: Map<string, Document>, item: ReviewItem) {
  const doc = documents.get(item.documentId);
  if (!doc) throw new SyncError('Review item has no staged document.');
  const previous = record(doc.import);
  const reasons = typeof previous.reviewReason === 'string' ? previous.reviewReason.split('\n').filter(Boolean) : [];
  doc.import = {...previous, _type: 'importMetadata', origin: previous.origin === 'imported' ? 'imported' : 'manual', needsReview: true, reviewReason: [...new Set([...reasons, `${item.field ?? 'fixture'}: ${item.reason}`])].join('\n')};
}

/** One coherent plan against ORIGINAL revisions, with at most one operation per document. */
export function planCompetitionBatch(schedule: ScheduleSnapshot, documents: Document[], observations: BatchObservation[], options: SyncOptions & BatchScope) {
  // Reuse schedule integrity/identity/Season checks before accepting source observations.
  planSchedule(schedule, documents, options);
  const candidates = selectBatchMatches(schedule, documents, options);
  const observed = new Map(observations.map(item => [item.matchNumber, item.result]));
  if (observed.size !== observations.length || observed.size !== candidates.length || candidates.some(item => !observed.has(item.matchNumber))) throw new SyncError('Batch needs exactly one source observation for every selected match.');
  const checked: {matchNumber: string; verified: boolean; importDetails: boolean; reason?: string}[] = [];
  const notices: {matchNumber: string; field: string; reason: string}[] = [];
  const verifiedSchedule = structuredClone(schedule);
  for (const candidate of candidates) {
    const fixture = verifiedSchedule.matches.find(match => match.external.id === candidate.matchNumber)!;
    const result = observed.get(candidate.matchNumber)!;
    assertBatchSource(result);
    const source = result.value;
    if (!identity(source.external, fixture.external) || !identity(source.competition, schedule.external) || !identity(source.homeTeam.external, fixture.homeTeam.external) || !identity(source.awayTeam.external, fixture.awayTeam.external)) throw new SyncError('Match page identity, pool or teams disagree with the schedule; the batch was not written.');
    if (!['completed', 'postponed', 'unknown'].includes(source.status) || (source.score !== undefined && validateScore(source.score) !== true)) throw new SyncError('Invalid match result observation.');
    const verified = source.status === 'completed' && source.score !== undefined;
    checked.push({matchNumber: candidate.matchNumber, verified, importDetails: verified && candidate.includeDetails,
      ...(!verified ? {reason: 'Completion and a complete official score were not both established on the match page.'} : {})});
    if (verified) {
      if (fixture.score && !isDeepStrictEqual(fixture.score, source.score)) notices.push({matchNumber: candidate.matchNumber, field: 'score', reason: 'Schedule and match-page scores differ; verified match-page result used unless manually protected.'});
      fixture.status = 'completed'; fixture.score = source.score;
    } else {
      // Keep existing local facts; do not attach an unverified NEW score to a
      // previously completed or manually protected local status.
      fixture.status = source.status === 'postponed' ? 'postponed' : 'unknown';
      delete fixture.score;
      notices.push({matchNumber: candidate.matchNumber, field: 'status', reason: 'Result not verified on this run; existing local facts retained and no completion inferred.'});
    }
  }
  const staged = new Map(documents.map(doc => [doc._id, structuredClone(doc)]));
  const initial = new Map(documents.map(doc => [doc._id, doc]));
  const schedulePlan = planSchedule(verifiedSchedule, documents, options);
  project(staged, schedulePlan);
  const review = [...schedulePlan.review];
  const detailedMatchIds: string[] = [];
  for (const item of checked.filter(item => item.importDetails)) {
    const source = observed.get(item.matchNumber)!;
    const local = storedMatch([...staged.values()], source.value)!;
    if (local.status !== 'completed') {
      item.importDetails = false; item.reason = 'Protected local status prevents completed-match detail import.';
      notices.push({matchNumber: item.matchNumber, field: 'status', reason: item.reason}); continue;
    }
    const details = planMatchDetails(source.value, [...staged.values()], options.now, source.diagnostics);
    project(staged, details); review.push(...details.review); detailedMatchIds.push(item.matchNumber);
  }
  for (const notice of notices) {
    const fixture = schedule.matches.find(match => match.external.id === notice.matchNumber)!;
    const doc = storedMatch([...staged.values()], fixture)!;
    const item: ReviewItem = {documentId: doc._id, field: notice.field, reason: notice.reason};
    markReview(staged, item); review.push(item);
  }
  const poolCompetition = [...staged.values()].find(doc => doc._type === 'competition' && published(doc._id) && identity(doc.external, schedule.external))!;
  const sourceIds = new Set(schedule.matches.map(match => match.external.id));
  const retainedMissingMatchIds: string[] = [];
  for (const doc of staged.values()) if (doc._type === 'match' && published(doc._id) && record(doc.competition)._ref === poolCompetition._id && record(doc.external).source === 'dbu' && !sourceIds.has(String(record(doc.external).id))) {
    retainedMissingMatchIds.push(doc._id);
    const item = {documentId: doc._id, field: 'status', reason: 'Stored DBU fixture is absent from the fetched schedule; retained for review.'};
    markReview(staged, item); review.push(item);
  }
  const creates: Plan['operations'] = [], patches: Plan['operations'] = [];
  for (const doc of staged.values()) {
    const previous = initial.get(doc._id);
    if (!previous) {
      if (validateImport(doc.import) !== true) throw new SyncError('Invalid staged import metadata.');
      if (doc._type === 'match' && validateMatch(doc) !== true) throw new SyncError('Invalid new staged match.');
      const created = {...doc}; delete created._rev;
      creates.push({kind: 'create', document: created}); continue;
    }
    const set = Object.fromEntries(Object.entries(doc).filter(([field, value]) => !['_id', '_type', '_rev'].includes(field) && !isDeepStrictEqual(value, previous[field])));
    if (Object.keys(previous).some(field => !(field in doc)) || Object.values(set).some(value => value === undefined)) throw new SyncError('Batch cannot unset existing document fields.');
    if (Object.keys(set).length) {
      if (validateImport(doc.import) !== true) throw new SyncError('Invalid staged import metadata.');
      if (doc._type === 'match' && validateMatch(doc) !== true) throw new SyncError('Invalid staged match; resolve conflicting manual facts before applying the batch.');
      if (!previous._rev) throw new SyncError('A changed document is missing its original revision.');
      patches.push({kind: 'patch', id: doc._id, revision: previous._rev, set});
    }
  }
  const plan: Plan = {operations: [...creates, ...patches], review};
  return {plan, summary: {scheduleMatches: schedule.matches.length, checked, verifiedResults: checked.filter(item => item.verified).length, detailedMatchIds, retainedMissingMatchIds}};
}
