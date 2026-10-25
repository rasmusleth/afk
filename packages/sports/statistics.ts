import {appearanceFromEvidence, record, validateEvent, validateParticipant} from './validation.ts';
import {referenceId, uniqueRecords, validFixture, wholeNumber, type DerivationIssue, type MatchRecord} from './derivation.ts';

/** Counts of confirmed facts only. Never label these as exhaustive totals. */
export interface PlayerStatistics {
  playerId: string; knownAppearances: number; unknownAppearances: number;
  knownGoals: number; knownAssists: number; knownYellowCards: number; knownRedCards: number;
}
export interface TeamMatchCoverage {
  matchId: string; teamId: string;
  participants: 'missing' | 'recorded'; events: 'missing' | 'recorded';
  unresolvedParticipants: number; unknownAppearances: number;
  knownGoalEvents: number; unresolvedScorers: number; unknownAssists: number; unresolvedAssisters: number;
  unresolvedYellowCards: number; unresolvedRedCards: number;
  officialGoals?: number; goalCoverageDifference?: number;
}
export interface PlayerStatisticsResult {players: PlayerStatistics[]; coverage: TeamMatchCoverage[]; issues: DerivationIssue[]; excludedMatchIds: string[]}

/** Only completed matches contribute; source names never join player identities. */
export function derivePlayerStatistics(matches: readonly MatchRecord[], options: {teamId?: string} = {}): PlayerStatisticsResult {
  const result: PlayerStatisticsResult = {players: [], coverage: [], issues: [], excludedMatchIds: []};
  const rows = new Map<string, PlayerStatistics>();
  function player(id: string): PlayerStatistics {
    let row = rows.get(id);
    if (!row) {row = {playerId: id, knownAppearances: 0, unknownAppearances: 0, knownGoals: 0, knownAssists: 0, knownYellowCards: 0, knownRedCards: 0}; rows.set(id, row);}
    return row;
  }
  for (const match of uniqueRecords(matches, result.issues)) {
    const home = referenceId(match.homeTeam), away = referenceId(match.awayTeam);
    if (options.teamId && ![home, away].includes(options.teamId)) continue;
    if (!validFixture(match, result.issues) || match.status !== 'completed') {
      result.excludedMatchIds.push(match._id);
      if (match.status !== 'completed' && match.score) result.issues.push({code: 'unverified-result', matchId: match._id, message: 'A score alone does not prove completion; player statistics excluded.'});
      continue;
    }
    const coverage = new Map<string, TeamMatchCoverage>();
    for (const teamId of [home!, away!].filter(id => !options.teamId || id === options.teamId)) {
      const score = record(match.score)[teamId === home ? 'home' : 'away'];
      const item: TeamMatchCoverage = {matchId: match._id, teamId, participants: Array.isArray(match.participants) ? 'recorded' : 'missing', events: Array.isArray(match.events) ? 'recorded' : 'missing',
        unresolvedParticipants: 0, unknownAppearances: 0, knownGoalEvents: 0, unresolvedScorers: 0, unknownAssists: 0, unresolvedAssisters: 0, unresolvedYellowCards: 0, unresolvedRedCards: 0,
        ...(wholeNumber(score) ? {officialGoals: score} : {})};
      coverage.set(teamId, item); result.coverage.push(item);
      for (const section of ['participants', 'events'] as const) if (item[section] === 'missing') result.issues.push({code: 'missing-section', matchId: match._id, teamId, field: section, message: `${section} coverage is unknown, not a confirmed zero.`});
    }
    const played = new Set<string>(), unknown = new Set<string>();
    function items(field: 'events' | 'participants') {
      const values = Array.isArray(match[field]) ? match[field].map(record) : [];
      const counts = new Map<unknown, number>();
      for (const item of values) counts.set(item._key, (counts.get(item._key) ?? 0) + 1);
      return values.filter(item => {
        const check = field === 'events' ? validateEvent(item) : validateParticipant(item);
        const teamId = referenceId(item.team);
        if (check !== true || typeof item._key !== 'string' || !item._key.trim() || counts.get(item._key)! > 1 || ![home, away].includes(teamId)) {
          result.issues.push({code: 'invalid-match-item', matchId: match._id, field, message: 'Invalid or duplicate keyed item excluded; known counts may be incomplete.'}); return false;
        }
        return true;
      });
    }
    // Appearance inference must use only validated events, never malformed raw items.
    const events = items('events');
    for (const event of events) {
      const teamId = referenceId(event.team)!, data = coverage.get(teamId);
      if (!data) continue;
      const scorer = referenceId(event.player), assist = record(event.assist), assister = assist.status === 'credited' ? referenceId(assist.player) : undefined;
      for (const id of [scorer, assister]) if (id) {played.add(id); player(id);}
      if (event._type === 'goal') {
        data.knownGoalEvents++;
        if (scorer) player(scorer).knownGoals++; else data.unresolvedScorers++;
        if (assist.status === 'unknown') data.unknownAssists++;
        if (assist.status === 'credited') {if (assister) player(assister).knownAssists++; else data.unresolvedAssisters++;}
      } else if (event._type === 'yellowCard') {
        if (scorer) player(scorer).knownYellowCards++; else data.unresolvedYellowCards++;
      } else if (event._type === 'redCard') {
        if (scorer) player(scorer).knownRedCards++; else data.unresolvedRedCards++;
      }
    }
    const participants = items('participants');
    const resolved = new Set<string>();
    for (const participant of participants) {
      const teamId = referenceId(participant.team)!, data = coverage.get(teamId);
      if (!data) continue;
      const id = referenceId(participant.player);
      const appearance = appearanceFromEvidence({...match, events}, participant);
      if (!id) data.unresolvedParticipants++;
      if (appearance === 'unknown') data.unknownAppearances++;
      if (!id) continue;
      const key = `${teamId}:${id}`;
      if (resolved.has(key)) result.issues.push({code: 'duplicate-player-participation', matchId: match._id, teamId, message: 'Repeated resolved participant counted at most once per match.'});
      resolved.add(key); player(id);
      if (appearance === 'played') played.add(id);
      else if (appearance === 'unknown') unknown.add(id);
      if (appearance === 'played' && participant.appearance === 'didNotPlay') result.issues.push({code: 'appearance-conflict', matchId: match._id, teamId, message: 'Starter/event evidence conflicts with did-not-play; confirmed evidence counted.'});
    }
    for (const id of played) player(id).knownAppearances++;
    for (const id of unknown) if (!played.has(id)) player(id).unknownAppearances++;
    for (const data of coverage.values()) if (data.officialGoals !== undefined) {
      data.goalCoverageDifference = data.officialGoals - data.knownGoalEvents;
      if (data.goalCoverageDifference !== 0) result.issues.push({code: 'goal-coverage-difference', matchId: match._id, teamId: data.teamId, message: 'Known goal events differ from official score; no missing goals or assists were invented.'});
    }
  }
  result.players = [...rows.values()].sort((a, b) => a.playerId.localeCompare(b.playerId));
  return result;
}
