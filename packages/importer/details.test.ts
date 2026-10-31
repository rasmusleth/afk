import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {parseMatch, parseSchedule} from '@afk/dbu/parse';
import {normalizeMatch, normalizeSchedule} from '@afk/dbu/normalize';
import {record, validateEvent, validateImport, validateMatch} from '@afk/sports/validation';
import {planMatchDetails} from './details.ts';
import {planSchedule} from './plan.ts';
import {fetchMatch, matchUrl} from './fetch.ts';
import {parseDetailOptions} from './detail-options.ts';
import {sanityStore} from './sanity-store.ts';
import {type Document, type Plan, SyncError} from './model.ts';

const now = '2026-10-25T10:00:00Z';
const html = (name: string) => readFileSync(new URL(`../dbu/fixtures/${name}.html`, import.meta.url), 'utf8');
const schedule = normalizeSchedule(parseSchedule(html('competition-508399'), 'https://dbu.dk/resultater/pulje/508399/kampprogramFuld')).value;
const detail = (id = '602659', pool = '508399') => normalizeMatch(parseMatch(html(`match-${id}`), matchUrl(id, pool)));
function apply(documents: Document[], plan: Plan): Document[] {
  const result = structuredClone(documents);
  for (const operation of plan.operations) {
    if (operation.kind === 'create') result.push({...structuredClone(operation.document), _rev: 'r1'});
    else {
      const target = result.find(d => d._id === operation.id)!;
      assert.equal(target._rev, operation.revision);
      Object.assign(target, structuredClone(operation.set));
    }
  }
  return result;
}
function scheduled() {
  const initial: Document[] = [{_type: 'season', _id: 's', _rev: 'r', name: 'Season', startDate: '2026-07-01', endDate: '2027-06-30'}];
  return apply(initial, planSchedule(schedule, initial, {seasonId: 's', timeZone: 'Europe/Copenhagen', now}));
}
const match = (documents: Document[], id = '602659') => documents.find(d => d._id === `dbu-match-${id}`)!;
const items = (document: Document, field: string) => (document[field] as unknown[]).map(record);
function imported() {const documents = scheduled(); return apply(documents, planMatchDetails(detail().value, documents, now));}

test('recorded DBU assists import as unresolved credited names and repeat without duplicate goals', () => {
  const source = detail('602673').value;
  let documents = apply(scheduled(), planMatchDetails(source, scheduled(), now));
  const assisted = items(match(documents, '602673'), 'events').filter(event => record(event.assist).status === 'credited');
  assert.equal(assisted.length, 3);
  assert.equal(assisted[0].sourceName, 'Bertram Rosendal Jensen');
  assert.deepEqual(assisted[0].assist, {_type: 'assist', status: 'credited', sourceName: 'Christian Søndergaard'});
  assert.ok(assisted.every(event => !event.player && !record(event.assist).player));
  const before = items(match(documents, '602673'), 'events').map(event => event._key);
  documents = apply(documents, planMatchDetails(source, documents, now));
  assert.deepEqual(items(match(documents, '602673'), 'events').map(event => event._key), before);
});

test('verified legacy combined-name signatures upgrade without losing keys or manual enrichment', () => {
  const source = detail('602673').value;
  const legacy = structuredClone(source);
  for (const event of legacy.events ?? []) if (event.type === 'goal' && event.assist.status === 'credited') {
    event.sourceName = `${event.sourceName} ${event.assist.sourceName}`;
    event.assist = {status: 'unknown'};
  }
  let documents = apply(scheduled(), planMatchDetails(legacy, scheduled(), now));
  const old = items(match(documents, '602673'), 'events');
  const goal = old.find(event => event.sourceName === 'Bertram Rosendal Jensen Christian Søndergaard')!;
  goal.player = {_type: 'reference', _ref: 'confirmed-scorer'};
  goal.assist = {_type: 'assist', status: 'credited', sourceName: 'Manual assister'};
  record(goal.import).overrides = ['assist'];
  const plan = planMatchDetails(source, documents, now);
  documents = apply(documents, plan);
  const after = items(match(documents, '602673'), 'events');
  assert.deepEqual(after.map(event => event._key), old.map(event => event._key));
  const kept = after.find(event => event._key === goal._key)!;
  assert.equal(kept.sourceName, 'Bertram Rosendal Jensen');
  assert.deepEqual(kept.player, goal.player);
  assert.deepEqual(kept.assist, goal.assist);
  assert.ok(plan.review.some(item => item.field === `events[${goal._key}].assist` && item.reason === 'Protected manual value differs from source.'));
  assert.ok(!plan.review.some(item => item.reason.includes('changed or disappeared')));
  const other = after.find(event => event.sourceName === 'Casper Flyvholm')!;
  assert.deepEqual(other.assist, {_type: 'assist', status: 'credited', sourceName: 'Tim Vigilsen Wiese'});
  assert.deepEqual(items(match(apply(documents, planMatchDetails(source, documents, now)), '602673'), 'events').map(event => event._key), after.map(event => event._key));
});

