import {test} from 'vitest';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {load} from 'cheerio/slim';
import {parseStandings, normalizeStandings} from './standings.ts';
import {DbuMarkupError} from './parse.ts';
const html = readFileSync(new URL('./fixtures/standing-508399.html', import.meta.url), 'utf8');
const url = 'https://www.dbu.dk/resultater/pulje/508399/stilling';
test('real official table preserves scoped IDs, signed points and goal columns once per team', () => {
  const normalized = normalizeStandings(parseStandings(html, url));
  assert.deepEqual(normalized.diagnostics, []); assert.equal(normalized.value.rows.length, 10);
  const hj = normalized.value.rows.find(row => row.team.id === '351397')!;
  assert.deepEqual(hj.team, {source: 'dbu', id: '351397', scope: '508399'});
  assert.equal(hj.played, 4); assert.equal(hj.won, 4); assert.equal(hj.goalsFor, 32); assert.equal(hj.goalsAgainst, 8); assert.equal(hj.points, -6);
  const club = normalized.value.rows.find(row => row.team.id === '404636')!;
  assert.equal(club.points, 2); assert.equal(club.goalsFor, 10); assert.equal(club.goalsAgainst, 15);
});
test('standing layout, source scope and duplicate identities fail closed', () => {
  for (const edit of [
    ($: ReturnType<typeof load>) => {$('thead th').eq(2).text('Unknown');},
    ($: ReturnType<typeof load>) => {$('tbody tr').first().attr('data-teamid', '434282_999');},
    ($: ReturnType<typeof load>) => {$('tbody').append($('tbody tr').first().clone());},
    ($: ReturnType<typeof load>) => {$('tbody').empty();},
  ]) {const $ = load(html); edit($); assert.throws(() => parseStandings($.html(), url), DbuMarkupError);}
  assert.throws(() => parseStandings(html, url.replace('508399', '999')), DbuMarkupError);
});
test('missing/malformed totals remain unknown and inconsistent W/D/L produce diagnostics', () => {
  const raw = parseStandings(html, url); raw.rows[0].points = ''; raw.rows[0].won = '99';
  const normalized = normalizeStandings(raw);
  assert.equal(normalized.value.rows[0].points, undefined);
  assert.ok(normalized.diagnostics.some(i => i.code === 'invalid-standing-value'));
  assert.ok(normalized.diagnostics.some(i => i.code === 'inconsistent-standing-counts'));
});
