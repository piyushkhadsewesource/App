// ─────────────────────────────────────────────────────────────────────────
// Data models shared across the whole app.
// Everything a couple creates lives inside a single shared "space".
// ─────────────────────────────────────────────────────────────────────────

export type ISODate = string; // 'YYYY-MM-DD'
export type Millis = number; // Date.now()

/** The 12 feelings on the emotion wheel. */
export type Mood =
  | 'joyful'
  | 'loved'
  | 'content'
  | 'calm'
  | 'hopeful'
  | 'tired'
  | 'meh'
  | 'stressed'
  | 'anxious'
  | 'lonely'
  | 'sad'
  | 'frustrated';

/** A daily Emotional Pulse Check. */
export interface CheckIn {
  id: string;
  authorId: string;
  date: ISODate; // the day this check-in is for
  createdAt: Millis;
  mood: Mood;
  need: string; // "one thing you need today"
  energy: number; // 1..5
  stress: number; // 1..5
  affection: number; // 1..5
  note?: string;
}

export type PingType = 'hug' | 'thinking' | 'miss';

/** A "Send Me A Hug" / "thinking of you" ping. */
export interface Ping {
  id: string;
  fromId: string;
  createdAt: Millis;
  type: PingType;
  message?: string;
  seenAt?: Millis | null;
}

/** A Delayed Love Letter, scheduled for the future. */
export interface Letter {
  id: string;
  authorId: string;
  createdAt: Millis;
  deliverAt: Millis;
  title: string;
  body: string;
  occasion?: string;
  openedAt?: Millis | null;
}

export type MemoryKind = 'milestone' | 'photo' | 'voice' | 'note';

/** An entry in the Memory Vault. */
export interface Memory {
  id: string;
  authorId: string;
  createdAt: Millis;
  date: ISODate; // when it happened (for "on this day")
  title: string;
  description?: string;
  emoji?: string;
  kind: MemoryKind;
}

/** A reason-you-love-them, shown in the "When I Miss You" kit. */
export interface Reason {
  id: string;
  authorId: string; // who wrote it (about the other person)
  text: string;
  createdAt: Millis;
}

export type FutureCategory = 'travel' | 'home' | 'milestones' | 'everyday' | 'dreams';

/** An item on the Shared Future Board. */
export interface FutureItem {
  id: string;
  authorId: string;
  category: FutureCategory;
  text: string;
  done: boolean;
  createdAt: Millis;
}

/** A response to an Intimacy Deck prompt. */
export interface DeckResponse {
  id: string;
  authorId: string;
  promptId: string;
  promptText: string;
  answer: string;
  createdAt: Millis;
}

/** Per-device identity + the shared pairing code that links two phones. */
export interface Identity {
  userId: string;
  name: string;
  partnerName: string;
  spaceId: string; // shared "pairing code", same on both phones
  anniversary?: ISODate;
  createdAt: Millis;
}

/** Names of the synced collections. */
export const COLLECTIONS = [
  'checkins',
  'pings',
  'letters',
  'memories',
  'reasons',
  'future',
  'deck',
] as const;

export type CollectionName = (typeof COLLECTIONS)[number];

/** Anything stored must carry a stable id. */
export interface HasId {
  id: string;
}
