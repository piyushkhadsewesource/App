// ─────────────────────────────────────────────────────────────────────────
// The Golden Hour — the lantern over the golden window. Our Day already
// computes when you're both free; this turns that math into a daily
// appointment: the lantern is lit for tonight's window, burns while the
// window is open, and the hearth ignites when you're BOTH actually here
// (live presence, honest data) while it burns. No streaks, no guilt: a
// missed lantern just stays warm.
// ─────────────────────────────────────────────────────────────────────────
import { ScheduleItem } from '../types/models';
import { goldenWindow } from './ourDay';

export type Lantern =
  | { kind: 'none' }
  | { kind: 'waiting'; start: number; end: number; minutesUntil: number }
  | { kind: 'burning'; start: number; end: number; minutesLeft: number }
  | { kind: 'passed'; start: number; end: number };

/** The lantern is an EVENING ritual: the window is sought from 5pm on. */
const LANTERN_FROM = 17 * 60;

/**
 * Tonight's lantern, from both lanes of today's schedule. The lantern only
 * exists once BOTH people have shared their day (a window computed from one
 * lane is a guess, not a promise).
 */
export function lanternFor(mine: ScheduleItem[], theirs: ScheduleItem[], nowMin: number): Lantern {
  if (mine.length === 0 || theirs.length === 0) return { kind: 'none' };
  // Anchored to a fixed evening baseline, so it is the SAME appointment all
  // day (never drifting as the day is consumed), and always tonight's window,
  // never a stray free stretch at 6am.
  const w = goldenWindow(mine, theirs, LANTERN_FROM);
  if (!w) return { kind: 'none' };
  if (nowMin < w.start) return { kind: 'waiting', start: w.start, end: w.end, minutesUntil: w.start - nowMin };
  if (nowMin < w.end) return { kind: 'burning', start: w.start, end: w.end, minutesLeft: w.end - nowMin };
  return { kind: 'passed', start: w.start, end: w.end };
}

/** The hearth ignites only when the lantern burns AND both are truly here. */
export function hearthIgnited(lantern: Lantern, partnerHereNow: boolean): boolean {
  return lantern.kind === 'burning' && partnerHereNow;
}
