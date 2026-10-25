import {load} from 'cheerio/slim';
import {DbuMarkupError} from './parse.ts';
import type {Diagnostic, ExternalKey, Normalized} from './model.ts';
export interface RawStandingRow {
  entryId: string; poolId: string; name: string;
  position: string; played: string; won: string; drawn: string; lost: string;
  goalsFor: string; goalsAgainst: string; points: string;
}
export interface RawStandings {poolId: string; sourceUrl: string; rows: RawStandingRow[]}
export interface StandingSnapshotRow {
  team: ExternalKey; name: string; position?: number; played?: number; won?: number; drawn?: number; lost?: number;
  goalsFor?: number; goalsAgainst?: number; points?: number;
}
export interface StandingsSnapshot {external: ExternalKey; sourceUrl: string; rows: StandingSnapshotRow[]}
/** Only the inspected standing table; identities must agree with the source URL. */
export function parseStandings(html: string, sourceUrl: string): RawStandings {
  const url = new URL(sourceUrl), poolId = url.pathname.match(/^\/resultater\/pulje\/(\d+)\/stilling\/?$/i)?.[1];
  if (url.username || url.password || url.protocol !== 'https:' || !['dbu.dk', 'www.dbu.dk'].includes(url.hostname) || !poolId) throw new DbuMarkupError('Expected a public DBU standings URL.');
  const $ = load(html), table = $('table.sr--pool-position--table');
  const text = (selection: ReturnType<typeof $>) => selection.text().replace(/\s+/gu, ' ').trim();
  if (table.length !== 1 || table.find('thead th').toArray().map(el => text($(el))).join('|') !== '||K|V|U|T|Score|P|') throw new DbuMarkupError('Standing table layout changed.');
  if (!$('.sr--tabs a').toArray().some(el => $(el).attr('href') === `/resultater/pulje/${poolId}/stilling`)) throw new DbuMarkupError('Standing pool identity disagrees with the source URL.');
  const rows: RawStandingRow[] = table.find('tbody > tr').toArray().map(el => {
    const row = $(el), cells = row.children('td');
    const identity = row.attr('data-teamid')?.match(/^(\d+)_(\d+)$/);
    const link = cells.eq(1).attr('onclick')?.match(/\/resultater\/hold\/(\d+)_(\d+)\/kampprogram/);
    if (cells.length !== 9 || !identity || !link || identity[1] !== link[1] || identity[2] !== poolId || link[2] !== poolId) throw new DbuMarkupError('Standing Team identity or columns changed.');
    const name = text(cells.eq(1).find('.teamname-logo span'));
    if (!name || cells.eq(6).find('.home-score').length !== 1 || cells.eq(6).find('.away-score').length !== 1) throw new DbuMarkupError('Standing name or goal columns missing.');
    return {entryId: identity[1], poolId, name, position: text(cells.eq(0)), played: text(cells.eq(2)), won: text(cells.eq(3)), drawn: text(cells.eq(4)), lost: text(cells.eq(5)), goalsFor: text(cells.eq(6).find('.home-score')), goalsAgainst: text(cells.eq(6).find('.away-score')), points: text(cells.eq(7))};
  });
  if (!rows.length || new Set(rows.map(row => row.entryId)).size !== rows.length) throw new DbuMarkupError('Standing is empty or has duplicate Team identities.');
  return {poolId, sourceUrl, rows};
}
export function normalizeStandings(raw: RawStandings): Normalized<StandingsSnapshot> {
  const diagnostics: Diagnostic[] = [];
  const rows = raw.rows.map((row, index) => {
    const value: StandingSnapshotRow = {team: {source: 'dbu', id: row.entryId, scope: row.poolId}, name: row.name};
    for (const field of ['position', 'played', 'won', 'drawn', 'lost', 'goalsFor', 'goalsAgainst', 'points'] as const) {
      const number = Number(row[field]);
      if (!/^-?\d+$/.test(row[field]) || !Number.isSafeInteger(number) || (field !== 'points' && number < (field === 'position' ? 1 : 0))) diagnostics.push({code: 'invalid-standing-value', path: `rows[${index}].${field}`, message: 'Standing value remains unknown.', sourceValue: row[field]});
      else value[field] = number;
    }
    if (value.played !== undefined && value.won !== undefined && value.drawn !== undefined && value.lost !== undefined && value.played !== value.won + value.drawn + value.lost) diagnostics.push({code: 'inconsistent-standing-counts', path: `rows[${index}]`, message: 'Played does not equal wins plus draws plus losses.'});
    return value;
  });
  return {value: {external: {source: 'dbu', id: raw.poolId}, sourceUrl: raw.sourceUrl, rows}, diagnostics};
}
