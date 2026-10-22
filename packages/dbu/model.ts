/** Source observations, before domain normalization. No Sanity identities. */
export type Side = 'home' | 'away';
export interface RawTeam { entryId: string; poolId: string; name: string }
export interface RawFixture {
  matchNumber: string;
  poolId: string;
  sourceUrl: string;
  home: RawTeam;
  away: RawTeam;
  dateText: string;
  timeText: string;
  statusText: string;
  resultText: string;
  homeScoreText: string;
  awayScoreText: string;
  venue?: string;
}
export interface RawSchedule {
  poolId: string;
  name: string;
  sourceUrl: string;
  matches: RawFixture[];
}
export interface RawParticipant {
  side: Side;
  sourceName: string;
  shirtNumberText: string;
  lineupStatus: 'starter' | 'substitute';
}
export interface RawEvent {
  /** Source order only; never use this as a persistent event ID or array key. */
  sourceIndex: number;
  side: Side | 'neutral' | 'unknown';
  sourceName?: string;
  minuteText: string;
  icons: string[];
  text: string;
}
export interface RawMatch extends RawFixture {
  competitionName: string;
  participants?: RawParticipant[];
  events?: RawEvent[];
}

export interface Diagnostic { code: string; path: string; message: string; sourceValue?: string }
export interface Normalized<T> { value: T; diagnostics: Diagnostic[] }
export interface ExternalKey { source: 'dbu'; id: string; scope?: string }
export interface TeamSnapshot { external: ExternalKey; name: string }
/** Preserve wall time without inventing a UTC offset absent from the HTML. */
export type KickoffSnapshot =
  | { precision: 'unknown' }
  | { precision: 'date'; date: string }
  | { precision: 'time'; date: string; localTime: string };
export interface FixtureSnapshot {
  external: ExternalKey;
  competition: ExternalKey;
  sourceUrl: string;
  homeTeam: TeamSnapshot;
  awayTeam: TeamSnapshot;
  kickoff: KickoffSnapshot;
  status: 'completed' | 'postponed' | 'unknown';
  score?: { home: number; away: number };
  venue?: string;
}
export interface ScheduleSnapshot {
  external: ExternalKey;
  name: string;
  sourceUrl: string;
  matches: FixtureSnapshot[];
}
export interface ParticipantSnapshot {
  team: ExternalKey;
  sourceName: string;
  shirtNumber?: number;
  lineupStatus: 'starter' | 'substitute';
  appearance: 'played' | 'unknown';
}
interface EventSnapshotBase {
  sourceIndex: number;
  team?: ExternalKey;
  sourceName?: string;
  minute?: number;
}
export type EventSnapshot =
  | (EventSnapshotBase & { type: 'goal'; team: ExternalKey; method: 'unspecified' | 'penalty'; assist: { status: 'unknown' } })
  | (EventSnapshotBase & { type: 'yellowCard' | 'redCard'; team: ExternalKey })
  | (EventSnapshotBase & { type: 'matchMarker'; text: string })
  | (EventSnapshotBase & { type: 'unsupported'; raw: RawEvent });
export interface MatchSnapshot extends FixtureSnapshot {
  competitionName: string;
  participants?: ParticipantSnapshot[];
  events?: EventSnapshot[];
}
