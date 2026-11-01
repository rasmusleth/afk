import { referenceId, type MatchRecord } from "@afk/sports/derivation";
import { publicCompetitions, type SportsSnapshot } from "./sports.ts";

/** A scheduled match in the past is unresolved, not the next match or a result. */
export function homepageSports(
  snapshot: SportsSnapshot,
  rules: readonly string[],
  competitionId: string | undefined,
  now = new Date(),
) {
  const competition = publicCompetitions(snapshot, rules).find(
    (item) =>
      item.competition._id === competitionId && item.clubTeams.length > 0,
  );
  const today = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Copenhagen",
  }).format(now);
  const dateKey = (match: MatchRecord) => {
    if (
      match.kickoff?.precision === "time" &&
      match.kickoff.dateTime &&
      Number.isFinite(Date.parse(match.kickoff.dateTime))
    )
      return Date.parse(match.kickoff.dateTime);
    if (
      match.kickoff?.precision === "date" &&
      match.kickoff.date &&
      /^\d{4}-\d{2}-\d{2}$/.test(match.kickoff.date)
    ) {
      const time = Date.parse(`${match.kickoff.date}T12:00:00Z`);
      return Number.isFinite(time) &&
        new Date(time).toISOString().slice(0, 10) === match.kickoff.date
        ? time
        : undefined;
    }
    return undefined;
  };
  const next = competition?.fixtures
    .filter((match) => {
      if (match.status !== "scheduled" || dateKey(match) === undefined)
        return false;
      return match.kickoff?.precision === "time"
        ? dateKey(match)! >= now.getTime()
        : match.kickoff!.date! >= today;
    })
    .sort((a, b) => dateKey(a)! - dateKey(b)! || a._id.localeCompare(b._id))[0];
  // Undated completed facts stay in the results page; they cannot establish "latest".
  const latest = competition?.results
    .filter((match) => dateKey(match) !== undefined)
    .sort((a, b) => dateKey(b)! - dateKey(a)! || a._id.localeCompare(b._id))[0];
  const name = (ref: MatchRecord["homeTeam"]) =>
    snapshot.teams.find((team) => team._id === referenceId(ref))?.name ??
    "Hold ikke oplyst";
  return { competition, next, latest, name };
}
export function formatKickoff(match: MatchRecord): string {
  if (
    match.kickoff?.precision === "time" &&
    match.kickoff.dateTime &&
    Number.isFinite(Date.parse(match.kickoff.dateTime))
  )
    return new Intl.DateTimeFormat("da-DK", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/Copenhagen",
    }).format(new Date(match.kickoff.dateTime));
  if (match.kickoff?.precision === "date" && match.kickoff.date)
    return `${match.kickoff.date.split("-").reverse().join(".")} · Tid ikke fastlagt`;
  return "Dato og tid ikke fastlagt";
}
