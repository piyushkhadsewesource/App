// ─────────────────────────────────────────────────────────────────────────
// The Rediscover Whisper: at most ONE quiet, dismissible suggestion on Home,
// surfacing a corner of the app that's been sitting unused. Rules-driven from
// data that already syncs — no tracking, no nagging. A dismissed whisper stays
// away for a week; eligible whispers rotate by day so the same one doesn't
// squat on the screen.
// ─────────────────────────────────────────────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';

const DISMISS_KEY = '@tether/whisper-dismissed';
const SNOOZE_DAYS = 7;
const DAY_MS = 86_400_000;

export interface Whisper {
  id: string;
  emoji: string;
  title: string;
  text: string;
  route: string;
}

export interface WhisperInput {
  partnerName: string;
  /** ms timestamps of MY latest activity in each area (0 / undefined = never). */
  lastLetterAt?: number;
  lastDeckAt?: number;
  futureCount: number;
  memoryCount: number;
  occasionCount: number;
}

const STALE_14D = 14 * DAY_MS;

function candidates(inp: WhisperInput, now: number): Whisper[] {
  const p = inp.partnerName;
  const out: Whisper[] = [];
  if (!inp.lastLetterAt || now - inp.lastLetterAt > STALE_14D) {
    out.push({
      id: 'letters',
      emoji: '💌',
      title: 'Write them a letter',
      text: `A few lines now, delivered to ${p} whenever you choose.`,
      route: 'Letters',
    });
  }
  if (!inp.lastDeckAt || now - inp.lastDeckAt > STALE_14D) {
    out.push({
      id: 'deck',
      emoji: '🃏',
      title: 'A question is waiting',
      text: `The intimacy deck has one you two haven't answered.`,
      route: 'Deck',
    });
  }
  if (inp.futureCount === 0) {
    out.push({
      id: 'future',
      emoji: '✨',
      title: 'Dream one thing up',
      text: 'Put a first wish on your future board.',
      route: 'Future',
    });
  }
  if (inp.memoryCount === 0) {
    out.push({
      id: 'vault',
      emoji: '🗂️',
      title: 'Keep a memory safe',
      text: 'Start the vault with one moment you never want to lose.',
      route: 'Vault',
    });
  }
  if (inp.occasionCount === 0) {
    out.push({
      id: 'occasions',
      emoji: '🎀',
      title: 'Save your dates',
      text: 'Anniversaries and little milestones, remembered for you.',
      route: 'Occasions',
    });
  }
  return out;
}

/** Pick today's whisper (or null): eligible → not snoozed → rotate by day. */
export async function pickWhisper(inp: WhisperInput, now = Date.now()): Promise<Whisper | null> {
  let snoozed: Record<string, number> = {};
  try {
    const raw = await AsyncStorage.getItem(DISMISS_KEY);
    if (raw) snoozed = JSON.parse(raw);
  } catch {
    /* first run / bad JSON — treat as nothing snoozed */
  }
  const live = candidates(inp, now).filter(
    (w) => !snoozed[w.id] || now - snoozed[w.id] > SNOOZE_DAYS * DAY_MS,
  );
  if (live.length === 0) return null;
  return live[Math.floor(now / DAY_MS) % live.length];
}

/** Quietly put a whisper away for a week. */
export async function dismissWhisper(id: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(DISMISS_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[id] = Date.now();
    await AsyncStorage.setItem(DISMISS_KEY, JSON.stringify(map));
  } catch {
    /* storage unavailable — the whisper just reappears next visit */
  }
}
