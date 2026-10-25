import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {parseSchedule} from '@afk/dbu/parse';
import {normalizeSchedule} from '@afk/dbu/normalize';
import {fetchMatch, fetchSchedule, scheduleUrl} from './fetch.ts';
import {planSchedule, reservedIds} from './plan.ts';
import {selectBatchMatches, planCompetitionBatch} from './batch.ts';
import {collectBatchObservations} from './batch-source.ts';
import {parseBatchOptions} from './batch-options.ts';
import {readToken, confirmApply} from './prompt.ts';
import {sanityStore, decodeDocuments, planMutations} from './sanity-store.ts';
import {SyncError} from './model.ts';

async function main() {
  if (process.argv.slice(2).includes('--help')) {
    console.log(`Manual competition batch import (dry-run by default).
Required: --pool ID --season PUBLISHED_SEASON_ID --time-zone IANA_ZONE
Connected: --project ID --dataset development
Optional: --details club|all|none (default club), --club-team-entry DBU_ENTRY_ID
Default club selection uses Studio Team.isClubTeam within the requested pool.
Saved sources: --html SCHEDULE_FILE --match-html-dir DIRECTORY (match-NUMBER.html)
Offline: saved sources plus --existing DOCUMENT_ARRAY_JSON; never --apply or network.
Write: connected options plus --apply; one fresh combined preview and typed confirmation.
Verifies up to 100 scored/previously scored/completed fixtures from actual match pages.
No production, inferred completion, partial commit, automatic retry, deletion or totals.`); return;
  }
  const options = parseBatchOptions(process.argv.slice(2), process.env.INIT_CWD ?? process.cwd());
  const html = options.html ? await readFile(options.html, 'utf8') : await fetchSchedule(options.poolId);
  const normalized = normalizeSchedule(parseSchedule(html, scheduleUrl(options.poolId)));
  if (normalized.diagnostics.length) throw new SyncError('Schedule normalization requires review; the batch was not written.');
  const store = options.existing ? undefined : sanityStore({projectId: options.projectId!, dataset: options.dataset!, token: await readToken()}, undefined, 'batch');
  const documents = options.existing ? decodeDocuments(JSON.parse(await readFile(options.existing, 'utf8'))) : await store!.load([...reservedIds(normalized.value), options.seasonId]);
  const now = new Date().toISOString();
  planSchedule(normalized.value, documents, {...options, now}); // Preflight before fetching many pages.
  const candidates = selectBatchMatches(normalized.value, documents, options);
  const observations = await collectBatchObservations(normalized.value, candidates,
    id => options.matchHtmlDir ? readFile(join(options.matchHtmlDir, `match-${id}.html`), 'utf8') : fetchMatch(id, options.poolId),
    (index, total, id) => console.error(`Checking DBU match ${id} (${index}/${total})…`));
  const {plan, summary} = planCompetitionBatch(normalized.value, documents, observations, {...options, now});
  planMutations(plan, 'batch'); // Limits and guard checks happen before confirmation.
  console.log(JSON.stringify({mode: options.apply ? 'pending-apply' : 'dry-run', target: options.projectId ? `${options.projectId}/development` : 'offline snapshot (no Sanity access)',
    summary, creates: plan.operations.filter(op => op.kind === 'create').length, patches: plan.operations.filter(op => op.kind === 'patch').length, review: plan.review,
    changes: plan.operations.map(op => ({id: op.kind === 'create' ? op.document._id : op.id, operation: op.kind, values: Object.fromEntries(Object.entries(op.kind === 'create' ? op.document : op.set).filter(([field]) => field !== 'import'))}))}, null, 2));
  if (!options.apply) return;
  await confirmApply(`${options.projectId}/development`);
  await store!.commit(plan);
  console.log('Development competition batch transaction confirmed.');
}
main().catch(error => {
  console.error(error instanceof SyncError ? error.message : 'Competition batch stopped unexpectedly. No transaction was confirmed; review sources/configuration and rerun a dry-run.');
  process.exitCode = 1;
});
