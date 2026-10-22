import type {
  Diagnostic, EventSnapshot, ExternalKey, FixtureSnapshot, KickoffSnapshot,
  MatchSnapshot, Normalized, RawEvent, RawFixture, RawMatch, RawSchedule,
  RawTeam, ScheduleSnapshot,
} from './model.ts';

const key = (id: string, scope?: string): ExternalKey => ({source: 'dbu', id, ...(scope ? {scope} : {})});
const team = (value: RawTeam) => ({external: key(value.entryId, value.poolId), name: value.name});
function issue(diagnostics: Diagnostic[], code: string, path: string, message: string, sourceValue?: string) {
  diagnostics.push({code, path, message, sourceValue});
}
function whole(value: string): number | undefined {
  if (!/^\d+$/.test(value)) return undefined;
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : undefined;
}
function kickoff(dateText: string, timeText: string, diagnostics: Diagnostic[]): KickoffSnapshot {
  const parts = dateText.match(/(\d{2})-(\d{2})[ -](\d{4})$/);
  const date = parts ? `${parts[3]}-${parts[2]}-${parts[1]}` : undefined;
  if (!date || Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) {
    if (dateText || timeText) issue(diagnostics, 'invalid-date', 'kickoff', 'Date not recognized; kickoff remains unknown.', dateText);
    return {precision: 'unknown'};
  }
  if (!timeText) return {precision: 'date', date};
  const time = timeText.replace(/^Kl\.\s*/u, '');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    issue(diagnostics, 'invalid-time', 'kickoff', 'Time not recognized; preserve the known date only.', timeText);
    return {precision: 'date', date};
  }
  return {precision: 'time', date, localTime: time};
}
function status(value: string, diagnostics: Diagnostic[]): FixtureSnapshot['status'] {
  if (value === 'Færdigspillet') return 'completed';
  if (value === 'UDS' || value === 'Kamp udsat') return 'postponed';
  if (value) issue(diagnostics, 'unknown-status', 'status', 'Unverified source status; do not infer a result or exceptional ruling.', value);
  // Blank schedule/detail status is not evidence that a result is final or
  // that an unreported past fixture is still scheduled. No clock-based guesses.
  return 'unknown';
}
function fixture(raw: RawFixture, diagnostics: Diagnostic[]): FixtureSnapshot {
  const value: FixtureSnapshot = {
    external: key(raw.matchNumber), competition: key(raw.poolId), sourceUrl: raw.sourceUrl,
    homeTeam: team(raw.home), awayTeam: team(raw.away),
    kickoff: kickoff(raw.dateText, raw.timeText, diagnostics),
    status: status(raw.statusText, diagnostics), venue: raw.venue,
  };
  const home = whole(raw.homeScoreText), away = whole(raw.awayScoreText);
  if (home !== undefined && away !== undefined) value.score = {home, away};
  else if (raw.homeScoreText || raw.awayScoreText) issue(diagnostics, 'invalid-score', 'score', 'Score needs two non-negative whole numbers; no partial or guessed result is stored.', raw.resultText);
  else if (raw.resultText && raw.resultText !== '-' && raw.resultText !== raw.statusText) issue(diagnostics, 'unknown-result', 'score', 'Unrecognized result text; preserve for review without inventing goals.', raw.resultText);
  return value;
}
export function normalizeSchedule(raw: RawSchedule): Normalized<ScheduleSnapshot> {
  const diagnostics: Diagnostic[] = [];
  return {
    value: {external: key(raw.poolId), name: raw.name, sourceUrl: raw.sourceUrl, matches: raw.matches.map((match, index) => {
      const local: Diagnostic[] = [];
      const value = fixture(match, local);
      diagnostics.push(...local.map(item => ({...item, path: `matches[${index}].${item.path}`})));
      return value;
    })}, diagnostics,
  };
}
const eventIcons = {
  '/Content/Gfx/SR/livescorev2/icon_sr_goal.svg': 'goal',
  '/Content/Gfx/SR/livescorev2/icon_sr_penaltyGoal.svg': 'penaltyGoal',
  '/Content/Gfx/SR/livescorev2/icon_sr_yellow.svg': 'yellowCard',
  '/Content/Gfx/SR/livescorev2/icon_sr_red.svg': 'redCard',
} as const;
function iconType(icon: string): typeof eventIcons[keyof typeof eventIcons] | undefined {
  try {
    const url = new URL(icon, 'https://dbu.dk');
    if (!['dbu.dk', 'www.dbu.dk'].includes(url.hostname)) return undefined;
    const path = url.pathname;
    return path in eventIcons ? eventIcons[path as keyof typeof eventIcons] : undefined;
  } catch { return undefined; }
}
function event(raw: RawEvent, match: FixtureSnapshot, diagnostics: Diagnostic[]): EventSnapshot {
  const path = `events[${raw.sourceIndex}]`;
  const minuteText = raw.minuteText.replace(/^'/u, '');
  const minute = whole(minuteText);
  if (raw.minuteText && minute === undefined) issue(diagnostics, 'invalid-minute', `${path}.minute`, 'Minute is unknown; preserve the original notation for review.', raw.minuteText);
  const base = {
    sourceIndex: raw.sourceIndex, minute, sourceName: raw.sourceName,
    team: raw.side === 'home' ? match.homeTeam.external : raw.side === 'away' ? match.awayTeam.external : undefined,
  };
  if (raw.side === 'neutral' && raw.icons.length === 0 && raw.text) return {...base, type: 'matchMarker', text: raw.text};
  const type = raw.icons.length === 1 ? iconType(raw.icons[0]) : undefined;
  if (!type || !base.team) {
    issue(diagnostics, 'unsupported-event', path, 'Unmapped icon or side; retained without crediting any player statistic.', raw.icons.join(', ') || raw.text);
    return {...base, type: 'unsupported', raw};
  }
  const known = {...base, team: base.team};
  if (!raw.sourceName) issue(diagnostics, 'unknown-event-player', `${path}.sourceName`, 'Known event with unresolved source player; do not invent an identity.');
  if (type === 'goal' || type === 'penaltyGoal') return {...known, type: 'goal', method: type === 'penaltyGoal' ? 'penalty' : 'unspecified', assist: {status: 'unknown'}};
  return {...known, type};
}
export function normalizeMatch(raw: RawMatch): Normalized<MatchSnapshot> {
  const diagnostics: Diagnostic[] = [];
  const value: MatchSnapshot = {...fixture(raw, diagnostics), competitionName: raw.competitionName};
  if (raw.participants !== undefined) value.participants = raw.participants.map((participant, index) => {
    const shirtNumber = whole(participant.shirtNumberText);
    if (participant.shirtNumberText && shirtNumber === undefined) issue(diagnostics, 'invalid-shirt-number', `participants[${index}].shirtNumber`, 'Shirt number remains unknown.', participant.shirtNumberText);
    return {
      team: participant.side === 'home' ? value.homeTeam.external : value.awayTeam.external,
      sourceName: participant.sourceName, shirtNumber, lineupStatus: participant.lineupStatus,
      // No Player IDs are present. A name match against a timeline row does
      // not establish identity, even if only one lineup name happens to match.
      appearance: participant.lineupStatus === 'starter' && value.status === 'completed' ? 'played' : 'unknown',
    };
  });
  if (raw.events !== undefined) value.events = raw.events.map(item => event(item, value, diagnostics));
  return {value, diagnostics};
}
