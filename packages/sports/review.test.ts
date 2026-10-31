import {test} from 'vitest';
import assert from 'node:assert/strict';
import {dismissImportNotice, sportsReview, reviewPath, type ReviewDocument} from './review.ts';
import {record} from './validation.ts';
const ref = (id: string) => ({_type: 'reference', _ref: id});
const docs = (): ReviewDocument[] => [
  {_id: 'club', _type: 'team', name: 'Aalborg', isClubTeam: true},
  {_id: 'opponent', _type: 'team', name: 'Opponent'},
  {_id: 'match', _type: 'match', homeTeam: ref('club'), awayTeam: ref('opponent'), status: 'completed', score: {home: 1, away: 0},
    participants: [{_key: 'sub', _type: 'participant', team: ref('club'), sourceName: 'Listed substitute', lineupStatus: 'substitute', appearance: 'unknown'}],
    events: [{_key: 'goal', _type: 'goal', team: ref('club'), sourceName: 'Scorer', minute: 8, assist: {status: 'unknown'}}],
    import: {needsReview: true, reviewReason: 'participants[sub]: Player identity unresolved; source name preserved.\nevents[goal].assist: Assist remains unknown.\nevents: Known goal coverage differs from official source score; no events invented.'}},
];
test('review priorities and stable keyed paths target the actual affected player, assist and appearance fields', () => {
  const issues = sportsReview(docs());
  assert.deepEqual(issues.map(i => i.category).sort(), ['appearance', 'assist', 'identity', 'identity']);
  assert.ok(issues.every(item => item.club));
  const goal = issues.find(item => item.category === 'assist')!;
  assert.equal(reviewPath(goal.path), 'events[_key=="goal"].assist');
  assert.equal(issues[0].category, 'identity');
});
test('resolving facts removes current issues despite historical importer uncertainty markers', () => {
  const documents = docs(), match = documents[2];
  match.participants = [{_key: 'sub', _type: 'participant', team: ref('club'), sourceName: 'Listed substitute', player: ref('p1'), lineupStatus: 'substitute', appearance: 'didNotPlay'}];
  match.events = [{_key: 'goal', _type: 'goal', team: ref('club'), sourceName: 'Scorer', player: ref('p2'), assist: {status: 'none'}}];
  assert.deepEqual(sportsReview(documents), []);
});
test('club scope uses explicit Team identity, not names; opponents retain identity issues at lower priority', () => {
  const documents = docs();
  documents[0].isClubTeam = false;
  const issues = sportsReview(documents);
  assert.ok(issues.every(item => !item.club && item.category === 'identity'));
});
test('unknown vs known-zero coverage and upcoming substitutes remain distinct', () => {
  const documents = docs(), match = documents[2];
  match.status = 'unknown';
  assert.ok(!sportsReview(documents).some(item => ['score', 'appearance', 'assist'].includes(item.category)));
  match.status = 'completed'; match.events = undefined;
  assert.ok(!sportsReview(documents).some(item => item.category === 'score'));
  match.events = []; match.score = {home: 0, away: 0};
  assert.ok(!sportsReview(documents).some(item => item.category === 'score'));
  match.score = {home: 1, away: 0};
  assert.equal(sportsReview(documents).filter(item => item.category === 'score').length, 1);
});
test('import conflicts link by key; stale source indices link to arrays, never to an unrelated player', () => {
  const documents = docs();
  documents[2].import = {needsReview: true, reviewReason: 'events[goal].minute: Protected manual value differs from source.\nevents[12].minute: Invalid source minute.\nstatus: Unknown source state.'};
  const issues = sportsReview(documents).filter(item => item.category === 'import');
  assert.equal(issues.length, 3);
  assert.ok(issues.some(item => reviewPath(item.path) === 'events[_key=="goal"].minute'));
  assert.ok(issues.some(item => reviewPath(item.path) === 'events'));
  assert.ok(issues.some(item => reviewPath(item.path) === 'status'));
});
test('embedded notices and resolved assister references are reflected without modifying records', () => {
  const documents = docs();
  documents[2].events = [{_key: 'goal', _type: 'goal', team: ref('club'), sourceName: 'Scorer', player: ref('p'), assist: {status: 'credited', sourceName: 'Assister'}, import: {needsReview: true, reviewReason: 'minute: Source changed.'}}];
  const before = structuredClone(documents), issues = sportsReview(documents);
  assert.deepEqual(documents, before);
  assert.ok(issues.some(item => reviewPath(item.path) === 'events[_key=="goal"].assist.player'));
  assert.ok(issues.some(item => reviewPath(item.path) === 'events[_key=="goal"].minute'));
});
test('non-match sports import conflicts appear; drafts and releases do not duplicate review', () => {
  const documents: ReviewDocument[] = [{_id: 'competition', _type: 'competition', name: 'League', import: {needsReview: true, reviewReason: 'name: Protected manual value differs from source.'}}];
  documents.push({...documents[0], _id: 'drafts.competition'}, {...documents[0], _id: 'versions.release.competition'});
  assert.equal(sportsReview(documents).length, 1);
  assert.equal(sportsReview(documents)[0].documentType, 'competition');
});
test('keyed edit paths escape source-derived text safely', () => {
  assert.equal(reviewPath(['events', {_key: 'a"b'}, 'player']), 'events[_key=="a\\"b"].player');
});

