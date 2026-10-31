import {test} from 'vitest';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {load} from 'cheerio/slim';
import {parseStandings} from './standings.ts';
import {DbuMarkupError, parseMatch, parseSchedule} from './parse.ts';
import {normalizeMatch, normalizeSchedule} from './normalize.ts';
import type {RawEvent} from './model.ts';

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
const matchUrl = (id: string, pool = '508399') => `https://dbu.dk/resultater/kamp/${id}_${pool}/kampinfo`;
const scheduleUrl = 'https://dbu.dk/resultater/pulje/508399/kampprogramFuld';
const match = (id = '602659', pool = '508399') => parseMatch(fixture(`match-${id}.html`), matchUrl(id, pool));
const mutate = (id: string, update: (document: ReturnType<typeof load>) => void) => {
  const $ = load(fixture(`match-${id}.html`));
  update($);
  return $.html();
};

test('saved public HTML excerpts match their provenance checksums', () => {
  const manifest: {file: string; sha256: string; url: string}[] = JSON.parse(fixture('manifest.json'));
  assert.equal(manifest.length, 11);
  for (const entry of manifest) {
    const bytes = readFileSync(new URL(`./fixtures/${entry.file}`, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256, entry.file);
    if (entry.file.startsWith('match-')) assert.ok(parseMatch(bytes.toString('utf8'), entry.url));
    else if (entry.file.startsWith('standing-')) assert.ok(parseStandings(bytes.toString('utf8'), entry.url));
    else assert.ok(parseSchedule(bytes.toString('utf8'), entry.url));
  }
});
test('recorded goal assists keep the scorer separate from the secondary player in match 602673', () => {
  const raw = match('602673');
  const goal = raw.events?.find(event => event.minuteText === "'27");
  assert.equal(goal?.sourceName, 'Bertram Rosendal Jensen');
  const {value, diagnostics} = normalizeMatch(raw);
  assert.deepEqual(diagnostics, []);
  assert.deepEqual(value.events?.filter(event => event.type === 'goal' && event.assist.status === 'credited').map(event => [event.minute, event.sourceName, event.type === 'goal' ? event.assist : undefined]), [
    [27, 'Bertram Rosendal Jensen', {status: 'credited', sourceName: 'Christian Søndergaard'}],
    [19, 'Casper Flyvholm', {status: 'credited', sourceName: 'Tim Vigilsen Wiese'}],
    [1, 'Mads Falck', {status: 'credited', sourceName: 'Tim Vigilsen Wiese'}],
  ]);
});
test('ambiguous, blank or misplaced assister markup fails instead of inventing a name', () => {
  for (const update of [
    ($: ReturnType<typeof load>) => { const assister = $('.sr--match--live-score--event--player2').first(); assister.after(assister.clone()); },
    ($: ReturnType<typeof load>) => { $('.sr--match--live-score--event--player2').first().text(' '); },
    ($: ReturnType<typeof load>) => { const assister = $('.sr--match--live-score--event--player2').first(); assister.parent().parent().append(assister); },
  ]) assert.throws(() => parseMatch(mutate('602673', update), matchUrl('602673')), DbuMarkupError);
  const raw = match('602673');
  const goal = raw.events!.find(event => event.assistSourceName)!;
  goal.icons = ['/Content/Gfx/SR/livescorev2/icon_sr_yellow.svg'];
  const result = normalizeMatch(raw);
  assert.equal(result.value.events?.find(event => event.sourceIndex === goal.sourceIndex)?.type, 'unsupported');
  assert.ok(result.diagnostics.some(item => item.code === 'unsupported-event'));
});
test('full competition discovery parses 90 fixtures once, ignoring only known ad rows and mobile duplicates', () => {
  const raw = parseSchedule(fixture('competition-508399.html'), scheduleUrl);
  assert.equal(raw.name, 'Futsal Liga - Herrer');
  assert.equal(raw.poolId, '508399');
  assert.equal(raw.matches.length, 90);
  assert.equal(new Set(raw.matches.map(row => row.matchNumber)).size, 90);
  const played = raw.matches.find(row => row.matchNumber === '602659');
  assert.deepEqual(played?.away, {entryId: '404636', poolId: '508399', name: 'Aalborg Futsal Klub'});
  assert.equal(played?.homeScoreText, '4');
  assert.equal(played?.venue, 'Hundested Hallen');
  const upcoming = raw.matches.find(row => row.matchNumber === '602675');
  assert.equal(upcoming?.sourceUrl, matchUrl('602675')); // URL comes from onclick, not a missing anchor
  assert.equal(upcoming?.homeScoreText, '');
  const normalized = normalizeSchedule(raw);
  assert.equal(normalized.value.matches.find(row => row.external.id === '602678')?.status, 'postponed');
  assert.equal(normalized.value.matches.find(row => row.external.id === '602675')?.score, undefined);
  assert.equal(normalized.value.matches.find(row => row.external.id === '602659')?.status, 'unknown');
  assert.deepEqual(normalized.diagnostics, []);
});
test('completed match keeps official result, venue and source identities without inventing Sanity references', () => {
  const raw = match();
  const {value, diagnostics} = normalizeMatch(raw);
  assert.equal(raw.matchNumber, '602659');
  assert.equal(value.status, 'completed');
  assert.deepEqual(value.score, {home: 4, away: 3});
  assert.deepEqual(value.kickoff, {precision: 'time', date: '2026-09-27', localTime: '13:00'});
  assert.deepEqual(value.awayTeam.external, {source: 'dbu', id: '404636', scope: '508399'});
  assert.deepEqual(diagnostics, []);
  assert.equal(value.events?.filter(event => event.type === 'goal').length, 7);
  assert.equal(value.events?.filter(event => event.type === 'yellowCard').length, 3);
  assert.equal(value.events?.filter(event => event.type === 'matchMarker').length, 4);
  assert.equal(JSON.stringify(value).includes('"_ref"'), false);
  assert.equal(JSON.stringify(value).includes('"_key"'), false);
});
test('home/away lineups decode source names and numbers, exclude staff, and preserve unresolved substitute appearances', () => {
  const {value} = normalizeMatch(match());
  assert.equal(value.participants?.length, 24);
  const source = value.participants?.find(player => player.sourceName === 'Rasmus Wittrup Leth');
  assert.equal(source?.shirtNumber, 7);
  assert.equal(source?.appearance, 'played');
  assert.equal(source?.team.id, '404636');
  assert.ok(value.participants?.some(player => player.sourceName === 'Nicolai Jægergaard'));
  assert.ok(value.participants?.filter(player => player.lineupStatus === 'substitute').every(player => player.appearance === 'unknown'));
  assert.equal(value.participants?.some(player => player.sourceName === 'Christoffer Haagh'), false);
});
test('second Aalborg sample verifies 2–6 and 26 lineup entries with unknown assists', () => {
  const {value} = normalizeMatch(match('602665'));
  assert.deepEqual(value.score, {home: 2, away: 6});
  assert.equal(value.participants?.length, 26);
  const goals = value.events?.filter(event => event.type === 'goal');
  assert.equal(goals?.length, 8);
  assert.ok(goals?.every(event => event.assist.status === 'unknown'));
});
test('observed red-card icon maps only to a red-card fact', () => {
  const event = normalizeMatch(match('602658')).value.events?.find(event => event.type === 'redCard');
  assert.equal(event?.sourceName, 'Maicon Tauan Dias Alves');
  assert.equal(event?.minute, 36);
  assert.equal(event?.team?.id, '351397');
});
test('verified penalty goal is distinguishable; no six/ten-metre or assist claim is invented', () => {
  const {value, diagnostics} = normalizeMatch(match('671446', '476135'));
  const penalty = value.events?.find(event => event.type === 'goal' && event.method === 'penalty');
  assert.equal(penalty?.sourceName, 'Sebastian Østergård Kargo Larsen');
  assert.equal(penalty?.minute, 22);
  assert.deepEqual(diagnostics, []);
});
test('own goals and combined yellow/red remain distinct unsupported observations, with source details intact', () => {
  for (const [id, pool, expected] of [['602662', '508399', 3], ['662399', '476135', 1]] as const) {
    const {value, diagnostics} = normalizeMatch(match(id, pool));
    const unknown = value.events?.filter(event => event.type === 'unsupported');
    assert.equal(unknown?.length, expected);
    assert.equal(diagnostics.filter(item => item.code === 'unsupported-event').length, expected);
    assert.ok(unknown?.every(event => event.raw.icons.length === 1 && event.sourceName && event.team));
  }
});
test('upcoming and postponed fixtures preserve absent lineups and missing scores rather than zeroes', () => {
  const upcoming = normalizeMatch(match('602675')).value;
  assert.equal(upcoming.score, undefined);
  assert.equal(upcoming.participants, undefined);
  assert.deepEqual(upcoming.events, []);
  assert.equal(upcoming.status, 'unknown');
  const postponed = normalizeMatch(match('602678')).value;
  assert.equal(postponed.status, 'postponed');
  assert.equal(postponed.score, undefined);
  assert.deepEqual(postponed.kickoff, {precision: 'time', date: '2026-10-30', localTime: '19:30'});
});
test('absent timeline remains unavailable, while valid known zero scores/minutes/numbers remain zero', () => {
  const raw = parseMatch(mutate('602659', $ => $(`.sr--match--live-score--eventlist`).remove()), matchUrl('602659'));
  assert.equal(normalizeMatch(raw).value.events, undefined);
  const normalized = normalizeMatch({...raw, homeScoreText: '0', awayScoreText: '0', resultText: '0 - 0', participants: [{side: 'home', sourceName: 'Source player', shirtNumberText: '0', lineupStatus: 'starter'}], events: [{sourceIndex: 0, side: 'home', sourceName: 'Source player', minuteText: "'0", icons: ['/Content/Gfx/SR/livescorev2/icon_sr_goal.svg'], text: ''}]});
  assert.deepEqual(normalized.value.score, {home: 0, away: 0});
  assert.equal(normalized.value.participants?.[0].shirtNumber, 0);
  assert.equal(normalized.value.events?.[0].minute, 0);
});
test('unknown status/result/icon and missing or malformed fields produce diagnostics without invented facts', () => {
  const raw = match();
  const result = normalizeMatch({...raw, statusText: 'Unverified status', resultText: 'HHT', homeScoreText: '', awayScoreText: '', dateText: '31-02-2026', timeText: '25:00', events: [{sourceIndex: 0, side: 'away', sourceName: 'Source name', minuteText: "'45+2", icons: ['/Content/Gfx/SR/livescorev2/unseen.svg'], text: ''}]});
  assert.equal(result.value.status, 'unknown');
  assert.equal(result.value.score, undefined);
  assert.deepEqual(result.value.kickoff, {precision: 'unknown'});
  assert.equal(result.value.events?.[0].type, 'unsupported');
  assert.equal(result.value.events?.[0].minute, undefined);
  assert.deepEqual(new Set(result.diagnostics.map(item => item.code)), new Set(['unknown-status', 'unknown-result', 'invalid-date', 'invalid-minute', 'unsupported-event']));
  assert.equal(normalizeMatch({...raw, homeScoreText: '1', awayScoreText: ''}).value.score, undefined);
  assert.equal(normalizeMatch({...raw, timeText: '25:00'}).value.kickoff.precision, 'date');
  assert.equal(normalizeMatch({...raw, timeText: ''}).value.kickoff.precision, 'date');
});
test('repeated source names and identical events are not merged or assigned identity by name/order', () => {
  const raw = match();
  const event: RawEvent = {sourceIndex: 0, side: 'home', sourceName: 'Same name', minuteText: '', icons: ['/Content/Gfx/SR/livescorev2/icon_sr_goal.svg'], text: ''};
  const {value} = normalizeMatch({...raw, participants: [1, 2].map(() => ({side: 'home', sourceName: 'Same name', shirtNumberText: '', lineupStatus: 'substitute'})), events: [event, {...event, sourceIndex: 1}]});
  assert.equal(value.events?.length, 2);
  assert.equal(value.participants?.length, 2);
  assert.ok(value.participants?.every(player => player.appearance === 'unknown'));
  assert.ok(value.events?.every(event => event.minute === undefined));
});
test('wrong pages, mismatched identity and structural drift fail closed instead of returning empty data', () => {
  assert.throws(() => parseSchedule('<html>Maintenance</html>', scheduleUrl), DbuMarkupError);
  assert.throws(() => parseMatch(fixture('match-602659.html'), matchUrl('602665')), DbuMarkupError);
  assert.throws(() => parseSchedule(fixture('competition-508399.html'), scheduleUrl.replace('508399', '999')), DbuMarkupError);
  assert.throws(() => parseMatch(fixture('match-602659.html'), 'https://example.com/resultater/kamp/602659_508399/kampinfo'), DbuMarkupError);
  assert.throws(() => parseSchedule(fixture('competition-508399.html').replace('<th>Kampnr</th>', '<th>New layout</th>'), scheduleUrl), DbuMarkupError);
  assert.throws(() => parseMatch(mutate('602659', $ => $('.shirt-number').first().removeClass('shirt-number')), matchUrl('602659')), DbuMarkupError);
  assert.throws(() => parseMatch(mutate('602659', $ => $('.sr--match--live-score--event').attr('class', 'changed')), matchUrl('602659')), DbuMarkupError);
});
test('multiple icons and unknown sides never silently become ordinary goals', () => {
  const raw = match();
  const known: RawEvent = {sourceIndex: 0, side: 'home', sourceName: 'Name', minuteText: "'1", icons: ['/Content/Gfx/SR/livescorev2/icon_sr_goal.svg'], text: ''};
  for (const event of [{...known, side: 'unknown' as const}, {...known, icons: [...known.icons, '/unknown.svg']}]) {
    const result = normalizeMatch({...raw, events: [event]});
    assert.equal(result.value.events?.[0].type, 'unsupported');
    assert.equal(result.diagnostics[0].code, 'unsupported-event');
  }
});
