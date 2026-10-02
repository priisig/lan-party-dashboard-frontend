import { useNow } from '../hooks/useNow';
import { formatTime, formatWeekday } from '../lib/time';

export function Clock({ timeZone }: { timeZone: string }) {
  const now = useNow(1000);
  return (
    <div className="clock">
      <time className="clock__time mono" dateTime={now.toISOString()}>
        {formatTime(now, timeZone)}
      </time>
      <span className="clock__day">{formatWeekday(now, timeZone)}</span>
    </div>
  );
}
