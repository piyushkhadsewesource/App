// ─────────────────────────────────────────────────────────────────────────
// Pulse rhythm maths for Through the Glass. Pure and dependency-free so the
// tender surface stays thin: a recorded heartbeat is nothing but the gaps
// between taps, and every reading the UI shows is derived here.
//
// Only humanly-plausible gaps ever survive. A mistimed tap (a stumble, a
// pause to scratch your nose) must never become a "heartbeat" the other
// person feels played back to them, and must never skew the reading.
// ─────────────────────────────────────────────────────────────────────────

/** ~240 bpm — faster than a human resting pulse can plausibly be tapped. */
export const BEAT_MIN_MS = 250;
/** ~24 bpm — slower than a pulse; anything longer is a pause, not a beat. */
export const BEAT_MAX_MS = 2500;

/** True when a gap could plausibly be one beat of a human pulse. */
export function isPlausibleBeat(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n >= BEAT_MIN_MS && n <= BEAT_MAX_MS;
}

/**
 * The usable rhythm inside a recording, or null when there isn't enough of
 * one to play back. Two gaps is the floor — a single gap is a coincidence,
 * not a rhythm.
 */
export function plausibleIntervals(arr?: number[] | null): number[] | null {
  const safe = (arr ?? []).filter(isPlausibleBeat);
  return safe.length >= 2 ? safe : null;
}

/**
 * Beats per minute from the MEDIAN gap, not the mean: one long pause while
 * someone finds their pulse would drag an average badly, while the median
 * shrugs it off. Null when there's nothing usable to read.
 */
export function bpmOf(intervals: number[]): number | null {
  const safe = (intervals ?? []).filter(isPlausibleBeat);
  if (safe.length === 0) return null;
  const sorted = [...safe].sort((a, b) => a - b);
  const mid = sorted.length / 2;
  // Even counts average the two middle gaps, so a two-tap rhythm reads true
  // rather than arbitrarily picking the faster half.
  const median =
    sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[Math.floor(mid)];
  return Math.round(60_000 / median);
}
