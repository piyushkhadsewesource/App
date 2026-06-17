// Helpers for the daily-photo "Moments" gallery.
import { ISODate, Moment } from '../types/models';
import { addDaysISO, todayISO } from './date';

/** Newest day first; within a day, newest photo first. */
export function sortMoments(list: Moment[]): Moment[] {
  return [...list].sort((a, b) =>
    a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1,
  );
}

export function momentsForDate(list: Moment[], date: ISODate): Moment[] {
  return sortMoments(list.filter((m) => m.date === date));
}

/** Set of days (YYYY-MM-DD) that have at least one photo. */
export function daysWithMoments(list: Moment[]): Set<ISODate> {
  return new Set(list.map((m) => m.date));
}

export function hasMomentToday(list: Moment[], authorId: string): boolean {
  const t = todayISO();
  return list.some((m) => m.authorId === authorId && m.date === t);
}

/** Consecutive days (ending today or yesterday) with a photo by this author. */
export function captureStreak(list: Moment[], authorId: string): number {
  const days = new Set(list.filter((m) => m.authorId === authorId).map((m) => m.date));
  if (days.size === 0) return 0;
  let cursor = todayISO();
  if (!days.has(cursor)) {
    cursor = addDaysISO(cursor, -1); // a streak can still be "alive" until end of today
    if (!days.has(cursor)) return 0;
  }
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = addDaysISO(cursor, -1);
  }
  return streak;
}

export interface DayGroup {
  date: ISODate;
  items: Moment[];
}

/** Group photos by day, newest day first, for the feed. */
export function groupByDay(list: Moment[]): DayGroup[] {
  const map = new Map<ISODate, Moment[]>();
  for (const m of sortMoments(list)) {
    const arr = map.get(m.date);
    if (arr) arr.push(m);
    else map.set(m.date, [m]);
  }
  return [...map.entries()].map(([date, items]) => ({ date, items }));
}
