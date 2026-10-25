import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync, spawnSync} from 'node:child_process';
import {parseSchedule, parseMatch} from '@afk/dbu/parse';
import {normalizeSchedule, normalizeMatch} from '@afk/dbu/normalize';
import {parseStandings, normalizeStandings} from '@afk/dbu/standings';
import {record} from '@afk/sports/validation';
import {planSchedule} from './plan.ts';
import {planMatchDetails} from './details.ts';
import {buildSportsReport} from './report.ts';
import {parseReportOptions, decodeNoShows} from './report-options.ts';
import {fetchStanding, standingUrl} from './fetch.ts';
import {type Document, type Plan, SyncError} from './model.ts';
const now = '2026-10-25T17:00:00Z';
const fixture = (name: string) => readFileSync(new URL(`../dbu/fixtures/${name}.html`, import.meta.url), 'utf8');
const schedule = normalizeSchedule(parseSchedule(fixture('competition-508399'), 'https://dbu.dk/resultater/pulje/508399/kampprogramFuld')).value;
const official = normalizeStandings(parseStandings(fixture('standing-508399'), standingUrl('508399'))).value;
function apply(documents: Document[], plan: Plan) {
  for (const operation of plan.operations) {
    if (operation.kind === 'create') documents.push({...structuredClone(operation.document), _rev: 'r'});
    else Object.assign(documents.find(d => d._id === operation.id)!, structuredClone(operation.set));
  }
}
function documents() {
  const docs: Document[] = [{_id: 's', _type: 'season', name: 'Season', startDate: '2026-07-01', endDate: '2027-06-30'}];
  apply(docs, planSchedule(schedule, docs, {seasonId: 's', timeZone: 'Europe/Copenhagen', now}));
  const detail = normalizeMatch(parseMatch(fixture('match-602659'), 'https://dbu.dk/resultater/kamp/602659_508399/kampinfo')).value;
  apply(docs, planMatchDetails(detail, docs, now));
  return docs;
}
const options = {competitionId: 'dbu-competition-508399', rules: 'national-futsal-men' as const};
test('full fixture report exposes unverified results, unresolved names and actual official differences without any writes', () => {
  const docs = documents(), before = structuredClone(docs);
  const report = buildSportsReport(docs, {...options, standing: official});
  assert.deepEqual(docs, before);
  assert.deepEqual(report.standings.includedMatchIds, ['dbu-match-602659']);
  assert.ok(report.standings.issues.some(i => i.code === 'unverified-result'));
  assert.deepEqual(report.competitionPlayers.players, []); // names alone never make Player rows
  assert.ok(report.competitionPlayers.coverage.some(item => item.unresolvedScorers > 0));
  assert.equal(report.comparison!.matches, false);
  assert.equal(report.comparison!.mappingIssues.length, 0);
  assert.ok(report.comparison!.differences.some(d => d.teamId === 'dbu-team-508399-351397' && d.field === 'points' && d.official === -6));
  assert.ok(report.standings.rows.every(row => row.adjustmentPoints === 0));
});
test('confirmed Player references aggregate competition and season statistics while public profiles stay outside report data', () => {
  const docs = documents(), match = docs.find(d => d._id === 'dbu-match-602659')!;
  const goal = (match.events as unknown[]).map(record).find(e => e._type === 'goal')!;
  goal.player = {_type: 'reference', _ref: 'confirmed'};
  docs.push({_id: 'confirmed', _type: 'player', name: 'Confirmed Player', profile: 'PROFILE_SHOULD_NOT_BE_EMITTED'});
  const report = buildSportsReport(docs, options);
  assert.equal(report.competitionPlayers.players[0].knownGoals, 1);
  assert.equal(report.season.playerStatistics!.players[0].knownGoals, 1);
  assert.equal(report.playerNames.confirmed, 'Confirmed Player');
  assert.ok(!JSON.stringify(report).includes('PROFILE_SHOULD_NOT_BE_EMITTED'));
});
test('official Team identity is resolved by external scope rather than internal ID or name', () => {
  const docs = documents(), target = docs.find(d => d._id === 'dbu-team-508399-404636')!;
  target._id = 'arbitrary-club-team';
  for (const match of docs.filter(d => d._type === 'match')) for (const field of ['homeTeam', 'awayTeam']) if (record(match[field])._ref === 'dbu-team-508399-404636') match[field] = {_type: 'reference', _ref: target._id};
  const report = buildSportsReport(docs, {...options, standing: official});
  assert.ok(report.comparison!.differences.some(d => d.teamId === 'arbitrary-club-team'));
  assert.equal(report.comparison!.mappingIssues.length, 0);
  target.external = {_type: 'externalIdentity', source: 'dbu', id: '404636', scope: 'other-pool'};
  assert.ok(buildSportsReport(docs, {...options, standing: official}).comparison!.mappingIssues.length > 0);
});
test('unknown/duplicate external identities and wrong competition snapshots cannot yield a clean comparison', () => {
  const docs = documents(); docs.push({...docs.find(d => d._id === 'dbu-team-508399-404636')!, _id: 'duplicate-team'});
  assert.ok(buildSportsReport(docs, {...options, standing: official}).comparison!.mappingIssues.length > 0);
  assert.throws(() => buildSportsReport(docs, {...options, standing: {...official, external: {source: 'dbu', id: 'other'}}}), SyncError);
});
test('read-only report CLI outputs JSON from saved inputs and refuses apply or unsafe credentials/targets', () => {
  const directory = mkdtempSync(join(tmpdir(), 'afk-statistics-'));
  try {
    const snapshot = join(directory, 'documents.json'), contents = JSON.stringify(documents()); writeFileSync(snapshot, contents);
    const args = [new URL('./report-cli.ts', import.meta.url).pathname, '--competition', options.competitionId, '--rules', 'national-futsal-men', '--existing', snapshot, '--standing-html', new URL('../dbu/fixtures/standing-508399.html', import.meta.url).pathname];
    const output = JSON.parse(execFileSync(process.execPath, args, {encoding: 'utf8'}));
    assert.equal(output.mode, 'read-only'); assert.equal(output.comparisonInput, 'saved-html'); assert.equal(output.standings.rows.length, 10);
    assert.equal(readFileSync(snapshot, 'utf8'), contents);
    const bad = spawnSync(process.execPath, [...args, '--apply'], {encoding: 'utf8'});
    assert.equal(bad.status, 1); assert.ok(bad.stderr.includes('Unknown'));
  } finally {rmSync(directory, {recursive: true});}
});
test('explicit rule/no-show assertions are required; offline reports never contact a live target', () => {
  const base = ['--competition', 'c', '--rules', 'national-futsal-men', '--existing', 'snapshot.json'];
  assert.equal(parseReportOptions(base, '/tmp').existing, '/tmp/snapshot.json');
  for (const args of [base.filter(a => a !== '--rules' && a !== 'national-futsal-men'), [...base, '--project', 'project'], [...base, '--compare-dbu'], [...base, '--no-shows', 'counts.json', '--assume-no-shows-zero'], ['--competition', 'c', '--rules', 'national-futsal-men', '--project', 'test', '--dataset', 'production'], [...base, '--token', 'SYNTHETIC_NOT_A_TOKEN']]) assert.throws(() => parseReportOptions(args, '/tmp'), SyncError);
  assert.deepEqual(decodeNoShows({team: 0, other: 2}), {team: 0, other: 2});
  for (const value of [[], null, {team: -1}, {team: '0'}]) assert.throws(() => decodeNoShows(value), SyncError);
});
test('standing retrieval reuses bounded public fetching with no Sanity authentication', async () => {
  let calls = 0;
  const html = await fetchStanding('508399', async (url, options) => {
    calls++; assert.equal(url, standingUrl('508399')); assert.equal(new Headers(options?.headers).has('Authorization'), false);
    return new Response('saved', {headers: {'content-type': 'text/html'}});
  });
  assert.equal(html, 'saved'); assert.equal(calls, 1);
});
