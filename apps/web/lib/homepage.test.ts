import { test } from "vitest";
import assert from "node:assert/strict";
import { homepageSports, formatKickoff } from "./homepage.ts";
import { emptySnapshot } from "./sports.ts";
import type { MatchRecord } from "@afk/sports/derivation";
const ref = (_ref: string) => ({ _type: "reference" as const, _ref });
const now = new Date("2026-11-01T12:00:00Z");
const match = (
  _id: string,
  status: MatchRecord["status"],
  date: string,
): MatchRecord => ({
  _id,
  status,
  competition: ref("cup"),
  homeTeam: ref("club"),
  awayTeam: ref("other"),
  kickoff: { _type: "kickoff", precision: "date", date },
});
function snapshot() {
  return {
    ...emptySnapshot(),
    competitions: [{ _id: "cup", name: "Liga" }],
    teams: [
      { _id: "club", isClubTeam: true, name: "Aalborg" },
      { _id: "other", name: "Modstander" },
    ],
  };
}
test("next match excludes stale, cancelled, postponed and unknown facts regardless of score", () => {
  const data = {
    ...snapshot(),
    matches: [
      match("past", "scheduled", "2026-10-01"),
      match("invalid-date", "scheduled", "2026-99-01"),
      match("postponed", "postponed", "2026-11-02"),
      match("cancelled", "cancelled", "2026-11-02"),
      match("unknown", "unknown", "2026-11-02"),
      match("next", "scheduled", "2026-11-03"),
      match("later", "scheduled", "2026-11-05"),
    ],
  };
  assert.equal(homepageSports(data, [], "cup", now).next?._id, "next");
  assert.equal(homepageSports(data, [], undefined, now).next, undefined);
  assert.equal(
    homepageSports(
      { ...data, teams: [{ _id: "club", name: "Aalborg" }] },
      [],
      "cup",
      now,
    ).next,
    undefined,
  );
});
test("date-only today remains scheduled; an exact kickoff in the past is not upcoming", () => {
  const exact: MatchRecord = {
    ...match("exact", "scheduled", "2026-11-01"),
    kickoff: {
      _type: "kickoff",
      precision: "time",
      dateTime: "2026-11-01T11:00:00Z",
    },
  };
  const data = {
    ...snapshot(),
    matches: [exact, match("today", "scheduled", "2026-11-01")],
  };
  assert.equal(homepageSports(data, [], "cup", now).next?._id, "today");
  assert.match(formatKickoff(data.matches[1]), /Tid ikke fastlagt/);
});
test("latest needs completed status and a date, but unknown official score stays unknown", () => {
  const data = {
    ...snapshot(),
    matches: [
      match("one", "completed", "2026-10-01"),
      match("two", "completed", "2026-10-30"),
      { ...match("undated", "completed", "2026-10-31"), kickoff: undefined },
      match("not-result", "scheduled", "2026-10-31"),
    ],
  };
  const view = homepageSports(data, ["cup"], "cup", now);
  assert.equal(view.latest?._id, "two");
  assert.equal(view.latest?.score, undefined);
  assert.equal(view.competition?.standings?.includedMatchIds.length, 0);
});
