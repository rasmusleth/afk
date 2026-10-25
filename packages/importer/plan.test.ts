import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseSchedule} from '@afk/dbu/parse';
import {normalizeSchedule} from '@afk/dbu/normalize';
import {planSchedule} from './plan.ts';
import {fingerprint} from './reconcile.ts';
import {canonicalKickoff} from './time.ts';
import {SyncError, type Document, type Plan} from './model.ts';

const source = normalizeSchedule(parseSchedule(readFileSync(new URL('../dbu/fixtures/competition-508399.html', import.meta.url), 'utf8'), 'https://dbu.dk/resultater/pulje/508399/kampprogramFuld')).value;
const initial: Document[] = JSON.parse(readFileSync(new URL('./fixtures/empty-development.json', import.meta.url), 'utf8'));
const options = {seasonId: 'season-example', timeZone: 'Europe/Copenhagen', now: '2026-10-24T10:00:00Z'};
const later = {...options, now: '2026-10-24T11:00:00Z'};
class MemoryStore {
  documents: Document[];
  constructor(documents = initial) { this.documents = structuredClone(documents); }
  async commit(plan: Plan) {
    const next = new Map(this.documents.map(document => [document._id, structuredClone(document)]));
    for (const operation of plan.operations) {
      if (operation.kind === 'create') {
        assert.ok(!next.has(operation.document._id), 'create conflict');
        next.set(operation.document._id, {...structuredClone(operation.document), _rev: 'revision-1'});
      } else {
        const existing = next.get(operation.id);
        assert.equal(existing?._rev, operation.revision, 'revision conflict');
        next.set(operation.id, {...existing!, ...structuredClone(operation.set), _rev: `${operation.revision}-next`});
      }
    }
    this.documents = [...next.values()];
  }
}
async function imported() { const store = new MemoryStore(); await store.commit(planSchedule(source, store.documents, options)); return store; }
function doc(store: MemoryStore, id = 'dbu-match-602659') { return store.documents.find(document => document._id === id)!; }

