import type {Competition, Match, Team} from './model.ts';
import {record} from './validation.ts';
export type MatchRecord = Partial<Match> & {_id: string};
export type CompetitionRecord = Partial<Competition> & {_id: string};
export type TeamRecord = Partial<Team> & {_id: string};
export interface DerivationIssue {code: string; message: string; matchId?: string; teamId?: string; field?: string}
export const referenceId = (value: unknown): string | undefined => {
  const id = record(value)._ref;
  return typeof id === 'string' && id.trim() && publishedId(id) ? id : undefined;
};
export const wholeNumber = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
export const publishedId = (id: string) => !id.startsWith('drafts.') && !id.startsWith('versions.');
export function uniqueRecords<T extends {_id: string}>(records: readonly T[], issues: DerivationIssue[]): T[] {
  const counts = new Map<string, number>();
  for (const value of records) counts.set(value._id, (counts.get(value._id) ?? 0) + 1);
  return records.filter(value => {
    if (typeof value._id !== 'string' || !value._id.trim() || !publishedId(value._id)) {
      issues.push({code: 'invalid-document-id', message: 'Unpublished or invalid document excluded.'}); return false;
    }
    if (counts.get(value._id)! > 1) {issues.push({code: 'duplicate-document', matchId: value._id, message: 'Duplicate document ID excluded rather than counting a record twice.'}); return false;}
    return true;
  });
}
export function validFixture(match: MatchRecord, issues: DerivationIssue[]): boolean {
  const home = referenceId(match.homeTeam), away = referenceId(match.awayTeam);
  if (!home || !away || home === away || !referenceId(match.competition)) {
    issues.push({code: 'invalid-fixture', matchId: match._id, message: 'Competition and two distinct Team references are required.'}); return false;
  }
  return true;
}
/** Season membership follows Competition, never a date guess or team-entry ID. */
export function selectSeasonMatches(seasonId: string, competitions: readonly CompetitionRecord[], matches: readonly MatchRecord[]) {
  const issues: DerivationIssue[] = [];
  const all = uniqueRecords(competitions, issues);
  const selected = new Set(all.filter(c => referenceId(c.season) === seasonId).map(c => c._id));
  const known = new Set(all.map(c => c._id));
  const result = uniqueRecords(matches, issues).filter(match => {
    const competition = referenceId(match.competition);
    if (!competition || !known.has(competition)) issues.push({code: 'unknown-competition', matchId: match._id, message: 'Cannot determine Season without the referenced Competition.'});
    return !!competition && selected.has(competition);
  });
  return {matches: result, issues};
}
export function safeSum(a: number, b: number): number {
  const value = a + b;
  if (!Number.isSafeInteger(value)) throw new RangeError('Derived total exceeds safe integer range.');
  return value;
}
