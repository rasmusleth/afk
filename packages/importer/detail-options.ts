import {resolve} from 'node:path';
import {assertDevelopmentTarget} from './sanity-store.ts';
import {SyncError} from './model.ts';
export function parseDetailOptions(args: string[], base: string) {
  const values = new Map<string, string>();
  let apply = false;
  const flags = ['--match', '--pool', '--html', '--existing', '--project', '--dataset'];
  for (let index = 0; index < args.length; index++) {
    const flag = args[index];
    if (flag === '--apply' && !apply) {apply = true; continue;}
    if (!flags.includes(flag) || values.has(flag) || !args[index + 1] || args[index + 1].startsWith('--')) throw new SyncError('Unknown, duplicate or incomplete detail option. Use --help.');
    values.set(flag, args[++index]);
  }
  const match = values.get('--match') ?? '', pool = values.get('--pool') ?? '';
  if (!/^\d+$/.test(match) || !/^\d+$/.test(pool)) throw new SyncError('Supply numeric --match and --pool identifiers.');
  const html = values.get('--html'), existing = values.get('--existing');
  const projectId = values.get('--project'), dataset = values.get('--dataset');
  if (existing) {
    if (!html || apply || projectId || dataset) throw new SyncError('Offline details require --html and --existing without a target or --apply.');
  } else assertDevelopmentTarget(projectId ?? '', dataset ?? '');
  return {match, pool, apply, projectId, dataset, html: html ? resolve(base, html) : undefined, existing: existing ? resolve(base, existing) : undefined};
}
