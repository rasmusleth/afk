import {test} from 'vitest';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {canonicalValue} from '@afk/sports/ownership';
import {clearsAssister, editedFields, releaseField} from './editor-state.ts';
const imported = {_type: 'goal', minute: 12, assist: {status: 'none'}, import: {origin: 'imported', overrides: ['minute', 'assist.player']}};
const hash = (value: unknown) => createHash('sha256').update(canonicalValue(value)).digest('hex');
test('editing imported fields records their owning field, including nested reference/assist edits and unsets', () => {
  assert.deepEqual(editedFields('goal', imported, [{type: 'set', path: ['player', '_ref']}, {type: 'set', path: ['assist', 'status']}, {type: 'unset', path: ['minute']}]), ['player', 'assist', 'minute']);
});
test('manual items, metadata, remote/internal patches and initialization do not create protections', () => {
  assert.deepEqual(editedFields('goal', {import: {origin: 'manual'}}, [{type: 'set', path: ['minute']}]), []);
  assert.deepEqual(editedFields('goal', imported, [{type: 'set', path: ['import', 'overrides']}, {type: 'set', path: ['minute'], origin: 'remote'}, {type: 'set', path: ['minute'], origin: 'internal'}, {type: 'setIfMissing', path: ['assist']}]), []);
});
test('embedded edits do not lock entire match arrays; explicit removals do', () => {
  assert.deepEqual(editedFields('match', imported, [{type: 'set', path: ['events', {_key: 'goal'}, 'minute']}]), []);
  assert.deepEqual(editedFields('match', imported, [{type: 'unset', path: ['events', {_key: 'goal'}]}]), ['events']);
  assert.deepEqual(editedFields('match', imported, [{type: 'insert', path: ['events', -1]}]), []);
});
test('releasing an override accepts current local data without changing sporting facts or unrelated protections', () => {
  const before = structuredClone(imported);
  const changes = releaseField(imported, 'minute', hash(12));
  assert.deepEqual(changes['import.overrides'], ['assist.player']);
  assert.deepEqual(changes['import.detailBaseline'], [{_type: 'scheduleFieldBaseline', _key: 'minute', path: 'minute', fingerprint: hash(12)}]);
  assert.deepEqual(imported, before);
  assert.equal(changes.minute, undefined);
});
test('releasing nested correction accepts the complete field and preserves other baseline entries', () => {
  const value = {...imported, import: {...imported.import, detailBaseline: [{_type: 'scheduleFieldBaseline', _key: 'minute', path: 'minute', fingerprint: hash(12)}]}};
  const changes = releaseField(value, 'assist.player', hash(value.assist));
  assert.deepEqual(changes['import.overrides'], ['minute']);
  assert.equal((changes['import.detailBaseline'] as unknown[]).length, 2);
});
test('releasing an array removal accepts existing keys so the next sync can supply source observations', () => {
  const value = {_type: 'match', events: [{_key: 'kept'}], import: {origin: 'imported', overrides: ['events'], detailKeys: ['events:removed', 'events:kept', 'participants:person']}};
  const changes = releaseField(value, 'events', hash(value.events));
  assert.deepEqual(changes['import.detailKeys'], ['participants:person', 'events:kept']);
});
test('browser and Node digest APIs produce the same canonical field fingerprints, including unsets', async () => {
  for (const value of [undefined, {status: 'credited', sourceName: 'Æ ø'}, {b: 2, a: [1, null]}, '']) {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalValue(value)));
    assert.equal(Buffer.from(digest).toString('hex'), hash(value));
  }
});

test('assist decisions clear stale credited identity only when explicitly selecting none or unknown', () => {
  assert.equal(clearsAssister([{type: 'set', path: ['status'], value: 'none'}]), true);
  assert.equal(clearsAssister([{type: 'set', path: ['status'], value: 'unknown'}]), true);
  assert.equal(clearsAssister([{type: 'set', path: ['status'], value: 'credited'}]), false);
  assert.equal(clearsAssister([{type: 'set', path: ['player'], value: {_ref: 'p'}}]), false);
});
