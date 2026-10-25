import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {parseSchedule, parseMatch} from '@afk/dbu/parse';
import {normalizeSchedule, normalizeMatch} from '@afk/dbu/normalize';
import {record, validateMatch} from '@afk/sports/validation';
import {planCompetitionBatch, selectBatchMatches} from './batch.ts';
import {collectBatchObservations} from './batch-source.ts';
import {parseBatchOptions} from './batch-options.ts';
import {planSchedule} from './plan.ts';
import {planMatchDetails} from './details.ts';
import {planMutations, sanityStore} from './sanity-store.ts';
import {scheduleUrl, matchUrl} from './fetch.ts';
import {SyncError, type Document, type Plan} from './model.ts';

const now = '2026-10-25T18:00:00Z';
const options = {seasonId: 'season-example', timeZone: 'Europe/Copenhagen', now, details: 'club' as const, clubTeamEntryId: '404636'};
const html = (id: string) => readFileSync(new URL(`../dbu/fixtures/match-${id}.html`, import.meta.url), 'utf8');
const schedule = normalizeSchedule(parseSchedule(readFileSync(new URL('./fixtures/batch-schedule-508399.html', import.meta.url), 'utf8'), scheduleUrl('508399'))).value;
const initial: Document[] = JSON.parse(readFileSync(new URL('./fixtures/empty-development.json', import.meta.url), 'utf8'));
const observations = ['602658', '602659'].map(matchNumber => ({matchNumber, result: normalizeMatch(parseMatch(html(matchNumber), matchUrl(matchNumber, '508399'), {includeDetails: matchNumber === '602659'}))}));
function apply(documents: Document[], plan: Plan): Document[] {
  const result = structuredClone(documents);
  for (const op of plan.operations) {
    if (op.kind === 'create') result.push({...structuredClone(op.document), _rev: 'original-revision'});
    else {const doc = result.find(doc => doc._id === op.id)!; assert.equal(doc._rev, op.revision); Object.assign(doc, structuredClone(op.set));}
  }
  return result;
}
const match = (documents: Document[], id = '602659') => documents.find(doc => doc._id === `dbu-match-${id}`)!;
const run = (documents = initial) => planCompetitionBatch(schedule, documents, observations, options);
const imported = () => apply(initial, run().plan);

