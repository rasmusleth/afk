import {resolve} from 'node:path';
import {assertDevelopmentTarget} from './sanity-store.ts';
import {SyncError} from './model.ts';
export function parseReportOptions(args: string[], base: string) {
  const values = new Map<string, string>(), switches = new Set<string>();
  const flags = ['--competition', '--rules', '--existing', '--project', '--dataset', '--standing-html', '--no-shows'];
  for (let index = 0; index < args.length; index++) {
    const flag = args[index];
    if (['--compare-dbu', '--assume-no-shows-zero'].includes(flag) && !switches.has(flag)) {switches.add(flag); continue;}
    if (!flags.includes(flag) || values.has(flag) || !args[index + 1] || args[index + 1].startsWith('--')) throw new SyncError('Unknown, duplicate or incomplete report option. Use --help.');
    values.set(flag, args[++index]);
  }
  const competitionId = values.get('--competition') ?? '';
  if (!/^[a-zA-Z0-9_-][a-zA-Z0-9._-]{0,127}$/.test(competitionId) || /^(drafts|versions)\./.test(competitionId) || values.get('--rules') !== 'national-futsal-men') throw new SyncError('Supply a published --competition ID and assert --rules national-futsal-men after verifying applicability.');
  const projectId = values.get('--project'), dataset = values.get('--dataset'), existing = values.get('--existing');
  if (existing) {if (projectId || dataset || switches.has('--compare-dbu')) throw new SyncError('Offline snapshot reports do not support Sanity targets or live DBU retrieval.');}
  else assertDevelopmentTarget(projectId ?? '', dataset ?? '');
  if (values.has('--standing-html') && switches.has('--compare-dbu')) throw new SyncError('Choose a saved standing HTML file or live comparison, not both.');
  if (values.has('--no-shows') && switches.has('--assume-no-shows-zero')) throw new SyncError('Choose explicit no-show counts or a verified zero assertion, not both.');
  const path = (flag: string) => values.has(flag) ? resolve(base, values.get(flag)!) : undefined;
  return {competitionId, rules: 'national-futsal-men' as const, projectId, dataset, existing: path('--existing'), standingHtml: path('--standing-html'), noShowsFile: path('--no-shows'), compareDbu: switches.has('--compare-dbu'), assumeNoShowsZero: switches.has('--assume-no-shows-zero')};
}
export function decodeNoShows(value: unknown): Record<string, number> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new SyncError('No-show input must map internal Team IDs to verified non-negative integer counts.');
  const result: Record<string, number> = {};
  for (const [id, count] of Object.entries(value)) {
    if (!id.trim() || typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0) throw new SyncError('Invalid no-show count.');
    Object.defineProperty(result, id, {value: count, enumerable: true});
  }
  return result;
}