test('newly recorded assists enrich existing goals, but ambiguous legacy signatures are retained for review', () => {
  const source = detail('602673').value;
  const previous = structuredClone(source);
  for (const event of previous.events ?? []) if (event.type === 'goal') event.assist = {status: 'unknown'};
  const initial = scheduled();
  const documents = apply(initial, planMatchDetails(previous, initial, now));
  const upgraded = apply(documents, planMatchDetails(source, documents, now));
  assert.equal(items(match(upgraded, '602673'), 'events').filter(event => record(event.assist).status === 'credited').length, 3);
  assert.deepEqual(items(match(upgraded, '602673'), 'events').map(event => event._key), items(match(documents, '602673'), 'events').map(event => event._key));

  const ambiguous = structuredClone(source);
  const goal = ambiguous.events!.find(event => event.type === 'goal' && event.assist.status === 'credited')!;
  if (goal.type !== 'goal') throw new Error('Expected goal fixture.');
  ambiguous.events!.push({...goal, sourceIndex: 999, assist: {status: 'credited', sourceName: 'Another assister'}});
  const plan = planMatchDetails(ambiguous, documents, now);
  const kept = items(match(apply(documents, plan), '602673'), 'events');
  assert.equal(kept.length, items(match(documents, '602673'), 'events').length);
  assert.ok(plan.review.some(item => item.reason.includes('changed or disappeared')));
});

