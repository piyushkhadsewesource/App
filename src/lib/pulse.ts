// ─────────────────────────────────────────────────────────────────────────
// Emotional Pulse logic: turn daily check-ins into conversation starters,
// concrete support suggestions, and an early "they've been struggling" alert.
// ─────────────────────────────────────────────────────────────────────────
import { CheckIn, ISODate } from '../types/models';
import { moodMeta } from './mood';

/** Newest first by day, then by time written. */
export function sortCheckins(list: CheckIn[]): CheckIn[] {
  return [...list].sort((a, b) =>
    a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1,
  );
}

export function recentByAuthor(list: CheckIn[], authorId: string, limit = 30): CheckIn[] {
  return sortCheckins(list.filter((c) => c.authorId === authorId)).slice(0, limit);
}

export function latestCheckin(list: CheckIn[], authorId: string): CheckIn | null {
  return recentByAuthor(list, authorId, 1)[0] ?? null;
}

export function checkinForDate(
  list: CheckIn[],
  authorId: string,
  date: ISODate,
): CheckIn | null {
  return list.find((c) => c.authorId === authorId && c.date === date) ?? null;
}

/** Is this a hard day? */
export function isTough(c: CheckIn): boolean {
  return moodMeta(c.mood).valence <= -1 || c.stress >= 4 || c.affection <= 2 || c.energy <= 1;
}

export interface Streak {
  days: number;
  since: ISODate;
}

/** Counts the run of recent tough check-ins, for the "struggling" alert. */
export function strugglingStreak(list: CheckIn[], authorId: string): Streak | null {
  const recent = recentByAuthor(list, authorId, 10);
  let days = 0;
  let since: ISODate = '';
  for (const c of recent) {
    if (isTough(c)) {
      days += 1;
      since = c.date;
    } else {
      break;
    }
  }
  return days >= 3 ? { days, since } : null;
}

const GENERIC_STARTERS = [
  "What was the smallest good thing in your day?",
  "If I were there right now, what would we be doing?",
  "What are you looking forward to this week?",
  "What do you wish I understood about today?",
  "Tell me one thing you didn’t get to say out loud today.",
  "What’s been on your mind that you haven’t mentioned?",
  "What made you laugh today, even a little?",
  "What’s been the hardest part of today?",
  "If today had a title, what would it be?",
  "What do you need from me tonight, honestly?",
  "What’s something you’re proud of from today?",
  "What drained you most today?",
  "What’s a tiny thing that would make tomorrow easier?",
  "Who did you talk to today that I’d find interesting?",
  "What did you eat today, tell me everything.",
  "What’s the last thing that made you think of me?",
  "What song has been stuck in your head?",
  "What would you change about today if you could?",
  "What’s one thing you’re grateful for right now?",
  "What did you see today that you wanted to show me?",
  "How’s your heart, really, right now?",
  "What’s worrying you that we could talk through?",
  "What’s something you’re curious about lately?",
  "If we had this evening together, how would we spend it?",
  "What’s a small win we should celebrate?",
  "What part of your day did you wish I was part of?",
  "What’s something kind someone did for you today?",
  "What’s something kind you did for someone today?",
  "What’s the weather doing where you are, and your mood to match?",
  "What do you wish you had more time for?",
  "What’s a decision you’re sitting with right now?",
  "What made today feel different from yesterday?",
  "What’s the most beautiful thing you noticed today?",
  "What would make you feel close to me right now?",
  "What’s something you’ve been overthinking?",
  "What’s a tiny adventure you had today, even a boring one?",
  "What do you want to remember about today?",
  "What’s been the soundtrack to your week?",
  "What’s something you’re avoiding that we could face together?",
  "What did your body need today that you didn’t give it?",
  "What’s a thought you almost texted me but didn’t?",
  "What’s the nicest message you could get right now, and from whom?",
  "What’s one thing that went better than expected today?",
  "What’s something you learned today, big or small?",
  "What would a good night look like for you tonight?",
  "What’s a comfort you reached for today?",
  "What’s something you’re looking forward to about us?",
  "If you could nap anywhere right now, where?",
  "What made you feel capable today?",
  "What’s a question you wish I’d ask you more often?",
  "What’s the most you thing you did today?",
  "What do you want less of this week?",
  "What do you want more of this week?",
  "What’s something you saw that made you think of us?",
  "What’s a worry you can hand to me for tonight?",
  "What’s the bravest thing you did today, however small?",
  "What’s something you’re hopeful about?",
  "What part of today would you happily relive?",
  "What’s a craving you have right now, food or otherwise?",
  "What’s one thing I could do this week to make you feel loved?",
  "What did you almost forget to tell me?",
  "What’s the texture of your mood right now?",
  "What’s something you’re protecting your energy from?",
  "What did today teach you about yourself?",
  "What’s a small plan we could make to look forward to?",
  "What’s something you wish were easier right now?",
  "What made you feel seen today, if anything?",
  "What’s the last photo you took, and why?",
  "What would you do with a totally free hour right now?",
  "What’s something you’re proud of me for, recently?",
  "What’s a memory of us that surfaced today?",
  "What’s been the best meal of your week?",
  "What’s a feeling you can’t quite name right now?",
  "What do you wish people understood about you?",
  "What would make tomorrow a good day?",
  "What’s something tiny I do that you missed today?",
  "What’s a place you wished you were today?",
  "What’s something you want to say but it feels silly?",
  "What’s the kindest thing you could say to yourself today?",
  "What did you put off that you’ll be glad to finish?",
  "What’s a question you’re asking yourself lately?",
  "What would feel like a treat right now?",
  "What’s something about today you want to bottle up?",
  "What’s the headline of your day in five words?",
  "What do you need to hear right now?",
  "What made the distance feel smaller today?",
  "What made it feel bigger, and how can I help?",
  "What’s one good thing waiting for you tomorrow?",
];

