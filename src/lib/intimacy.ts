// ─────────────────────────────────────────────────────────────────────────
// Intimacy Deck — daily prompts to deepen emotional intimacy, drawn from
// research-backed closeness exercises. One surfaces each day; both answer.
// ─────────────────────────────────────────────────────────────────────────
import { DeckResponse, ISODate } from '../types/models';
import { isoToDate, todayISO } from './date';

export type DeckCategory = 'memory' | 'vulnerability' | 'admiration' | 'future' | 'playful' | 'closeness';

export interface Prompt {
  id: string;
  text: string;
  category: DeckCategory;
}

export const DECK: Prompt[] = [
  { id: 'p01', category: 'memory', text: 'What’s a memory of me that makes you smile when you’re having a bad day?' },
  { id: 'p02', category: 'vulnerability', text: 'What’s something you’ve been afraid to tell me?' },
  { id: 'p03', category: 'admiration', text: 'What’s something you quietly admire about me?' },
  { id: 'p04', category: 'closeness', text: 'When do you feel closest to me, even across the distance?' },
  { id: 'p05', category: 'future', text: 'Where do you picture us a year from tonight?' },
  { id: 'p06', category: 'playful', text: 'If we had 24 hours together and unlimited budget, what’s the plan?' },
  { id: 'p07', category: 'vulnerability', text: 'What do you need more of from me lately?' },
  { id: 'p08', category: 'memory', text: 'What was the exact moment you knew you were falling for me?' },
  { id: 'p09', category: 'admiration', text: 'What’s a strength of mine you wish I saw in myself?' },
  { id: 'p10', category: 'closeness', text: 'What small ritual of ours means the most to you?' },
  { id: 'p11', category: 'vulnerability', text: 'What are you most afraid of in this relationship?' },
  { id: 'p12', category: 'future', text: 'What does “home” look like when we finally close the distance?' },
  { id: 'p13', category: 'playful', text: 'What’s a tiny habit of mine you find unreasonably cute?' },
  { id: 'p14', category: 'memory', text: 'Which trip or day together would you relive exactly as it was?' },
  { id: 'p15', category: 'closeness', text: 'How do you most like to be comforted when we’re apart?' },
  { id: 'p16', category: 'admiration', text: 'When were you proudest of me recently?' },
  { id: 'p17', category: 'vulnerability', text: 'Is there anything unsaid between us right now?' },
  { id: 'p18', category: 'future', text: 'What’s one dream of yours I can help carry?' },
  { id: 'p19', category: 'playful', text: 'What song instantly makes you think of us?' },
  { id: 'p20', category: 'closeness', text: 'What makes you feel most chosen by me?' },
  { id: 'p21', category: 'memory', text: 'What’s the funniest thing that’s ever happened to us?' },
  { id: 'p22', category: 'vulnerability', text: 'What do you wish I understood about your hardest days?' },
  { id: 'p23', category: 'future', text: 'What tradition do you want us to start when we’re together?' },
  { id: 'p24', category: 'admiration', text: 'What’s one way I’ve helped you grow?' },
];

const DECK_BY_ID = DECK.reduce<Record<string, Prompt>>((a, p) => {
  a[p.id] = p;
  return a;
}, {});

export function promptById(id: string): Prompt | undefined {
  return DECK_BY_ID[id];
}

/** The same prompt for both partners on a given day. */
export function promptForDay(dateISO: ISODate = todayISO()): Prompt {
  const d = isoToDate(dateISO);
  const epochDay = Math.floor(d.getTime() / 86_400_000);
  return DECK[((epochDay % DECK.length) + DECK.length) % DECK.length];
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
};
