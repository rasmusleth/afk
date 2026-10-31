import {record, validateAdjustment} from './validation.ts';
import {referenceId, safeSum, uniqueRecords, validFixture, wholeNumber, type CompetitionRecord, type DerivationIssue, type MatchRecord, type TeamRecord} from './derivation.ts';

export interface StandingRow {
  teamId: string; name: string; rank: number; sharedRank: boolean;
  played: number; won: number; drawn: number; lost: number;
  goalsFor: number; goalsAgainst: number; goalDifference: number; awayGoalsFor: number;
  earnedPoints: number; adjustmentPoints: number; points: number;
  adjustments: {key: string; points: number; reason: string; source?: string}[];
}
export interface StandingsResult {competitionId: string; rows: StandingRow[]; includedMatchIds: string[]; excludedMatchIds: string[]; issues: DerivationIssue[]}
export interface StandingRules {
  win: number; draw: number; loss: number;
  ranking: 'points-only' | 'national-futsal-men';
}
/** Verified national men's rules; do not apply to other competitions silently. */
export const nationalFutsalMen: Readonly<StandingRules> = Object.freeze({win: 3, draw: 1, loss: 0, ranking: 'national-futsal-men'});
/** No-show ranking is currently omitted unless explicit verified counts are supplied. */
export interface StandingsOptions {rules: StandingRules; noShows?: Readonly<Record<string, number>>}
interface Result {matchId: string; home: string; away: string; homeScore: number; awayScore: number}
const descending = (a: number, b: number) => a > b ? -1 : a < b ? 1 : 0;