test('real completed fixture imports source names, starters and typed events without Player creation', () => {
  const documents = scheduled(), before = structuredClone(documents);
  const plan = planMatchDetails(detail().value, documents, now);
  assert.deepEqual(documents, before);
  assert.equal(plan.operations.length, 1);
  const result = match(apply(documents, plan));
  assert.equal(result.status, 'completed');
  assert.equal(validateMatch(result), true);
  assert.ok(items(result, 'participants').length > 0);
  for (const p of items(result, 'participants')) {
    assert.equal(p.player, undefined);
    assert.equal(p.appearance, p.lineupStatus === 'starter' ? 'played' : 'unknown');
  }
  assert.ok(items(result, 'events').some(e => e._type === 'goal'));
  assert.ok(plan.review.some(r => r.reason.includes('identity unresolved')));
});
test('repeat detail import preserves keys and manual assists, scorer references, minutes and explicit unsets', () => {
  let documents = imported();
  assert.deepEqual(planMatchDetails(detail().value, documents, now).operations, []);
  const goal = items(match(documents), 'events').find(e => e._type === 'goal')!;
  const key = goal._key;
  goal.player = {_type: 'reference', _ref: 'confirmed-player'};
  goal.assist = {_type: 'assist', status: 'credited', sourceName: 'Manual assister'};
  delete goal.minute;
  const plan = planMatchDetails(detail().value, documents, now);
  documents = apply(documents, plan);
  const kept = items(match(documents), 'events').find(e => e._key === key)!;
  assert.deepEqual(kept.player, goal.player);
  assert.deepEqual(kept.assist, goal.assist);
  assert.equal(kept.minute, undefined);
  assert.ok((record(kept.import).overrides as string[]).includes('minute'));
  assert.deepEqual(planMatchDetails(detail().value, documents, now).operations, []);
});
test('participant changes preserve identity keys and local shirt corrections', () => {
  const documents = imported(), source = structuredClone(detail().value);
  const participant = items(match(documents), 'participants')[0];
  participant.shirtNumber = 99;
  source.participants![0].shirtNumber = 88;
  source.participants![0].lineupStatus = 'substitute';
  const next = match(apply(documents, planMatchDetails(source, documents, now)));
  const kept = items(next, 'participants').find(p => p._key === participant._key)!;
  assert.equal(kept.shirtNumber, 99);
  assert.equal(kept.lineupStatus, 'substitute');
  assert.equal(kept.appearance, 'played'); // source unknown cannot erase evidence
});
test('changed/disappearing events retain enrichment and block uncertain additions', () => {
  const documents = imported(), source = structuredClone(detail().value);
  const before = items(match(documents), 'events');
  const goal = source.events!.find(e => e.type === 'goal')!;
  goal.minute = 999;
  const plan = planMatchDetails(source, documents, now);
  assert.deepEqual(items(match(apply(documents, plan)), 'events'), before);
  assert.ok(plan.review.some(r => r.reason.includes('changed or disappeared')));
});
test('unambiguous new observations append; source order changes preserve keys', () => {
  let documents = imported();
  const source = structuredClone(detail().value);
  const before = items(match(documents), 'events').map(e => e._key);
  const extra = structuredClone(source.events!.find(e => e.type === 'goal')!);
  extra.minute = 999;
  source.events!.push(extra);
  documents = apply(documents, planMatchDetails(source, documents, now));
  assert.equal(items(match(documents), 'events').length, before.length + 1);
  source.events!.reverse();
  const after = match(apply(documents, planMatchDetails(source, documents, now)));
  assert.deepEqual(items(after, 'events').slice(0, before.length).map(e => e._key), before);
});
test('identical repeated goals keep distinct keys and changing multiplicity requires review', () => {
  const source = structuredClone(detail().value);
  const goal = source.events!.find(e => e.type === 'goal')!;
  source.events = [goal, structuredClone(goal)];
  let documents = scheduled();
  documents = apply(documents, planMatchDetails(source, documents, now));
  const keys = items(match(documents), 'events').map(e => e._key);
  assert.equal(new Set(keys).size, 2);
  assert.deepEqual(planMatchDetails(source, documents, now).operations, []);
  source.events.pop();
  const plan = planMatchDetails(source, documents, now);
  assert.deepEqual(items(match(apply(documents, plan)), 'events').map(e => e._key), keys);
  assert.ok(plan.review.some(r => r.reason.includes('multiplicity')));
});
test('manual events survive, and local array removals are not silently recreated', () => {
  let documents = imported();
  const current = match(documents);
  (current.events as unknown[]).push({_key: 'manual', _type: 'yellowCard', team: current.homeTeam, sourceName: 'Manual', import: {_type: 'importMetadata', origin: 'manual'}});
  (current.events as unknown[]).shift();
  const count = (current.events as unknown[]).length;
  documents = apply(documents, planMatchDetails(detail().value, documents, now));
  assert.equal(items(match(documents), 'events').length, count);
  assert.ok(items(match(documents), 'events').some(e => e._key === 'manual'));
  assert.ok((record(match(documents).import).overrides as string[]).includes('events'));
});
test('missing sections retain arrays and unknown fixture status never downgrades completed evidence', () => {
  const documents = imported(), source = structuredClone(detail().value);
  delete source.events; delete source.participants; source.status = 'unknown';
  const result = match(apply(documents, planMatchDetails(source, documents, now)));
  assert.deepEqual(result.events, match(documents).events);
  assert.deepEqual(result.participants, match(documents).participants);
  assert.equal(result.status, 'completed');
});
test('drafts, duplicate identities, relationship mismatch and invalid metadata stop detail writes', () => {
  for (const corrupt of [
    (docs: Document[]) => docs.push({...match(docs), _id: 'drafts.dbu-match-602659'}),
    (docs: Document[]) => docs.push({...match(docs), _id: 'duplicate'}),
    (docs: Document[]) => {match(docs).homeTeam = match(docs).awayTeam;},
    (docs: Document[]) => {match(docs).import = {origin: 'imported', detailKeys: ['x', 'x']};},
  ]) {
    const documents = scheduled(); corrupt(documents);
    assert.throws(() => planMatchDetails(detail().value, documents, now), SyncError);
  }
});
test('penalty goals use inspected markup; unsupported own goals are flagged without crediting a player', () => {
  const penalty = detail('671446', '476135').value.events!.find(e => e.type === 'goal' && e.method === 'penalty')!;
  assert.ok(penalty);
  assert.equal(validateEvent({_type: 'goal', team: {_ref: 't'}, sourceName: 'Player', method: 'penalty', assist: {status: 'unknown'}}), true);
  assert.notEqual(validateEvent({_type: 'yellowCard', team: {_ref: 't'}, sourceName: 'Player', method: 'penalty'}), true);
  const normalized = detail('602662');
  const documents = scheduled(), plan = planMatchDetails(normalized.value, documents, now, normalized.diagnostics);
  const result = match(apply(documents, plan), '602662');
  assert.ok(plan.review.some(r => r.reason.includes('Unsupported') || r.reason.includes('Unmapped')));
  assert.ok(items(result, 'events').every(e => ['goal', 'yellowCard', 'redCard'].includes(String(e._type))));
});
test('detail baseline validation rejects malformed source state and schedule sync preserves detail facts', () => {
  assert.notEqual(validateImport({origin: 'imported', detailBaseline: [{path: 'minute'}]}), true);
  const documents = imported();
  const next = apply(documents, planSchedule(schedule, documents, {seasonId: 's', timeZone: 'Europe/Copenhagen', now}));
  assert.deepEqual(match(next).events, match(documents).events);
  assert.deepEqual(record(match(next).import).detailBaseline, record(match(documents).import).detailBaseline);
});
test('offline detail CLI emits a reviewable plan without changing snapshot inputs', () => {
  const directory = mkdtempSync(join(tmpdir(), 'afk-details-'));
  try {
    const snapshot = join(directory, 'snapshot.json'), contents = JSON.stringify(scheduled());
    writeFileSync(snapshot, contents);
    const output = execFileSync(process.execPath, [new URL('./detail-cli.ts', import.meta.url).pathname, '--match', '602659', '--pool', '508399', '--html', new URL('../dbu/fixtures/match-602659.html', import.meta.url).pathname, '--existing', snapshot], {encoding: 'utf8'});
    assert.equal(JSON.parse(output).patches, 1);
    assert.equal(JSON.parse(output).mode, 'dry-run');
    assert.equal(readFileSync(snapshot, 'utf8'), contents);
  } finally {rmSync(directory, {recursive: true});}
});
test('detail options reject unsafe combinations; bounded fetch uses only the requested public page', async () => {
  assert.throws(() => parseDetailOptions(['--match', '1', '--pool', '2', '--dataset', 'production', '--project', 'test'], '/tmp'), SyncError);
  assert.throws(() => parseDetailOptions(['--match', '1', '--pool', '2', '--html', 'x', '--existing', 'y', '--apply'], '/tmp'), SyncError);
  const result = await fetchMatch('602659', '508399', async (url, options) => {
    assert.equal(url, matchUrl('602659', '508399'));
    assert.equal(new Headers(options?.headers).has('Authorization'), false);
    return new Response('fixture', {headers: {'content-type': 'text/html'}});
  });
  assert.equal(result, 'fixture');
});
test('detail persistence uses guarded patches and refuses creates and schedule fields', async () => {
  const mutations: unknown[] = [];
  const store = sanityStore({projectId: 'test', dataset: 'development', token: 'synthetic'}, {async fetch() {return [];}, async mutate(value) {mutations.push(value);}}, 'detail');
  await store.commit(planMatchDetails(detail().value, scheduled(), now));
  assert.equal(mutations.length, 1);
  assert.equal(record(record((mutations[0] as unknown[])[0]).patch).ifRevisionID, 'r1');
  await assert.rejects(store.commit({operations: [{kind: 'create', document: {_id: 'x', _type: 'match'}}], review: []}), SyncError);
  await assert.rejects(store.commit({operations: [{kind: 'patch', id: 'x', revision: 'r', set: {score: {home: 1, away: 0}}}], review: []}), SyncError);
});

