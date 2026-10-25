import { readFile } from "node:fs/promises";
import { cache } from "react";
import { emptySnapshot, parseSnapshot } from "./sports.ts";

// Explicit projections: technical import metadata is excluded; source names only validate unresolved facts.
export const sportsQuery = `{
  "seasons": *[_type == "season" && !(_id in path("drafts.**")) && !(_id in path("versions.**"))]{_id,name,startDate,endDate},
  "competitions": *[_type == "competition" && !(_id in path("drafts.**")) && !(_id in path("versions.**"))]{_id,name,season,external{source,id},pointsAdjustments[]{_type,_key,team,points,reason,source}},
  "teams": *[_type == "team" && !(_id in path("drafts.**")) && !(_id in path("versions.**"))]{_id,name,isClubTeam,external{source,id,scope}},
  "players": *[_type == "player" && !(_id in path("drafts.**")) && !(_id in path("versions.**"))]{_id,name,profile},
  "matches": *[_type == "match" && !(_id in path("drafts.**")) && !(_id in path("versions.**"))]{_id,competition,homeTeam,awayTeam,kickoff,venue,status,score,participants[]{_type,_key,team,player,sourceName,lineupStatus,appearance},events[]{_type,_key,team,player,sourceName,method,minute,assist{_type,status,player,sourceName}}}
}`;

export async function readSports(
  environment: Readonly<Record<string, string | undefined>> = process.env,
  fetcher: typeof fetch = fetch,
) {
  const fixture = environment.AFK_SPORTS_SNAPSHOT;
  const project = environment.AFK_SPORTS_PROJECT_ID;
  const dataset = environment.AFK_SPORTS_DATASET;
  const rules = (environment.AFK_SPORTS_NATIONAL_MEN_COMPETITIONS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (fixture && (project || dataset))
    throw new Error(
      "Choose an offline snapshot or development Sanity, not both.",
    );
  if (fixture)
    return {
      snapshot: parseSnapshot(JSON.parse(await readFile(fixture, "utf8"))),
      rules,
      mode: "example" as const,
    };
  if (!project && !dataset)
    return { snapshot: emptySnapshot(), rules, mode: "unconfigured" as const };
  if (!project || !/^[a-z0-9-]+$/.test(project) || dataset !== "development")
    throw new Error(
      "Public sports preview requires a project ID and the development dataset.",
    );
  // Public dataset only. No token, credentials, browser request or write capability.
  const url = new URL(
    `https://${project}.api.sanity.io/v2025-02-19/data/query/development`,
  );
  url.searchParams.set("query", sportsQuery);
  url.searchParams.set("perspective", "published");
  const response = await fetcher(url, {
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok)
    throw new Error(
      `Development sports read failed (${response.status}); see docs/public-sports-views.md.`,
    );
  const text = await response.text();
  if (text.length > 8_000_000)
    throw new Error("Sports snapshot exceeds the 8 MB preview limit.");
  const body = JSON.parse(text);
  return {
    snapshot: parseSnapshot(body.result),
    rules,
    mode: "development" as const,
  };
}

export const loadSports = cache(() => readSports());
