// ─────────────────────────────────────────────────────────────────────────
// Relationship Health Dashboard, a maintenance gauge, never a judgment.
// Blends recency, warmth, mood alignment and shared activity into one score.
// ─────────────────────────────────────────────────────────────────────────
import { colors } from '../theme';
import { CheckIn, DeckResponse, Letter, Memory, Moment, Ping } from '../types/models';
import { daysBetween, todayISO } from './date';
import { moodMeta } from './mood';
import { latestCheckin } from './pulse';

export interface Health {
  closeness: number; // 0..100
  label: string;
  color: string;
  daysSinceTogether: number | null;
  moodAlignment: number; // 0..100
  sharedThisWeek: number;
  bothCheckedToday: boolean;
}

interface Input {
  checkins: CheckIn[];
  memories: Memory[];
  letters: Letter[];
  pings: Ping[];
  deck: DeckResponse[];
  moments: Moment[];
  meId: string;
  partnerId: string;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const WEEK = 7 * 24 * 3600 * 1000;

export function computeHealth(input: Input): Health {
  const { checkins, memories, letters, pings, deck, moments, meId, partnerId } = input;
  const today = todayISO();

  const mine = latestCheckin(checkins, meId);
  const theirs = latestCheckin(checkins, partnerId);

  // Recency: how recently has each person checked in?
  const recency = (c: CheckIn | null) => {
    if (!c) return 0;
    const gap = daysBetween(c.date, today);
    return Number.isFinite(gap) ? clamp01(1 - gap / 5) : 0;
  };
  const recencyScore = (recency(mine) + recency(theirs)) / 2;

  // Warmth: latest affection levels.
  const affScore =
    ((mine?.affection ?? 0) + (theirs?.affection ?? 0)) / 2 / 5;

  // Mood alignment: are you emotionally in the same weather?
  let alignment = 0.5;
  if (mine && theirs) {
    alignment = clamp01(1 - Math.abs(moodMeta(mine.mood).valence - moodMeta(theirs.mood).valence) / 4);
  }

  // Shared activity in the last 7 days (moments included — they're the most
  // frequent touch-point and were previously missing from this score).
  const since = Date.now() - WEEK;
  const sharedThisWeek =
    pings.filter((p) => p.createdAt >= since).length +
    memories.filter((m) => m.createdAt >= since).length +
    deck.filter((d) => d.createdAt >= since).length +
    letters.filter((l) => l.createdAt >= since).length +
    moments.filter((m) => m.createdAt >= since).length;
  const activityScore = clamp01(sharedThisWeek / 5);

  const closeness = Math.round(
    100 * (0.3 * recencyScore + 0.3 * affScore + 0.2 * alignment + 0.2 * activityScore),
  );

  // When there are no check-ins yet, the score is 0 by construction — don't
  // tell a brand-new couple their relationship "Needs nurture".
  const hasData = mine !== null || theirs !== null;
  const { label, color } = !hasData
    ? { label: 'Getting started', color: colors.textSoft }
    : closeness >= 75
      ? { label: 'Close', color: colors.primary }
      : closeness >= 55
        ? { label: 'Warm', color: colors.good }
        : closeness >= 35
          ? { label: 'A little distant', color: colors.warn }
          : { label: 'Needs nurture', color: colors.accent };

  // Days since you were "together", both checked in on the same day.
  const myDays = new Set(checkins.filter((c) => c.authorId === meId).map((c) => c.date));
  const sharedDays = checkins
    .filter((c) => c.authorId === partnerId && myDays.has(c.date))
    .map((c) => c.date)
    .sort()
    .reverse();
  const daysSinceTogether = sharedDays.length ? daysBetween(sharedDays[0], today) : null;

  return {
    closeness,
    label,
    color,
    daysSinceTogether,
    moodAlignment: Math.round(alignment * 100),
    sharedThisWeek,
    bothCheckedToday: !!(mine?.date === today && theirs?.date === today),
  };
}
