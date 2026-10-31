# Reviewing sports data in Studio

Run `pnpm studio` from the repository root. [Studio setup](sanity-studio.md).
Sports edits save directly; review is not a publication approval step.

## Review imported matches

1. Under **Sports → Teams**, enable **Aalborg team** for each Aalborg competition
   entry. This controls club-detail imports and the default review scope.
2. Open **Sports review** in the top tool menu. It shows Aalborg issues plus
   import discrepancies for all teams. Filter by match/issue or choose All teams.
3. Choose **Open affected match field**, then check the fact against the source.
4. Edit the normal form. Return and click **Refresh review** to update the list.

| Issue | What to do |
| --- | --- |
| Player identity | Select/create a confirmed Player. Link the participant and relevant events separately after checking each fact. Keep source names. Equal names never link automatically. |
| Unknown assist | Choose Credited and identify the assister, or No assist if confirmed. Leave Unknown when unsure. |
| Substitute appearance | Choose Played or Did not play with evidence. A substitute listing alone proves neither. |
| Score coverage | Compare the official score and goal events. Add only verified facts; incomplete events need not equal the final score. |
| Import discrepancy | Investigate changed/disappearing source facts. The importer retains them rather than silently deleting or replacing them. |

Completed-match starters count as appearances. Confirmed involvement in an event,
including a credited assist, also provides appearance evidence. Statistics are
calculated from matches; there are no player totals to enter manually.

When editing kickoff precision, clear the date/time field that no longer applies.
Switching an assist away from Credited clears the old assister fields.
Points adjustments belong on the affected Competition and need a reason.

## Keep a correction or allow DBU again

Editing an imported field automatically protects your correction on later imports.
Manual events and participants also survive imports.

Expand **protected corrections** on the affected object and choose **Use DBU
next time** to release a field. Its current value stays until the next successful
import can supply a value; this does not immediately restore an older value.
Missing DBU information still does not erase known facts. Releasing a field
cannot create player IDs or assists that DBU does not supply.

Removing a participant/event protects the array against automatic recreation.
Release that array's correction if you want the importer to supply the item again.
Correction release requires localhost or HTTPS.

## Clear investigated notices

Identity, assist and appearance issues disappear when resolved and the review
is refreshed. Import notices need explicit acknowledgement: expand **Import
notices to check** and choose **Clear checked import notices** after investigation.
A match summary and its embedded item may each have a notice.

Clearing a notice does not change facts or remove correction protection.
A later import can raise the issue again if it persists.

## Check correction protection

Correct an imported venue, preview an import and confirm your value survives.
Choose **Use DBU next time**, then preview again: DBU's venue should be proposed
when available. Use the [normal import workflow](sports-data.md) to apply it.
