import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseMatch, parseSchedule} from '@afk/dbu/parse';
import {normalizeMatch, normalizeSchedule} from '@afk/dbu/normalize';
import {record} from '@afk/sports/validation';
import {sportsReview} from '@afk/sports/review';
import {editedFields, releaseField} from '../../apps/studio/review/editor-state.ts';
import {planSchedule} from './plan.ts';
import {planMatchDetails} from './details.ts';
import {fingerprint} from './reconcile.ts';
import type {Document, Plan} from './model.ts';
const now = '2026-10-25T15:00:00Z';
const fixture = (name: string) => readFileSync(new URL(`../dbu/fixtures/${name}.html`, import.meta.url), 'utf8');
const schedule = normalizeSchedule(parseSchedule(fixture('competition-508399'), 'https://dbu.dk/resultater/pulje/508399/kampprogramFuld')).value;
const detail = normalizeMatch(parseMatch(fixture('match-602659'), 'https://dbu.dk/resultater/kamp/602659_508399/kampinfo')).value;
function apply(documents: Document[], plan: Plan) {
  for (const operation of plan.operations) {
    if (operation.kind === 'create') documents.push({...structuredClone(operation.document), _rev: 'test-r'});
    else Object.assign(documents.find(d => d._id === operation.id)!, structuredClone(operation.set));
  }
}
function setup() {
  const documents: Document[] = [{_id: 's', _type: 'season', name: 'Season', startDate: '2026-07-01', endDate: '2027-06-30'}];
  apply(documents, planSchedule(schedule, documents, {seasonId: 's', timeZone: 'Europe/Copenhagen', now}));
  apply(documents, planMatchDetails(detail, documents, now));
  const match = documents.find(d => d._id === 'dbu-match-602659')!;
  return {documents, match};
}
function acceptRelease(value: Record<string, unknown>, field: string) {
  for (const [path, next] of Object.entries(releaseField(value, field, fingerprint(value[field])))) record(value.import)[path.split('.')[1]] = next;
}
test('Studio correction protects a field immediately; releasing before any intervening sync permits DBU again', () => {
  const {documents, match} = setup();
  const goal = (match.events as unknown[]).map(record).find(e => e._type === 'goal')!;
  const original = goal.minute;
  const fields = editedFields('goal', goal, [{type: 'set', path: ['minute']}]);
  goal.minute = 99; record(goal.import).overrides = fields;
  // The editor releases it immediately, before the importer has accepted a new baseline.
  acceptRelease(goal, 'minute');
  apply(documents, planMatchDetails(detail, documents, now));
  const after = (match.events as unknown[]).map(record).find(e => e._key === goal._key)!;
  assert.equal(after.minute, original);
  assert.equal((record(after.import).overrides as string[]).includes('minute'), false);
});
test('Studio source-name correction and manual assist survive detail synchronization', () => {
  const {documents, match} = setup();
  const goal = (match.events as unknown[]).map(record).find(e => e._type === 'goal')!;
  goal.sourceName = 'Corrected person'; goal.player = {_type: 'reference', _ref: 'confirmed'};
  goal.assist = {_type: 'assist', status: 'credited', sourceName: 'Confirmed assister'};
  record(goal.import).overrides = editedFields('goal', goal, [{type: 'set', path: ['sourceName']}, {type: 'set', path: ['player']}, {type: 'set', path: ['assist', 'status']}]);
  apply(documents, planMatchDetails(detail, documents, now));
  const kept = (match.events as unknown[]).map(record).find(e => e._key === goal._key)!;
  assert.equal(kept.sourceName, 'Corrected person');
  assert.deepEqual(kept.assist, goal.assist);
  assert.deepEqual(kept.player, goal.player);
});
test('a manually credited assist enriches an unknown DBU assist without creating an import discrepancy', () => {
  const {documents, match} = setup();
  const goal = (match.events as unknown[]).map(record).find(e => e._type === 'goal')!;
  goal.assist = {_type: 'assist', status: 'credited', sourceName: 'Confirmed assister'};
  record(goal.import).overrides = editedFields('goal', goal, [{type: 'set', path: ['assist', 'status']}]);
  const plan = planMatchDetails(detail, documents, now);
  assert.deepEqual(plan.review.filter(item => item.field === `events[${goal._key}].assist`), []);
  apply(documents, plan);
  assert.deepEqual((match.events as unknown[]).map(record).find(e => e._key === goal._key)!.assist, goal.assist);
  assert.ok(!sportsReview(documents).some(item => item.category === 'import' && item.reason === 'Protected manual value differs from source.'));
});
test('Studio release of a local deletion allows source restoration on the very next detail sync', () => {
  const {documents, match} = setup();
  const count = (match.events as unknown[]).length;
  (match.events as unknown[]).shift();
  record(match.import).overrides = ['events'];
  acceptRelease(match, 'events');
  apply(documents, planMatchDetails(detail, documents, now));
  assert.equal((match.events as unknown[]).length, count);
});
test('schedule corrections can be released before sync; club selection survives later imports', () => {
  const {documents, match} = setup();
  const old = match.venue;
  match.venue = 'Corrected venue'; record(match.import).overrides = ['venue'];
  acceptRelease(match, 'venue');
  const club = documents.find(d => d._id === record(match.homeTeam)._ref)!;
  club.isClubTeam = true;
  apply(documents, planSchedule(schedule, documents, {seasonId: 's', timeZone: 'Europe/Copenhagen', now}));
  assert.equal(match.venue, old); assert.equal(club.isClubTeam, true);
  assert.ok(sportsReview(documents).some(item => item.documentId === match._id && item.club));
});
