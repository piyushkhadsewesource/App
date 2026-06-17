import { Millis } from '../types/models';

export interface Countdown {
  past: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

/** Break a target time into days/hours/minutes/seconds from now. */
export function countdownTo(at: Millis, from: Millis = Date.now()): Countdown {
  const raw = at - from;
  const past = raw <= 0;
  let diff = Math.abs(raw);
  const days = Math.floor(diff / 86_400_000);
  diff -= days * 86_400_000;
  const hours = Math.floor(diff / 3_600_000);
  diff -= hours * 3_600_000;
  const minutes = Math.floor(diff / 60_000);
  diff -= minutes * 60_000;
  const seconds = Math.floor(diff / 1000);
  return { past, days, hours, minutes, seconds };
}

/** Short label for cards, e.g. "23d 4h" or "in 3h". */
export function shortCountdown(at: Millis, from: Millis = Date.now()): string {
  const c = countdownTo(at, from);
  if (c.past) return 'today';
  if (c.days >= 1) return `${c.days}d ${c.hours}h`;
  if (c.hours >= 1) return `${c.hours}h ${c.minutes}m`;
  return `${c.minutes}m`;
}