test('batch stages new schedule plus verified results and club details in one immutable plan', () => {
  const before = structuredClone(initial), sources = structuredClone(observations);
  const {plan, summary} = run();
  assert.deepEqual(initial, before); assert.deepEqual(observations, sources);
  assert.equal(plan.operations.length, 7); assert.equal(summary.verifiedResults, 2);
  assert.deepEqual(summary.detailedMatchIds, ['602659']);
  const documents = apply(initial, plan), club = match(documents), opponent = match(documents, '602658');
  for (const doc of [club, opponent]) {assert.equal(doc.status, 'completed'); assert.equal(validateMatch(doc), true);}
  assert.ok(Array.isArray(club.events)); assert.ok(Array.isArray(club.participants));
  assert.equal(opponent.events, undefined); assert.equal(opponent.participants, undefined);
  assert.ok(plan.operations.every(op => op.kind === 'create' && op.document._rev === undefined));
  assert.equal(documents.filter(doc => doc._type === 'player').length, 0);
  assert.deepEqual(run(documents).plan.operations, []);
});
test('existing matches merge schedule and detail changes into one patch using original revisions', () => {
  const documents = apply(initial, planSchedule(schedule, initial, options));
  const {plan} = run(documents);
  assert.equal(plan.operations.length, 2);
  for (const op of plan.operations) {assert.equal(op.kind, 'patch'); if (op.kind === 'patch') assert.equal(op.revision, 'original-revision');}
  const result = apply(documents, plan), current = match(result);
  assert.equal((record(current.import).overrides as string[]).includes('status'), false);
  const afterSchedule = apply(result, planSchedule(schedule, result, options));
  assert.equal((record(match(afterSchedule).import).overrides as string[]).includes('status'), false);
  assert.deepEqual(planMatchDetails(observations[1].result.value, result, now).operations, []);
});
test('batch retains manual score, linked players, assists, event keys and locally removed minutes', () => {
  const documents = imported(), current = match(documents);
  current.score = {home: 9, away: 8};
  const goal = (current.events as unknown[]).map(record).find(event => event._type === 'goal')!;
  goal.player = {_type: 'reference', _ref: 'confirmed-player'};
  goal.assist = {_type: 'assist', status: 'credited', sourceName: 'Manual assister'};
  delete goal.minute;
  const result = match(apply(documents, run(documents).plan));
  assert.deepEqual(result.score, {home: 9, away: 8});
  const kept = (result.events as unknown[]).map(record).find(event => event._key === goal._key)!;
  assert.deepEqual(kept.player, goal.player); assert.deepEqual(kept.assist, goal.assist); assert.equal(kept.minute, undefined);
  assert.ok((record(result.import).overrides as string[]).includes('score'));
});
test('protected non-completed status blocks importing played appearances', () => {
  const documents = apply(initial, planSchedule(schedule, initial, options));
  match(documents).status = 'cancelled';
  record(match(documents).import).overrides = ['status'];
  const {plan, summary} = run(documents), result = match(apply(documents, plan));
  assert.equal(result.status, 'cancelled'); assert.equal(result.participants, undefined);
  assert.deepEqual(summary.detailedMatchIds, []);
});
test('unverified source withholds new score, retains existing facts and marks review', () => {
  const changed = structuredClone(observations); changed[1].result.value.status = 'unknown';
  changed[1].result.value.score = {home: 99, away: 99};
  for (const documents of [initial, imported()]) {
    const {plan, summary} = planCompetitionBatch(schedule, documents, changed, options);
    const result = match(apply(documents, plan));
    assert.deepEqual(result.score, match(documents)?.score);
    assert.equal(result.status, match(documents)?.status ?? 'unknown');
    assert.equal(record(result.import).needsReview, true);
    assert.equal(summary.verifiedResults, 1); assert.deepEqual(summary.detailedMatchIds, []);
  }
});
test('verified 0–0 is a known result, match-page corrections do not become false manual overrides', () => {
  const documents = imported(), changed = structuredClone(observations);
  changed[0].result.value.score = {home: 0, away: 0};
  const {plan, summary} = planCompetitionBatch(schedule, documents, changed, options);
  const result = match(apply(documents, plan), '602658');
  assert.equal(summary.verifiedResults, 2); assert.deepEqual(result.score, {_type: 'score', home: 0, away: 0});
  assert.equal((record(result.import).overrides as string[]).includes('score'), false);
  assert.ok(plan.review.some(item => item.reason.includes('scores differ')));
});
test('selection uses club flag or explicit scoped identity, never score truthiness or the clock', () => {
  assert.throws(() => selectBatchMatches(schedule, initial, {details: 'club'}), SyncError);
  const documents = imported(); documents.find(doc => doc._id === 'dbu-team-508399-404636')!.isClubTeam = true;
  assert.deepEqual(selectBatchMatches(schedule, documents, {details: 'club'}), [{matchNumber: '602658', includeDetails: false}, {matchNumber: '602659', includeDetails: true}]);
  assert.ok(selectBatchMatches(schedule, initial, {details: 'all'}).every(item => item.includeDetails));
  assert.ok(selectBatchMatches(schedule, initial, {details: 'none'}).every(item => !item.includeDetails));
  const blank = structuredClone(schedule); blank.matches.forEach(item => {delete item.score; item.status = 'unknown';});
  assert.deepEqual(selectBatchMatches(blank, initial, {details: 'none'}), []);
  assert.equal(selectBatchMatches(blank, documents, {details: 'none'}).length, 2);
  const oversized = structuredClone(schedule); oversized.matches = Array.from({length: 101}, (_, index) => ({...schedule.matches[0], external: {source: 'dbu', id: String(index)}}));
  assert.throws(() => selectBatchMatches(oversized, initial, {details: 'none'}), /100-match/);
});
test('missing stored fixtures survive and require review; missing/duplicate/mismatched observations stop everything', () => {
  const documents = imported();
  documents.push({...structuredClone(match(documents, '602658')), _id: 'old-fixture', external: {source: 'dbu', id: '123456'}});
  const {plan, summary} = run(documents);
  assert.deepEqual(summary.retainedMissingMatchIds, ['old-fixture']);
  assert.equal(record(apply(documents, plan).find(doc => doc._id === 'old-fixture')!.import).needsReview, true);
  record(documents.find(doc => doc._id === 'old-fixture')!.import).overrides = ['status', 'status'];
  assert.throws(() => run(documents), SyncError);
  for (const bad of [observations.slice(1), [...observations, observations[0]]]) assert.throws(() => planCompetitionBatch(schedule, initial, bad, options), SyncError);
  const wrong = structuredClone(observations); wrong[0].result.value.homeTeam.external.id = '999';
  assert.throws(() => planCompetitionBatch(schedule, initial, wrong, options), /identity/);
  const invalid = structuredClone(observations); invalid[0].result.diagnostics.push({code: 'invalid-score', path: 'score', message: 'Invalid'});
  assert.throws(() => planCompetitionBatch(schedule, initial, invalid, options), SyncError);
});
test('retrieval is sequential, result-only parsing tolerates changed lineup markup, failures never yield a partial plan', async () => {
  let active = 0, peak = 0;
  const result = await collectBatchObservations(schedule, selectBatchMatches(schedule, initial, options), async id => {
    active++; peak = Math.max(peak, active); await Promise.resolve(); active--;
    return id === '602658' ? html(id).replaceAll('shirt-number', 'changed-shirt-number') : html(id);
  });
  assert.equal(peak, 1); assert.equal(result[0].result.value.participants, undefined);
  assert.ok(result[1].result.value.participants!.length > 0);
  assert.throws(() => parseMatch(html('602658').replaceAll('shirt-number', 'changed-shirt-number'), matchUrl('602658', '508399')));
  const requested: string[] = [];
  await assert.rejects(collectBatchObservations(schedule, selectBatchMatches(schedule, initial, options), async id => {requested.push(id); throw new Error('sensitive transport error');}), error => error instanceof SyncError && !error.message.includes('sensitive'));
  assert.deepEqual(requested, ['602658']);
});
test('batch persistence submits one guarded transaction and rejects unsafe or oversized plans before writing', async () => {
  const documents = apply(initial, planSchedule({...schedule, matches: [schedule.matches[0]]}, initial, options));
  const {plan} = run(documents); assert.ok(plan.operations.some(op => op.kind === 'create')); assert.ok(plan.operations.some(op => op.kind === 'patch'));
  const calls: unknown[][] = [];
  const store = sanityStore({projectId: 'test', dataset: 'development', token: 'synthetic'}, {async fetch() {return [];}, async mutate(mutations) {calls.push(mutations);}}, 'batch');
  await store.commit(plan); assert.equal(calls.length, 1); assert.equal(calls[0].length, plan.operations.length);
  for (const mutation of calls[0].map(record).filter(item => item.patch)) assert.equal(record(mutation.patch).ifRevisionID, 'original-revision');
  const patch = {kind: 'patch' as const, id: 'm', revision: 'r', set: {status: 'completed'}};
  for (const unsafe of [
    {operations: [patch, patch], review: []},
    {operations: [{...patch, revision: ''}], review: []},
    {operations: [{...patch, set: {isClubTeam: true}}], review: []},
    {operations: [{...patch, set: {venue: 'x'.repeat(4_000_000)}}], review: []},
    {operations: Array.from({length: 501}, (_, index) => ({...patch, id: `m${index}`})), review: []},
  ]) assert.throws(() => planMutations(unsafe, 'batch'), SyncError);
  assert.equal(calls.length, 1);
});
test('offline batch CLI produces JSON and refuses incomplete sources and unsafe targets', () => {
  const base = new URL('../../', import.meta.url).pathname;
  const args = ['--pool', '508399', '--season', 'season-example', '--time-zone', 'Europe/Copenhagen', '--html', `${base}packages/importer/fixtures/batch-schedule-508399.html`, '--match-html-dir', `${base}packages/dbu/fixtures`, '--existing', `${base}packages/importer/fixtures/empty-development.json`, '--club-team-entry', '404636'];
  const report = JSON.parse(execFileSync(process.execPath, [new URL('./batch-cli.ts', import.meta.url).pathname, ...args], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}));
  assert.equal(report.mode, 'dry-run'); assert.equal(report.creates, 7); assert.equal(report.summary.verifiedResults, 2);
  assert.deepEqual(report.summary.detailedMatchIds, ['602659']);
  assert.throws(() => parseBatchOptions([...args, '--apply'], base), SyncError);
  assert.throws(() => parseBatchOptions(args.filter((_, index) => index !== 8 && index !== 9), base), SyncError);
  assert.throws(() => parseBatchOptions([...args, '--details', 'all'], base), SyncError);
  assert.throws(() => parseBatchOptions(['--pool', '508399', '--season', 's', '--time-zone', 'Europe/Copenhagen', '--project', 'test', '--dataset', 'production'], base), SyncError);
});

