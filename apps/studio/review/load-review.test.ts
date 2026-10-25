import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadReviewDocuments} from './load-review.ts';
test('review reads subsequent pages instead of silently hiding later matches', async () => {
  let calls = 0;
  const result = await loadReviewDocuments(async after => {
    calls++;
    if (!after) return Array.from({length: 500}, (_, i) => ({_id: `match-${String(i).padStart(4, '0')}`, _type: 'match'}));
    assert.equal(after, 'match-0499');
    return [{_id: 'match-0500', _type: 'match'}];
  });
  assert.equal(result.length, 501); assert.equal(calls, 2);
});
test('failed or malformed review reads cannot return a partial or apparently empty success', async () => {
  for (const getPage of [async () => {throw new Error('Offline');}, async () => ({}), async () => [{_id: 'x'}], async () => [{_id: 'x', _type: 'match'}, {_id: 'x', _type: 'match'}]]) await assert.rejects(loadReviewDocuments(getPage));
});
test('review explicitly refuses a snapshot beyond its initial limit', async () => {
  let page = 0;
  await assert.rejects(loadReviewDocuments(async () => {
    const prefix = String(page++).padStart(3, '0');
    return Array.from({length: 500}, (_, i) => ({_id: `${prefix}-${String(i).padStart(3, '0')}`, _type: 'match'}));
  }), /exceeds/);
});
