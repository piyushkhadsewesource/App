// ─────────────────────────────────────────────────────────────────────────
// Tonight's Reveal — the daily blind-answer ritual.
//
// One question per day, chosen deterministically from the date so both
// phones agree with zero coordination. Answers are stored as ordinary deck
// responses under promptId `daily-YYYY-MM-DD` (no new collections, no new
// rules). The blindness is a UI contract: a partner's answer for today is
// never rendered until yours exists.
// ─────────────────────────────────────────────────────────────────────────
import { DeckResponse } from '../types/models';

/** The stable id for a given day's ritual answers. */
export function revealPromptId(dateISO: string): string {
  return `daily-${dateISO}`;
}

/** Deterministic question for a date: same on both phones, never mid-day swaps. */
export function questionForDate(dateISO: string): string {
  // djb2 over the date string → stable index; offset so consecutive days
  // stride through the bank instead of clustering.
  let h = 5381;
  for (let i = 0; i < dateISO.length; i += 1) h = ((h << 5) + h + dateISO.charCodeAt(i)) | 0;
  return QUESTIONS[Math.abs(h) % QUESTIONS.length];
}

/** Today's two answers, if they exist. */
export function revealAnswers(
  deck: DeckResponse[],
  dateISO: string,
  meId: string,
): { mine: DeckResponse | null; theirs: DeckResponse | null } {
  const pid = revealPromptId(dateISO);
  const todays = deck.filter((d) => d.promptId === pid);
  return {
    mine: todays.find((d) => d.authorId === meId) ?? null,
    theirs: todays.find((d) => d.authorId !== meId) ?? null,
  };
}

// Written for two people who already love each other: questions that make you
// want to know the answer, never quiz-show trivia. Rotates ~2 months before
// any repeat.
const QUESTIONS: string[] = [
  'What did I do recently that you never told me you noticed?',
  'What tiny thing about today would you have shown me first, if I were there?',
  'When did you last miss me at a completely ordinary moment?',
  'What song sounded like us this week?',
  'What would we be doing right now if we lived in the same city?',
  'What do you hope I never stop doing?',
  "What's one thing you were shy to tell me this week?",
  'Which photo of us do you keep going back to, and why?',
  'What did you eat today that I would have stolen off your plate?',
  'What worry got lighter this week? What made it lighter?',
  'If tonight had a colour, what colour was it for you?',
  'What do you want our first hour together to look like, next time?',
  'What made you laugh today when no one was watching?',
  'What are you proud of this week that nobody clapped for?',
  'Which of my habits do you secretly find adorable?',
  'What smell reminded you of me recently?',
  'If you could send me one minute of your day as a video, which minute?',
  'What are you looking forward to that you haven’t said out loud yet?',
  'What did you almost text me today, then didn’t?',
  'Where on your body do you carry stress right now? I want to know.',
  'What would you want me to cook for you tonight, badly but with love?',
  'What did you wear today? Paint me the picture.',
  'Which stranger did you see today who made you think of us?',
  'What tiny luxury do you want us to share someday?',
  'What is one thing you understand about me that nobody else does?',
  'What dream from this week do you still remember?',
  'When did you feel most like yourself today?',
  'What would you title this week of your life?',
  'What do you want more of from me right now: words, time, or silliness?',
  'What place from your childhood do you want to show me one day?',
  'What did you do today purely to take care of yourself?',
  'If I could have watched you for one hour today, which hour should I pick?',
  'What are you quietly getting better at?',
  'What question do you wish I would ask you more often?',
  'What little tradition should we invent, just the two of us?',
  'What did the sky look like where you are today?',
  'Which word do I say in a way that belongs only to me?',
  'What tiny gift under 100 rupees would make your whole day?',
  'What part of your day would have been better with my hand in yours?',
  'What fear feels smaller when you say it to me?',
  'What did you learn about yourself this week?',
  'If we had a whole rainy Sunday together, hour by hour, what happens?',
  'What compliment do you never get tired of hearing from me?',
  'What small brave thing did you do recently?',
  'Which meal are we recreating from memory when we’re together again?',
  'What about the future scares you a little and excites you a lot?',
  'When did you feel closest to me this week, physically apart and all?',
  'What silly thing do you want us to be old and still doing?',
  'What did you nearly buy today? Should you have?',
  'Whose relationship do you look at and think: we do it better?',
  'What do my messages sound like in your head when you read them?',
  'What tiny detail of your room right now would I tease you about?',
  'What promise do you want us to make for this month?',
  'When you close your eyes and think "home", what exactly do you see?',
  'What is something you want to be forgiven for that I never even counted?',
  'What version of me do you miss the most on hard days?',
  'What would you whisper to me right now if I were half asleep next to you?',
  'What did you handle today that deserved a kiss on the forehead?',
  'Which upcoming ordinary day are you secretly excited about?',
  'What do you want the last five minutes of tonight to feel like?',
];
