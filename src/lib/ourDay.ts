// ─────────────────────────────────────────────────────────────────────────
// "Our Day" shared math: turns two people's schedule items into the three
// human answers the app actually shows —
//   · what's next for each of you,
//   · when each of you comes free,
//   · the golden window: the first stretch of evening you're BOTH free.
// Heuristic on purpose (an item with no end is assumed to take an hour); the
// labels around these numbers stay soft ("free after ~6:30") rather than
// pretending calendar-grade precision.
// ─────────────────────────────────────────────────────────────────────────
import { ScheduleItem } from '../types/models';

/** Assumed length of a plan that has no explicit end. */
const DEFAULT_LEN_MIN = 60;
/** A moment together needs at least this much room. */
const WINDOW_MIN = 60;
/** Stop looking for windows after this (late-night "free" isn't a suggestion). */
const DAY_END_MIN = 23 * 60;

export function minLabel(min: number): string {
  const m = Math.max(0, Math.min(1439, Math.round(min)));
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(mm).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

type Interval = { start: number; end: number };

/** One person's busy intervals for a day, merged where they overlap/touch. */
export function busyIntervals(items: ScheduleItem[]): Interval[] {
  const raw = items
    .map((s) => ({
      start: s.startMin,
      end: Math.min(1440, (s.endMin != null && s.endMin > s.startMin ? s.endMin : s.startMin + DEFAULT_LEN_MIN)),
    }))
    .sort((a, b) => a.start - b.start);
  const merged: Interval[] = [];
  for (const iv of raw) {
    const last = merged[merged.length - 1];
    if (last && iv.start <= last.end) last.end = Math.max(last.end, iv.end);
    else merged.push({ ...iv });
  }
  return merged;
}

/** The next thing on someone's day (ongoing counts as "now"), or null. */
export function nextBlock(items: ScheduleItem[], nowMin: number): ScheduleItem | null {
  const sorted = [...items].sort((a, b) => a.startMin - b.startMin);
  const ongoing = sorted.find((s) => {
    const end = s.endMin != null && s.endMin > s.startMin ? s.endMin : s.startMin + DEFAULT_LEN_MIN;
    return s.startMin <= nowMin && nowMin < end;
  });
  return ongoing ?? sorted.find((s) => s.startMin >= nowMin) ?? null;
}

/**
 * When this person's remaining obligations end — the minute their last busy
 * interval (at or after now) finishes. null = nothing ahead, free already.
 */
export function freeAfterMin(items: ScheduleItem[], nowMin: number): number | null {
  const ahead = busyIntervals(items).filter((iv) => iv.end > nowMin);
  if (ahead.length === 0) return null;
  return ahead[ahead.length - 1].end;
}

/**
 * The first gap of at least an hour, from `fromMin` to late evening, where
 * NEITHER of you has anything. The romantic payoff of sharing your day.
 */
export function goldenWindow(
  mine: ScheduleItem[],
  theirs: ScheduleItem[],
  fromMin: number,
): Interval | null {
  const busy = busyIntervals([...mine, ...theirs]).filter((iv) => iv.end > fromMin);
  let cursor = Math.max(fromMin, 0);
  for (const iv of busy) {
    if (iv.start - cursor >= WINDOW_MIN && cursor < DAY_END_MIN) {
      return { start: cursor, end: Math.min(iv.start, DAY_END_MIN) };
    }
    cursor = Math.max(cursor, iv.end);
  }
  if (DAY_END_MIN - cursor >= WINDOW_MIN) return { start: cursor, end: DAY_END_MIN };
  return null;
}
