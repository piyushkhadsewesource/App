// ─────────────────────────────────────────────────────────────────────────
// Attachment-aware companion: gently surface patterns (withdrawal, persistent
// stress, affection dips, reassurance-seeking) before they harden into a
// conflict cycle, and coach both partners toward a healthier response.
// ─────────────────────────────────────────────────────────────────────────
import { CheckIn } from '../types/models';
import { moodMeta } from './mood';
import { daysBetween, todayISO } from './date';
import { recentByAuthor, strugglingStreak } from './pulse';

export type Severity = 'info' | 'watch' | 'tend';

export interface Insight {
  id: string;
  title: string;
  summary: string;
  severity: Severity;
  /** Coaching for the person noticing (you). */
  forYou: string;
  /** A gentle move for the relationship. */
  together: string;
}

const REASSURANCE_WORDS = ['reassur', 'miss', 'alone', 'lonely', 'talk', 'call', 'hear you', 'okay', 'us'];

function avg(nums: number[]): number {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

interface AnalyzeInput {
  checkins: CheckIn[];
  meId: string;
  partnerId: string;
  meName: string;
  partnerName: string;
}

/** Build the list of active insights, most important first. */
export function analyze({ checkins, meId, partnerId, meName, partnerName }: AnalyzeInput): Insight[] {
  const out: Insight[] = [];
  const partnerRecent = recentByAuthor(checkins, partnerId, 6);
  const myRecent = recentByAuthor(checkins, meId, 6);

  // 1. Withdrawal / communication gap (partner gone quiet).
  const last = partnerRecent[0];
  const gap = last ? daysBetween(last.date, todayISO()) : 99;
  if (!last || gap >= 3) {
    out.push({
      id: 'gap',
      severity: 'tend',
      title: `${partnerName} has gone quiet`,
      summary: last
        ? `No check-in from ${partnerName} in ${gap} days.`
        : `${partnerName} hasn’t checked in yet.`,
      forYou: 'Silence is easy to read as rejection, but withdrawal is often overwhelm. Reach out warmly without keeping score.',
      together: `Send a low-pressure note: “No need to reply fast, just thinking of you and here when you’re ready.”`,
    });
  }

  // 2. Persistent stress load.
  const pStress = avg(partnerRecent.slice(0, 4).map((c) => c.stress));
  if (partnerRecent.length >= 3 && pStress >= 3.5) {
    out.push({
      id: 'stress',
      severity: 'watch',
      title: `${partnerName} is carrying a lot`,
      summary: `Stress has averaged ${pStress.toFixed(1)}/5 across their recent check-ins.`,
      forYou: 'Under sustained stress people have less to give, not because they care less. Lower the bar for connection.',
      together: 'Offer one concrete thing (“I’ll handle our plans this week”) instead of an open-ended “what can I do?”.',
    });
  }

  // 3. Affection dip.
  const pAff = partnerRecent.map((c) => c.affection);
  if (pAff.length >= 3 && avg(pAff.slice(0, 2)) <= 2.5 && avg(pAff.slice(0, 2)) < avg(pAff.slice(2)) - 0.4) {
    out.push({
      id: 'affection',
      severity: 'watch',
      title: 'Affection has dipped',
      summary: `${partnerName}’s closeness scores have been trending down.`,
      forYou: 'A dip usually signals distance or distraction, not a verdict on the relationship. Don’t over-interpret one low day.',
      together: 'Re-anchor on warmth: share a favorite memory, or open the “When I Miss You” kit together.',
    });
  }

  // 4. Reassurance-seeking (anxious bids for connection).
  const needs = partnerRecent.map((c) => (c.need || '').toLowerCase());
  const bids = needs.filter((n) => REASSURANCE_WORDS.some((w) => n.includes(w))).length;
  if (bids >= 2) {
    out.push({
      id: 'reassurance',
      severity: 'info',
      title: `${partnerName} is reaching for reassurance`,
      summary: 'Their recent needs are about closeness and being heard.',
      forYou: 'These are bids for connection. Meeting them early (a quick, warm reply) prevents the anxious-distant spiral.',
      together: 'Be explicit and unprompted: “I’m all in on us. The distance is the hard part, not you.”',
    });
  }

  // 5. Your own running-on-empty (you can’t pour from an empty cup).
  const myStreak = strugglingStreak(checkins, meId);
  const myEnergy = avg(myRecent.slice(0, 4).map((c) => c.energy));
  if (myStreak || (myRecent.length >= 3 && myEnergy <= 2)) {
    out.push({
      id: 'self',
      severity: 'info',
      title: 'Look after yourself too',
      summary: myStreak
        ? `You’ve logged ${myStreak.days} hard days in a row.`
        : 'Your own energy has been low lately.',
      forYou: 'You show up better for someone you love when you’re not depleted. Tending yourself is part of tending the relationship.',
      together: `Tell ${partnerName} honestly where you’re at, being known is its own kind of closeness.`,
    });
  }

  // 6. Struggling streak for partner (escalated).
  const pStreak = strugglingStreak(checkins, partnerId);
  if (pStreak) {
    out.unshift({
      id: 'partner-streak',
      severity: 'tend',
      title: `${partnerName} has had ${pStreak.days} hard days`,
      summary: 'Several tough check-ins in a row, worth a real conversation.',
      forYou: 'A streak is different from a bad day. Don’t wait for them to ask; gently go first.',
      together: 'Make time for an unhurried call. Open with “I’ve noticed it’s been heavy, I’m here, no fixing required.”',
    });
  }

  // Sort by severity weight.
  const weight: Record<Severity, number> = { tend: 0, watch: 1, info: 2 };
  return out.sort((a, b) => weight[a.severity] - weight[b.severity]);
}

export function severityLabel(s: Severity): string {
  return s === 'tend' ? 'Tend to this' : s === 'watch' ? 'Worth noticing' : 'Gentle nudge';
}

export { moodMeta };