test('verified penalty fixture persists penalty method through the full adapter', () => {
  const source = detail('671446', '476135').value;
  const initial: Document[] = [{_id: 's', _type: 'season', name: 'Previous', startDate: '2025-07-01', endDate: '2026-06-30', _rev: 'r'}];
  const documents = apply(initial, planSchedule({external: source.competition, name: source.competitionName, sourceUrl: source.sourceUrl, matches: [source]}, initial, {seasonId: 's', timeZone: 'Europe/Copenhagen', now}));
  const result = match(apply(documents, planMatchDetails(source, documents, now)), '671446');
  assert.ok(items(result, 'events').some(e => e._type === 'goal' && e.method === 'penalty'));
});
test('confirmed event identity proves a substitute appearance without mutating planner inputs', () => {
  const documents = imported(), current = match(documents);
  const participant = items(current, 'participants').find(p => p.lineupStatus === 'substitute')!;
  participant.player = {_type: 'reference', _ref: 'confirmed'};
  const event = items(current, 'events').find(e => record(e.team)._ref === record(participant.team)._ref)!;
  event.player = participant.player;
  const before = structuredClone(documents), source = structuredClone(detail().value);
  delete source.events; delete source.participants;
  const result = match(apply(documents, planMatchDetails(source, documents, now)));
  assert.deepEqual(documents, before);
  assert.equal(items(result, 'participants').find(p => p._key === participant._key)!.appearance, 'played');
});
test('enriched manual facts are not duplicated when an overlapping source observation appears', () => {
  const documents = scheduled(), source = detail().value;
  const goal = source.events!.find(e => e.type === 'goal')!;
  const current = match(documents);
  current.events = [{_key: 'manual', _type: 'goal', sourceName: goal.sourceName, minute: goal.minute, team: record(current.homeTeam)._ref === `dbu-team-${goal.team!.scope}-${goal.team!.id}` ? current.homeTeam : current.awayTeam, player: {_type: 'reference', _ref: 'confirmed'}, assist: {_type: 'assist', status: 'credited', sourceName: 'Assister'}, import: {_type: 'importMetadata', origin: 'manual'}}];
  const plan = planMatchDetails({...source, events: [goal]}, documents, now);
  assert.equal(items(match(apply(documents, plan)), 'events').length, 1);
  assert.ok(plan.review.some(r => r.reason.includes('overlap')));
});