/** Official scores drive results; events never manufacture a result or its finality. */
export function deriveStandings(competition: CompetitionRecord, entries: readonly TeamRecord[], matches: readonly MatchRecord[], options: StandingsOptions): StandingsResult {
  const result: StandingsResult = {competitionId: competition._id, rows: [], includedMatchIds: [], excludedMatchIds: [], issues: []};
  if (![options.rules.win, options.rules.draw, options.rules.loss].every(wholeNumber) || !['points-only', 'national-futsal-men'].includes(options.rules.ranking)) throw new Error('Explicit supported points and ranking rules are required.');
  const rows = new Map<string, StandingRow>(uniqueRecords(entries, result.issues).map(team => [team._id, {
    teamId: team._id, name: typeof team.name === 'string' && team.name.trim() ? team.name : team._id, rank: 0, sharedRank: false,
    played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, awayGoalsFor: 0,
    earnedPoints: 0, adjustmentPoints: 0, points: 0, adjustments: [],
  }]));
  const results: Result[] = [];
  for (const match of uniqueRecords(matches, result.issues)) {
    if (referenceId(match.competition) !== competition._id) continue;
    const home = referenceId(match.homeTeam), away = referenceId(match.awayTeam);
    if (!validFixture(match, result.issues) || !rows.has(home!) || !rows.has(away!)) {
      result.excludedMatchIds.push(match._id);
      result.issues.push({code: 'unknown-table-team', matchId: match._id, message: 'Fixture needs two Teams from the supplied competition entries.'}); continue;
    }
    if (match.status !== 'completed') {
      result.excludedMatchIds.push(match._id);
      if (match.score) result.issues.push({code: 'unverified-result', matchId: match._id, message: 'Scored but unverified fixture excluded. Confirm completion; do not infer it from goals or the clock.'});
      continue;
    }
    const score = record(match.score);
    if (!wholeNumber(score.home) || !wholeNumber(score.away)) {
      result.excludedMatchIds.push(match._id);
      result.issues.push({code: 'missing-official-score', matchId: match._id, message: 'Completed fixture needs a complete non-negative official score; goal events are not a substitute.'}); continue;
    }
    result.includedMatchIds.push(match._id);
    const game: Result = {matchId: match._id, home: home!, away: away!, homeScore: score.home, awayScore: score.away};
    results.push(game);
    for (const [id, own, against, isAway] of [[game.home, game.homeScore, game.awayScore, false], [game.away, game.awayScore, game.homeScore, true]] as const) {
      const row = rows.get(id)!;
      row.played++; row.goalsFor = safeSum(row.goalsFor, own); row.goalsAgainst = safeSum(row.goalsAgainst, against);
      if (isAway) row.awayGoalsFor = safeSum(row.awayGoalsFor, own);
      if (own > against) {row.won++; row.earnedPoints = safeSum(row.earnedPoints, options.rules.win);}
      else if (own === against) {row.drawn++; row.earnedPoints = safeSum(row.earnedPoints, options.rules.draw);}
      else {row.lost++; row.earnedPoints = safeSum(row.earnedPoints, options.rules.loss);}
    }
  }
  if (competition.pointsAdjustments != null && !Array.isArray(competition.pointsAdjustments)) result.issues.push({code: 'invalid-points-adjustment', field: 'pointsAdjustments', message: 'Points adjustments must be an array; incomplete data was not applied.'});
  const adjustments = Array.isArray(competition.pointsAdjustments) ? competition.pointsAdjustments.map(record) : [];
  for (const adjustment of adjustments) {
    const teamId = referenceId(adjustment.team);
    if (validateAdjustment(adjustment) !== true || typeof adjustment._key !== 'string' || !adjustment._key.trim() || typeof adjustment.points !== 'number' || typeof adjustment.reason !== 'string' || adjustments.filter(item => item._key === adjustment._key).length !== 1 || !rows.has(teamId!)) {
      result.issues.push({code: 'invalid-points-adjustment', teamId, field: 'pointsAdjustments', message: 'Invalid, duplicated or unknown-Team points adjustment excluded; review the ruling.'}); continue;
    }
    const row = rows.get(teamId!)!;
    row.adjustmentPoints = safeSum(row.adjustmentPoints, adjustment.points);
    row.adjustments.push({key: adjustment._key, points: adjustment.points, reason: adjustment.reason, ...(typeof adjustment.source === 'string' && adjustment.source ? {source: adjustment.source} : {})});
  }
  for (const row of rows.values()) {
    row.goalDifference = safeSum(row.goalsFor, -row.goalsAgainst);
    row.points = safeSum(row.earnedPoints, row.adjustmentPoints);
  }
  function groups(group: StandingRow[], metric: (row: StandingRow) => number, ascending = false): StandingRow[][] {
    const sorted = [...group].sort((a, b) => (ascending ? -1 : 1) * descending(metric(a), metric(b)) || a.teamId.localeCompare(b.teamId));
    const grouped: StandingRow[][] = [];
    for (const row of sorted) {
      const last = grouped[grouped.length - 1];
      if (last && metric(last[0]) === metric(row)) last.push(row); else grouped.push([row]);
    }
    return grouped;
  }
  function rank(group: StandingRow[], position: number, stage = 0, headToHead?: Map<string, number[]>): StandingRow[] {
    if (group.length === 1) {group[0].rank = position; return group;}
    if (stage === 0 && options.rules.ranking === 'national-futsal-men' && group.some(row => !wholeNumber(options.noShows?.[row.teamId]))) {
      result.issues.push({code: 'unknown-no-shows', message: `Tied points need explicit no-show counts before further ranking: ${group.map(r => r.teamId).join(', ')}.`});
      return unresolved(group, position);
    }
    if (options.rules.ranking === 'points-only' || stage > 8) {
      result.issues.push({code: 'unresolved-ranking', message: 'Sporting tie remains unresolved; display order is not an official placement.'});
      return unresolved(group, position);
    }
    // One mini-table for the remaining group. Do not recursively restart it
    // when a subgroup separates: that interpretation has not been verified.
    if (stage === 5 && group.length > 2) {
      result.issues.push({code: 'unverified-head-to-head', message: 'Multi-team head-to-head subgroup interpretation is unverified; tied placement retained.'});
      return unresolved(group, position);
    }
    if (stage === 5) {
      const ids = new Set(group.map(row => row.teamId));
      headToHead = new Map(group.map(row => [row.teamId, [0, 0, 0, 0]]));
      for (const game of results.filter(game => ids.has(game.home) && ids.has(game.away))) {
        for (const [id, own, against, away] of [[game.home, game.homeScore, game.awayScore, false], [game.away, game.awayScore, game.homeScore, true]] as const) {
          const stats = headToHead.get(id)!;
          stats[0] = safeSum(stats[0], own > against ? options.rules.win : own === against ? options.rules.draw : options.rules.loss);
          stats[1] = safeSum(stats[1], own - against); stats[2] = safeSum(stats[2], own);
          if (away) stats[3] = safeSum(stats[3], own);
        }
      }
    }
    const metric = (row: StandingRow) => [options.noShows?.[row.teamId] ?? 0, row.goalDifference, row.goalsFor, row.awayGoalsFor, row.won, ...(headToHead?.get(row.teamId) ?? [])][stage];
    const subgroups = groups(group, metric, stage === 0);
    let offset = position;
    return subgroups.flatMap(subgroup => {
      const ranked = rank(subgroup, offset, stage + 1, headToHead);
      offset += subgroup.length; return ranked;
    });
  }
  function unresolved(group: StandingRow[], position: number) {
    for (const row of group) {row.rank = position; row.sharedRank = true;}
    return [...group].sort((a, b) => a.teamId.localeCompare(b.teamId));
  }
  let position = 1;
  result.rows = groups([...rows.values()], row => row.points).flatMap(group => {
    // Club policy: omit no-shows for now, rather than treating missing counts
    // as recorded zeroes. Explicit counts still take precedence when provided.
    const ranked = rank(group, position, options.noShows === undefined ? 1 : 0); position += group.length; return ranked;
  });
  return result;
}

