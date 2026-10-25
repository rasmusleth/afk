import {resolve} from 'node:path';
import {SyncError} from './model.ts';
import {assertDevelopmentTarget} from './sanity-store.ts';
export interface Options {
  poolId: string; seasonId: string; timeZone: string;
  html?: string; existing?: string; projectId?: string; dataset?: string; apply: boolean;
}
export function parseOptions(args: string[], base: string): Options {
  const values = new Map<string, string>();
  let apply = false;
  const flags = ['--pool', '--season', '--time-zone', '--html', '--existing', '--project', '--dataset'];
  for (let index = 0; index < args.length; index++) {
    const flag = args[index];
    if (flag === '--apply') { if (apply) throw new SyncError('Duplicate --apply option.'); apply = true; continue; }
    if (!flags.includes(flag) || values.has(flag) || !args[index + 1] || args[index + 1].startsWith('--')) throw new SyncError('Unknown, duplicate or incomplete option. Use --help. Tokens are never accepted as command-line arguments.');
    values.set(flag, args[++index]);
  }
  const poolId = values.get('--pool') ?? '', seasonId = values.get('--season') ?? '', timeZone = values.get('--time-zone') ?? '';
  if (!/^\d+$/.test(poolId) || !/^[a-zA-Z0-9_-][a-zA-Z0-9._-]{0,127}$/.test(seasonId) || seasonId.startsWith('drafts.') || seasonId.startsWith('versions.') || !timeZone) throw new SyncError('Supply --pool, a published --season ID and an explicit --time-zone.');
  try { new Intl.DateTimeFormat('en', {timeZone}); } catch { throw new SyncError('Invalid IANA time zone.'); }
  const existing = values.get('--existing'), html = values.get('--html');
  const projectId = values.get('--project'), dataset = values.get('--dataset');
  if (existing) {
    if (apply || projectId || dataset || !html) throw new SyncError('Offline snapshot mode requires --html and --existing, and does not support --apply or Sanity targets.');
  } else {
    assertDevelopmentTarget(projectId ?? '', dataset ?? '');
  }
  return {poolId, seasonId, timeZone, apply, projectId, dataset, ...(html ? {html: resolve(base, html)} : {}), ...(existing ? {existing: resolve(base, existing)} : {})};
}
