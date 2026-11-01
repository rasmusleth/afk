# Homepage and news

The homepage implements the selected D direction from prototype PR #25:
open sections, a split hero, a court graphic, news, a season overview, club
introduction and contact/joining information. The prototype is a design
reference; it is not merged into this implementation.

## Editors

In Studio, open **Forside**. Fill the required text and contact fields, choose
**Turnering på forsiden**, and publish. This fixed document has ID `homepage`.
Selecting a competition controls the summary; teams still need the existing
**Aalborg team** flag. Leaving the competition empty produces an honest empty
sports summary, not an inferred selection by club name.

Under **Nyheder**, create an article with title, address, introduction, date and
body. Addresses use lower-case a-z, numbers and hyphens. Publish when ready.
Future-dated articles appear only in a build after their date. Article text
supports paragraphs, subheadings, bold, emphasis and HTTP(S) links. This is a
fixed template, not a page builder.

Homepage and news use drafts and publication. Existing sports saves and review
behaviour are unchanged. Published content becomes visible after rebuilding;
publication-triggered builds and unpublished website previews are launch work.

News images, the optional hero background and the optional club image support
crop/hotspot and require an
image description. Photos are optional; the code-drawn court is the fallback.
The official image URL helper supplies responsive Sanity CDN crops without a
Next.js image server. The supplied white AFK crest is served locally from
`apps/web/public/afk-logo-white-small.png`. The system font remains temporary
until a licensed font is chosen.

## Local preview with fictional data

Run from the repository root:

```sh
AFK_CONTENT_PROJECT_ID='' AFK_CONTENT_DATASET='' \
AFK_CONTENT_SNAPSHOT="$PWD/apps/web/fixtures/editorial.json" \
AFK_SPORTS_PROJECT_ID='' AFK_SPORTS_DATASET='' \
AFK_SPORTS_SNAPSHOT="$PWD/apps/web/fixtures/public-sports.json" \
AFK_SPORTS_NATIONAL_MEN_COMPETITIONS=example-cup pnpm dev
```

Visit `/`, `/nyheder/` and `/nyheder/spillet-og-historien/`. The page labels
fictional data. The example contact uses the reserved `example.com` domain.
Use the same environment with `pnpm build` for a static export, then run
`pnpm test:e2e` against that export. Run `pnpm test`, `pnpm typecheck` and
`pnpm lint` independently.

For the local development dataset, set `AFK_CONTENT_PROJECT_ID` and
`AFK_CONTENT_DATASET=development` in `apps/web/.env.local`, and remove
`AFK_CONTENT_SNAPSHOT`. Configure sports separately using the
[public sports guide](public-sports-views.md). No token is needed: this reader
is anonymous, published-only and read-only. Never put credentials in public
variables. No production dataset access or deployment is introduced here.

When neither content source is configured, the site builds an explicit empty
state; it never silently substitutes example articles or contact details.
Once a source is configured, a missing/invalid required homepage, invalid
published article or failed read fails the build. Optional photos/news can be
absent. Next 16.4 requires a dynamic export parameter even without articles;
a reserved `__empty__` parameter renders a 404, never a placeholder article. Production content must be filled before launch; the last successful
deployment should remain in place when a build fails.

## Sports selection

The homepage uses the explicitly selected competition and existing shared
sports derivation. It does not store or edit totals. Only scheduled, dated
fixtures that have not passed can be the next match. A date-only fixture today
retains its unknown time. Postponed, cancelled, abandoned and unresolved matches
remain accessible on the sports page. Undated completed matches cannot establish
which result is latest. Official scores, standings issues and shared ranks
retain their existing unknown/confirmed distinctions. Everything is a build-time
snapshot; this is not a live ticker.

## Before launch

Publish the real homepage, club/contact text, news and photos; confirm the
featured competition and rules; choose the final font; review long real team names
on mobile. Automatic rebuilds, hosting, production dataset configuration and
final brand assets remain separate launch work. No Sanity documents are seeded
or changed by the build or test commands.

## Confirmed contact and draft copy

The club supplied **Aalborg Futsal Klub** and **info@aalborgfutsal.dk** as the
public contact. These prefill a newly created Forside draft; they do not change
an existing document. For an existing Forside, enter those values in Studio.
The website continues to read published contact fields from Sanity.

[Homepage copy draft](homepage-copy.md) contains the proposed Danish text and
confirmed contact. Review it in Studio before publishing. No training schedule
has been confirmed, so leave that optional field empty. The local test fixture
intentionally retains its fictional `example.com` contact.

## Visual reference and navigation

The Astralis homepage (https://astralis.gg/) informs the more immersive visual
composition: a full-width dark hero, clear type hierarchy, compact navigation
and open editorial sections. AFK retains its own crest, cobalt palette, court
motif and content structure, with restrained movement. No Astralis media or
brand assets are reused.

Primary navigation is **På banen**, **Nyheder**, **Klubben**, **Kontakt**; the
crest returns home. Sports pages expose **Kampe & resultater**, **Stilling** and
**Spillere** in a shared secondary navigation. Exact pages and active parent
sections are distinguished with `aria-current`.

In Studio, **Baggrundsbillede i toppen** is optional. It uses the existing
image CDN path with crop/hotspot, eager loading and a dark overlay; without a
photo the hero retains the court illustration on the dark background. Hero
entrance motion respects reduced-motion preferences. No background video,
scroll interception or animation dependency is introduced.