/** Deterministic daily pick so rotating content changes day to day, not at random. */
function pickByDay<T>(arr: T[], seed: number): T {
  const n = arr.length;
  return arr[(((seed % n) + n) % n)];
}

/** The generic starters rotated so a different set surfaces each day. */
function rotatedGeneric(seed: number): string[] {
  const n = GENERIC_STARTERS.length;
  const start = ((seed % n) + n) % n;
  return Array.from({ length: n }, (_, i) => GENERIC_STARTERS[(start + i) % n]);
}

/**
 * Conversation starters tuned to your partner's check-in (and yours),
 * so reaching out feels easy and specific instead of "how was your day".
 */
export function conversationStarters(
  partner: CheckIn | null,
  me: CheckIn | null,
  partnerName: string,
): string[] {
  const out: string[] = [];
  if (partner) {
    const m = moodMeta(partner.mood);
    if (partner.need?.trim()) {
      out.push(`${partnerName} said they need "${partner.need.trim()}". Ask how you can help with that today.`);
    }
    if (m.valence <= -1) {
      out.push(`They’re feeling ${m.label.toLowerCase()}. Try: "I saw your check-in, want to talk it out, or just have company?"`);
    }
    if (partner.stress >= 4) {
      out.push(`Stress is high for ${partnerName}. Ask: "What’s the heaviest thing on your plate right now?"`);
    }
    if (partner.affection >= 4 && m.valence >= 1) {
      out.push(`They’re feeling close, lean in: "Tell me the best part of your day."`);
    }
  }
  if (me && partner) {
    const meV = moodMeta(me.mood).valence;
    const pV = moodMeta(partner.mood).valence;
    if (meV >= 1 && pV <= -1) {
      out.push(`You’re steadier than ${partnerName} today, a good day to be the calm one.`);
    } else if (meV <= -1 && pV <= -1) {
      out.push(`You’re both having a heavy day. Name it together: "Neither of us is at our best, let’s be gentle."`);
    }
  }
  const dayNum = Math.floor(Date.now() / 86_400_000);
  for (const g of rotatedGeneric(dayNum)) {
    if (out.length >= 4) break;
    if (!out.includes(g)) out.push(g);
  }
  return out.slice(0, 4);
}

/** Concrete, do-this-now ways to support your partner today (rotated daily). */
export function supportSuggestions(partner: CheckIn | null, partnerName: string): string[] {
  const day = Math.floor(Date.now() / 86_400_000);
  if (!partner) {
    return [
      pickByDay(
        [
          `No check-in from ${partnerName} yet today, a simple "thinking of you" goes a long way.`,
          `${partnerName} hasn’t shared today. A warm "no pressure, just thinking of you" lands well.`,
          `Quiet from ${partnerName} so far. A gentle hello with no ask can mean a lot.`,
          `Before you hear from ${partnerName} today, send something small and kind.`,
          `${partnerName} hasn’t checked in. A short "you crossed my mind" is enough.`,
        ],
        day,
      ),
    ];
  }
  const tips: string[] = [];
  const v = moodMeta(partner.mood).valence;
  if (partner.energy <= 2) {
    tips.push(
      pickByDay(
        [
          'Low energy, keep it light. A voice note may feel easier than a call.',
          'They’re running on empty, lower the bar: a meme or a heart, not a deep talk.',
          'Tired day for them. Offer rest, not plans: "no need to reply, just resting with you in spirit."',
          'Energy is low, take something off their plate instead of adding to it.',
        ],
        day,
      ),
    );
  }
  if (partner.stress >= 4) {
    tips.push(
      pickByDay(
        [
          'High stress, offer specific help, not just "let me know if you need anything."',
          'They’re overwhelmed. Name one concrete thing you’ll handle this week.',
          'Stress is high, ask "what’s the heaviest thing right now?" and just listen.',
          'Under pressure they need calm, not solutions. Slow your pace to match.',
        ],
        day,
      ),
    );
  }
  if (partner.affection <= 2) {
    tips.push(
      pickByDay(
        [
          'Affection is low, send a warm, no-pressure reminder that they’re loved.',
          'They feel distant. Reconnect gently with a favourite memory, no demands.',
          'Closeness dipped, a soft "I’m here, no rush" reassures without pressure.',
          'Low affection often means overwhelm, not distance. Lead with patience.',
        ],
        day,
      ),
    );
  }
  if (v <= -1) {
    tips.push(
      pickByDay(
        [
          'Lead with validation before solutions: "that sounds really hard."',
          'Sit with the feeling first: "you don’t have to be okay right now."',
          'Resist fixing. "I’m here, tell me more" beats advice today.',
          'Acknowledge the weight: "that’s a lot to carry, and I see it."',
        ],
        day,
      ),
    );
  }
  if (v >= 1 && partner.affection >= 4) {
    tips.push(
      pickByDay(
        [
          'They’re in a good place, match it and make a small plan to look forward to.',
          'Good day for them, celebrate it: ask for the best part and savour it together.',
          'They’re feeling close, lean in with a playful note or a future plan.',
          'Ride the good mood, share something that made you think of them.',
        ],
        day,
      ),
    );
  }
  if (tips.length === 0) {
    tips.push(
      pickByDay(
        [
          'Steady day, a tiny surprise (a photo, an old memory) keeps the spark alive.',
          'All calm, send an unprompted "thinking of you" just because.',
          'Nothing urgent today, a small specific compliment goes a long way.',
          'Quiet and steady, plant something small to look forward to together.',
        ],
        day + 1,
      ),
    );
  }
  return tips;
}
