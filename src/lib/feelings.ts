// Helpers for the timestamped "feelings" timeline in the daily pulse.
import { FeelingEntry, Millis } from '../types/models';
import { MS_DAY } from './date';

/** Midnight (local) for a given moment, as absolute ms. */
export function startOfLocalDay(d: Date = new Date()): Millis {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

/**
 * A person's feelings that fall within the viewer's local calendar day, matched
 * on the absolute `createdAt` timestamp (earliest first, for the timeline).
 *
 * Why not the stored `date` string? Because that string is the LOGGER's local
 * day. For a long-distance couple in different timezones, the partner's "today"
 * rarely equals the viewer's "today", so a date-string match silently hid the
 * partner's feelings. `createdAt` is an absolute instant, so comparing it to the
 * viewer's local midnight works no matter where each person is.
 */
export function feelingsInDay(list: FeelingEntry[], authorId: string, dayStart: Millis): FeelingEntry[] {
  const dayEnd = dayStart + MS_DAY;
  return list
    .filter((f) => f.authorId === authorId && f.createdAt >= dayStart && f.createdAt < dayEnd)
    .sort((a, b) => a.createdAt - b.createdAt);
}

export function todaysFeelings(list: FeelingEntry[], authorId: string): FeelingEntry[] {
  return feelingsInDay(list, authorId, startOfLocalDay());
}

/** Average intensity (1..10) of a set of feelings, or null if none. */
export function averageIntensity(items: FeelingEntry[]): number | null {
  if (items.length === 0) return null;
  return items.reduce((s, f) => s + f.intensity, 0) / items.length;
}
