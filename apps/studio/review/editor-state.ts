import {record} from '@afk/sports/validation';
import type {ScheduleFieldBaseline} from '@afk/sports/model';

export interface EditorPatch { type: string; path: readonly unknown[]; origin?: string }
const owned: Record<string, readonly string[]> = {
  season: ['name', 'startDate', 'endDate'], competition: ['name', 'season', 'pointsAdjustments'], team: ['name', 'shortName'], player: ['name', 'profile'],
  match: ['competition', 'homeTeam', 'awayTeam', 'kickoff', 'venue', 'status', 'score'],
  participant: ['team', 'player', 'sourceName', 'shirtNumber', 'lineupStatus', 'appearance'],
  goal: ['team', 'player', 'sourceName', 'minute', 'method', 'assist'],
  yellowCard: ['team', 'player', 'sourceName', 'minute'], redCard: ['team', 'player', 'sourceName', 'minute'],
};
export const isSportsObject = (type: string) => type in owned;
export const overridePaths = (value: unknown): string[] => Array.isArray(record(record(value).import).overrides) ? record(record(value).import).overrides as string[] : [];
export function editedFields(type: string, value: unknown, patches: readonly EditorPatch[]): string[] {
  if (record(record(value).import).origin !== 'imported') return [];
  return [...new Set(patches.flatMap(patch => {
    if (patch.origin === 'remote' || patch.origin === 'internal' || patch.type === 'setIfMissing') return [];
    const root = patch.path[0];
    if (typeof root !== 'string') return [];
    if (owned[type]?.includes(root)) return [root];
    // Editing an embedded field is handled by that object's own wrapper.
    // A manual append/reorder is safe. A removal or whole-array replacement is protected.
    if (type === 'match' && ['events', 'participants'].includes(root) && ((patch.type === 'unset' && patch.path.length <= 2) || (patch.path.length === 1 && patch.type === 'set'))) return [root];
    return [];
  }))];
}
export function fieldLabel(field: string): string {
  const labels: Record<string, string> = {player: 'Player identity', sourceName: 'Source name', shirtNumber: 'Shirt number', lineupStatus: 'Lineup', appearance: 'Appearance', minute: 'Minute', method: 'Scoring method', assist: 'Assist', homeTeam: 'Home team', awayTeam: 'Away team', kickoff: 'Kickoff', venue: 'Venue', status: 'Match status', score: 'Official score', participants: 'Lineup', events: 'Events', name: 'Name', shortName: 'Short name', season: 'Season', competition: 'Competition', startDate: 'Start date', endDate: 'End date', profile: 'Profile', team: 'Team', pointsAdjustments: 'Points adjustments'};
  return labels[field.split('.')[0]] ?? 'Corrected field';
}
/** Accept the current local value before releasing protection, even before a sync. */
export function releaseField(value: unknown, field: string, fingerprint: string): Record<string, unknown> {
  if (!/^[a-f0-9]{64}$/.test(fingerprint)) throw new Error('Invalid field fingerprint.');
  const v = record(value), metadata = record(v.import), root = field.split('.')[0];
  const remaining = overridePaths(value).filter(path => path.split('.')[0] !== root);
  const changes: Record<string, unknown> = {'import.overrides': remaining};
  const baseline: ScheduleFieldBaseline = {_type: 'scheduleFieldBaseline', _key: root, path: root, fingerprint};
  const detail = ['participant', 'goal', 'yellowCard', 'redCard'].includes(String(v._type));
  const primary = detail ? 'detailBaseline' : 'scheduleBaseline';
  for (const name of new Set([primary, ...['scheduleBaseline', 'detailBaseline'].filter(key => Array.isArray(metadata[key]) && metadata[key].some(entry => record(entry).path === root))])) {
    changes[`import.${name}`] = [...(Array.isArray(metadata[name]) ? metadata[name].filter(entry => record(entry).path !== root) : []), baseline];
  }
  if (v._type === 'match' && ['participants', 'events'].includes(root)) {
    changes['import.detailKeys'] = [...(Array.isArray(metadata.detailKeys) ? metadata.detailKeys.filter(key => typeof key === 'string' && !key.startsWith(`${root}:`)) : []), ...(Array.isArray(v[root]) ? v[root].map(record).filter(item => typeof item._key === 'string').map(item => `${root}:${item._key}`) : [])];
  }
  return changes;
}

/** Switching away from credited is an explicit decision to clear the assister. */
export function clearsAssister(patches: readonly (EditorPatch & {value?: unknown})[]): boolean {
  return patches.some(patch => patch.type === 'set' && patch.path.length === 1 && patch.path[0] === 'status' && ['none', 'unknown'].includes(String(patch.value)));
}
