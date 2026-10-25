# Sports editor review

Sports review is a Studio tool for improving imported data. It is not an
approval stage: sports edits still save directly to published records, and
unknown information is valid. No new credentials, hosted service or deployment
is needed to try it locally.

## First trial with your imported Aalborg match

1. Start Studio from the repository root with `pnpm studio` and open
   http://localhost:3333. Use your existing development project and login.
2. In Sports → Teams, open the Aalborg entry and turn on **Aalborg team**.
   Do this for each Aalborg competition entry you want prioritized. The flag is
   an explicit club designation, not a guess based on a name or a cross-season
   identity. Importers preserve it.
3. Open **Sports review** in the top tool menu. The default view shows Aalborg
   issues plus import discrepancies for every team. Choose a Match or Issue to
   narrow the list; choose All teams to include opponent player identities.
4. Open **Open affected match field** on an issue. The link targets the keyed
   participant/event field, so reordering items does not send you to another
   player. **Check DBU source** opens the public source when available.
5. Make a correction using the normal form, then return to Sports review and
   click **Refresh review**. The tool reads a fresh published snapshot; it does
   not update in the background while another editor is working.

What to do for each kind of issue:

| Issue | Editor action |
| --- | --- |
| Player identity | Select the confirmed Player, or create a Player through the reference field if you know the identity. Reuse that Player reference on the relevant participant and events only after checking each fact. Keep the source name. Equal names never link records automatically. |
| Unknown assist | Select Credited and identify the assister, or choose No assist when confirmed. Keep Unknown if you do not know. Switching away from Credited clears the old assister fields. |
| Substitute appearance | Choose Played or Did not play only with evidence. Unknown remains valid. A confirmed Player reference connecting the participant to an event (including an assist) already provides appearance evidence. |
| Score coverage | Compare the official score, DBU page and recorded goal events. Correct or add only verified facts; never invent a goal or scorer to make counts balance. |
| Import discrepancy | Read the notice, compare the affected fact with the source, and correct the form if needed. Changed/disappearing events remain in place; the queue does not delete or automatically merge them. |

A completed-match starter already has appearance evidence. Player identity
confirmation may be needed separately on a lineup item and its goal/card items:
a name match does not establish that they are the same person. Statistics
remain derived from canonical match facts; no editable totals are added.

## Keeping a correction, or allowing DBU again

Editing an imported sports field records its protection in the same form change.
You do not need to edit technical flags. Normal import metadata stays hidden.
New manual items remain manual and survive imports.

On an imported object, expand **protected corrections** to see the field labels.
Use **Use DBU next time** only when you want a future successful import to supply
that field again. The current local value remains until that import; it is not
restored from an old source snapshot immediately. Missing DBU values still do
not erase known facts. DBU has no verified player identities or assists in our
fixtures, so releasing those fields cannot manufacture values for them.

The release action accepts a fingerprint of the current local field first. It
therefore works even if you edited the field and have not run a sync since.
Nested corrections such as an assist release their containing field together.
Releasing a protected lineup/events array also accepts its current keys so a
future sync can supply locally removed source items again. These are explicit
editor choices; ordinary additions and reordering do not lock an entire array.

To check preservation locally:

1. Correct a minute or venue on an imported match/item.
2. Verify a protected correction appears on that same object.
3. Run the appropriate importer as a dry-run. It should retain your correction.
4. Choose Use DBU next time, then preview again. The source value should now be
   proposed when that source observation can be reconciled unambiguously.
5. Apply only if you want that change, using the existing importer confirmation.

## Import notices and resolved issues

Unresolved identity, assist, appearance and goal coverage issues are derived
from current facts. They disappear after resolution and refresh even if an old
import reason mentioned the uncertainty. These facts do not need a separate
"approved" flag.

Import conflicts and unsupported-source notices persist until checked. Expand
**Import notices to check** on the affected Match or embedded object and choose
**Clear checked import notices** after investigating. An embedded notice and a
Match summary may both need clearing. This clears notices only; it does not
change sporting facts, remove correction protection, or hide a currently
unknown identity/assist/appearance. The next sync can raise a persistent or new
conflict again.

## Implementation and verification boundaries

`packages/sports/review.ts` derives the queue without Sanity or React. The Studio
tool reads published sports documents in ordered 500-record pages and refuses
an incomplete snapshot beyond its initial limit (20 full pages). Errors hide
stale results and never claim that a partial read is a clean queue. Dates in
match labels use the stored date, or the UTC date of an exact kickoff.

Form wrappers use Sanity's normal patch flow to record top-level field ownership
on the affected object. Nested participant/event edits do not protect entire
Match arrays. Explicit removals do. Field fingerprints share the importer's
canonical serialization and use browser SHA-256; release requires a secure
browser context, such as localhost or HTTPS. Permissions and server validation
remain authoritative; hiding metadata and read-only controls are editor UX,
not a security boundary. Editors remain a small trusted group.

Automated tests cover current-vs-historical review state, keyed links, club
selection, score/unknown distinctions, appearance evidence, metadata-only edits,
array removals, canonical fingerprints and correction/release behavior against
the actual fixture-based importers. An offline browser preview uses saved public
fixtures and a simulated Sanity client to verify filters, correction release,
and assist cleanup. Schema extraction and Studio bundling use fake public
configuration. Real login, document focus, reference selection and collaborative
permissions still need the manual trial above; no real dataset was read or
changed during implementation.

Sanity integration references:
[form components](https://www.sanity.io/docs/studio/form-components-reference),
[custom tools](https://www.sanity.io/docs/studio/custom-studio-tool), and
[document edit links](https://www.sanity.io/docs/studio/link-from-custom-components).
