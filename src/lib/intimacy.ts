// ─────────────────────────────────────────────────────────────────────────
// Intimacy Deck, daily prompts to deepen emotional intimacy, drawn from
// research-backed closeness exercises. One surfaces each day; both answer.
//
// The full prompt catalogue lives in deckPrompts.ts. The daily prompt uses a
// deterministic per-cycle reshuffle: within each pass through the deck every
// prompt appears once, and each new pass is shuffled differently, so the daily
// question never follows a fixed calendar pattern and never repeats its order.
// Both phones compute the same prompt for the same day (no device randomness).
// ─────────────────────────────────────────────────────────────────────────
import { DeckResponse, ISODate } from '../types/models';
import { isoToDate, todayISO } from './date';
import { DECK_PROMPTS } from './deckPrompts';
import type { DeckCategory, Prompt } from './deckPrompts';

export type { DeckCategory, Prompt };

export const DECK: Prompt[] = DECK_PROMPTS;

const DECK_BY_ID = DECK.reduce<Record<string, Prompt>>((a, p) => {
  a[p.id] = p;
  return a;
}, {});

export function promptById(id: string): Prompt | undefined {
  return DECK_BY_ID[id];
}

// Tiny deterministic PRNG (mulberry32) so a given seed always yields the same
// shuffle, on both phones, with no external dependency.
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The deck index for position `pos` within shuffle `cycle` (Fisher-Yates). */
function shuffledIndex(pos: number, cycle: number, n: number): number {
  const order = Array.from({ length: n }, (_, i) => i);
  const rng = mulberry32((cycle + 1) * 0x9e3779b1);
  for (let i = n - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = order[i];
    order[i] = order[j];
    order[j] = tmp;
  }
  return order[pos];
}

/** The same prompt for both partners on a given day, non-repeating in order. */
const SAFE_PROMPT: Prompt = { id: 'fallback', text: 'What made you think of me today?', category: 'everyday' };

export function promptForDay(dateISO: ISODate = todayISO()): Prompt {
  const n = DECK.length;
  if (n === 0) return SAFE_PROMPT;
  const d = isoToDate(dateISO);
  const epochDay = Math.floor(d.getTime() / 86_400_000);
  const cycle = Math.floor(epochDay / n);
  const pos = ((epochDay % n) + n) % n;
  return DECK[shuffledIndex(pos, cycle, n)] ?? SAFE_PROMPT;
}

export function hasAnswered(responses: DeckResponse[], authorId: string, promptId: string): boolean {
  return responses.some((r) => r.authorId === authorId && r.promptId === promptId);
}

/** Today's prompt if unanswered, else the next one this person hasn't answered. */
export function nextPromptFor(responses: DeckResponse[], authorId: string): Prompt {
  const today = promptForDay();
  if (!hasAnswered(responses, authorId, today.id)) return today;
  const unanswered = DECK.find((p) => !hasAnswered(responses, authorId, p.id));
  return unanswered ?? today;
}

export const CATEGORY_LABEL: Record<DeckCategory, string> = {
  memory: 'Memory',
  vulnerability: 'Vulnerability',
  admiration: 'Admiration',
  future: 'Future',
  playful: 'Playful',
  closeness: 'Closeness',
  gratitude: 'Gratitude',
  desire: 'Desire',
  growth: 'Growth',
  repair: 'Repair',
  values: 'Values',
  hypothetical: 'What if',
  longing: 'Longing',
  support: 'Support',
  everyday: 'Everyday',
  dreams: 'Dreams',
};
