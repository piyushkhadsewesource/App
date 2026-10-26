import { Millis } from '../types/models';
import { formatDayMonth } from './date';

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

/**
 * The reunion's own name, unless it only repeats the card's title. Cards read
 * "Together again in 24d 4h", so a label of "Together again 💞" said the same
 * thing twice; then the date itself is the more useful second line.
 */
export function reunionLabel(label: string | undefined, at: Millis): string {
  const plain = (label ?? '').toLowerCase().replace(/[^a-z ]/g, '').trim();
  if (plain && plain !== 'together again') return label!.trim();
  return `${formatDayMonth(at)}, ${clockLabel(at)}`;
}

function clockLabel(at: Millis): string {
  const d = new Date(at);
  const h = d.getHours();
  const m = d.getMinutes();
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h < 12 ? 'AM' : 'PM'}`;
}
