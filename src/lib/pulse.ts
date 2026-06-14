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
  'What was the smallest good thing in your day?',
  'If I were there right now, what would we be doing?',
  'What’s something you’re looking forward to this week?',
  'What do you wish I understood about today?',
  'Tell me one thing you didn’t get to say out loud today.',
];

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
      out.push(`${partnerName} said they need “${partner.need.trim()}”. Ask how you can help with that today.`);
    }
    if (m.valence <= -1) {
      out.push(`They’re feeling ${m.label.toLowerCase()}. Try: “I saw your check-in — want to talk it out, or just have company?”`);
    }
    if (partner.stress >= 4) {
      out.push(`Stress is high for ${partnerName}. Ask: “What’s the heaviest thing on your plate right now?”`);
    }
    if (partner.affection >= 4 && m.valence >= 1) {
      out.push(`They’re feeling close — lean in: “Tell me the best part of your day.”`);
    }
  }
  if (me && partner) {
    const meV = moodMeta(me.mood).valence;
    const pV = moodMeta(partner.mood).valence;
    if (meV >= 1 && pV <= -1) {
      out.push(`You’re steadier than ${partnerName} today — a good day to be the calm one.`);
    } else if (meV <= -1 && pV <= -1) {
      out.push(`You’re both having a heavy day. Name it together: “Neither of us is at our best — let’s be gentle.”`);
    }
  }
  for (const g of GENERIC_STARTERS) {
    if (out.length >= 4) break;
    if (!out.includes(g)) out.push(g);
  }
  return out.slice(0, 4);
}

/** Concrete, do-this-now ways to support your partner today. */
export function supportSuggestions(partner: CheckIn | null, partnerName: string): string[] {
  if (!partner) {
    return [`No check-in from ${partnerName} yet today — a simple “thinking of you” goes a long way.`];
  }
  const tips: string[] = [];
  const v = moodMeta(partner.mood).valence;
  if (partner.energy <= 2) tips.push('Low energy — keep it light. A voice note may feel easier than a call.');
  if (partner.stress >= 4) tips.push('High stress — offer specific help, not just “let me know if you need anything.”');
  if (partner.affection <= 2) tips.push('Affection is low — send a warm, no-pressure reminder that they’re loved.');
  if (v <= -1) tips.push('Lead with validation before solutions: “that sounds really hard.”');
  if (v >= 1 && partner.affection >= 4) tips.push('They’re in a good place — match it and make a small plan to look forward to.');
  if (tips.length === 0) tips.push('Steady day — a tiny surprise (a photo, an old memory) keeps the spark alive.');
  return tips;
}
