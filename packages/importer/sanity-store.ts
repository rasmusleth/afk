import {createClient, type BaseMutationOptions, type Mutation} from '@sanity/client';
import {record} from '@afk/sports/validation';
import {SyncError, type Document, type Plan, type Store} from './model.ts';

export interface SanityTransport {
  fetch(query: string, params: Record<string, unknown>): Promise<unknown>;
  mutate(mutations: Mutation[], options: BaseMutationOptions): Promise<unknown>;
}
export function assertDevelopmentTarget(projectId: string, dataset: string) {
  if (!/^[a-z0-9]+$/.test(projectId) || dataset !== 'development') throw new SyncError('Supply a valid project ID and the exact development dataset. Production targets are not supported.');
}
export function decodeDocuments(value: unknown): Document[] {
  if (!Array.isArray(value)) throw new SyncError('Expected a document snapshot array.');
  return value.map(item => {
    const document = record(item);
    if (typeof document._id !== 'string' || typeof document._type !== 'string' || (document._rev != null && typeof document._rev !== 'string')) throw new SyncError('Invalid stored document shape.');
    return {...document, _id: document._id, _type: document._type, _rev: typeof document._rev === 'string' ? document._rev : undefined};
  });
}
export function sanityStore(config: {projectId: string; dataset: string; token: string}, transport?: SanityTransport, purpose: 'schedule' | 'detail' = 'schedule'): Store {
  assertDevelopmentTarget(config.projectId, config.dataset);
  if (!config.token.trim()) throw new SyncError('A token must be supplied through the hidden terminal prompt.');
  const client: SanityTransport = transport ?? createClient({...config, apiVersion: '2026-03-01', perspective: 'raw', useCdn: false, maxRetries: 0, timeout: 30_000});
  return {
    async load(reservedIds) {
      const documents: Document[] = [];
      let after = '';
      try {
        // Raw includes draft/release collisions. Pagination avoids silently
        // truncating the dataset before duplicate source identities are checked.
        for (let page = 0; page < 20; page++) {
          const result = await client.fetch('*[_id > $after && (_type in ["season", "competition", "team", "player", "match"] || _id in $reserved)] | order(_id asc) [0...500]', {after, reserved: reservedIds.flatMap(id => [id, `drafts.${id}`])});
          const batch = decodeDocuments(result);
          if (batch.length > 500 || batch.some(document => document._id <= after)) throw new SyncError('Invalid pagination result from the store.');
          documents.push(...batch);
          if (batch.length < 500) return documents;
          after = batch[batch.length - 1]._id;
        }
        throw new SyncError('Development snapshot exceeds the initial importer limit; nothing was written.');
      } catch (error) {
        if (error instanceof SyncError) throw error;
        // Never forward client errors, request objects, headers, or causes.
        throw new SyncError('Sanity snapshot read failed. Check the project, dataset, token permissions and network.');
      }
    },
    async commit(plan: Plan) {
      if (!plan.operations.length) return;
      const allowed = new Set(purpose === 'detail' ? ['status', 'participants', 'events', 'import'] : ['name', 'season', 'competition', 'homeTeam', 'awayTeam', 'kickoff', 'venue', 'status', 'score', 'import']);
      const mutations: Mutation[] = plan.operations.map(operation => {
        const id = operation.kind === 'create' ? operation.document._id : operation.id;
        if (!id || id.startsWith('drafts.') || id.startsWith('versions.')) throw new SyncError('Only published sports documents can be written.');
        if (operation.kind === 'create') {
          if (purpose === 'detail' || !['competition', 'team', 'match'].includes(operation.document._type)) throw new SyncError('Unsupported imported document type.');
          return {create: operation.document};
        }
        if (!operation.revision || Object.keys(operation.set).some(field => !allowed.has(field))) throw new SyncError('Unsafe schedule patch refused.');
        return {patch: {id, ifRevisionID: operation.revision, set: operation.set}};
      });
      if (mutations.length > 500 || Buffer.byteLength(JSON.stringify(mutations)) > 4_000_000) throw new SyncError('Plan exceeds the initial atomic-import limit; nothing was written.');
      try {
        await client.mutate(mutations, {returnDocuments: false, visibility: 'sync', autoGenerateArrayKeys: false});
      } catch {
        throw new SyncError('Sanity transaction was not confirmed. It may have committed; rerun a dry-run before retrying. Concurrent changes require a fresh plan.');
      }
    },
  };
}
