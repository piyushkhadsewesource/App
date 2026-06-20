// Helpers for the timestamped "feelings" timeline in the daily pulse.
import { FeelingEntry, ISODate } from '../types/models';
import { todayISO } from './date';

/** A person's feelings for one day, earliest first (for the timeline). */
export function feelingsForDate(list: FeelingEntry[], authorId: string, date: ISODate): FeelingEntry[] {
  return list
    .filter((f) => f.authorId === authorId && f.date === date)
    .sort((a, b) => a.createdAt - b.createdAt);
}

export function todaysFeelings(list: FeelingEntry[], authorId: string): FeelingEntry[] {
  return feelingsForDate(list, authorId, todayISO());
}

/** Average intensity (1..10) of a set of feelings, or null if none. */
export function averageIntensity(items: FeelingEntry[]): number | null {
  if (items.length === 0) return null;
  return items.reduce((s, f) => s + f.intensity, 0) / items.length;
}
