/**
 * Time helpers. All display formatting happens in the event's timezone so every screen shows the same
 * wall clock, and "now" is corrected by the offset to the server clock (beamer laptops drift).
 */

let serverOffsetMs = 0;

export function setServerTime(serverIso: string, receivedAt = Date.now()) {
  const server = Date.parse(serverIso);
  if (!Number.isNaN(server)) serverOffsetMs = server - receivedAt;
}

export function now(): Date {
  return new Date(Date.now() + serverOffsetMs);
}

const formatters = new Map<string, Intl.DateTimeFormat>();
function fmt(timeZone: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = timeZone + JSON.stringify(options);
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat('de-CH', { timeZone, ...options });
    formatters.set(key, f);
  }
  return f;
}

export function formatTime(value: string | Date, timeZone: string): string {
  return fmt(timeZone, { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value));
}

export function formatWeekday(value: string | Date, timeZone: string, style: 'long' | 'short' = 'long'): string {
  return fmt(timeZone, { weekday: style }).format(new Date(value)).replace('.', '');
}

export function formatDateTime(value: string | Date, timeZone: string): string {
  return fmt(timeZone, { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
    .format(new Date(value))
    .replace('.,', ',');
}

/** "1h 18min", "12 min", "45 s" */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  if (totalSeconds < 60) return `${totalSeconds} s`;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}min`;
}

/** mm:ss countdown for the last minutes, otherwise like formatDuration. */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return '0:00';
  if (ms < 10 * 60_000) {
    const s = Math.ceil(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }
  return formatDuration(ms);
}

/** Converts an ISO instant to the value of an <input type="datetime-local"> in the given zone. */
export function toLocalInput(iso: string | null | undefined, timeZone: string): string {
  if (!iso) return '';
  const parts = fmt(timeZone, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  const hour = get('hour') === '24' ? '00' : get('hour');
  return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}`;
}

/** Inverse of toLocalInput: interprets "2026-10-17T20:00" as wall time in the given zone. */
export function fromLocalInput(value: string, timeZone: string): string | null {
  if (!value) return null;
  const [date, time] = value.split('T');
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = (time ?? '00:00').split(':').map(Number);
  // Start with the UTC guess, then correct by the zone's offset at that moment (twice for DST edges).
  let utc = Date.UTC(y, mo - 1, d, h, mi);
  for (let i = 0; i < 2; i++) {
    const shown = toLocalInput(new Date(utc).toISOString(), timeZone);
    const [sd, st] = shown.split('T');
    const [sy, smo, sdd] = sd.split('-').map(Number);
    const [sh, smi] = st.split(':').map(Number);
    const diff = Date.UTC(sy, smo - 1, sdd, sh, smi) - Date.UTC(y, mo - 1, d, h, mi);
    utc -= diff;
  }
  return new Date(utc).toISOString();
}
