import {parseMatch} from '@afk/dbu/parse';
import {normalizeMatch} from '@afk/dbu/normalize';
import type {ScheduleSnapshot} from '@afk/dbu/model';
import {matchUrl} from './fetch.ts';
import {assertBatchSource, type BatchCandidate, type BatchObservation} from './batch.ts';
import {SyncError} from './model.ts';

/** Sequential, bounded candidate retrieval. Result-only pages never parse lineups/timelines. */
export async function collectBatchObservations(schedule: ScheduleSnapshot, candidates: BatchCandidate[], loadHtml: (matchNumber: string) => Promise<string>, progress?: (index: number, total: number, matchNumber: string) => void): Promise<BatchObservation[]> {
  const observations: BatchObservation[] = [];
  for (const [index, candidate] of candidates.entries()) {
    progress?.(index + 1, candidates.length, candidate.matchNumber);
    let html: string;
    try {html = await loadHtml(candidate.matchNumber);} catch {throw new SyncError(`Could not retrieve selected match ${candidate.matchNumber}; the whole batch was stopped without writing.`);}
    const url = matchUrl(candidate.matchNumber, schedule.external.id);
    const summary = normalizeMatch(parseMatch(html, url, {includeDetails: false}));
    assertBatchSource(summary);
    const result = candidate.includeDetails && summary.value.status === 'completed' && summary.value.score !== undefined
      ? normalizeMatch(parseMatch(html, url)) : summary;
    assertBatchSource(result);
    observations.push({matchNumber: candidate.matchNumber, result});
  }
  return observations;
}
