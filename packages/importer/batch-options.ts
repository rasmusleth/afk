import {resolve} from 'node:path';
import {parseOptions} from './options.ts';
import {SyncError} from './model.ts';
import type {BatchScope} from './batch.ts';
export function parseBatchOptions(args: string[], base: string) {
  const shared: string[] = [], values = new Map<string, string>();
  for (let index = 0; index < args.length; index++) {
    const flag = args[index];
    if (!['--details', '--club-team-entry', '--match-html-dir'].includes(flag)) {shared.push(flag); continue;}
    if (values.has(flag) || !args[index + 1] || args[index + 1].startsWith('--')) throw new SyncError('Duplicate or incomplete batch option.');
    values.set(flag, args[++index]);
  }
  const options = parseOptions(shared, base);
  const mode = values.get('--details') ?? 'club';
  if (mode !== 'club' && mode !== 'all' && mode !== 'none') throw new SyncError('Choose --details club, all or none.');
  const scope: BatchScope = {details: mode, clubTeamEntryId: values.get('--club-team-entry')};
  if (scope.clubTeamEntryId && (scope.details !== 'club' || !/^\d+$/.test(scope.clubTeamEntryId))) throw new SyncError('Use a numeric --club-team-entry only with club details.');
  const directory = values.get('--match-html-dir');
  if (options.existing && !directory) throw new SyncError('Offline batch mode requires --match-html-dir; it never downloads missing pages.');
  return {...options, ...scope, matchHtmlDir: directory ? resolve(base, directory) : undefined};
}
