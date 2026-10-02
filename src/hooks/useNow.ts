import { useEffect, useState } from 'react';
import { now } from '../lib/time';

/** Server-corrected current time, re-rendering every {@code intervalMs}. */
export function useNow(intervalMs = 1000): Date {
  const [value, setValue] = useState(now);
  useEffect(() => {
    const id = window.setInterval(() => setValue(now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return value;
}
