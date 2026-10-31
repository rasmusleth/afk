import {test} from 'vitest';
import assert from 'node:assert/strict';
import type {Goal, Participant, Reference} from './model.ts';
import {derivePlayerStatistics} from './statistics.ts';
import {selectSeasonMatches, type MatchRecord} from './derivation.ts';
const ref = (id: string): Reference => ({_type: 'reference', _ref: id});
const goal = (key: string, player?: string): Goal => ({_type: 'goal', _key: key, team: ref('a'), sourceName: 'Source scorer', ...(player ? {player: ref(player)} : {}), assist: {_type: 'assist', status: 'unknown'}});
const person = (key: string, player?: string): Participant => ({_type: 'participant', _key: key, team: ref('a'), sourceName: 'Listed player', ...(player ? {player: ref(player)} : {}), lineupStatus: 'substitute', appearance: 'unknown'});
const match = (id = 'm', changes: Partial<MatchRecord> = {}): MatchRecord => ({_id: id, _type: 'match', competition: ref('c'), homeTeam: ref('a'), awayTeam: ref('b'), status: 'completed', score: {_type: 'score', home: 2, away: 0}, participants: [], events: [], ...changes});
test('confirmed starters, repeated goals, penalty goals, assists and cards count once per fact and appearance', () => {
  const p = {...person('p', 'p1'), lineupStatus: 'starter' as const};
  const first = {...goal('g1', 'p1'), assist: {_type: 'assist' as const, status: 'credited' as const, player: ref('p2')}};
  const second = {...goal('g2', 'p1'), method: 'penalty' as const};
  const result = derivePlayerStatistics([match('m', {participants: [p, person('p2', 'p2')], events: [first, second, {_type: 'yellowCard', _key: 'y', team: ref('a'), player: ref('p1')}, {_type: 'redCard', _key: 'r', team: ref('a'), player: ref('p2')}]})]);
  assert.deepEqual(result.players, [
    {playerId: 'p1', knownAppearances: 1, unknownAppearances: 0, knownGoals: 2, knownAssists: 0, knownYellowCards: 1, knownRedCards: 0},
    {playerId: 'p2', knownAppearances: 1, unknownAppearances: 0, knownGoals: 0, knownAssists: 1, knownYellowCards: 0, knownRedCards: 1},
  ]);
});
test('listed substitutes stay unknown; name matches do not supply player identity or appearance evidence', () => {
  const source = goal('g'); source.sourceName = 'Listed player';
  const result = derivePlayerStatistics([match('m', {participants: [person('p', 'p1'), person('unresolved')], events: [source]})]);
  assert.equal(result.players[0].knownAppearances, 0); assert.equal(result.players[0].unknownAppearances, 1);
  assert.equal(result.players[0].knownGoals, 0);
  assert.equal(result.coverage.find(c => c.teamId === 'a')!.unresolvedParticipants, 1);
  assert.equal(result.coverage.find(c => c.teamId === 'a')!.unresolvedScorers, 1);
});
test('known did-not-play is not unknown, and confirmed event evidence works even without a lineup', () => {
  const result = derivePlayerStatistics([match('m', {participants: [{...person('p', 'p0'), appearance: 'didNotPlay'}], events: [goal('g', 'p1')]})]);
  assert.equal(result.players.find(p => p.playerId === 'p0')!.unknownAppearances, 0);
  assert.equal(result.players.find(p => p.playerId === 'p0')!.knownAppearances, 0);
  assert.equal(result.players.find(p => p.playerId === 'p1')!.knownAppearances, 1);
});
test('unknown, none and unresolved credited assists remain distinct', () => {
  const goals = [goal('unknown', 'p'), {...goal('none', 'p'), assist: {_type: 'assist' as const, status: 'none' as const}}, {...goal('credited', 'p'), assist: {_type: 'assist' as const, status: 'credited' as const, sourceName: 'Unresolved assister'}}];
  const result = derivePlayerStatistics([match('m', {events: goals})]);
  const coverage = result.coverage.find(c => c.teamId === 'a')!;
  assert.equal(coverage.unknownAssists, 1); assert.equal(coverage.unresolvedAssisters, 1);
  assert.equal(result.players[0].knownAssists, 0);
});
test('missing sections stay unknown; official scores do not create missing player goals or assists', () => {
  const missing = derivePlayerStatistics([match('m', {events: undefined, participants: undefined})]);
  assert.deepEqual(missing.players, []);
  assert.equal(missing.coverage[0].events, 'missing'); assert.equal(missing.coverage[0].participants, 'missing');
  assert.equal(missing.coverage[0].goalCoverageDifference, 2);
  const partial = derivePlayerStatistics([match('m', {events: [goal('g', 'p')]})]);
  assert.equal(partial.players[0].knownGoals, 1); assert.equal(partial.players[0].knownAssists, 0);
  assert.equal(partial.coverage[0].goalCoverageDifference, 1);
  assert.ok(partial.issues.some(i => i.code === 'goal-coverage-difference'));
});
test('non-completed scores and clock dates cannot produce finalized statistics', () => {
  const result = derivePlayerStatistics([match('m', {status: 'unknown', events: [goal('g', 'p')], kickoff: {_type: 'kickoff', precision: 'date', date: '2000-01-01'}})]);
  assert.deepEqual(result.players, []); assert.deepEqual(result.excludedMatchIds, ['m']);
  assert.ok(result.issues.some(i => i.code === 'unverified-result'));
});
test('invalid/duplicate keyed items cannot provide goal or appearance evidence; distinct repeated keys remain valid facts', () => {
  const invalid = goal('invalid', 'p'); Object.assign(invalid, {team: ref('outside')});
  const result = derivePlayerStatistics([match('m', {participants: [person('p', 'p')], events: [goal('duplicate', 'p'), goal('duplicate', 'p'), invalid]})]);
  assert.equal(result.players[0].knownGoals, 0); assert.equal(result.players[0].knownAppearances, 0);
  assert.ok(result.issues.some(i => i.code === 'invalid-match-item'));
  assert.equal(derivePlayerStatistics([match('m', {events: [goal('one', 'p'), goal('two', 'p')]})]).players[0].knownGoals, 2);
});
test('duplicate match IDs cannot double count appearances or select an arbitrary conflicting result', () => {
  const fixture = match('m', {events: [goal('g', 'p')]});
  const result = derivePlayerStatistics([fixture, structuredClone(fixture)]);
  assert.deepEqual(result.players, []); assert.ok(result.issues.some(i => i.code === 'duplicate-document'));
});
test('team filtering, manual/imported facts and immutable inputs preserve confirmed identity semantics', () => {
  const fixture = match('m', {events: [{...goal('g', 'p'), import: {_type: 'importMetadata', origin: 'manual'}}, {...goal('away', 'other'), team: ref('b')}]});
  const before = structuredClone(fixture), result = derivePlayerStatistics([fixture], {teamId: 'a'});
  assert.deepEqual(fixture, before); assert.equal(result.players.length, 1); assert.equal(result.players[0].playerId, 'p');
  assert.equal(result.coverage.length, 1);
});
test('season selection follows Competition references across entries and never kickoff dates or names', () => {
  const fixtures = [match('one'), match('two', {competition: ref('c2')}), match('other', {competition: ref('other')}), match('missing', {competition: ref('absent')})];
  const selected = selectSeasonMatches('s', [{_id: 'c', season: ref('s')}, {_id: 'c2', season: ref('s')}, {_id: 'other', season: ref('old')}], fixtures);
  assert.deepEqual(selected.matches.map(m => m._id), ['one', 'two']);
  assert.ok(selected.issues.some(i => i.code === 'unknown-competition'));
  const totals = derivePlayerStatistics(selected.matches.map(m => ({...m, events: [goal('g', 'same-confirmed-player')]})));
  assert.equal(totals.players[0].knownAppearances, 2);
});
test('completed-match participation/events remain usable even when the official score is unknown', () => {
  const result = derivePlayerStatistics([match('m', {score: undefined, events: [goal('g', 'p')]})]);
  assert.equal(result.players[0].knownGoals, 1);
  assert.equal(result.players[0].knownAppearances, 1);
  assert.equal(result.coverage[0].officialGoals, undefined);
  assert.equal(result.coverage[0].goalCoverageDifference, undefined);
});
test('draft/release records and references never become confirmed published player identities', () => {
  const result = derivePlayerStatistics([match('drafts.match', {events: [goal('g', 'p')]}), match('published', {events: [goal('g', 'drafts.person'), goal('other', 'versions.release.person')]})]);
  assert.deepEqual(result.players, []);
  assert.equal(result.coverage[0].unresolvedScorers, 2);
  assert.ok(result.issues.some(i => i.code === 'invalid-document-id'));
});
