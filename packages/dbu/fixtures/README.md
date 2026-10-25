# DBU fixture provenance

These are DOM excerpts of public DBU responses captured without authentication
on 22 October 2026 (schedule/matches) and 25 October 2026 (standings). `manifest.json` records the original URL, selected containers,
and SHA-256 of each saved excerpt. Only the outermost selected containers are included, so nested selections do
not duplicate content. The excerpts are serialized with Cheerio;
scripts are removed, line endings normalized to LF, and trailing whitespace
removed. Relevant sporting markup, advertising row containers, both desktop
and mobile representations, source names and unknown fields are retained.
Site navigation, ads outside results, login forms, and other unrelated page
content are omitted. Tests do not fetch pages or execute their scripts.

The source observations and limits are in `docs/dbu-source-notes.md` at the
repository root. Never replace a fixture with invented DBU markup. Additional
edge cases in tests are explicit mutations of these saved fixtures or raw parsed
values; they are not evidence of DBU event variants.

When refreshing, manually retrieve the manifest URL, inspect the source markup,
extract the listed containers using the same transformations, update the hash,
and review the resulting fixture and expectations. A changed page is evidence
to investigate, not permission to silently delete previously known sports data.
