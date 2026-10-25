import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compareStandings, deriveStandings, nationalFutsalMen} from './standings.ts';
import type {CompetitionRecord, MatchRecord} from './derivation.ts';
const ref = (id: string) => ({_type: 'reference' as const, _ref: id});
const competition: CompetitionRecord = {_id: 'c', _type: 'competition', name: 'League', season: ref('s')};
const entries = ['a', 'b', 'c', 'd', 'e'].map(_id => ({_id, _type: 'team' as const, name: _id}));
const fixture = (id: string, home: string, away: string, h: number, a: number): MatchRecord => ({_id: id, _type: 'match', competition: ref('c'), homeTeam: ref(home), awayTeam: ref(away), status: 'completed', score: {_type: 'score', home: h, away: a}});
const options = {rules: nationalFutsalMen, noShows: Object.fromEntries(entries.map(e => [e._id, 0]))};
test('official results produce wins/draws/losses, goals and 3/1/0 points independently of event coverage', () => {
  const matches = [fixture('win', 'a', 'b', 2, 0), fixture('draw', 'b', 'a', 1, 1)];
  const result = deriveStandings(competition, entries.slice(0, 2), matches, options);
  assert.deepEqual(result.rows.map(r => [r.teamId, r.played, r.won, r.drawn, r.lost, r.goalsFor, r.goalsAgainst, r.awayGoalsFor, r.points]), [['a', 2, 1, 1, 0, 3, 1, 1, 4], ['b', 2, 0, 1, 1, 1, 3, 0, 1]]);
});
test('signed competition adjustments accumulate once, including rulings originating in a prior Season', () => {
  const adjusted: CompetitionRecord = {...competition, pointsAdjustments: [
    {_type: 'pointsAdjustment', _key: 'one', team: ref('a'), points: -3, reason: 'Verified ruling', originatingSeason: ref('old')},
    {_type: 'pointsAdjustment', _key: 'two', team: ref('a'), points: -2, reason: 'Another ruling'},
  ]};
  const matches = [fixture('win', 'a', 'b', 1, 0), {...fixture('outside', 'a', 'b', 10, 0), competition: ref('other')}];
  const before = structuredClone(adjusted), result = deriveStandings(adjusted, entries.slice(0, 2), matches, options);
  const row = result.rows.find(r => r.teamId === 'a')!;
  assert.equal(row.earnedPoints, 3); assert.equal(row.adjustmentPoints, -5); assert.equal(row.points, -2);
  assert.equal(row.adjustments.length, 2); assert.deepEqual(adjusted, before);
});
test('no-shows precede goal difference; absent no-show data preserves a shared rank instead of guessing zero', () => {
  const matches = [fixture('one', 'a', 'c', 10, 0), fixture('two', 'b', 'd', 1, 0)];
  const unknown = deriveStandings(competition, entries.slice(0, 4), matches, {rules: nationalFutsalMen});
  assert.equal(unknown.rows.find(r => r.teamId === 'a')!.rank, unknown.rows.find(r => r.teamId === 'b')!.rank);
  assert.ok(unknown.issues.some(i => i.code === 'unknown-no-shows'));
  const known = deriveStandings(competition, entries.slice(0, 4), matches, {...options, noShows: {a: 1, b: 0, c: 0, d: 0}});
  assert.equal(known.rows[0].teamId, 'b');
});
test('away goals and wins are genuine ranking criteria rather than alphabetical order', () => {
  const away = deriveStandings(competition, entries.slice(0, 4), [fixture('one', 'c', 'b', 0, 2), fixture('two', 'a', 'd', 2, 0)], options);
  assert.equal(away.rows[0].teamId, 'b');
  const wins = deriveStandings(competition, entries, [fixture('w', 'a', 'c', 3, 0), fixture('l', 'a', 'd', 0, 3), fixture('d1', 'b', 'c', 1, 1), fixture('d2', 'b', 'd', 1, 1), fixture('d3', 'b', 'e', 1, 1)], options);
  assert.ok(wins.rows.findIndex(r => r.teamId === 'a') < wins.rows.findIndex(r => r.teamId === 'b'));
});
test('two-team head-to-head breaks a tie only after the overall criteria', () => {
  const result = deriveStandings(competition, entries.slice(0, 4), [fixture('direct', 'b', 'a', 1, 0), fixture('loss', 'c', 'b', 1, 0), fixture('balance', 'a', 'd', 1, 0)], options);
  assert.ok(result.rows.findIndex(r => r.teamId === 'b') < result.rows.findIndex(r => r.teamId === 'a'));
});
test('unverified multi-team mini-table semantics and unresolved two-team ties stay explicit', () => {
  const multi = deriveStandings(competition, entries.slice(0, 3), [], options);
  assert.ok(multi.issues.some(i => i.code === 'unverified-head-to-head'));
  assert.ok(multi.rows.every(r => r.rank === 1 && r.sharedRank));
  const pair = deriveStandings(competition, entries.slice(0, 2), [], options);
  assert.ok(pair.issues.some(i => i.code === 'unresolved-ranking'));
  assert.ok(pair.rows.every(r => r.rank === 1 && r.sharedRank));
});
test('unknown/non-final scores, missing official scores, malformed fixtures and duplicates never become results', () => {
  const matches = [
    {...fixture('unverified', 'a', 'b', 2, 0), status: 'unknown' as const},
    {...fixture('missing', 'a', 'b', 2, 0), score: undefined, events: []},
    fixture('self', 'a', 'a', 2, 0), fixture('outside', 'a', 'other', 2, 0),
    fixture('duplicate', 'a', 'b', 2, 0), fixture('duplicate', 'a', 'b', 9, 0),
  ];
  const result = deriveStandings(competition, entries.slice(0, 2), matches, options);
  assert.ok(result.rows.every(r => r.played === 0 && r.points === 0));
  for (const code of ['unverified-result', 'missing-official-score', 'invalid-fixture', 'duplicate-document']) assert.ok(result.issues.some(i => i.code === code));
});
test('invalid adjustments are reported, not silently applied or used twice', () => {
  const adjustment = {_type: 'pointsAdjustment' as const, _key: 'same', team: ref('a'), points: -3, reason: 'Ruling'};
  const result = deriveStandings({...competition, pointsAdjustments: [adjustment, {...adjustment}, {...adjustment, _key: 'unknown', team: ref('absent')}, {...adjustment, _key: 'zero', points: 0}]}, entries.slice(0, 2), [], options);
  assert.ok(result.rows.every(r => r.adjustmentPoints === 0));
  assert.ok(result.issues.some(i => i.code === 'invalid-points-adjustment'));
});
test('official comparison reports field, identity and rank uncertainty without changing facts or inventing adjustments', () => {
  const derived = deriveStandings(competition, entries.slice(0, 2), [fixture('one', 'a', 'b', 1, 0)], options);
  const before = structuredClone(derived);
  const official = derived.rows.map(row => ({...row}));
  assert.equal(compareStandings(derived, official).matches, true);
  official[0].points = -6;
  const compared = compareStandings(derived, official);
  assert.equal(compared.matches, false); assert.ok(compared.differences.some(d => d.field === 'points' && d.official === -6));
  assert.deepEqual(derived, before);
  assert.ok(compareStandings(derived, [official[0], official[0]]).differences.some(d => d.field === 'team'));
  const tied = deriveStandings(competition, entries.slice(0, 2), [], {rules: nationalFutsalMen});
  assert.ok(compareStandings(tied, official).differences.some(d => d.reason.includes('unresolved')));
});
test('unsafe integer totals fail visibly and custom scoring must be explicit', () => {
  assert.throws(() => deriveStandings(competition, entries.slice(0, 2), [fixture('one', 'a', 'b', Number.MAX_SAFE_INTEGER, 0), fixture('two', 'a', 'b', 1, 0)], options), RangeError);
  const custom = deriveStandings(competition, entries.slice(0, 2), [fixture('one', 'a', 'b', 1, 0)], {rules: {win: 2, draw: 1, loss: 0, ranking: 'points-only'}});
  assert.equal(custom.rows[0].points, 2);
});
test('partial live-edited adjustment objects are diagnosed rather than crashing a read', () => {
  const partial = structuredClone(competition); Object.assign(partial, {pointsAdjustments: [null, {_key: 'partial'}]});
  const result = deriveStandings(partial, entries.slice(0, 2), [], options);
  assert.ok(result.issues.some(i => i.code === 'invalid-points-adjustment'));
  assert.ok(result.rows.every(row => row.adjustmentPoints === 0));
});
