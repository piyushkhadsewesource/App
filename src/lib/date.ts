import { ISODate, Millis } from '../types/models';

const MS_DAY = 24 * 60 * 60 * 1000;

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** Local calendar date as 'YYYY-MM-DD'. */
export function toISODate(d: Date = new Date()): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(): ISODate {
  return toISODate(new Date());
}

export function isoToDate(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map((x) => parseInt(x, 10));
  return new Date(y, (m || 1) - 1, d || 1);
}

export function now(): Millis {
  return Date.now();
}

/** Whole days from a→b (b later → positive). */
export function daysBetween(aISO: ISODate, bISO: ISODate): number {
  const a = isoToDate(aISO).getTime();
  const b = isoToDate(bISO).getTime();
  return Math.round((b - a) / MS_DAY);
}

export function addDaysISO(iso: ISODate, days: number): ISODate {
  const d = isoToDate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** "Jun 14, 2026" */
export function formatDate(value: ISODate | Millis): string {
  const d = typeof value === 'number' ? new Date(value) : isoToDate(value);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** "Jun 14" */
export function formatDayMonth(value: ISODate | Millis): string {
  const d = typeof value === 'number' ? new Date(value) : isoToDate(value);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function monthLabel(iso: ISODate): string {
  const d = isoToDate(iso);
  return `${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

/** "just now", "12m ago", "3h ago", "2d ago", or a date. */
export function formatRelative(ts: Millis): string {
  const diff = Date.now() - ts;
  if (diff < 0) return 'just now';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDayMonth(ts);
}

/** "in 3 days", "in 5 hours", "today", or "delivered". */
export function formatCountdown(ts: Millis): string {
  const diff = ts - Date.now();
  if (diff <= 0) return 'ready to open';
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `in ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `in ${hours} hr`;
  const days = Math.round(hours / 24);
  if (days < 31) return `in ${days} day${days === 1 ? '' : 's'}`;
  const months = Math.round(days / 30);
  return `in ${months} month${months === 1 ? '' : 's'}`;
}

/** Greeting based on the hour. */
export function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Still up';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 22) return 'Good evening';
  return 'Late night';
}

export { MS_DAY };
