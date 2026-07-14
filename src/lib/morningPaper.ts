// ─────────────────────────────────────────────────────────────────────────
// The Morning Paper — the sealed overnight digest. In an LDR across
// timezones their evening happens while you sleep, so everything the partner
// did overnight bundles into one envelope that cannot open before your
// morning. You learn THAT there are three things, never WHAT, until you
// break the seal (the same asymmetric tease the Reveal proves works).
// Urgent things (SOS, live alerts) never wait for the paper.
// ─────────────────────────────────────────────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityEvent } from './activity';
import { todayISO } from './date';

/** Overnight starts at 21:00 the evening before. */
const EVENING_HOUR = 21;
/** The paper cannot be opened before 05:00 local. */
const MORNING_HOUR = 5;

const keyFor = (date: string) => `@tether/paperOpened/${date}`;

export interface Paper {
  date: string;
  items: ActivityEvent[];
}

/**
 * Today's paper: partner-authored events since yesterday evening, available
 * from 5am. Null when it isn't morning yet, or there is nothing inside.
 */
export function composePaper(events: ActivityEvent[], nowMs = Date.now()): Paper | null {
  const now = new Date(nowMs);
  if (now.getHours() < MORNING_HOUR) return null;
  const eveningBefore = new Date(nowMs);
  eveningBefore.setDate(eveningBefore.getDate() - 1);
  eveningBefore.setHours(EVENING_HOUR, 0, 0, 0);
  const since = eveningBefore.getTime();
  const items = events
    .filter((e) => !e.mine && e.at >= since && e.at <= nowMs)
    .sort((a, b) => a.at - b.at); // the night in the order it happened
  if (items.length === 0) return null;
  return { date: todayISO(), items };
}

/** Has today's paper been opened on this device? */
export async function paperOpened(date: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(keyFor(date))) === '1';
  } catch {
    return false;
  }
}

/** Remember the seal is broken (per-device, like other seen-flags). */
export async function markPaperOpened(date: string): Promise<void> {
  try {
    await AsyncStorage.setItem(keyFor(date), '1');
  } catch {
    /* storage hiccup: the paper simply re-offers next visit */
  }
}
