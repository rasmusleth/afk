import type {KickoffSnapshot} from '@afk/dbu/model';
import type {Match} from '@afk/sports/model';
import {SyncError} from './model.ts';

/** The operator asserts the source's IANA zone; DBU HTML supplies no offset. */
export function canonicalKickoff(value: KickoffSnapshot, timeZone: string): Match['kickoff'] {
  if (value.precision === 'unknown') return undefined;
  if (value.precision === 'date') return {_type: 'kickoff', precision: 'date', date: value.date};
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat('en-GB', {timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'});
  } catch { throw new SyncError('Invalid IANA time zone. Supply --time-zone explicitly.'); }
  const wall = `${value.date}T${value.localTime}`;
  const nominal = Date.parse(`${wall}:00Z`);
  if (!Number.isFinite(nominal)) throw new SyncError('Invalid source kickoff date/time.');
  const wallAt = (time: number) => {
    const parts = formatter.formatToParts(time);
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value;
    return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;
  };
  // Enumerate possible offsets around this date using the zone's own Intl data,
  // rather than hardcoding CET/CEST or silently choosing an offset in a DST fold.
  const offsets = new Set<number>();
  for (let hour = -36; hour <= 36; hour += 6) {
    const time = nominal + hour * 3_600_000;
    offsets.add(Date.parse(`${wallAt(time)}:00Z`) - time);
  }
  const candidates = [...offsets].map(offset => nominal - offset).filter(time => wallAt(time) === wall);
  if (candidates.length !== 1) throw new SyncError(`Kickoff ${wall} is ambiguous or nonexistent in ${timeZone}; resolve it before importing.`);
  return {_type: 'kickoff', precision: 'time', dateTime: new Date(candidates[0]).toISOString()};
}