test('dismissing a checked import notice clears both copies and preserves other notices and sporting facts', () => {
  const documents = docs(), match = documents[2];
  match.import = {needsReview: true, reviewReason: 'events[goal].assist: Protected manual value differs from source.\nvenue: A different conflict.'};
  const goal = record(Array.isArray(match.events) ? match.events[0] : undefined);
  goal.assist = {status: 'credited', player: ref('assister')};
  goal.import = {origin: 'imported', overrides: ['assist'], needsReview: true, reviewReason: 'assist: Protected manual value differs from source.'};
  const item = sportsReview(documents).find(item => item.category === 'import' && item.reason === 'Protected manual value differs from source.')!;
  const before = structuredClone(documents);
  const changes = dismissImportNotice(match, item);
  assert.deepEqual(changes, {
    'import.needsReview': true,
    'import.reviewReason': 'venue: A different conflict.',
    'events[_key=="goal"].import.needsReview': false,
    'events[_key=="goal"].import.reviewReason': '',
  });
  assert.deepEqual(documents, before);
  Object.assign(record(match.import), {needsReview: changes['import.needsReview'], reviewReason: changes['import.reviewReason']});
  Object.assign(record(goal.import), {needsReview: changes['events[_key=="goal"].import.needsReview'], reviewReason: changes['events[_key=="goal"].import.reviewReason']});
  assert.deepEqual(sportsReview(documents).filter(item => item.category === 'import').map(item => item.reason), ['A different conflict.']);
  assert.ok(sportsReview(documents).some(item => item.category === 'appearance'));
  assert.deepEqual(goal.assist, {status: 'credited', player: ref('assister')});
  assert.deepEqual(record(goal.import).overrides, ['assist']);
});

test('only stored import notices on the same document can be dismissed', () => {
  const documents = docs(), item = sportsReview(documents)[0];
  assert.throws(() => dismissImportNotice(documents[2], item));
  assert.throws(() => dismissImportNotice(documents[0], {...item, category: 'import'}));
});

test('confirmed player-linked event evidence resolves an unknown substitute appearance in the queue', () => {
  const documents = docs();
  documents[2].participants = [{_key: 'sub', _type: 'participant', team: ref('club'), player: ref('p'), lineupStatus: 'substitute', appearance: 'unknown'}];
  documents[2].events = [{_key: 'goal', _type: 'goal', team: ref('club'), player: ref('p'), assist: {status: 'unknown'}}];
  assert.ok(!sportsReview(documents).some(item => item.category === 'appearance'));
});
