/** Canonical sports facts. Unknown states are deliberately explicit. */
export interface Reference { _type: 'reference'; _ref: string }
export interface ScheduleFieldBaseline {
  _type: 'scheduleFieldBaseline';
  _key: string;
  path: string;
  fingerprint: string;
}
export interface ImportMetadata {
  _type: 'importMetadata';
  origin: 'manual' | 'imported';
  firstImportedAt?: string;
  lastSeenAt?: string;
  lastScheduleSyncAt?: string;
  lastDetailSyncAt?: string;
  /** Field paths relative to the containing document/object, never display names. */
  overrides?: string[];
  /** Fingerprints of local field values accepted at the last schedule sync. */
  scheduleBaseline?: ScheduleFieldBaseline[];
  detailBaseline?: ScheduleFieldBaseline[];
  /** Source observation fingerprint, not an external event/player identity. */
  detailSignature?: string;
  /** Last accepted array keys detect deliberate local removals. */
  detailKeys?: string[];
  needsReview?: boolean;
  reviewReason?: string;
}
export interface ExternalIdentity {
  _type: 'externalIdentity'; source: string; id: string;
  /** Required for DBU team entries; no assumption of cross-season identity. */
  scope?: string;
  sourceUrl?: string;
}
interface Imported { external?: ExternalIdentity; import?: ImportMetadata }
export interface Season extends Imported { _type: 'season'; name: string; startDate: string; endDate: string }
export interface PointsAdjustment {
  _type: 'pointsAdjustment'; _key: string; team: Reference; points: number;
  reason: string; source?: string; originatingSeason?: Reference;
}
export interface Competition extends Imported {
  _type: 'competition'; name: string; season: Reference; pointsAdjustments?: PointsAdjustment[];
}
export interface Team extends Imported { _type: 'team'; name: string; shortName?: string; isClubTeam?: boolean }
export interface Player extends Imported { _type: 'player'; name: string; profile?: string }
export interface Participant extends Imported {
  _type: 'participant'; _key: string; team: Reference; player?: Reference;
  sourceName?: string; shirtNumber?: number;
  lineupStatus: 'starter' | 'substitute' | 'unknown';
  appearance: 'played' | 'didNotPlay' | 'unknown';
}
export interface Assist {
  _type: 'assist'; status: 'credited' | 'none' | 'unknown';
  player?: Reference; sourceName?: string;
}
interface EventFact extends Imported {
  _key: string; team: Reference; player?: Reference; sourceName?: string; minute?: number;
}
export interface Goal extends EventFact { _type: 'goal'; method?: 'unspecified' | 'penalty'; assist: Assist }
export interface YellowCard extends EventFact { _type: 'yellowCard' }
export interface RedCard extends EventFact { _type: 'redCard' }
export type MatchEvent = Goal | YellowCard | RedCard;
export interface Match extends Imported {
  _type: 'match'; competition: Reference; homeTeam: Reference; awayTeam: Reference;
  kickoff?: { _type: 'kickoff'; precision: 'unknown' | 'date' | 'time'; date?: string; dateTime?: string };
  venue?: string;
  status: 'unknown' | 'scheduled' | 'completed' | 'postponed' | 'cancelled' | 'abandoned';
  score?: { _type: 'score'; home: number; away: number };
  participants?: Participant[]; events?: MatchEvent[];
}
