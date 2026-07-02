// ─────────────────────────────────────────────────────────────────────────
// Walking Each Other Home — every real step either of you takes subtracts
// from the distance between your two cities.
//
// Step data is tiered honestly by what each platform can actually do:
//   • iOS: Core Motion answers "how many steps between two dates?", so the
//     day's count syncs automatically (expo-sensors Pedometer).
//   • Android: the SDK's getStepCountAsync throws NotSupportedException (no
//     historical query without Health Connect), so steps are logged as a
//     small daily ritual — minutes walked or a step count.
//   • Web: manual logging only.
// All Pedometer access goes through guarded requires: binaries that predate
// expo-sensors degrade to manual logging instead of crashing.
// ─────────────────────────────────────────────────────────────────────────
import { Platform } from 'react-native';

/** Average stride: 0.75 m per step → km walked from a step count. */
export const KM_PER_STEP = 0.00075;
/** Rough steps in a minute of purposeful walking (for minutes → steps). */
export const STEPS_PER_MIN = 100;
/** Sanity cap for one person's day (ultramarathon territory). */
export const MAX_DAY_STEPS = 200_000;

export const kmFromSteps = (steps: number): number => steps * KM_PER_STEP;
export const stepsFromKm = (km: number): number => Math.round(km / KM_PER_STEP);

/**
 * Where each walker stands on the shared track (0..1 from their own end).
 * Each is capped so the pair never overlaps past their meeting point; the
 * journey is complete when the fractions together cover the whole line.
 */
export function walkPositions(myKm: number, theirKm: number, distanceKm: number) {
  if (!(distanceKm > 0)) return { mine: 0, theirs: 0, done: false, coveredKm: 0 };
  const rawMine = Math.max(0, myKm) / distanceKm;
  const rawTheirs = Math.max(0, theirKm) / distanceKm;
  const done = rawMine + rawTheirs >= 1;
  const scale = done ? 1 / (rawMine + rawTheirs) : 1; // meet exactly, pro-rata
  return {
    mine: Math.min(1, rawMine * scale),
    theirs: Math.min(1, rawTheirs * scale),
    done,
    coveredKm: Math.min(distanceKm, myKm + theirKm),
  };
}

const MILESTONES: { at: number; line: string }[] = [
  { at: 0.1, line: 'A tenth of the way. It adds up faster than you think.' },
  { at: 0.25, line: 'A quarter of the distance, walked out of existence.' },
  { at: 0.5, line: 'Halfway. Somewhere out there is the exact spot you meet.' },
  { at: 0.75, line: 'Three quarters. The map is running out of room between you.' },
  { at: 0.9, line: 'So close the last stretch is basically a long goodnight walk.' },
  { at: 1, line: 'You walked the whole way to each other. 🤍' },
];

/** The most recently passed milestone line, and the next target. */
export function milestoneFor(progress: number): { passed: string | null; nextPct: number | null } {
  let passed: string | null = null;
  let nextPct: number | null = null;
  for (const m of MILESTONES) {
    if (progress >= m.at) passed = m.line;
    else {
      nextPct = Math.round(m.at * 100);
      break;
    }
  }
  return { passed, nextPct };
}

/** True where the day's steps can sync automatically (iOS Core Motion). */
export function autoStepsSupported(): boolean {
  return Platform.OS === 'ios';
}

type Pedometer = {
  isAvailableAsync(): Promise<boolean>;
  getPermissionsAsync(): Promise<{ granted: boolean }>;
  requestPermissionsAsync(): Promise<{ granted: boolean }>;
  getStepCountAsync(start: Date, end: Date): Promise<{ steps: number }>;
};

/** Guarded accessor — null on web, on Android-irrelevant paths, or old binaries. */
function getPedometer(): Pedometer | null {
  if (Platform.OS === 'web') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-sensors').Pedometer ?? null;
  } catch {
    return null;
  }
}

/** Prompt for motion permission (iOS). False anywhere it can't work. */
export async function requestStepPermission(): Promise<boolean> {
  if (!autoStepsSupported()) return false;
  const ped = getPedometer();
  if (!ped) return false;
  try {
    if (!(await ped.isAvailableAsync())) return false;
    const res = await ped.requestPermissionsAsync();
    return !!res?.granted;
  } catch {
    return false;
  }
}

/**
 * Silently read today's (and yesterday's, for backfill) step counts on iOS.
 * Never prompts — returns [] unless permission is already granted. Each entry
 * is a full-day device truth, meant to be stored with "keep the max" semantics.
 */
export async function readRecentDeviceSteps(
  todayISO: string,
  yesterdayISO: string,
): Promise<{ date: string; steps: number }[]> {
  if (!autoStepsSupported()) return [];
  const ped = getPedometer();
  if (!ped) return [];
  try {
    if (!(await ped.isAvailableAsync())) return [];
    const perm = await ped.getPermissionsAsync(); // never prompts
    if (!perm?.granted) return [];
    const out: { date: string; steps: number }[] = [];
    for (const iso of [yesterdayISO, todayISO]) {
      const start = new Date(`${iso}T00:00:00`);
      const end = iso === todayISO ? new Date() : new Date(`${iso}T23:59:59`);
      try {
        const res = await ped.getStepCountAsync(start, end);
        if (typeof res?.steps === 'number' && res.steps >= 0) {
          out.push({ date: iso, steps: Math.min(MAX_DAY_STEPS, Math.round(res.steps)) });
        }
      } catch {
        /* single-day read failed; keep going */
      }
    }
    return out;
  } catch {
    return [];
  }
}
