# Homepage visual study — throwaway branch

Question: which visual direction should lead the AFK homepage?

Run `pnpm dev` and open `http://localhost:3000/?variant=A`.
Use the floating arrows or your keyboard's left/right arrows to compare:

- **A / Matchday:** dark ink, acid lime, oversized type, next-match panel.
- **B / Klubjournal:** warm paper, brick red, serif typography, editorial rhythm.
- **C / På banen:** cobalt and white, outlined type, a compact match dashboard.
- **D / C + A:** C’s palette and outlined typography with A’s split hero, spacing,
  court graphic and next-match placement. Open `/?variant=D` to review this refinement.

All match details and proposed copy are illustrative. AFK is a text placeholder,
not a proposed official logo. System fonts stand in for future licensed fonts.
The court artwork is a code-drawn motif; no stock photos or invented club photos.

Only development mode replaces the homepage. Production exports retain the
existing sports homepage. Existing sports routes are unchanged.

This branch is a design source, not an implementation PR to merge. After choosing
a direction, implement that decision on a fresh branch and leave this study here.
Current feedback: C’s colours and distinctive styling are preferred; A’s hero
spacing, split composition and side graphic are preferred. D explores that
combination. Original A–C remain available for comparison. Final verdict pending.

## E / Klubhub — revised after feedback

The spacious, soft Apple/Webflow study was rejected. The maintainer prefers
C/D's sharper sports identity and a denser news/community-hub composition,
using https://www.hltv.org as a reference for information hierarchy.

E now explores a compact match strip, a shorter split hero, editorial content
alongside a league overview, news rows, and direct routes to sports views.
White space is local to each block rather than large gaps between sections.
Square edges and cobalt typography replace pill buttons and soft panels.

News is explicitly proposed content. The table and matches are illustrative,
not official current data. Expanding a news row reveals suggested editorial
content; it does not publish or fetch anything. No community accounts, forums
or other interactive services are introduced by the community-hub reference.

D remains unchanged. The rejected E study remains available in commit d383fde.
Verdict: awaiting review of density, hierarchy and sports character.
