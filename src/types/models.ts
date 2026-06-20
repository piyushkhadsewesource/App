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

export type PingType = 'hug' | 'kiss' | 'thinking' | 'miss';

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

/**
 * A daily photo "Moment". The image travels inside the record as a compressed
 * base64 JPEG data URI, so it syncs through the same local/Firebase pipeline as
 * everything else, with no separate file storage to set up.
 */
export interface Moment {
  id: string;
  authorId: string;
  date: ISODate; // the day it was captured
  createdAt: Millis;
  image: string; // "data:image/jpeg;base64,..."
  caption?: string;
}

/** An urgent "I need you now" alert, delivered through live sync. */
export interface SosAlert {
  id: string;
  fromId: string;
  createdAt: Millis;
  message?: string;
  seenAt?: Millis | null;
}

/** The shared "next time we meet" date, for the reunion countdown. */
export interface Meeting {
  id: string; // always 'next' (a single shared record)
  authorId: string;
  at: Millis; // when you'll be together
  label?: string;
  createdAt: Millis;
}

/**
 * A phone's Expo push token, stored in the shared space so the partner's phone
 * can send an emergency push that wakes the device even when the app is closed.
 */
export interface DeviceToken {
  id: string; // the owner's userId
  token: string; // ExponentPushToken[...]
  platform: string;
  updatedAt: Millis;
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

/** A timestamped feeling logged during the day, for the intensity timeline. */
export interface FeelingEntry {
  id: string;
  authorId: string;
  date: ISODate; // the day it belongs to
  createdAt: Millis; // exact time, used as the timeline x-axis
  mood: Mood;
  intensity: number; // 1..10
  note?: string;
}

/** Which mini-game a stored answer belongs to. */
export type GameKind = 'thisorthat' | 'wyr' | 'knowme';

/** One person's choice on one game prompt (id is deterministic so it upserts). */
export interface GameAnswer {
  id: string; // `${game}:${promptId}:${authorId}`
  authorId: string;
  game: GameKind;
  promptId: string;
  choice: number; // selected option index (for knowme: your own true answer)
  createdAt: Millis;
}

/** The single shared Tic-Tac-Toe game state for the couple. */
export interface TicTacToe {
  id: 'current';
  board: string; // 9 chars, each 'X' | 'O' | '-'
  turn: string; // authorId whose move it is
  xId: string; // authorId playing X (started this game)
  oId: string; // authorId playing O
  createdAt: Millis;
  updatedAt: Millis;
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
  'moments',
  'alerts',
  'meetings',
  'tokens',
  'feelings',
  'gameAnswers',
  'tictactoe',
] as const;

export type CollectionName = (typeof COLLECTIONS)[number];

/** Anything stored must carry a stable id. */
export interface HasId {
  id: string;
}
