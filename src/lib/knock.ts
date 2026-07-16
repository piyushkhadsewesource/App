// ─────────────────────────────────────────────────────────────────────────
// Our Knock — haptic signatures. Everyone knocks on a door differently:
// each partner records a short tap rhythm (a handful of ms offsets, a few
// bytes synced), and that rhythm becomes their tactile signature. On
// Android the phone literally knocks the way they knock; on the iOS PWA
// (no vibration API) the same rhythm plays as a visual ripple, so the
// information survives the platform (web-safe or it doesn't ship).
// ─────────────────────────────────────────────────────────────────────────
import { hMedium } from './haptics';

/** Humanly-plausible gaps between taps; the signature stays short. */
export const KNOCK_MIN_GAP = 80;
export const KNOCK_MAX_GAP = 1500;
export const KNOCK_MAX_TAPS = 12;
export const KNOCK_MIN_TAPS = 2;

/** Tap timestamps (ms) → clean intervals between taps. */
export function intervalsFromTaps(taps: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < taps.length && out.length < KNOCK_MAX_TAPS - 1; i++) {
    const gap = Math.round(taps[i] - taps[i - 1]);
    if (Number.isFinite(gap)) out.push(Math.max(KNOCK_MIN_GAP, Math.min(KNOCK_MAX_GAP, gap)));
  }
  return out;
}

export function validKnock(intervals: number[] | undefined | null): intervals is number[] {
  return Array.isArray(intervals) && intervals.length >= KNOCK_MIN_TAPS - 1 && intervals.length <= KNOCK_MAX_TAPS;
}

/**
 * Play a knock: fires `onTap(index)` for the visual ripple and a medium
 * haptic thump per tap (no-op on web via the haptics guard). Returns a
 * cancel function; always call it on unmount.
 */
export function playKnock(intervals: number[], onTap: (index: number) => void): () => void {
  const timers: ReturnType<typeof setTimeout>[] = [];
  let at = 0;
  const fire = (i: number) => {
    hMedium();
    onTap(i);
  };
  timers.push(setTimeout(() => fire(0), 0));
  intervals.forEach((gap, i) => {
    at += gap;
    timers.push(setTimeout(() => fire(i + 1), at));
  });
  return () => timers.forEach(clearTimeout);
}

/** Total duration of a knock (ms), for scheduling what follows it. */
export function knockDuration(intervals: number[]): number {
  return intervals.reduce((a, b) => a + b, 0);
}

/**
 * Does a tapped answer match a knock? Generous, human tolerance: this checks
 * the RHYTHM (same number of taps, each gap within 40% or 150ms), never
 * precision. Answering a knock should feel like recognition, not a test.
 */
export function matchKnock(expected: number[], actualTaps: number[]): boolean {
  const actual = intervalsFromTaps(actualTaps);
  if (actual.length !== expected.length) return false;
  for (let i = 0; i < expected.length; i++) {
    const tol = Math.max(150, expected[i] * 0.4);
    if (Math.abs(actual[i] - expected[i]) > tol) return false;
  }
  return true;
}