test('full fixture creates 1 competition, 10 scoped teams and 90 published matches, with no lineups/events or season mutation', async () => {
  const before = structuredClone(initial);
  const plan = planSchedule(source, initial, options);
  assert.equal(plan.operations.length, 101);
  assert.ok(plan.operations.every(operation => operation.kind === 'create'));
  assert.deepEqual(initial, before);
  const store = await imported();
  const match = doc(store);
  assert.deepEqual(match.kickoff, {_type: 'kickoff', precision: 'time', dateTime: '2026-09-27T11:00:00.000Z'});
  assert.deepEqual(match.score, {_type: 'score', home: 4, away: 3});
  assert.equal(match.status, 'unknown'); // no guessed finality from numeric score
  assert.equal(match.participants, undefined);
  assert.equal(match.events, undefined);
  assert.deepEqual(doc(store, 'season-example'), initial[0]);
  assert.equal(doc(store, 'dbu-match-602678').status, 'postponed');
  assert.ok(store.documents.every(document => !document._id.startsWith('drafts.')));
});
test('repeat imports are idempotent; later runs refresh only schedule metadata', async () => {
  const store = await imported();
  assert.deepEqual(planSchedule(source, store.documents, options).operations, []);
  const again = planSchedule(source, store.documents, later);
  assert.equal(again.operations.length, 101);
  assert.ok(again.operations.every(operation => operation.kind === 'patch' && Object.keys(operation.set).join() === 'import'));
  await store.commit(again);
  assert.equal(store.documents.length, 102);
});
test('changed fixtures update importer-owned fields without touching manual arrays or detail metadata', async () => {
  const store = await imported();
  const match = doc(store);
  match.events = [{_type: 'goal', _key: 'manual-goal', team: match.homeTeam, sourceName: 'Confirmed source', assist: {_type: 'assist', status: 'none'}, import: {_type: 'importMetadata', origin: 'manual'}}];
  match.participants = [];
  const changed = structuredClone(source);
  changed.matches.find(match => match.external.id === '602659')!.venue = 'New source venue';
  await store.commit(planSchedule(changed, store.documents, later));
  assert.equal(doc(store).venue, 'New source venue');
  assert.deepEqual(doc(store).events, match.events);
  assert.deepEqual(doc(store).participants, []);
});
test('edits without override flags are detected, protected and recorded per field', async () => {
  const store = await imported();
  doc(store).venue = 'Manual correction';
  const plan = planSchedule(source, store.documents, later);
  assert.ok(plan.review.some(item => item.documentId === 'dbu-match-602659' && item.field === 'venue'));
  await store.commit(plan);
  assert.equal(doc(store).venue, 'Manual correction');
  const metadata = doc(store).import as {overrides: string[]; scheduleBaseline: {path: string; fingerprint: string}[]};
  assert.ok(metadata.overrides.includes('venue'));
  assert.equal(metadata.scheduleBaseline.find(item => item.path === 'venue')?.fingerprint, fingerprint('Manual correction'));
  metadata.overrides = metadata.overrides.filter(field => field !== 'venue');
  await store.commit(planSchedule(source, store.documents, {...later, now: '2026-10-24T12:00:00Z'}));
  assert.equal(doc(store).venue, 'Hundested Hallen');
});
test('explicit nested overrides protect the complete score fact, and manually cleared fields stay cleared', async () => {
  const store = await imported();
  const match = doc(store);
  match.score = {_type: 'score', home: 0, away: 0};
  (match.import as {overrides: string[]}).overrides = ['score.home'];
  delete match.venue;
  await store.commit(planSchedule(source, store.documents, later));
  assert.deepEqual(doc(store).score, {_type: 'score', home: 0, away: 0});
  assert.equal(doc(store).venue, undefined);
  assert.ok((doc(store).import as {overrides: string[]}).overrides.includes('venue'));
  const reason = (doc(store).import as {reviewReason: string}).reviewReason;
  await store.commit(planSchedule(source, store.documents, {...later, now: '2026-10-24T12:00:00Z'}));
  assert.equal((doc(store).import as {reviewReason: string}).reviewReason, reason);
});
test('manual enrichment in an absent imported field is never erased by missing or newly supplied source data', async () => {
  const store = await imported();
  const fixture = source.matches.find(match => match.external.id === '602675')!;
  const id = 'dbu-match-602675';
  doc(store, id).score = {_type: 'score', home: 7, away: 0};
  const changed = structuredClone(source);
  changed.matches.find(match => match.external.id === fixture.external.id)!.score = {home: 2, away: 5};
  await store.commit(planSchedule(changed, store.documents, later));
  assert.deepEqual(doc(store, id).score, {_type: 'score', home: 7, away: 0});
});
test('missing source values and fixtures retain known data and never delete records', async () => {
  const store = await imported();
  const changed = structuredClone(source);
  const fixture = changed.matches.find(match => match.external.id === '602659')!;
  delete fixture.score;
  delete fixture.venue;
  fixture.kickoff = {precision: 'unknown'};
  changed.matches = changed.matches.filter(match => match.external.id !== '602658');
  await store.commit(planSchedule(changed, store.documents, later));
  assert.equal(doc(store).venue, 'Hundested Hallen');
  assert.deepEqual(doc(store).score, {_type: 'score', home: 4, away: 3});
  assert.ok(doc(store, 'dbu-match-602658'));
});
test('loss of kickoff precision is retained for review rather than inventing or erasing a time', async () => {
  const store = await imported();
  const changed = structuredClone(source);
  changed.matches.find(match => match.external.id === '602659')!.kickoff = {precision: 'date', date: '2026-09-28'};
  const plan = planSchedule(changed, store.documents, later);
  assert.ok(plan.review.some(item => item.field === 'kickoff'));
  await store.commit(plan);
  assert.deepEqual(doc(store).kickoff, {_type: 'kickoff', precision: 'time', dateTime: '2026-09-27T11:00:00.000Z'});
});
test('existing verified external identities retain arbitrary internal IDs, while names alone do not merge', async () => {
  const store = await imported();
  const team = doc(store, 'dbu-team-508399-404636');
  team._id = 'trusted-aalborg-entry';
  for (const match of store.documents.filter(document => document._type === 'match')) {
    for (const field of ['homeTeam', 'awayTeam']) if ((match[field] as {_ref: string})._ref === 'dbu-team-508399-404636') {
      match[field] = {_type: 'reference', _ref: team._id};
      const baseline = (match.import as {scheduleBaseline: {path: string; fingerprint: string}[]}).scheduleBaseline.find(item => item.path === field)!;
      baseline.fingerprint = fingerprint(match[field]);
    }
  }
  store.documents.push({_id: 'manual-similar-name', _type: 'team', _rev: 'manual', name: 'Aalborg Futsal Klub'});
  await store.commit(planSchedule(source, store.documents, later));
  assert.equal((doc(store).awayTeam as {_ref: string})._ref, 'trusted-aalborg-entry');
  assert.ok(doc(store, 'manual-similar-name'));
});
test('duplicate identities, draft/release records, ID collisions and invalid manual records fail closed', async () => {
  const store = await imported();
  const team = doc(store, 'dbu-team-508399-404636');
  for (const extra of [{...team, _id: 'duplicate'}, {...team, _id: `drafts.${team._id}`}, {...team, _id: `versions.release.${team._id}`}]) {
    assert.throws(() => planSchedule(source, [...store.documents, extra], later), SyncError);
  }
  assert.throws(() => planSchedule(source, [...initial, {_id: 'dbu-match-602659', _type: 'player', _rev: 'collision'}], options), SyncError);
  doc(store).score = {_type: 'score', home: -1, away: 3};
  assert.throws(() => planSchedule(source, store.documents, later), SyncError);
});
test('concurrent editor changes reject the whole transaction instead of partially applying the plan', async () => {
  const store = await imported();
  const changed = structuredClone(source);
  changed.matches[0].venue = 'Fixture change';
  const plan = planSchedule(changed, store.documents, later);
  doc(store)._rev = 'concurrent-editor';
  const before = structuredClone(store.documents);
  await assert.rejects(store.commit(plan));
  assert.deepEqual(store.documents, before);
});
test('source duplicate teams/fixtures and season conflicts cannot generate a partial plan', async () => {
  const store = await imported();
  const duplicate = {...source, matches: [source.matches[0], source.matches[0]]};
  assert.throws(() => planSchedule(duplicate, store.documents, later), SyncError);
  const wrongSeason = {...options, seasonId: 'missing-season'};
  assert.throws(() => planSchedule(source, store.documents, wrongSeason), SyncError);
  doc(store, 'dbu-competition-508399').season = {_type: 'reference', _ref: 'other-season'};
  assert.throws(() => planSchedule(source, store.documents, later), SyncError);
});
test('timezone conversion handles Copenhagen summer/winter and rejects gaps/folds', () => {
  assert.deepEqual(canonicalKickoff({precision: 'time', date: '2026-01-10', localTime: '13:00'}, 'Europe/Copenhagen'), {_type: 'kickoff', precision: 'time', dateTime: '2026-01-10T12:00:00.000Z'});
  assert.deepEqual(canonicalKickoff({precision: 'time', date: '2026-07-10', localTime: '13:00'}, 'Europe/Copenhagen'), {_type: 'kickoff', precision: 'time', dateTime: '2026-07-10T11:00:00.000Z'});
  for (const date of ['2026-03-29', '2026-10-25']) assert.throws(() => canonicalKickoff({precision: 'time', date, localTime: '02:30'}, 'Europe/Copenhagen'), SyncError);
  assert.deepEqual(canonicalKickoff({precision: 'date', date: '2026-10-25'}, 'Europe/Copenhagen'), {_type: 'kickoff', precision: 'date', date: '2026-10-25'});
  assert.equal(canonicalKickoff({precision: 'unknown'}, 'Europe/Copenhagen'), undefined);
});

test('verified but manually owned or legacy documents retain values without guessed importer ownership', async () => {
  const store = await imported();
  const team = doc(store, 'dbu-team-508399-404636');
  team.name = 'Manual display label';
  team.import = {_type: 'importMetadata', origin: 'manual'};
  const match = doc(store);
  match.import = {_type: 'importMetadata', origin: 'imported'};
  match.venue = 'Legacy value without a baseline';
  await store.commit(planSchedule(source, store.documents, later));
  assert.equal(doc(store, team._id).name, 'Manual display label');
  assert.equal(doc(store).venue, 'Legacy value without a baseline');
  assert.equal((doc(store, team._id).import as {origin: string}).origin, 'manual');
});
test('draft Season and corrupted tracking metadata abort planning without guessing', async () => {
  const store = await imported();
  assert.throws(() => planSchedule(source, [...store.documents, {...initial[0], _id: 'drafts.season-example'}], later), SyncError);
  doc(store).import = {_type: 'importMetadata', origin: 'imported', scheduleBaseline: [{_key: 'wrong', path: 'venue', fingerprint: 'a'.repeat(64)}]};
  assert.throws(() => planSchedule(source, store.documents, later), SyncError);
});