test('all-details is explicit and result-only refreshes preserve existing detail data', async () => {
  const scope = {...options, details: 'all' as const, clubTeamEntryId: undefined};
  const all = await collectBatchObservations(schedule, selectBatchMatches(schedule, initial, scope), async id => html(id));
  const first = planCompetitionBatch(schedule, initial, all, scope);
  assert.deepEqual(first.summary.detailedMatchIds, ['602658', '602659']);
  const documents = apply(initial, first.plan), before = structuredClone(match(documents, '602658'));
  const none = {...scope, details: 'none' as const};
  const summaries = await collectBatchObservations(schedule, selectBatchMatches(schedule, documents, none), async id => html(id));
  const result = apply(documents, planCompetitionBatch(schedule, documents, summaries, none).plan);
  assert.deepEqual(match(result, '602658').events, before.events);
  assert.deepEqual(match(result, '602658').participants, before.participants);
});
test('a later-page failure discards earlier observations and changed required markup stops collection', async () => {
  const candidates = selectBatchMatches(schedule, initial, options), requested: string[] = [];
  await assert.rejects(collectBatchObservations(schedule, candidates, async id => {
    requested.push(id); if (id === '602659') throw new Error('missing file'); return html(id);
  }), /whole batch/);
  assert.deepEqual(requested, ['602658', '602659']);
  await assert.rejects(collectBatchObservations(schedule, candidates, async () => '<html>Unrecognized page</html>'));
});
