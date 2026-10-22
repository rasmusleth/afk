// Runtime checks also usable at the future importer boundary. Studio validation
// does not protect API writes. Partial records and unknown facts are expected.
type RecordValue = Record<string, unknown>;
export const record = (value: unknown): RecordValue =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as RecordValue : {};
const text = (v: unknown) => typeof v === 'string' && v.trim().length > 0;
const ref = (v: unknown) => text(record(v)._ref);
const id = (v: unknown) => record(v)._ref;
const whole = (v: unknown) => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const date = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
const timestamp = (v: unknown) => typeof v === 'string' && date(v.slice(0, 10)) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(v) && !Number.isNaN(Date.parse(v));
const oneOf = (v: unknown, values: readonly string[]) => typeof v === 'string' && values.includes(v);
export type Check = true | string;
export function validateName(value: unknown): Check {
  return text(value) || 'Enter a name that is not blank.';
}
export function validateSeason(value: unknown): Check {
  const v = record(value);
  if (!date(v.startDate) || !date(v.endDate)) return 'Enter both season dates as valid calendar dates.';
  return String(v.startDate) <= String(v.endDate) || 'End date must be on or after start date.';
}
export function validateScore(value: unknown): Check {
  if (value == null) return true;
  const v = record(value);
  return (whole(v.home) && whole(v.away)) || 'Enter both official scores as non-negative whole numbers, or leave the score empty.';
}
export function validateAssist(value: unknown): Check {
  const v = record(value);
  if (!oneOf(v.status, ['credited', 'none', 'unknown'])) return 'Choose an assist state.';
  if (v.status !== 'credited' && (v.player != null || text(v.sourceName))) return 'Only a credited assist can identify an assister.';
  // A credited but unresolved player is valid; preserve the source name.
  return v.status !== 'credited' || ref(v.player) || text(v.sourceName) || 'Identify the credited assister or preserve their source name.';
}
export function validateParticipant(value: unknown): Check {
  const v = record(value);
  if (!ref(v.team)) return 'Choose the participant’s team.';
  if (!ref(v.player) && !text(v.sourceName)) return 'Choose a player or preserve the source player name.';
  if (v.shirtNumber != null && !whole(v.shirtNumber)) return 'Shirt number must be a non-negative whole number.';
  if (!oneOf(v.lineupStatus, ['starter', 'substitute', 'unknown'])) return 'Choose a lineup status.';
  return oneOf(v.appearance, ['played', 'didNotPlay', 'unknown']) || 'Choose an appearance state.';
}
export function validateEvent(value: unknown): Check {
  const v = record(value);
  if (!oneOf(v._type, ['goal', 'yellowCard', 'redCard'])) return 'Unsupported match event type.';
  if (!ref(v.team)) return 'Choose the event’s team.';
  if (!ref(v.player) && !text(v.sourceName)) return 'Choose a player or preserve the source player name.';
  if (v.minute != null && !whole(v.minute)) return 'Minute must be a non-negative whole number.';
  if (v._type !== 'goal' && v.assist != null) return 'Only goals can have assists.';
  if (v._type === 'goal') {
    const result = validateAssist(v.assist);
    if (result !== true) return result;
    if (ref(v.player) && id(v.player) === id(record(v.assist).player)) return 'Scorer and assister must be different players.';
  }
  return true;
}
export function validateAdjustment(value: unknown): Check {
  const v = record(value);
  if (!ref(v.team)) return 'Choose the team affected by the ruling.';
  if (typeof v.points !== 'number' || !Number.isSafeInteger(v.points) || v.points === 0) return 'Enter a non-zero signed whole-number points change.';
  return text(v.reason) || 'Explain the points adjustment.';
}
export function validateExternal(value: unknown): Check {
  if (value == null) return true;
  const v = record(value);
  return (text(v.source) && text(v.id)) || 'External identity needs a source and source identifier.';
}
export function validateTeamIdentity(value: unknown): Check {
  const v = record(value);
  const result = validateExternal(value);
  if (result !== true) return result;
  return v.source !== 'dbu' || text(v.scope) || 'A DBU team-entry identity needs its competition pool scope.';
}
export function validateImport(value: unknown): Check {
  if (value == null) return true;
  const v = record(value);
  if (!oneOf(v.origin, ['manual', 'imported'])) return 'Choose a data origin.';
  if (v.overrides != null && (!Array.isArray(v.overrides) || v.overrides.some(p => !text(p)) || new Set(v.overrides).size !== v.overrides.length)) return 'Override paths must be non-blank and unique.';
  return true;
}
export function validateKickoff(value: unknown): Check {
  if (value == null) return true;
  const v = record(value);
  if (v.precision === 'unknown') return (!v.date && !v.dateTime) || 'Unknown kickoff cannot contain a date or time.';
  if (v.precision === 'date') return (date(v.date) && !v.dateTime) || 'Date-only kickoff needs a date and no invented time.';
  if (v.precision === 'time') return (timestamp(v.dateTime) && !v.date) || 'Known kickoff time needs a timestamp and no separate date.';
  return 'Choose kickoff precision.';
}
export function validateMatch(value: unknown): Check {
  const v = record(value);
  if (!ref(v.competition) || !ref(v.homeTeam) || !ref(v.awayTeam)) return 'Choose a competition and both teams.';
  if (id(v.homeTeam) === id(v.awayTeam)) return 'Home and away teams must be different.';
  if (!oneOf(v.status, ['unknown', 'scheduled', 'completed', 'postponed', 'cancelled', 'abandoned'])) return 'Choose a match status.';
  for (const result of [validateScore(v.score), validateKickoff(v.kickoff)]) if (result !== true) return result;
  for (const name of ['participants', 'events']) {
    const items = v[name];
    if (items == null) continue;
    if (!Array.isArray(items)) return `${name} must be an array.`;
    const keys = items.map(item => record(item)._key);
    if (keys.some(key => !text(key)) || new Set(keys).size !== keys.length) return `${name} need non-blank, unique persistent keys.`;
  }
  const seen = new Set<string>();
  for (const participant of Array.isArray(v.participants) ? v.participants : []) {
    const p = record(participant);
    const result = validateParticipant(p);
    if (result !== true) return result;
    if (![id(v.homeTeam), id(v.awayTeam)].includes(id(p.team))) return 'Participants must belong to one of the match teams.';
    if (ref(p.player)) {
      const key = `${id(p.team)}:${id(p.player)}`;
      if (seen.has(key)) return 'A resolved player may only appear once per team.';
      seen.add(key);
    }
    if (v.status === 'completed' && p.lineupStatus === 'starter' && p.appearance === 'didNotPlay') return 'A starter in a completed match has evidence of an appearance.';
  }
  for (const event of Array.isArray(v.events) ? v.events : []) {
    const e = record(event);
    const result = validateEvent(e);
    if (result !== true) return result;
    if (![id(v.homeTeam), id(v.awayTeam)].includes(id(e.team))) return 'Events must belong to one of the match teams.';
    for (const player of [e.player, record(e.assist).player]) {
      if (!ref(player)) continue;
      const participant = (Array.isArray(v.participants) ? v.participants : []).map(record).find(p => id(p.team) === id(e.team) && id(p.player) === id(player));
      if (participant?.appearance === 'didNotPlay') return 'A player involved in an event has evidence of an appearance.';
    }
  }
  return true;
}
/** Evidence wins over an unresolved appearance; a listed substitute alone proves nothing. */
export function appearanceFromEvidence(match: unknown, participant: unknown): 'played' | 'didNotPlay' | 'unknown' {
  const m = record(match), p = record(participant);
  if (m.status === 'completed' && p.lineupStatus === 'starter') return 'played';
  if (ref(p.player) && (Array.isArray(m.events) ? m.events : []).some(event => {
    const e = record(event);
    return id(e.team) === id(p.team) && [id(e.player), id(record(e.assist).player)].includes(id(p.player));
  })) return 'played';
  return p.appearance === 'played' || p.appearance === 'didNotPlay' ? p.appearance : 'unknown';
}
