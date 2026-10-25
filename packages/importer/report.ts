import type {StandingsSnapshot} from '@afk/dbu/standings';
import {record} from '@afk/sports/validation';
import {publishedId, referenceId, selectSeasonMatches, type CompetitionRecord, type MatchRecord, type TeamRecord} from '@afk/sports/derivation';
import {derivePlayerStatistics} from '@afk/sports/statistics';
import {compareStandings, deriveStandings, nationalFutsalMen, type OfficialStandingRow} from '@afk/sports/standings';
import {SyncError, type Document} from './model.ts';

export function buildSportsReport(documents: Document[], options: {competitionId: string; rules: 'national-futsal-men'; noShows?: Record<string, number>; assumeNoShowsZero?: boolean; standing?: StandingsSnapshot}) {
  if (options.rules !== 'national-futsal-men') throw new SyncError('Assert the applicable national futsal rules before reporting.');
  const published = documents.filter(d => publishedId(d._id));
  if (new Set(published.map(d => d._id)).size !== published.length) throw new SyncError('Duplicate snapshot document IDs.');
  const source = published.find(d => d._id === options.competitionId && d._type === 'competition');
  if (!source) throw new SyncError('Select an existing published Competition ID.');
  const competition: CompetitionRecord = {...source, _type: 'competition'};
  const allMatches: MatchRecord[] = published.filter(d => d._type === 'match').map(d => ({...d, _type: 'match'}));
  const matches = allMatches.filter(d => referenceId(d.competition) === source._id);
  const ids = new Set(matches.flatMap(m => [referenceId(m.homeTeam), referenceId(m.awayTeam)]).filter(id => id !== undefined));
  for (const adjustment of Array.isArray(competition.pointsAdjustments) ? competition.pointsAdjustments : []) {
    const id = referenceId(record(adjustment).team); if (id) ids.add(id);
  }
  const external = record(source.external);
  const entries: TeamRecord[] = published.filter(d => d._type === 'team' && (ids.has(d._id) || (external.source === 'dbu' && typeof external.id === 'string' && record(d.external).source === 'dbu' && record(d.external).scope === external.id))).map(d => ({...d, _type: 'team'}));
  if (options.noShows && options.assumeNoShowsZero) throw new SyncError('Supply explicit no-show counts or assert all zero, not both.');
  const noShows = options.assumeNoShowsZero ? Object.fromEntries(entries.map(team => [team._id, 0])) : options.noShows;
  const table = deriveStandings(competition, entries, allMatches, {rules: nationalFutsalMen, noShows});
  const competitions: CompetitionRecord[] = published.filter(d => d._type === 'competition').map(d => ({...d, _type: 'competition'}));
  const seasonId = referenceId(competition.season);
  const season = seasonId ? selectSeasonMatches(seasonId, competitions, allMatches) : undefined;
  let comparison;
  if (options.standing) {
    const snapshot = options.standing;
    if (external.source !== snapshot.external.source || external.id !== snapshot.external.id) throw new SyncError('Official snapshot belongs to a different competition.');
    const mapped: OfficialStandingRow[] = [], mappingIssues: {external: unknown; reason: string}[] = [];
    for (const row of snapshot.rows) {
      const found = entries.filter(team => {
        const identity = record(team.external);
        return identity.source === row.team.source && identity.id === row.team.id && identity.scope === row.team.scope;
      });
      if (found.length !== 1) {mappingIssues.push({external: row.team, reason: 'Official scoped Team identity is missing or ambiguous locally; no name match attempted.'}); continue;}
      mapped.push({teamId: found[0]._id, rank: row.position, played: row.played, won: row.won, drawn: row.drawn, lost: row.lost, goalsFor: row.goalsFor, goalsAgainst: row.goalsAgainst, points: row.points});
    }
    const compared = compareStandings(table, mapped);
    comparison = {...compared, matches: compared.matches && mappingIssues.length === 0, mappingIssues, sourceUrl: snapshot.sourceUrl};
  }
  const competitionPlayers = derivePlayerStatistics(matches);
  const seasonPlayers = season ? derivePlayerStatistics(season.matches) : undefined;
  const playerIds = new Set([...competitionPlayers.players, ...(seasonPlayers?.players ?? [])].map(player => player.playerId));
  return {
    competitionId: competition._id, rules: 'national-futsal-men', noShows: noShows ?? null,
    standings: table, competitionPlayers,
    season: season ? {seasonId, selectionIssues: season.issues, playerStatistics: seasonPlayers} : {seasonId: null, reason: 'Competition has no Season reference; season statistics remain unknown.'},
    playerNames: Object.fromEntries(published.filter(d => d._type === 'player' && playerIds.has(d._id) && typeof d.name === 'string').map(d => [d._id, d.name])),
    comparison: comparison ?? null,
  };
}
