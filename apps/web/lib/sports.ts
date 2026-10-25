import {
  publishedId,
  referenceId,
  wholeNumber,
  type CompetitionRecord,
  type MatchRecord,
  type TeamRecord,
} from "@afk/sports/derivation";
import { derivePlayerStatistics } from "@afk/sports/statistics";
import { deriveStandings, nationalFutsalMen } from "@afk/sports/standings";
import type { Player, Season } from "@afk/sports/model";

export interface SportsSnapshot {
  competitions: CompetitionRecord[];
  teams: TeamRecord[];
  matches: MatchRecord[];
  players: (Partial<Player> & { _id: string })[];
  seasons: (Partial<Season> & { _id: string })[];
}
export const emptySnapshot = (): SportsSnapshot => ({
  competitions: [],
  teams: [],
  matches: [],
  players: [],
  seasons: [],
});

/** Boundary validation prevents a malformed/truncated response from becoming an empty league. */
export function parseSnapshot(value: unknown): SportsSnapshot {
  if (!value || typeof value !== "object")
    throw new Error("Invalid sports snapshot.");
  const snapshot = value as SportsSnapshot;
  const ids = new Set<string>();
  for (const key of [
    "competitions",
    "teams",
    "matches",
    "players",
    "seasons",
  ] as const) {
    if (!Array.isArray(snapshot[key]))
      throw new Error(`Missing sports collection: ${key}`);
    for (const doc of snapshot[key]) {
      if (
        !doc ||
        typeof doc._id !== "string" ||
        !doc._id ||
        !publishedId(doc._id) ||
        ids.has(doc._id)
      )
        throw new Error(
          "Sports snapshot contains invalid, duplicate or unpublished IDs.",
        );
      ids.add(doc._id);
    }
  }
  return snapshot;
}

export function confirmedScore(match: MatchRecord): string | undefined {
  return match.status === "completed" &&
    wholeNumber(match.score?.home) &&
    wholeNumber(match.score?.away)
    ? `${match.score.home}–${match.score.away}`
    : undefined;
}

/** Selection and derivation live outside React. Never join player identities by name. */
export function publicCompetitions(
  snapshot: SportsSnapshot,
  rulesCompetitionIds: readonly string[],
) {
  return snapshot.competitions
    .map((competition) => {
      const matches = snapshot.matches.filter(
        (match) => referenceId(match.competition) === competition._id,
      );
      const ids = new Set(
        matches.flatMap((match) => [
          referenceId(match.homeTeam),
          referenceId(match.awayTeam),
        ]),
      );
      for (const adjustment of competition.pointsAdjustments ?? [])
        ids.add(referenceId(adjustment.team));
      const teams = snapshot.teams.filter(
        (team) =>
          ids.has(team._id) ||
          (competition.external?.source === "dbu" &&
            team.external?.source === "dbu" &&
            !!competition.external.id &&
            team.external.scope === competition.external.id),
      );
      const clubTeams = teams.filter((team) => team.isClubTeam === true);
      const clubIds = new Set(clubTeams.map((team) => team._id));
      const clubMatches = matches.filter(
        (match) =>
          clubIds.has(referenceId(match.homeTeam) ?? "") ||
          clubIds.has(referenceId(match.awayTeam) ?? ""),
      );
      const ordered = [...clubMatches].sort((a, b) => {
        const date = (m: MatchRecord) =>
          m.kickoff?.dateTime ?? m.kickoff?.date ?? "9999";
        return date(a).localeCompare(date(b)) || a._id.localeCompare(b._id);
      });
      return {
        competition,
        teams,
        clubTeams,
        season: snapshot.seasons.find(
          (season) => season._id === referenceId(competition.season),
        ),
        fixtures: ordered.filter((match) => match.status !== "completed"),
        results: ordered
          .filter((match) => match.status === "completed")
          .reverse(),
        standings: rulesCompetitionIds.includes(competition._id)
          ? deriveStandings(competition, teams, matches, {
              rules: nationalFutsalMen,
            })
          : undefined,
        squads: clubTeams.map((team) => {
          const statistics = derivePlayerStatistics(matches, {
            teamId: team._id,
          });
          return {
            team,
            statistics,
            missingSections: statistics.coverage.filter(
              (c) => c.participants === "missing" || c.events === "missing",
            ).length,
            unresolvedParticipants: statistics.coverage.reduce(
              (n, c) => n + c.unresolvedParticipants,
              0,
            ),
            players: statistics.players.flatMap((stats) => {
              const profile = snapshot.players.find(
                (player) => player._id === stats.playerId,
              );
              return profile ? [{ profile, stats }] : [];
            }),
            missingProfiles: statistics.players.filter(
              (stats) =>
                !snapshot.players.some(
                  (player) => player._id === stats.playerId,
                ),
            ).length,
          };
        }),
      };
    })
    .sort(
      (a, b) =>
        (b.season?.startDate ?? "").localeCompare(a.season?.startDate ?? "") ||
        a.competition._id.localeCompare(b.competition._id),
    );
}
