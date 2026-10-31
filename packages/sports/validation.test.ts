import {test} from 'vitest';
import assert from 'node:assert/strict';
import {appearanceFromEvidence, validateAdjustment, validateAssist, validateEvent, validateExternal, validateImport, validateKickoff, validateMatch, validateName, validateParticipant, validateScore, validateSeason, validateTeamIdentity} from './validation.ts';
import type {Match, Participant, Goal, Reference} from './model.ts';

const ref = (id: string): Reference => ({_type: 'reference', _ref: id});
const participant: Participant = {_type: 'participant', _key: 'p1', team: ref('home'), player: ref('a'), lineupStatus: 'substitute', appearance: 'unknown'};
const goal: Goal = {_type: 'goal', _key: 'g1', team: ref('home'), player: ref('a'), assist: {_type: 'assist', status: 'unknown'}};
const match: Match = {_type: 'match', competition: ref('league'), homeTeam: ref('home'), awayTeam: ref('away'), status: 'completed', score: {_type: 'score', home: 2, away: 6}, participants: [participant], events: [goal]};
const invalid = (result: true | string) => assert.equal(typeof result, 'string');

test('names and season chronology', () => {
  invalid(validateName('  '));
  assert.equal(validateName('2026–27'), true);
  invalid(validateSeason({startDate: '2027-01-01', endDate: '2026-01-01'}));
  assert.equal(validateSeason({startDate: '2026-01-01', endDate: '2026-01-01'}), true);
});
test('official score is optional, complete, integral, and independent of events', () => {
  assert.equal(validateScore(undefined), true);
  assert.equal(validateScore({home: 0, away: 0}), true);
  for (const score of [{home: 2}, {home: -1, away: 0}, {home: 0.5, away: 0}]) invalid(validateScore(score));
  assert.equal(validateMatch(match), true); // 2–6 despite just one known goal
  assert.equal(validateMatch({...match, score: undefined, events: []}), true);
});
test('assist unknown, none, resolved and unresolved credit stay distinct', () => {
  assert.equal(validateAssist({status: 'unknown'}), true);
  assert.equal(validateAssist({status: 'none'}), true);
  assert.equal(validateAssist({status: 'credited', sourceName: 'Unresolved name'}), true);
  assert.equal(validateAssist({status: 'credited', player: ref('b')}), true);
  invalid(validateAssist({status: 'credited'}));
  invalid(validateAssist({status: 'none', player: ref('b')}));
  invalid(validateAssist({status: 'unknown', sourceName: 'Name'}));
  invalid(validateEvent({...goal, assist: {status: 'credited', player: ref('a')}}));
});
test('typed events preserve unknown minutes and reject unrelated fields', () => {
  assert.equal(validateEvent({...goal, minute: 0}), true);
  invalid(validateEvent({...goal, minute: -1}));
  invalid(validateEvent({...goal, minute: 1.5}));
  invalid(validateEvent({...goal, _type: 'yellowCard'}));
  assert.equal(validateEvent({_type: 'redCard', team: ref('away'), sourceName: 'Unresolved name'}), true);
  invalid(validateEvent({...goal, _type: 'penaltyGoal'}));
});
test('unresolved participants preserve source identity without assuming name equality', () => {
  const unresolved = {...participant, player: undefined, sourceName: 'Same name'};
  assert.equal(validateParticipant(unresolved), true);
  assert.equal(validateMatch({...match, participants: [unresolved, {...unresolved, _key: 'p2'}]}), true);
  invalid(validateParticipant({...unresolved, sourceName: ' '}));
  invalid(validateParticipant({...participant, shirtNumber: -1}));
  assert.equal(validateParticipant({...participant, shirtNumber: 0}), true);
});
test('match references, membership and duplicate confirmed participation', () => {
  invalid(validateMatch({...match, homeTeam: match.awayTeam}));
  invalid(validateMatch({...match, competition: undefined}));
  invalid(validateMatch({...match, participants: [participant, {...participant, _key: 'p2'}]}));
  invalid(validateMatch({...match, participants: [{...participant, team: ref('other')}]}));
  invalid(validateMatch({...match, events: [{...goal, team: ref('other')}]}));
});
test('substitute listing alone is unknown; explicit negative is preserved without evidence', () => {
  assert.equal(appearanceFromEvidence({...match, events: []}, participant), 'unknown');
  assert.equal(appearanceFromEvidence({...match, events: []}, {...participant, appearance: 'didNotPlay'}), 'didNotPlay');
  assert.equal(appearanceFromEvidence(match, participant), 'played');
  assert.equal(appearanceFromEvidence({...match, events: []}, {...participant, lineupStatus: 'starter'}), 'played');
  assert.equal(appearanceFromEvidence({...match, status: 'scheduled', events: []}, {...participant, lineupStatus: 'starter'}), 'unknown');
});
test('appearance cannot deny starter, scorer, card or assister evidence', () => {
  const absent = {...participant, appearance: 'didNotPlay' as const};
  invalid(validateMatch({...match, participants: [absent]}));
  invalid(validateMatch({...match, events: [], participants: [{...absent, lineupStatus: 'starter'}]}));
  invalid(validateMatch({...match, participants: [absent], events: [{...goal, player: ref('b'), assist: {_type: 'assist', status: 'credited', player: ref('a')}}]}));
  assert.equal(appearanceFromEvidence({...match, events: [{...goal, player: ref('b'), assist: {player: ref('a')}}]}, participant), 'played');
});
test('points rulings allow either sign and repeated teams; require reason and integer', () => {
  const adjustment = {team: ref('home'), points: -3, reason: 'Disciplinary ruling'};
  assert.equal(validateAdjustment(adjustment), true);
  assert.equal(validateAdjustment({...adjustment, points: 3}), true);
  for (const points of [0, 1.5, NaN]) invalid(validateAdjustment({...adjustment, points}));
  invalid(validateAdjustment({...adjustment, reason: ' '}));
});
test('kickoff precision does not invent midnight or keep contradictory dates', () => {
  assert.equal(validateKickoff(undefined), true);
  assert.equal(validateKickoff({precision: 'unknown'}), true);
  assert.equal(validateKickoff({precision: 'date', date: '2026-10-20'}), true);
  assert.equal(validateKickoff({precision: 'time', dateTime: '2026-10-20T18:00:00Z'}), true);
  invalid(validateKickoff({precision: 'date'}));
  invalid(validateKickoff({precision: 'unknown', dateTime: '2026-10-20T00:00:00Z'}));
  invalid(validateKickoff({precision: 'time', date: '2026-10-20', dateTime: '2026-10-20T18:00:00Z'}));
});
test('metadata preserves field-level paths and distinct manual/imported origins', () => {
  assert.equal(validateExternal({source: 'dbu', id: '602659'}), true);
  invalid(validateExternal({source: 'dbu'}));
  assert.equal(validateImport({origin: 'manual'}), true);
  assert.equal(validateImport({origin: 'imported', overrides: ['player', 'assist.player']}), true);
  invalid(validateImport({origin: 'imported', overrides: ['player', 'player']}));
  invalid(validateImport({origin: 'imported', overrides: [' ']}));
});

