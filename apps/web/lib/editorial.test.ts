import { test } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseEditorial } from "./editorial.ts";
import { readEditorial } from "./editorial-data.ts";
const fixturePath = new URL("../fixtures/editorial.json", import.meta.url);
const fixture = () => JSON.parse(readFileSync(fixturePath, "utf8"));
const now = new Date("2026-11-01T12:00:00Z");
test("published content sorts by actual instant and withholds future stories", () => {
  const raw = fixture();
  raw.news[0].publishedAt = "2026-10-30T09:00:00-03:00";
  raw.news[1].publishedAt = "2026-10-30T13:00:00+02:00";
  raw.news[2].publishedAt = "2027-01-01T00:00:00Z";
  assert.deepEqual(
    parseEditorial(raw, now).news.map((article) => article._id),
    ["example-news-1", "example-news-2"],
  );
});
test("required homepage, drafts, duplicate routes and malformed content fail the build boundary", () => {
  const missing = fixture();
  missing.homepage = null;
  assert.throws(() => parseEditorial(missing, now));
  const email = fixture();
  email.homepage.contactEmail = "club@example.com?subject=injected";
  assert.throws(() => parseEditorial(email, now), /email/);
  for (const slug of ["../contact", "nyhed?x=1", "hello/world"]) {
    const raw = fixture();
    raw.news[0].slug.current = slug;
    assert.throws(() => parseEditorial(raw, now), /slug/);
  }
  const draft = fixture();
  draft.news[0]._id = "drafts.news";
  assert.throws(() => parseEditorial(draft, now), /Unpublished/);
  const duplicate = fixture();
  duplicate.news[1].slug = duplicate.news[0].slug;
  assert.throws(() => parseEditorial(duplicate, now), /duplicate/);
  const body = fixture();
  body.news[0].body = [];
  assert.throws(() => parseEditorial(body, now), /text/);
});
test("rich text preserves allowed formatting and rejects unsafe annotations", () => {
  const raw = fixture(),
    block = raw.news[0].body[0];
  block.markDefs = [
    { _type: "link", _key: "link", href: "https://example.com" },
  ];
  block.children[0].marks = ["strong", "em", "link"];
  assert.deepEqual(parseEditorial(raw, now).news[0].body[0].children[0].marks, [
    "strong",
    "em",
    "link",
  ]);
  block.markDefs[0].href = "javascript:alert(1)";
  assert.throws(() => parseEditorial(raw, now), /Unsafe/);
  block.markDefs[0].href = "https://example.com";
  block.children[0].marks = ["unknown"];
  assert.throws(() => parseEditorial(raw, now), /Unsupported/);
});
test("optional media requires descriptions and meaningful crop geometry", () => {
  const raw = fixture();
  raw.homepage.clubImage = {
    asset: { _ref: "image-abc123-1200x800-jpg" },
    alt: "Klubbillede",
    crop: { left: 0.1, right: 0.1, top: 0, bottom: 0 },
    hotspot: { x: 0.5, y: 0.5, width: 0.2, height: 0.2 },
  };
  assert.equal(parseEditorial(raw, now).homepage.clubImage?.alt, "Klubbillede");
  raw.homepage.clubImage.crop.left = 0.95;
  assert.throws(() => parseEditorial(raw, now), /crop/);
});
test("editorial reads are explicit, published, anonymous and conservative on errors", async () => {
  const deny: typeof fetch = async () => {
    throw new Error("Unexpected network");
  };
  assert.equal((await readEditorial({}, deny)).data, null);
  await assert.rejects(
    readEditorial(
      { AFK_CONTENT_PROJECT_ID: "example", AFK_CONTENT_DATASET: "production" },
      deny,
    ),
    /development/,
  );
  await assert.rejects(
    readEditorial(
      { AFK_CONTENT_PROJECT_ID: "example", AFK_CONTENT_SNAPSHOT: "unused" },
      deny,
    ),
    /not both/,
  );
  const env = {
    AFK_CONTENT_PROJECT_ID: "example",
    AFK_CONTENT_DATASET: "development",
  };
  const fake: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    assert.equal(url.hostname, "example.api.sanity.io");
    assert.equal(url.searchParams.get("perspective"), "published");
    assert.match(url.searchParams.get("query")!, /drafts/);
    assert.equal(init?.headers, undefined);
    return Response.json({ result: fixture() });
  };
  assert.equal((await readEditorial(env, fake, now)).data?.news.length, 3);
  assert.equal(
    (
      await readEditorial(
        { AFK_CONTENT_SNAPSHOT: fixturePath.pathname },
        deny,
        now,
      )
    ).mode,
    "example",
  );
  await assert.rejects(
    readEditorial(env, async () => new Response(null, { status: 503 })),
    /503/,
  );
  await assert.rejects(
    readEditorial(env, async () =>
      Response.json({ result: { homepage: null, news: [] } }),
    ),
    /editorial/,
  );
});
