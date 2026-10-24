import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import type {ImportMetadata, ScheduleFieldBaseline} from '@afk/sports/model';
import {record, validateImport} from '@afk/sports/validation';
import type {Document, Operation, ReviewItem} from './model.ts';
import {SyncError} from './model.ts';

function canonical(value: unknown): unknown {
  if (value === undefined || value === null) return null;
  if (Array.isArray(value)) return value.map(canonical);
  if (typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, item]) => [key, canonical(item)]));
  return value;
}
export const fingerprint = (value: unknown) => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const same = (a: unknown, b: unknown) => fingerprint(a) === fingerprint(b);
const protects = (paths: string[], field: string) => paths.some(path => path === field || path.startsWith(`${field}.`) || field.startsWith(`${path}.`));
function known(value: unknown): boolean {
  return value != null && value !== '' && value !== 'unknown' && record(value).precision !== 'unknown';
}
function lessPrecise(field: string, local: unknown, incoming: unknown): boolean {
  return field === 'kickoff' && record(local).precision === 'time' && record(incoming).precision !== 'time';
}
/** Only source-owned top-level fields are patched. Never replace a document. */
export function reconcile(
  proposed: Document, current: Document | undefined, fields: string[], now: string,
): {document: Document; operation: Operation; review: ReviewItem[]} {
  if (current && !current._rev) throw new SyncError(`Missing revision on ${current._id}; cannot safely update.`);
  if (current && validateImport(current.import) !== true) throw new SyncError(`Invalid import metadata on ${current._id}; resolve it before syncing.`);
  const previous = record(current?.import);
  const overrides = Array.isArray(previous.overrides) && previous.overrides.every(path => typeof path === 'string') ? [...previous.overrides] : [];
  if (previous.overrides != null && (!Array.isArray(previous.overrides) || !previous.overrides.every(path => typeof path === 'string' && path.trim().length))) throw new SyncError(`Invalid override metadata on ${current?._id}.`);
  const baselines = new Map<string, string>();
  if (previous.scheduleBaseline != null) {
    if (!Array.isArray(previous.scheduleBaseline)) throw new SyncError(`Invalid schedule baseline on ${current?._id}.`);
    for (const item of previous.scheduleBaseline) {
      const baseline = record(item);
      if (typeof baseline.path !== 'string' || typeof baseline.fingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(baseline.fingerprint) || baselines.has(baseline.path)) throw new SyncError(`Invalid schedule baseline on ${current?._id}.`);
      baselines.set(baseline.path, baseline.fingerprint);
    }
  }
  const review: ReviewItem[] = [];
  const set: Record<string, unknown> = {};
  const merged: Document = current ? {...current} : {...proposed};
  for (const field of fields) {
    const local = current?.[field], incoming = proposed[field];
    const baseline = baselines.get(field);
    const manual = !!current && previous.origin !== 'imported';
    const changedLocally = !!current && (baseline ? fingerprint(local) !== baseline : known(local));
    if (manual || changedLocally) {
      if (!protects(overrides, field)) overrides.push(field);
    }
    if (current && protects(overrides, field)) {
      if (known(incoming) && !same(local, incoming)) review.push({documentId: proposed._id, field, reason: 'Protected manual value differs from source.'});
    } else if (known(incoming)) {
      if (current && lessPrecise(field, local, incoming)) {
        review.push({documentId: proposed._id, field, reason: 'Source kickoff has less precision; retained existing kickoff for review.'});
      } else if (!same(local, incoming)) {
        set[field] = incoming;
        merged[field] = incoming;
      }
    }
    // Keep the accepted LOCAL value, including protected edits and explicit
    // unsets. Clearing an override after this sync lets the source take over.
    baselines.set(field, fingerprint(merged[field]));
  }
  const scheduleBaseline: ScheduleFieldBaseline[] = fields.map(path => ({_type: 'scheduleFieldBaseline', _key: path, path, fingerprint: baselines.get(path)!}));
  const reasons = [...new Set([...(typeof previous.reviewReason === 'string' ? previous.reviewReason.split('\n').filter(Boolean) : []), ...review.map(item => `${item.field}: ${item.reason}`)])];
  const metadata: ImportMetadata = {
    ...previous, _type: 'importMetadata', origin: current && previous.origin !== 'imported' ? 'manual' : 'imported',
    firstImportedAt: typeof previous.firstImportedAt === 'string' ? previous.firstImportedAt : now,
    lastScheduleSyncAt: now, overrides, scheduleBaseline,
    ...(review.length ? {needsReview: true, reviewReason: reasons.join('\n')} : {}),
  };
  // Metadata on unrelated detail syncs, review markers and manual arrays survive.
  set.import = metadata;
  merged.import = metadata;
  if (!current) return {document: merged, operation: {kind: 'create', document: merged}, review};
  // Only changes, never unsets/deletes. Revision checking covers the entire
  // document, so an editor racing with this plan causes the transaction to fail.
  for (const field of Object.keys(set)) if (isDeepStrictEqual(set[field], current[field])) delete set[field];
  return {document: merged, operation: {kind: 'patch', id: current._id, revision: current._rev!, set}, review};
}
