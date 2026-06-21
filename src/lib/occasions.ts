import { Occasion } from '../types/models';

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function anchorDate(o: Occasion): Date {
  const [y, m, d] = o.date.split('-').map((n) => parseInt(n, 10));
  return new Date(y || 2024, (m || 1) - 1, d || 1);
}

/** The next date this occasion happens, from `from` onward. */
export function nextOccurrence(o: Occasion, from = new Date()): Date {
  const anchor = anchorDate(o);
  const base = new Date(from);
  base.setHours(0, 0, 0, 0);
  if (o.recurrence === 'once') return anchor;
  if (o.recurrence === 'yearly') {
    let nx = new Date(base.getFullYear(), anchor.getMonth(), anchor.getDate());
    if (nx < base) nx = new Date(base.getFullYear() + 1, anchor.getMonth(), anchor.getDate());
    return nx;
  }
  let nx = new Date(base.getFullYear(), base.getMonth(), anchor.getDate());
  if (nx < base) nx = new Date(base.getFullYear(), base.getMonth() + 1, anchor.getDate());
  return nx;
}

export function daysUntil(d: Date): number {
  const a = new Date(d);
  a.setHours(0, 0, 0, 0);
  return Math.round((a.getTime() - startOfToday().getTime()) / 86_400_000);
}

export function untilLabel(n: number): string {
  if (n <= 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n < 31) return `In ${n} days`;
  const months = Math.round(n / 30);
  return months <= 1 ? 'In about a month' : `In about ${months} months`;
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** For yearly occasions: which anniversary number the next occurrence is. */
export function yearsAt(o: Occasion, occurrence: Date): number | null {
  if (o.recurrence !== 'yearly') return null;
  const n = occurrence.getFullYear() - anchorDate(o).getFullYear();
  return n >= 0 ? n : null;
}

export function sortByNext(list: Occasion[]): Occasion[] {
  return [...list].sort((a, b) => nextOccurrence(a).getTime() - nextOccurrence(b).getTime());
}

/** The most imminent upcoming occasion within a window (for Home surfacing). */
export function upcomingOccasion(
  list: Occasion[],
  withinDays = 31,
  minDays = 0,
): { occasion: Occasion; days: number; date: Date } | null {
  let best: { occasion: Occasion; days: number; date: Date } | null = null;
  for (const o of list) {
    const date = nextOccurrence(o);
    const days = daysUntil(date);
    if (days >= minDays && days <= withinDays && (!best || days < best.days)) best = { occasion: o, days, date };
  }
  return best;
}

/**
 * Saved dates whose month/day is today, with how many years ago the anchor was
 * (for "a year ago today" nostalgia). Yearly occasions, or one-time dates that
 * have since passed, qualify. Most years-ago first.
 */
export function occasionsOnThisDay(list: Occasion[]): { occasion: Occasion; yearsAgo: number }[] {
  const now = new Date();
  const m = now.getMonth();
  const d = now.getDate();
  const out: { occasion: Occasion; yearsAgo: number }[] = [];
  for (const o of list) {
    const a = anchorDate(o);
    if (a.getMonth() !== m || a.getDate() !== d) continue;
    const yearsAgo = now.getFullYear() - a.getFullYear();
    if (o.recurrence === 'yearly' || (o.recurrence === 'once' && yearsAgo >= 1)) {
      out.push({ occasion: o, yearsAgo });
    }
  }
  return out.sort((x, y) => y.yearsAgo - x.yearsAgo);
}
