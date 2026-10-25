import {record} from '@afk/sports/validation';
import type {ReviewDocument} from '@afk/sports/review';

/** Refuse incomplete snapshots rather than reporting a misleading empty queue. */
export async function loadReviewDocuments(getPage: (after: string) => Promise<unknown>): Promise<ReviewDocument[]> {
  const documents: ReviewDocument[] = [];
  let after = '';
  for (let page = 0; page < 20; page++) {
    const result = await getPage(after);
    if (!Array.isArray(result) || result.length > 500) throw new Error('Invalid review page.');
    const batch: ReviewDocument[] = [];
    let cursor = after;
    for (const item of result) {
      const document = record(item);
      if (typeof document._id !== 'string' || typeof document._type !== 'string' || document._id <= cursor) throw new Error('Invalid review document or pagination.');
      batch.push({...document, _id: document._id, _type: document._type});
      cursor = document._id;
    }
    documents.push(...batch);
    if (batch.length < 500) return documents;
    after = cursor;
  }
  throw new Error('Review snapshot exceeds its limit.');
}
