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
 * A device's push token, stored in the shared space so the partner can be
 * reached even when the app is closed. One person can have several: a phone
 * (Expo token) and one or more browsers (FCM web token). The doc id is unique
 * per device (userId for the native phone, `${userId}:web` for a browser) so
 * they never overwrite each other; `owner` always carries the userId so the
 * sender/Cloud Function can skip the author's own devices.
 */
export interface DeviceToken {
  id: string; // unique per device: userId (native) or `${userId}:web` (browser)
  owner?: string; // the owner's userId (falls back to `id` for legacy native docs)
  kind?: 'expo' | 'fcm'; // 'expo' → native Expo push; 'fcm' → browser web push
  token: string; // ExponentPushToken[...] (expo) or an FCM registration token
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

// Our Shared Canvas: one co-op pixel grid per space. `pixels` is a flat string
// of size*size chars, each a single palette index ('0' = empty). Kept as a
// compact string so the whole grid is a tiny (~256 byte) Firestore doc.
export interface Canvas {
  id: 'current';
  pixels: string;
  size: number; // grid dimension (16)
  updatedAt: Millis;
  updatedBy: string; // authorId of the last person to paint
}

/** One person's result for a given day's Wordle (shared daily word). */
export interface WordleResult {
  id: string; // `${date}:${authorId}`
  authorId: string;
  date: ISODate;
  guesses: string[]; // each a 5-letter uppercase guess
  solved: boolean;
  createdAt: Millis;
  updatedAt: Millis;
}

/** Shared Snakes & Ladders game state (two players, turn-based). */
export interface SnakesGame {
  id: 'current';
  aId: string; // authorId who started (token A)
  bId: string; // partner (token B)
  aPos: number; // 0..100
  bPos: number; // 0..100
  turn: string; // authorId to roll
  roll: number; // last die value 1..6, 0 if none
  rolledBy: string; // who rolled last
  winner: string; // authorId or ''
  createdAt: Millis;
  updatedAt: Millis;
}

/** Shared Ludo game state (two players, four tokens each). */
export interface LudoGame {
  id: 'current';
  aId: string; // authorId who started
  bId: string; // partner
  // Each token position: -1 in base, 0..51 on the main loop (absolute cells),
  // 100..105 in the home column, 106 = home/finished.
  aTokens: number[]; // length 4
  bTokens: number[]; // length 4
  turn: string; // authorId to act
  die: number; // last die rolled (for display), 0 only before first roll
  mustMove: boolean; // true when the turn-holder has rolled and must move a token
  winner: string; // authorId or ''
  createdAt: Millis;
  updatedAt: Millis;
}

/** One entry on the shared daily timetable. */
export interface ScheduleItem {
  id: string;
  authorId: string;
  date: ISODate; // the day it belongs to
  startMin: number; // minutes since midnight (0..1439)
  endMin?: number; // optional end, minutes since midnight
  title: string;
  icon?: string;
  note?: string;
  createdAt: Millis;
  updatedAt: Millis;
}

/** A recurring date to remember (anniversary, birthday, monthly milestone…). */
export interface Occasion {
  id: string;
  authorId: string;
  title: string;
  date: ISODate; // the anchor date
  recurrence: 'yearly' | 'monthly' | 'once';
  remindDaysBefore: number; // 0..30
  icon?: string;
  createdAt: Millis;
}

/**
 * A grievance the hurting partner raises so it can be talked through and made
 * right together. Kept gentle on purpose: a feeling, how much it weighs, and a
 * clear status the raiser controls.
 */
export interface Issue {
  id: string;
  authorId: string; // who raised it (the one who is hurting)
  title: string;
  detail?: string;
  feeling?: string; // a short mood word, e.g. "hurt", "unheard"
  weight: number; // 1..5, how heavily it sits
  status: 'open' | 'resolved';
  acknowledgedBy?: string; // partner who has seen and taken it to heart
  acknowledgedAt?: Millis;
  createdAt: Millis;
  updatedAt: Millis;
  resolvedAt?: Millis;
}

/** A concrete step either partner commits to (or has done) to make it right. */
export interface IssueStep {
  id: string;
  issueId: string;
  authorId: string;
  text: string;
  done: boolean; // false = "will do", true = "done"
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
  'moments',
  'alerts',
  'meetings',
  'tokens',
  'feelings',
  'gameAnswers',
  'tictactoe',
  'wordle',
  'snakes',
  'ludo',
  'canvas',
  'schedule',
  'occasions',
  'issues',
  'issueSteps',
] as const;

export type CollectionName = (typeof COLLECTIONS)[number];

/** Anything stored must carry a stable id. */
export interface HasId {
  id: string;
}