test('schedule and detail completion evidence does not become a false manual status override', () => {
  let documents = imported();
  assert.equal((record(match(documents).import).overrides as string[]).includes('status'), false);
  documents = apply(documents, planSchedule(schedule, documents, {seasonId: 's', timeZone: 'Europe/Copenhagen', now}));
  assert.equal((record(match(documents).import).overrides as string[]).includes('status'), false);
  const changedSchedule = structuredClone(schedule);
  changedSchedule.matches.find(m => m.external.id === '602659')!.status = 'postponed';
  documents = apply(documents, planSchedule(changedSchedule, documents, {seasonId: 's', timeZone: 'Europe/Copenhagen', now}));
  documents = apply(documents, planMatchDetails(detail().value, documents, now));
  assert.equal((record(match(documents).import).overrides as string[]).includes('status'), false);
});

test('clearing an accepted embedded override allows the next source value to return', () => {
  let documents = imported();
  const goal = items(match(documents), 'events').find(e => e._type === 'goal' && e.minute !== undefined)!;
  const key = goal._key, originalMinute = goal.minute;
  goal.minute = 999;
  documents = apply(documents, planMatchDetails(detail().value, documents, now));
  const accepted = items(match(documents), 'events').find(e => e._key === key)!;
  record(accepted.import).overrides = [];
  documents = apply(documents, planMatchDetails(detail().value, documents, now));
  assert.equal(items(match(documents), 'events').find(e => e._key === key)!.minute, originalMinute);
});
test('an explicit array override also protects unknown participant appearance', () => {
  const documents = imported(), current = match(documents);
  const participant = items(current, 'participants').find(p => p.lineupStatus === 'substitute')!;
  participant.player = {_type: 'reference', _ref: 'confirmed'};
  const event = items(current, 'events').find(e => record(e.team)._ref === record(participant.team)._ref)!;
  event.player = participant.player;
  record(current.import).overrides = ['participants'];
  const result = match(apply(documents, planMatchDetails(detail().value, documents, now)));
  assert.equal(items(result, 'participants').find(p => p._key === participant._key)!.appearance, 'unknown');
});
