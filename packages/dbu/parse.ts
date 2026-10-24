import {load, type CheerioAPI} from 'cheerio/slim';
import type {RawEvent, RawFixture, RawMatch, RawParticipant, RawSchedule, RawTeam} from './model.ts';

type Selection = ReturnType<CheerioAPI>;
const text = (selection: Selection) => selection.text().replace(/\s+/gu, ' ').trim();
const live = 'sr--match--live-score';
export class DbuMarkupError extends Error {
  constructor(message: string) { super(message); this.name = 'DbuMarkupError'; }
}
function requireValue(value: string | undefined, label: string): string {
  if (!value) throw new DbuMarkupError(`Missing or unrecognized ${label}.`);
  return value;
}
function pageIdentity(sourceUrl: string, kind: 'kamp' | 'pulje') {
  const url = new URL(sourceUrl);
  if (!['dbu.dk', 'www.dbu.dk'].includes(url.hostname) || url.protocol !== 'https:') throw new DbuMarkupError('Expected a public HTTPS DBU source URL.');
  const match = url.pathname.match(kind === 'kamp'
    ? /^\/resultater\/kamp\/(\d+)_(\d+)\/kampinfo\/?$/i
    : /^\/resultater\/pulje\/(\d+)\/kampprogramFuld\/?$/i);
  if (!match) throw new DbuMarkupError(`Unrecognized ${kind} source URL.`);
  return {id: match[1], poolId: kind === 'kamp' ? match[2] : match[1]};
}
function team(selection: Selection, poolId: string): RawTeam {
  if (selection.length !== 1) throw new DbuMarkupError('Expected exactly one team identity.');
  const location = selection.attr('href') ?? selection.attr('onclick') ?? '';
  const ids = location.match(/\/resultater\/hold\/(\d+)_(\d+)(?=['"/\s?#]|$)/i);
  if (!ids || ids[2] !== poolId) throw new DbuMarkupError('Missing or conflicting scoped team identity.');
  return {entryId: ids[1], poolId: ids[2], name: requireValue(text(selection), 'team name')};
}
function labelValue($: CheerioAPI, label: string): Selection {
  return $('.sr--match--info .col-pad').filter((_, element) => text($(element).children('label')) === label).first();
}

/** Throws on layout/identity drift rather than returning a plausible empty schedule. */
export function parseSchedule(html: string, sourceUrl: string): RawSchedule {
  const {poolId} = pageIdentity(sourceUrl, 'pulje');
  const $ = load(html);
  const table = $('.sr--pool--match-program .match-program--table');
  if (table.length !== 1) throw new DbuMarkupError('Expected one full competition schedule table.');
  const headers = table.find('thead th').toArray().map(element => text($(element)));
  if (headers.join('|') !== '|Kampnr|Dato|Tid|Hjemme|Ude|Spillested|Resultat') throw new DbuMarkupError('Schedule column layout changed.');
  const poolLinks = $('.sr--tabs a').toArray().map(element => $(element).attr('href') ?? '');
  if (!poolLinks.some(href => href === `/resultater/pulje/${poolId}/kampprogramFuld`)) throw new DbuMarkupError('Schedule pool identity does not match source URL.');
  const matches: RawFixture[] = [];
  table.find('tbody > tr').each((_, element) => {
    const row = $(element);
    // Observed advertising rows are not fixtures. Unknown non-ad rows fail closed.
    if (row.hasClass('adtr')) return;
    const cells = row.children('td.hide-on-mobile');
    if (cells.length !== 8) throw new DbuMarkupError('Schedule fixture column layout changed.');
    const link = row.attr('onclick')?.match(/MatchProgramMatchClick\('([^']+)'\)/)?.[1];
    const matchUrl = new URL(requireValue(link, 'fixture link'), sourceUrl).href;
    const identity = pageIdentity(matchUrl, 'kamp');
    if (identity.poolId !== poolId || text(cells.eq(1)) !== identity.id) throw new DbuMarkupError('Fixture URL, number, or pool disagree.');
    const home = team(cells.eq(4).find('a[href*="/resultater/hold/"]'), poolId);
    const away = team(cells.eq(5).find('a[href*="/resultater/hold/"]'), poolId);
    if (home.entryId === away.entryId) throw new DbuMarkupError('Home and away team entries must differ.');
    matches.push({
      matchNumber: identity.id, poolId, sourceUrl: matchUrl,
      home, away,
      dateText: text(cells.eq(2)), timeText: text(cells.eq(3)),
      statusText: text(cells.eq(7).find('.sr--match-program--match-state')),
      resultText: text(cells.eq(7)),
      homeScoreText: text(cells.eq(7).find('.home-score')),
      awayScoreText: text(cells.eq(7).find('.away-score')),
      venue: text(cells.eq(6)) || undefined,
    });
  });
  if (!matches.length) throw new DbuMarkupError('No fixtures found; an empty schedule has not been verified.');
  if (new Set(matches.map(match => match.matchNumber)).size !== matches.length) throw new DbuMarkupError('Duplicate fixture numbers require investigation.');
  return {poolId, sourceUrl, name: requireValue(text($('.sr--header h2').first()), 'competition name'), matches};
}
function parseParticipants($: CheerioAPI, home: RawTeam, away: RawTeam): RawParticipant[] | undefined {
  const cards = $('.sr--match--team-cards');
  if (!cards.length) return undefined;
  const participants: RawParticipant[] = [];
  for (const side of ['home', 'away'] as const) {
    const card = cards.find(`.sr--match--team-card_${side}`);
    if (card.length !== 1) throw new DbuMarkupError(`Lineup ${side} section changed.`);
    const tables = card.find('table');
    if (!tables.length) throw new DbuMarkupError(`Lineup ${side} tables missing.`);
    tables.each((_, element) => {
      const table = $(element);
      const heading = text(table.find('thead').first());
      if (heading === 'Officials') return;
      const expectedTeam = side === 'home' ? home : away;
      if (heading !== 'Reserver' && heading !== expectedTeam.name) throw new DbuMarkupError(`Unrecognized lineup table: ${heading}.`);
      table.find('tr').each((_, element) => {
        const cells = $(element).children('td');
        if (!cells.length) return;
        if (cells.length !== 2 || cells.filter('.shirt-number').length !== 1) throw new DbuMarkupError('Player row layout changed.');
        participants.push({side, sourceName: requireValue(text(cells.not('.shirt-number')), 'lineup source name'), shirtNumberText: text(cells.filter('.shirt-number')), lineupStatus: heading === 'Reserver' ? 'substitute' : 'starter'});
      });
    });
  }
  return participants;
}
function parseEvents($: CheerioAPI): RawEvent[] | undefined {
  const list = $(`.${live}--eventlist`);
  if (!list.length) return undefined;
  const rows = list.find(`.${live}--event`);
  if (!rows.length && text(list)) throw new DbuMarkupError('Timeline content exists but no event rows were recognized.');
  return rows.toArray().map((element, sourceIndex) => {
    const row = $(element);
    const sides = (['home', 'away', 'neutral'] as const).filter(side => row.find(`.${live}--event--${side}`).length > 0);
    return {
      sourceIndex, side: sides.length === 1 ? sides[0] : 'unknown',
      minuteText: text(row.find(`.${live}--event--minute`)),
      sourceName: text(row.find(`.${live}--event--player`)) || undefined,
      icons: row.find(`.${live}--event--icon img`).toArray().map(icon => $(icon).attr('src') ?? ''),
      text: text(row.find(`.${live}--event--text`)),
    };
  });
}
export function parseMatch(html: string, sourceUrl: string): RawMatch {
  const {id, poolId} = pageIdentity(sourceUrl, 'kamp');
  const $ = load(html);
  const info = $('.sr--match--info');
  const result = $(`.${live}--result`);
  if (info.length !== 1 || result.length !== 1) throw new DbuMarkupError('Expected match info and one scoreboard.');
  if (text(labelValue($, 'Kampnummer').children('span')) !== id) throw new DbuMarkupError('Match number does not match source URL.');
  const poolLink = labelValue($, 'Pulje').find('a').attr('href');
  if (poolLink !== `/resultater/pulje/${poolId}`) throw new DbuMarkupError('Match competition does not match source URL.');
  const home = team(result.find(`.${live}--result--home .teamname`), poolId);
  const away = team(result.find(`.${live}--result--away .teamname`), poolId);
  if (home.entryId === away.entryId) throw new DbuMarkupError('Home and away team entries must differ.');
  return {
    matchNumber: id, poolId, sourceUrl, home, away,
    competitionName: requireValue(text(labelValue($, 'Række').children('span')), 'competition name'),
    dateText: text(info.find('.date-time .date')), timeText: text(info.find('.date-time .time')),
    statusText: text(labelValue($, 'Status').children('span')) || text($(`.${live}--status`)),
    resultText: text(result.find('.sr-match-score')),
    homeScoreText: text(result.find('.sr-match-score > .home')),
    awayScoreText: text(result.find('.sr-match-score > .away')),
    venue: text(labelValue($, 'Spillested').find('a').first()) || undefined,
    participants: parseParticipants($, home, away), events: parseEvents($),
  };
}
