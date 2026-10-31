import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reconcile} from './reconcile.ts';
import type {Document} from './model.ts';
const now = '2026-10-31T12:00:00Z';
const local: Document = {_id: 'goal', _type: 'goal', _rev: 'revision', assist: {_type: 'assist', status: 'credited', sourceName: 'Confirmed assister'}, import: {_type: 'importMetadata', origin: 'imported', overrides: ['assist']}};
test('unknown source assists do not conflict with or erase credited or known-none manual assists', () => {
  for (const assist of [local.assist, {_type: 'assist', status: 'none'}]) {
    const current = {...local, assist};
    const result = reconcile({...local, assist: {_type: 'assist', status: 'unknown'}}, current, ['assist'], now, 'detail');
    assert.deepEqual(result.review, []);
    assert.deepEqual(result.document.assist, assist);
  }
});
test('known differing source assist decisions still flag a protected correction', () => {
  for (const assist of [{_type: 'assist', status: 'none'}, {_type: 'assist', status: 'credited', sourceName: 'Different assister'}]) {
    const result = reconcile({...local, assist}, local, ['assist'], now, 'detail');
    assert.deepEqual(result.review.map(item => item.field), ['assist']);
    assert.deepEqual(result.document.assist, local.assist);
  }
});
test('matching known source assists produce no conflict', () => {
  assert.deepEqual(reconcile(local, local, ['assist'], now, 'detail').review, []);
});
