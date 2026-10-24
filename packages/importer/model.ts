export class SyncError extends Error {
  constructor(message: string) { super(message); this.name = 'SyncError'; }
}
export interface Document {
  _id: string;
  _type: string;
  _rev?: string;
  [field: string]: unknown;
}
export type Operation =
  | {kind: 'create'; document: Document}
  | {kind: 'patch'; id: string; revision: string; set: Record<string, unknown>};
export interface ReviewItem { documentId: string; field?: string; reason: string }
export interface Plan { operations: Operation[]; review: ReviewItem[] }
export interface Store {
  load(reservedIds: string[]): Promise<Document[]>;
  commit(plan: Plan): Promise<void>;
}
export interface SyncOptions { seasonId: string; timeZone: string; now: string }
