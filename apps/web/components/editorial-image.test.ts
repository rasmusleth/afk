import { test } from "vitest";
import assert from "node:assert/strict";
import { editorialImageUrls } from "./editorial-image";
test("responsive Sanity URLs retain editor crop/hotspot and use the image CDN", () => {
  const image = {
    asset: { _ref: "image-abc123-1600x1200-jpg" },
    alt: "Klubfoto",
    crop: { left: 0.2, right: 0, top: 0, bottom: 0 },
    hotspot: { x: 0.7, y: 0.5, width: 0.2, height: 0.2 },
  };
  const urls = editorialImageUrls(image, {
    projectId: "example",
    dataset: "development",
  });
  assert.deepEqual(
    urls.map((item) => item.width),
    [480, 800, 1200],
  );
  for (const item of urls) {
    const url = new URL(item.url);
    assert.equal(url.hostname, "cdn.sanity.io");
    assert.match(url.pathname, /images\/example\/development/);
    assert.equal(url.searchParams.get("w"), String(item.width));
    assert.equal(
      url.searchParams.get("h"),
      String(Math.round((item.width * 2) / 3)),
    );
    assert.ok(url.searchParams.get("rect"));
  }
});
