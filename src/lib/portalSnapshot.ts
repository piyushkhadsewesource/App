// ─────────────────────────────────────────────────────────────────────────
// Portal snapshot — what the Android home-screen widget shows.
//
// The widget can't hold a Firestore listener (it renders in a short-lived
// headless task), so the APP composes this snapshot whenever its data changes
// and parks it in AsyncStorage; the widget task just reads and draws it. Pure
// module: no RN imports, so it's directly testable with node, like digest.js.
// ─────────────────────────────────────────────────────────────────────────
import { CheckIn, DeckResponse, ScheduleItem } from '../types/models';
import { lanternFor } from './goldenHour';
import { freeAfterMin, minLabel } from './ourDay';
import { revealPromptId } from './reveal';

export const WIDGET_SNAPSHOT_KEY = '@tether/widgetSnapshot';

export interface PortalSnapshot {
  partnerName: string;
  /** Headline line: the warmest single thing to say right now. */
  line: string;
  /** Secondary line: countdown or a quiet fallback. */
  subline: string;
  /** 🤍 badge: is something waiting for the user (fog / sealed answer / hug)? */
  waiting: boolean;
  updatedAt: number;
}

const MOOD_EMOJI: Record<string, string> = {
  joyful: '😄', loved: '🥰', content: '🙂', meh: '😐', tired: '🥱',
  stressed: '😥', sad: '😢', angry: '😤', sick: '🤒', anxious: '😟',
};

export function composeSnapshot(input: {
  partnerName: string;
  meId: string;
  partnerId: string;
  todayISO: string;
  nowMin: number;
  checkins: CheckIn[];
  schedule: ScheduleItem[];
  deck: DeckResponse[];
  fogWaiting: boolean;
  unseenPings: number;
  meetingAt?: number | null;
  nowMs?: number;
}): PortalSnapshot {
  const {
    partnerName, meId, partnerId, todayISO, nowMin, checkins, schedule, deck,
    fogWaiting, unseenPings, meetingAt, nowMs = Date.now(),
  } = input;

  // Headline, in order of warmth: sealed answer > fog > hug waiting >
  // free-after > mood today > a gentle constant.
  const pid = revealPromptId(todayISO);
  const theyAnswered = deck.some((d) => d.promptId === pid && d.authorId === partnerId);
  const iAnswered = deck.some((d) => d.promptId === pid && d.authorId === meId);
  const theirsToday = schedule.filter(
    (s) => s.date === todayISO && s.authorId === partnerId && s.kind !== 'moment',
  );
  const mineToday = schedule.filter(
    (s) => s.date === todayISO && s.authorId === meId && s.kind !== 'moment',
  );
  // The Golden Hour: the widget spends the day pointing at tonight's lantern,
  // the strongest reason for both to come back at the same minute.
  const lantern = lanternFor(mineToday, theirsToday, nowMin);
  const free = theirsToday.length > 0 ? freeAfterMin(theirsToday, nowMin) : null;
  const mood = checkins
    .filter((c) => c.authorId === partnerId && c.date === todayISO)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];

  let line: string;
  if (theyAnswered && !iAnswered) line = `${partnerName}'s sealed answer is waiting ✉️`;
  else if (fogWaiting) line = `${partnerName} drew something for you 🎨`;
  else if (unseenPings > 0) line = `${unseenPings === 1 ? 'A hug' : `${unseenPings} hugs`} waiting from ${partnerName} 🤗`;
  else if (lantern.kind === 'burning') line = `The lantern is burning until ${minLabel(lantern.end)} 🏮`;
  else if (lantern.kind === 'waiting') line = `Tonight's lantern: ${minLabel(lantern.start)} 🏮`;
  else if (free != null && free > nowMin && free < 1440) line = `${partnerName} is free after ${minLabel(free)}`;
  else if (mood && MOOD_EMOJI[mood.mood]) line = `${partnerName} is feeling ${mood.mood} ${MOOD_EMOJI[mood.mood]}`;
  else line = `Thinking of ${partnerName}? Tell them 🤍`;

  // Subline: the countdown when one exists, else the ritual nudge.
  let subline: string;
  if (meetingAt && meetingAt > nowMs) {
    const days = Math.ceil((meetingAt - nowMs) / 86_400_000);
    subline = days === 1 ? 'together again tomorrow 💞' : `together again in ${days} days 💞`;
  } else if (!iAnswered) {
    subline = "tonight's question is open ✉️";
  } else {
    subline = 'tap to step through the portal';
  }

  return {
    partnerName,
    line,
    subline,
    waiting: (theyAnswered && !iAnswered) || fogWaiting || unseenPings > 0,
    updatedAt: nowMs,
  };
}
