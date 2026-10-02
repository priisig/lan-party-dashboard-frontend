import { formatCountdown, formatDuration, fromLocalInput, toLocalInput } from './time';
import { lanDayOf, lanDayTimeToIso, lanDays } from './lanDays';

const TZ = 'Europe/Zurich';

describe('time helpers', () => {
  it('round-trips datetime-local values in the event timezone, also across DST', () => {
    expect(fromLocalInput('2026-10-17T20:00', TZ)).toBe('2026-10-17T18:00:00.000Z'); // CEST
    expect(fromLocalInput('2026-12-05T20:00', TZ)).toBe('2026-12-05T19:00:00.000Z'); // CET
    expect(toLocalInput('2026-10-25T00:30:00.000Z', TZ)).toBe('2026-10-25T02:30'); // DST end day
    expect(fromLocalInput('', TZ)).toBeNull();
  });

  it('formats durations and countdowns', () => {
    expect(formatDuration(78 * 60_000)).toBe('1h 18min');
    expect(formatDuration(12 * 60_000)).toBe('12 min');
    expect(formatDuration(45_000)).toBe('45 s');
    expect(formatCountdown(9 * 60_000 + 5_000)).toBe('9:05');
    expect(formatCountdown(25 * 60_000)).toBe('25 min');
    expect(formatCountdown(-1)).toBe('0:00');
  });
});

describe('LAN days', () => {
  it('counts night hours to the previous day like the backend', () => {
    expect(lanDayOf('2026-10-17T23:30:00.000Z', TZ)).toBe('2026-10-17'); // Sun 01:30 local
    expect(lanDayOf('2026-10-18T04:00:00.000Z', TZ)).toBe('2026-10-18'); // Sun 06:00 local
    expect(lanDayTimeToIso('2026-10-17', '01:00', TZ)).toBe('2026-10-17T23:00:00.000Z');
    expect(lanDayTimeToIso('2026-10-17', '20:00', TZ)).toBe('2026-10-17T18:00:00.000Z');
  });

  it('lists the days of an event', () => {
    const days = lanDays('2026-10-16T16:00:00.000Z', '2026-10-18T12:00:00.000Z', TZ);
    expect(days.map((d) => d.label)).toEqual(['Fr 16.10.', 'Sa 17.10.', 'So 18.10.']);
  });
});