export type OfficialStandingRow = Pick<StandingRow, 'teamId'> & Partial<Pick<StandingRow, 'rank' | 'played' | 'won' | 'drawn' | 'lost' | 'goalsFor' | 'goalsAgainst' | 'points'>>;
export interface StandingDifference {teamId: string; field: string; derived?: number; official?: number; reason: string}
/** Comparison is a report, never a mutation or an inferred points adjustment. */
export function compareStandings(derived: StandingsResult, official: readonly OfficialStandingRow[]) {
  const differences: StandingDifference[] = [];
  for (const row of derived.rows) {
    const matches = official.filter(item => item.teamId === row.teamId);
    if (matches.length !== 1) {differences.push({teamId: row.teamId, field: 'team', reason: matches.length ? 'Duplicate official Team identity.' : 'Team missing from official snapshot.'}); continue;}
    const expected = matches[0];
    for (const field of ['played', 'won', 'drawn', 'lost', 'goalsFor', 'goalsAgainst', 'points', 'rank'] as const) {
      const value = expected[field];
      if (field === 'rank' && row.sharedRank) {differences.push({teamId: row.teamId, field, reason: 'Derived sporting tie is unresolved; official placement was not copied.'}); continue;}
      if (typeof value !== 'number' || !Number.isSafeInteger(value) || (field !== 'points' && value < (field === 'rank' ? 1 : 0))) {
        differences.push({teamId: row.teamId, field, reason: 'Official value missing or invalid; comparison is unknown.'}); continue;
      }
      if (row[field] !== value) differences.push({teamId: row.teamId, field, derived: row[field], official: value, reason: field === 'points' ? 'Check verified results, competition rules and explicit points adjustments; no ruling inferred.' : 'Check source snapshot timing, result coverage and competition rules.'});
    }
  }
  for (const row of official) if (!derived.rows.some(item => item.teamId === row.teamId)) differences.push({teamId: row.teamId, field: 'team', reason: 'Official Team missing from derived competition entries.'});
  return {matches: differences.length === 0 && derived.issues.length === 0, differences, derivationIssues: derived.issues};
}
