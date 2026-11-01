import {test} from 'vitest';
import assert from 'node:assert/strict';
import {schemaTypes, sportsDocuments} from './index.ts';

test('only the five canonical documents exist, and each writes directly to published records', () => {
  assert.deepEqual(sportsDocuments.map(type => type.name), ['season', 'competition', 'team', 'player', 'match']);
  for (const type of sportsDocuments) assert.equal(type.liveEdit, true);
});
test('technical metadata is hidden and read-only on documents and embedded facts', () => {
  for (const type of schemaTypes.filter(type => ['season', 'competition', 'team', 'player', 'match', 'participant', 'goal', 'yellowCard', 'redCard'].includes(type.name))) {
    for (const name of ['external', 'import']) {
      const field = type.fields.find(field => field.name === name);
      assert.equal(field && 'hidden' in field && field.hidden, true, `${type.name}.${name}`);
      assert.equal(field && 'readOnly' in field && field.readOnly, true, `${type.name}.${name}`);
    }
  }
});
test('match owns embedded facts and derives its season through competition', () => {
  const match = sportsDocuments.find(type => type.name === 'match')!;
  assert.equal(match.fields.some(field => field.name === 'season'), false);
  assert.equal(match.fields.find(field => field.name === 'events')?.type, 'array');
  assert.equal(match.fields.find(field => field.name === 'participants')?.type, 'array');
  assert.deepEqual(schemaTypes.filter(type => ['goal', 'yellowCard', 'redCard'].includes(type.name)).map(type => [type.name, type.fields.some(field => field.name === 'assist')]), [['goal', true], ['yellowCard', false], ['redCard', false]]);
});

test('editorial documents publish explicitly while sports remain live-edit', () => {
  for (const name of ['homepage', 'newsArticle']) {
    const document = schemaTypes.find(type => type.name === name)!;
    assert.ok(document);
    assert.notEqual('liveEdit' in document && document.liveEdit, true);
  }
});
