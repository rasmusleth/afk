import {readFile} from 'node:fs/promises';
import {parseMatch} from '@afk/dbu/parse';
import {normalizeMatch} from '@afk/dbu/normalize';
import {fetchMatch, matchUrl} from './fetch.ts';
import {parseDetailOptions} from './detail-options.ts';
import {planMatchDetails} from './details.ts';
import {readToken, confirmApply} from './prompt.ts';
import {decodeDocuments, sanityStore} from './sanity-store.ts';
import {SyncError} from './model.ts';

async function main() {
  if (process.argv.slice(2).includes('--help')) {
    console.log(`Manual DBU match detail import (dry-run by default).
Required: --match NUMBER --pool ID
Offline: --html FILE --existing DOCUMENT_ARRAY_JSON
Connected: --project ID --dataset development [--html FILE]
Write: connected options plus --apply and typed confirmation.
Run schedule sync first. No Player creation, deletion, production target or token flags.`); return;
  }
  const options = parseDetailOptions(process.argv.slice(2), process.env.INIT_CWD ?? process.cwd());
  const html = options.html ? await readFile(options.html, 'utf8') : await fetchMatch(options.match, options.pool);
  const normalized = normalizeMatch(parseMatch(html, matchUrl(options.match, options.pool)));
  if (normalized.value.external.id !== options.match || normalized.value.competition.id !== options.pool) throw new SyncError('Source match/pool identity does not match the requested page.');
  const blocking = normalized.diagnostics.filter(item => !['unsupported-event', 'unknown-event-player', 'invalid-minute', 'invalid-shirt-number'].includes(item.code));
  if (blocking.length) throw new SyncError('Source normalization requires review; nothing was written.');
  const store = options.existing ? undefined : sanityStore({projectId: options.projectId!, dataset: options.dataset!, token: await readToken()}, undefined, 'detail');
  const documents = options.existing ? decodeDocuments(JSON.parse(await readFile(options.existing, 'utf8'))) : await store!.load([]);
  const plan = planMatchDetails(normalized.value, documents, new Date().toISOString(), normalized.diagnostics);
  console.log(JSON.stringify({mode: options.apply ? 'pending-apply' : 'dry-run', target: options.projectId ? `${options.projectId}/development` : 'offline snapshot (no Sanity access)',
    patches: plan.operations.length, diagnostics: normalized.diagnostics, review: plan.review,
    changes: plan.operations.map(operation => operation.kind === 'patch' ? {id: operation.id, values: Object.fromEntries(Object.entries(operation.set).filter(([field]) => field !== 'import'))} : {})}, null, 2));
  if (!options.apply) return;
  await confirmApply(`${options.projectId}/development`);
  await store!.commit(plan);
  console.log('Development match-detail transaction confirmed.');
}
main().catch(error => {
  console.error(error instanceof SyncError ? error.message : 'Match detail sync stopped unexpectedly. No transaction was confirmed; rerun a dry-run.');
  process.exitCode = 1;
});
