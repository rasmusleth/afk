import { test } from "vitest";
import assert from "node:assert/strict";
import {
  confirmedScore,
  emptySnapshot,
  parseSnapshot,
  publicCompetitions,
} from "./sports.ts";
import type { MatchRecord } from "@afk/sports/derivation";
const ref = (_ref: string) => ({ _type: "reference" as const, _ref });
const match: MatchRecord = {
  _id: "match",
  competition: ref("cup"),
  homeTeam: ref("afk"),
  awayTeam: ref("other"),
  status: "completed",
  score: { _type: "score", home: 0, away: 0 },
};
function snapshot() {
  return {
    ...emptySnapshot(),
    competitions: [{ _id: "cup", name: "Liga", season: ref("season") }],
    teams: [
      { _id: "afk", name: "Aalborg", isClubTeam: true },
      { _id: "other", name: "Other" },
    ],
    matches: [match],
  };
}
test("confirmed score preserves 0–0 and never infers completion", () => {
  assert.equal(confirmedScore(match), "0–0");
  assert.equal(confirmedScore({ ...match, status: "unknown" }), undefined);
  assert.equal(confirmedScore({ ...match, score: undefined }), undefined);
});
test("table requires explicit rule selection; shared ranking is preserved", () => {
  assert.equal(publicCompetitions(snapshot(), [])[0].standings, undefined);
  const table = publicCompetitions(snapshot(), ["cup"])[0].standings!;
  assert.equal(table.rows[0].points, 1);
  assert.equal(table.rows[0].sharedRank, true);
  assert.ok(table.issues.some((issue) => issue.code === "unresolved-ranking"));
});
test("public table ranks three equal-point teams by goal difference without no-show inputs", () => {
  const data = snapshot();
  data.teams = ["a", "b", "c", "d", "e", "f"].map((_id) => ({ _id, name: _id }));
  data.matches = [
    { ...match, _id: "one", homeTeam: ref("a"), awayTeam: ref("d"), score: { _type: "score", home: 1, away: 0 } },
    { ...match, _id: "two", homeTeam: ref("b"), awayTeam: ref("e"), score: { _type: "score", home: 5, away: 0 } },
    { ...match, _id: "three", homeTeam: ref("c"), awayTeam: ref("f"), score: { _type: "score", home: 10, away: 0 } },
  ];
  const table = publicCompetitions(data, ["cup"])[0].standings!;
  assert.deepEqual(table.rows.slice(0, 3).map((row) => [row.teamId, row.rank, row.sharedRank]), [["c", 1, false], ["b", 2, false], ["a", 3, false]]);
});
test("unknown status stays in fixtures even with a score; missing score remains a result needing confirmation", () => {
  const data = snapshot();
  data.matches = [
    { ...match, status: "unknown" },
    { ...match, _id: "completed-missing-score", score: undefined },
  ];
  const view = publicCompetitions(data, ["cup"])[0];
  assert.equal(view.fixtures.length, 1);
  assert.equal(view.results.length, 1);
  assert.equal(view.standings!.includedMatchIds.length, 0);
});
test("club flag and references control player views, unknown substitutes and unresolved names survive derivation", () => {
  const data = {
    ...snapshot(),
    players: [{ _id: "p", name: "Confirmed player", profile: "Profile" }],
  };
  data.matches = [
    {
      ...match,
      participants: [
        {
          _type: "participant",
          _key: "p",
          team: ref("afk"),
          player: ref("p"),
          lineupStatus: "substitute",
          appearance: "unknown",
        },
        {
          _type: "participant",
          _key: "u",
          team: ref("afk"),
          sourceName: "Unconfirmed source",
          lineupStatus: "starter",
          appearance: "unknown",
        },
      ],
    },
  ];
  const squad = publicCompetitions(data, ["cup"])[0].squads[0];
  assert.equal(squad.players.length, 1);
  assert.equal(squad.players[0].stats.unknownAppearances, 1);
  assert.equal(squad.players[0].stats.knownAppearances, 0);
  assert.equal(squad.unresolvedParticipants, 1);
  assert.equal(squad.missingSections, 1);
  data.teams[0].isClubTeam = false;
  assert.equal(publicCompetitions(data, ["cup"])[0].squads.length, 0);
});
test("snapshot rejects malformed, duplicate and unpublished documents", () => {
  assert.throws(() => parseSnapshot({}));
  assert.throws(() =>
    parseSnapshot({ ...snapshot(), players: [{ _id: "drafts.p" }] }),
  );
  assert.throws(() =>
    parseSnapshot({ ...snapshot(), players: [{ _id: "afk" }] }),
  );
  assert.deepEqual(parseSnapshot(emptySnapshot()), emptySnapshot());
});