test('DBU team-entry identity is scoped to a competition, not a global team ID', () => {
  invalid(validateTeamIdentity({source: 'dbu', id: '404636'}));
  assert.equal(validateTeamIdentity({source: 'dbu', id: '404636', scope: '508399'}), true);
});
test('embedded identities are persistent keys, with no event fingerprint deduplication', () => {
  invalid(validateMatch({...match, participants: [{...participant, _key: ''}]}));
  invalid(validateMatch({...match, events: [goal, goal]}));
  assert.equal(validateMatch({...match, events: [goal, {...goal, _key: 'g2'}]}), true);
});
test('date and timestamp integrity checks reject malformed source values', () => {
  invalid(validateSeason({startDate: '2026-02-30', endDate: '2026-12-31'}));
  invalid(validateKickoff({precision: 'date', date: 'not a date'}));
  invalid(validateKickoff({precision: 'time', dateTime: '2026-10-20'}));
  invalid(validateKickoff({precision: 'time', dateTime: '2026-10-20T18:00:00'}));
  invalid(validateKickoff({precision: 'time', dateTime: '2026-02-30T18:00:00Z'}));
});

test('schedule baselines validate stable field keys and unique fingerprints', () => {
  const baseline = {_type: 'scheduleFieldBaseline', _key: 'venue', path: 'venue', fingerprint: 'a'.repeat(64)};
  assert.equal(validateImport({origin: 'imported', scheduleBaseline: [baseline]}), true);
  invalid(validateImport({origin: 'imported', scheduleBaseline: [baseline, baseline]}));
  invalid(validateImport({origin: 'imported', scheduleBaseline: [{...baseline, fingerprint: 'invalid'}]}));
  invalid(validateImport({origin: 'imported', scheduleBaseline: [{...baseline, _key: 'other'}]}));
});
