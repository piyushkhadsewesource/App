import { colors } from '../theme';
import { Mood } from '../types/models';

export interface MoodMeta {
  key: Mood;
  emoji: string;
  label: string;
  color: string;
  soft: string;
  /** Emotional valence, -2 (hard) … +2 (bright). */
  valence: number;
}

/** The emotion wheel, ordered bright → heavy. */
export const MOODS: MoodMeta[] = [
  { key: 'joyful', emoji: '😄', label: 'Joyful', color: colors.gold, soft: colors.goldSoft, valence: 2 },
  { key: 'loved', emoji: '🥰', label: 'Loved', color: colors.primary, soft: colors.primarySoft, valence: 2 },
  { key: 'content', emoji: '🙂', label: 'Content', color: colors.good, soft: colors.goodSoft, valence: 1 },
  { key: 'calm', emoji: '😌', label: 'Calm', color: colors.good, soft: colors.goodSoft, valence: 1 },
  { key: 'hopeful', emoji: '✨', label: 'Hopeful', color: colors.accent, soft: colors.accentSoft, valence: 1 },
  { key: 'tired', emoji: '😴', label: 'Tired', color: colors.textSoft, soft: colors.surfaceAlt, valence: 0 },
  { key: 'meh', emoji: '😐', label: 'Meh', color: colors.textSoft, soft: colors.surfaceAlt, valence: 0 },
  { key: 'stressed', emoji: '😣', label: 'Stressed', color: colors.warn, soft: colors.warnSoft, valence: -1 },
  { key: 'anxious', emoji: '😟', label: 'Anxious', color: colors.warn, soft: colors.warnSoft, valence: -1 },
  { key: 'frustrated', emoji: '😤', label: 'Frustrated', color: colors.danger, soft: colors.dangerSoft, valence: -1 },
  { key: 'lonely', emoji: '🥺', label: 'Lonely', color: colors.accent, soft: colors.accentSoft, valence: -2 },
  { key: 'sad', emoji: '😢', label: 'Sad', color: colors.accent, soft: colors.accentSoft, valence: -2 },
];

const BY_KEY = MOODS.reduce<Record<Mood, MoodMeta>>((acc, m) => {
  acc[m.key] = m;
  return acc;
}, {} as Record<Mood, MoodMeta>);

// A safe fallback so an unexpected/legacy mood value synced from the partner
// can never crash a screen that reads .valence / .emoji / .label.
const FALLBACK_MOOD: MoodMeta = BY_KEY.meh ?? MOODS[0];

export function moodMeta(m: Mood): MoodMeta {
  return BY_KEY[m] ?? FALLBACK_MOOD;
}
