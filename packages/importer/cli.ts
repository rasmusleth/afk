import {readFile} from 'node:fs/promises';
import {parseSchedule} from '@afk/dbu/parse';
import {normalizeSchedule} from '@afk/dbu/normalize';
import {fetchSchedule, scheduleUrl} from './fetch.ts';
import {parseOptions} from './options.ts';
import {planSchedule, reservedIds} from './plan.ts';
import {readToken, confirmApply} from './prompt.ts';
import {decodeDocuments, sanityStore} from './sanity-store.ts';
import {SyncError} from './model.ts';

const help = `Manual DBU schedule importer (dry-run unless --apply is specified).
Required: --pool ID --season PUBLISHED_SEASON_ID --time-zone IANA_ZONE
Offline preview: --html FILE --existing DOCUMENT_ARRAY_JSON
Connected preview: --project ID --dataset development [--html FILE]
Development import: connected options plus --apply; final typed confirmation.
The token is entered through a hidden TTY prompt, never flags/env/files.
Relative file paths are resolved from the directory where pnpm was invoked.
No production targets, lineups/events, deletion, or automatic retry.`;
async function main() {
  if (process.argv.slice(2).includes('--help')) { console.log(help); return; }
  const options = parseOptions(process.argv.slice(2), process.env.INIT_CWD ?? process.cwd());
  const html = options.html ? await readFile(options.html, 'utf8') : await fetchSchedule(options.poolId);
  const normalized = normalizeSchedule(parseSchedule(html, scheduleUrl(options.poolId)));
  // Fail closed on invalid/unknown source scalars until reviewed. Blank unknown
  // values are valid; they do not produce diagnostics or erase stored data.
  if (normalized.diagnostics.length) throw new SyncError('Source normalization produced diagnostics. Review the source with the parser before synchronizing; nothing was written.');
  const store = options.existing ? undefined : sanityStore({projectId: options.projectId!, dataset: options.dataset!, token: await readToken()});
  const documents = options.existing
    ? decodeDocuments(JSON.parse(await readFile(options.existing, 'utf8')))
    : await store!.load([...reservedIds(normalized.value), options.seasonId]);
  const plan = planSchedule(normalized.value, documents, {seasonId: options.seasonId, timeZone: options.timeZone, now: new Date().toISOString()});
  console.log(JSON.stringify({mode: options.apply ? 'pending-apply' : 'dry-run', target: options.projectId ? `${options.projectId}/${options.dataset}` : 'offline snapshot (no Sanity access)', creates: plan.operations.filter(item => item.kind === 'create').length, patches: plan.operations.filter(item => item.kind === 'patch').length, review: plan.review, changes: plan.operations.map(item => ({id: item.kind === 'create' ? item.document._id : item.id, operation: item.kind, values: Object.fromEntries(Object.entries(item.kind === 'create' ? item.document : item.set).filter(([field]) => field !== 'import'))}))}, null, 2));
  if (!options.apply) return;
  await confirmApply(`${options.projectId}/${options.dataset}`);
  await store!.commit(plan);
  console.log('Development schedule transaction confirmed.');
}
main().catch(error => {
  // Do not log arbitrary errors/stacks: client errors may retain HTTP secrets.
  console.error(error instanceof SyncError ? error.message : 'Schedule sync stopped unexpectedly. No transaction was confirmed; review configuration/input and rerun a dry-run.');
  process.exitCode = 1;
});
