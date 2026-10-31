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

## E / Ro & bevægelse

The maintainer asked for the restraint and storytelling of Apple and Webflow,
with subtle sports character. E explores sentence-case typography, generous
space, a dimensional court illustration, compact match information and a
sequence of editorial sections. Native CSS entrance/scroll motion respects
reduced-motion preferences. No animation dependency, scroll interception,
production content or CMS changes.

References inspected: https://www.apple.com and https://webflow.com.
This is an interpretation of their hierarchy and pacing, not a reproduction.
The next review should assess overall rhythm before detailed component tuning.
Real club photography and the maintainer's sketches remain useful inputs.
