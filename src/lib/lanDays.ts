import { formatTime, formatWeekday, fromLocalInput, toLocalInput } from './time';

/** Same rule as the backend (ScheduleService.DAY_CUTOFF): before 06:00 still counts as the previous LAN day. */
export const DAY_CUTOFF_HOUR = 6;

export interface LanDay {
  key: string; // YYYY-MM-DD
  label: string; // "Fr 16.10."
}

function addDays(key: string, days: number): string {
  const d = new Date(key + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function lanDayOf(iso: string, timeZone: string): string {
  const local = toLocalInput(iso, timeZone);
  const [date, time] = local.split('T');
  return Number(time.slice(0, 2)) < DAY_CUTOFF_HOUR ? addDays(date, -1) : date;
}

export function lanDays(startsAt: string, endsAt: string, timeZone: string): LanDay[] {
  const days: LanDay[] = [];
  let key = lanDayOf(startsAt, timeZone);
  const last = lanDayOf(endsAt, timeZone);
  for (let i = 0; i < 14 && key <= last; i++) {
    const noon = fromLocalInput(key + 'T12:00', timeZone)!;
    const [, m, d] = key.split('-');
    days.push({ key, label: `${formatWeekday(noon, timeZone, 'short').slice(0, 2)} ${d}.${m}.` });
    key = addDays(key, 1);
  }
  return days;
}

/** Combines a LAN day and a wall-clock time ("01:00" on Friday's LAN day is Saturday 01:00). */
export function lanDayTimeToIso(dayKey: string, time: string, timeZone: string): string {
  const hour = Number(time.slice(0, 2));
  const date = hour < DAY_CUTOFF_HOUR ? addDays(dayKey, 1) : dayKey;
  return fromLocalInput(`${date}T${time}`, timeZone)!;
}

export function timeOf(iso: string, timeZone: string): string {
  return formatTime(iso, timeZone);
}
