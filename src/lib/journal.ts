// ─────────────────────────────────────────────────────────────────────────
// AI Relationship Journal, a warm, data-driven monthly narrator. It reads
// your check-ins, memories, letters and pings and writes a little scrapbook
// page about your month. Deterministic today; swap in Claude later for prose.
// ─────────────────────────────────────────────────────────────────────────
import { CheckIn, DeckResponse, ISODate, Letter, Memory, Ping } from '../types/models';
import { formatDayMonth, monthLabel, todayISO } from './date';
import { moodMeta } from './mood';

export interface ReportSection {
  heading: string;
  body: string;
}
export interface ReportStat {
  label: string;
  value: string;
}
export interface Report {
  title: string;
  periodLabel: string;
  sentence: string;
  sections: ReportSection[];
  stats: ReportStat[];
  empty: boolean;
}

interface Input {
  checkins: CheckIn[];
  memories: Memory[];
  letters: Letter[];
  pings: Ping[];
  deck: DeckResponse[];
  meId: string;
  partnerId: string;
  meName: string;
  partnerName: string;
  monthISO?: ISODate;
}

const monthKey = (iso: ISODate) => iso.slice(0, 7);
const tsMonthKey = (ts: number) => monthKey(new Date(ts).toISOString().slice(0, 10));

function avg(nums: number[]): number {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

function topMood(list: CheckIn[]) {
  if (!list.length) return null;
  const counts = new Map<string, number>();
  list.forEach((c) => counts.set(c.mood, (counts.get(c.mood) ?? 0) + 1));
  const [mood] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return moodMeta(mood as CheckIn['mood']);
}

function dayScore(c: CheckIn): number {
  return moodMeta(c.mood).valence * 2 + c.affection - c.stress;
}

export function generateReport(input: Input): Report {
  const target = monthKey(input.monthISO ?? todayISO());
  const label = monthLabel((input.monthISO ?? todayISO()).slice(0, 7) + '-01');

  const inMonth = <T extends { createdAt: number }>(items: T[]) =>
    items.filter((i) => tsMonthKey(i.createdAt) === target);

  const monthCheckins = input.checkins.filter((c) => monthKey(c.date) === target);
  const mine = monthCheckins.filter((c) => c.authorId === input.meId);
  const theirs = monthCheckins.filter((c) => c.authorId === input.partnerId);
  const memories = inMonth(input.memories);
  const letters = inMonth(input.letters);
  const pings = inMonth(input.pings);
  const deck = inMonth(input.deck);

  const total = monthCheckins.length + memories.length + letters.length + pings.length + deck.length;
  if (total === 0) {
    return {
      title: 'Your month, together',
      periodLabel: label,
      sentence: 'This chapter is still blank, and that’s the best kind. Check in, save a memory, send a hug, and watch your story write itself.',
      sections: [],
      stats: [],
      empty: true,
    };
  }

  const myMood = topMood(mine);
  const theirMood = topMood(theirs);
  const avgAff = avg(monthCheckins.map((c) => c.affection));
  const bright = [...monthCheckins].sort((a, b) => dayScore(b) - dayScore(a))[0];
  const hard = [...monthCheckins].sort((a, b) => dayScore(a) - dayScore(b))[0];

  const sentence =
    `In ${label}, you checked in ${monthCheckins.length} time${monthCheckins.length === 1 ? '' : 's'}, ` +
    `saved ${memories.length} memor${memories.length === 1 ? 'y' : 'ies'}, ` +
    `and reached for each other ${pings.length + letters.length} time${pings.length + letters.length === 1 ? '' : 's'}, ` +
    `proof the distance didn’t get the last word.`;

  const sections: ReportSection[] = [];

  sections.push({
    heading: 'Your emotional weather',
    body:
      (myMood ? `${input.meName} moved mostly through ${myMood.emoji} ${myMood.label.toLowerCase()} days. ` : `${input.meName} didn’t check in much this month. `) +
      (theirMood ? `${input.partnerName} leaned ${theirMood.emoji} ${theirMood.label.toLowerCase()}. ` : `${input.partnerName} was quieter here. `) +
      `Average closeness ran about ${avgAff.toFixed(1)} out of 5.`,
  });

  if (memories.length) {
    const titles = memories.slice(0, 3).map((m) => `“${m.title}”`).join(', ');
    sections.push({
      heading: 'Moments you saved',
      body: `You tucked away ${memories.length} memor${memories.length === 1 ? 'y' : 'ies'} this month${titles ? `, including ${titles}` : ''}. Future-you will be grateful.`,
    });
  }

  if (bright) {
    sections.push({
      heading: 'What carried you',
      body:
        `Your brightest check-in landed on ${formatDayMonth(bright.date)}, ` +
        `${moodMeta(bright.mood).emoji} ${moodMeta(bright.mood).label.toLowerCase()}, closeness high. ` +
        (hard && hard.id !== bright.id
          ? `${formatDayMonth(hard.date)} was the heaviest, and you got through it anyway.`
          : `Hold onto that feeling.`),
    });
  }

  const reaches = pings.length + letters.length + deck.length;
  if (reaches > 0) {
    sections.push({
      heading: 'Reaching for each other',
      body:
        `${pings.length} hug${pings.length === 1 ? '' : 's'}, ${letters.length} letter${letters.length === 1 ? '' : 's'}, ` +
        `and ${deck.length} deep-question answer${deck.length === 1 ? '' : 's'}. Small bids, big glue.`,
    });
  }

  sections.push({
    heading: 'Something to nurture',
    body:
      avgAff < 3
        ? 'Closeness scores dipped this month. Next month, try one unprompted “thinking of you” a day, tiny, but it compounds.'
        : 'You’re tending this well. Next month, pick one Future Board dream and take a single real step toward it.',
  });

  const stats: ReportStat[] = [
    { label: 'Check-ins', value: `${monthCheckins.length}` },
    { label: 'Memories', value: `${memories.length}` },
    { label: 'Letters', value: `${letters.length}` },
    { label: 'Avg closeness', value: `${avgAff.toFixed(1)}/5` },
  ];

  return { title: 'Your month, together', periodLabel: label, sentence, sections, stats, empty: false };
}
