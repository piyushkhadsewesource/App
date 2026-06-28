import { useEffect, useState } from 'react';

/**
 * A clock that ticks on an interval so time-derived UI (countdowns, "active
 * now" presence, letters crossing their delivery time) re-flows on its own
 * instead of going stale until some unrelated state change forces a re-render.
 * Cleans up on unmount.
 */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
