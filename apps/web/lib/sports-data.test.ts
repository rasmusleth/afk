import { test } from "vitest";
import assert from "node:assert/strict";
import { readSports } from "./sports-data.ts";
import { emptySnapshot } from "./sports.ts";

test("unconfigured and unsafe configurations never request Sanity", async () => {
  const deny: typeof fetch = async () => {
    throw new Error("Unexpected network request");
  };
  assert.equal((await readSports({}, deny)).mode, "unconfigured");
  await assert.rejects(
    readSports(
      { AFK_SPORTS_PROJECT_ID: "example", AFK_SPORTS_DATASET: "production" },
      deny,
    ),
    /development/,
  );
  await assert.rejects(
    readSports({ AFK_SPORTS_PROJECT_ID: "example" }, deny),
    /development/,
  );
  await assert.rejects(
    readSports(
      { AFK_SPORTS_SNAPSHOT: "unused", AFK_SPORTS_PROJECT_ID: "example" },
      deny,
    ),
    /not both/,
  );
});
test("development reader requests published projected facts with no authentication and propagates failures", async () => {
  const env = {
    AFK_SPORTS_PROJECT_ID: "example",
    AFK_SPORTS_DATASET: "development",
  };
  const fake: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    assert.equal(url.hostname, "example.api.sanity.io");
    assert.equal(url.pathname, "/v2025-02-19/data/query/development");
    assert.equal(url.searchParams.get("perspective"), "published");
    assert.match(url.searchParams.get("query")!, /sourceName/);
    assert.equal(init?.headers, undefined);
    assert.equal(init?.method, undefined);
    return Response.json({ result: emptySnapshot() });
  };
  assert.equal((await readSports(env, fake)).mode, "development");
  await assert.rejects(
    readSports(env, async () => new Response(null, { status: 403 })),
    /403/,
  );
  await assert.rejects(
    readSports(env, async () => Response.json({ result: {} })),
    /collection/,
  );
});
