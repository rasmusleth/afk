import { readFile } from "node:fs/promises";
import { cache } from "react";
import { parseEditorial } from "./editorial.ts";

// Explicit published projections keep drafts, import metadata and unrelated fields off the site.
export const editorialQuery = `{
 "homepage": *[_type == "homepage" && _id == "homepage"][0]{_id,heroTitle,heroAccent,heroIntro,newsHeading,featuredCompetition,clubTitle,clubText,clubImage{asset,alt,crop,hotspot},contactTitle,contactText,contactName,contactEmail,trainingInfo,seoDescription},
 "news": *[_type == "newsArticle" && !(_id in path("drafts.**")) && !(_id in path("versions.**"))]{_id,title,slug,excerpt,publishedAt,image{asset,alt,crop,hotspot},body[]{_key,_type,style,listItem,children[]{_key,_type,text,marks},markDefs[]{_key,_type,href}}}
}`;
export async function readEditorial(
  environment: Readonly<Record<string, string | undefined>> = process.env,
  fetcher: typeof fetch = fetch,
  now = new Date(),
) {
  const fixture = environment.AFK_CONTENT_SNAPSHOT;
  const projectId = environment.AFK_CONTENT_PROJECT_ID,
    dataset = environment.AFK_CONTENT_DATASET;
  if (fixture && (projectId || dataset))
    throw new Error(
      "Choose an editorial snapshot or development Sanity, not both.",
    );
  if (fixture)
    return {
      data: parseEditorial(JSON.parse(await readFile(fixture, "utf8")), now),
      mode: "example" as const,
      imageContext: undefined,
    };
  if (!projectId && !dataset)
    return {
      data: null,
      mode: "unconfigured" as const,
      imageContext: undefined,
    };
  if (
    !projectId ||
    !/^[a-z0-9-]+$/.test(projectId) ||
    dataset !== "development"
  )
    throw new Error(
      "Editorial reads require a project ID and development dataset.",
    );
  const url = new URL(
    `https://${projectId}.api.sanity.io/v2025-02-19/data/query/development`,
  );
  url.searchParams.set("query", editorialQuery);
  url.searchParams.set("perspective", "published");
  const response = await fetcher(url, { signal: AbortSignal.timeout(20000) });
  if (!response.ok)
    throw new Error(`Editorial read failed (${response.status}).`);
  const text = await response.text();
  if (text.length > 8_000_000)
    throw new Error("Editorial response exceeds 8 MB.");
  const body: unknown = JSON.parse(text);
  if (!body || typeof body !== "object" || !("result" in body))
    throw new Error("Invalid editorial response.");
  return {
    data: parseEditorial(body.result, now),
    mode: "development" as const,
    imageContext: { projectId, dataset },
  };
}
export const loadEditorial = cache(() => readEditorial());
