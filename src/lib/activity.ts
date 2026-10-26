// ─────────────────────────────────────────────────────────────────────────
// A unified "what happened" feed across every feature, so the Home screen can
// show the day as it unfolds and, above all, surface what your partner just did
// so it is easy to respond.
// ─────────────────────────────────────────────────────────────────────────
import {
  CheckIn,
  DeckResponse,
  FeelingEntry,
  FutureItem,
  Issue,
  Letter,
  Memory,
  Moment,
  Occasion,
  Ping,
  PingType,
  Reason,
  ScheduleItem,
  TicTacToe,
  WordleResult,
} from '../types/models';
import { tttWinner } from './games';
import { moodMeta } from './mood';

export interface ActivityEvent {
  id: string;
  actorId: string;
  mine: boolean;
  icon: string;
  text: string;
  at: number;
  route: string;
  params?: Record<string, unknown>;
  /** Back-to-back events with the same key, by the same person, fold into one row. */
  groupKey?: string;
  /** The folded row's text for `n` events (n ≥ 2). */
  groupText?: (n: number) => string;
  /** How many events this row stands for (set by `collapseRuns`). */
  count?: number;
}

export interface ActivitySources {
  meId: string;
  authorName: (id: string) => string;
  checkins: CheckIn[];
  feelings: FeelingEntry[];
  moments: Moment[];
  memories: Memory[];
  reasons: Reason[];
  future: FutureItem[];
  deck: DeckResponse[];
  schedule: ScheduleItem[];
  occasions: Occasion[];
  issues: Issue[];
  letters: Letter[];
  pings: Ping[];
  wordle: WordleResult[];
  tictactoe: TicTacToe | null;
}

function pingIcon(t: PingType): string {
  return t === 'kiss' ? '💋' : t === 'hug' ? '🤗' : t === 'miss' ? '🥺' : '💭';
}
function pingWord(t: PingType): string {
  return t === 'kiss' ? 'a kiss' : t === 'hug' ? 'a hug' : t === 'miss' ? 'a "miss you"' : 'a thought';
}

function pingPlural(t: PingType, n: number): string {
  return t === 'kiss' ? `${n} kisses` : t === 'hug' ? `${n} hugs` : t === 'miss' ? `"miss you" ${n} times` : `${n} thoughts`;
}

function trim(s: string | undefined, n = 60): string {
  const t = (s ?? '').trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

/** Every notable action across the app, newest first. */
export function buildActivity(s: ActivitySources): ActivityEvent[] {
  const who = (id: string) => s.authorName(id);
  const mine = (id: string) => id === s.meId;
  const ev: ActivityEvent[] = [];
  const push = (e: Omit<ActivityEvent, 'mine'>) => ev.push({ ...e, mine: mine(e.actorId) });

  for (const c of s.checkins) {
    push({ id: `ci_${c.id}`, actorId: c.authorId, icon: moodMeta(c.mood).emoji, at: c.createdAt, route: 'Pulse', text: `${who(c.authorId)} checked in feeling ${moodMeta(c.mood).label.toLowerCase()}` });
  }
  for (const f of s.feelings) {
    push({ id: `fl_${f.id}`, actorId: f.authorId, icon: moodMeta(f.mood).emoji, at: f.createdAt, route: 'Pulse', text: `${who(f.authorId)} logged ${moodMeta(f.mood).label.toLowerCase()} ${f.intensity}/10` });
  }
  for (const m of s.moments) {
    push({ id: `mo_${m.id}`, actorId: m.authorId, icon: '📸', at: m.createdAt, route: 'Moments', text: `${who(m.authorId)} shared a moment${m.caption ? `: ${trim(m.caption)}` : ''}` });
  }
  for (const m of s.memories) {
    push({ id: `me_${m.id}`, actorId: m.authorId, icon: m.emoji || '⭐️', at: m.createdAt, route: 'Vault', text: `${who(m.authorId)} saved a memory: ${trim(m.title)}` });
  }
  for (const r of s.reasons) {
    push({ id: `re_${r.id}`, actorId: r.authorId, icon: '💗', at: r.createdAt, route: 'MissYou', text: `${who(r.authorId)} added a reason they love you`, groupKey: 'reason', groupText: (n) => `${who(r.authorId)} added ${n} reasons they love you` });
  }
  for (const f of s.future) {
    push({ id: `fu_${f.id}`, actorId: f.authorId, icon: f.done ? '✅' : '✨', at: f.createdAt, route: 'Future', text: `${who(f.authorId)} ${f.done ? 'ticked off' : 'added'} a dream: ${trim(f.text)}` });
  }
  for (const d of s.deck) {
    push({ id: `dk_${d.id}`, actorId: d.authorId, icon: '🃏', at: d.createdAt, route: 'Deck', text: `${who(d.authorId)} answered a closeness question`, groupKey: 'deck', groupText: (n) => `${who(d.authorId)} answered ${n} closeness questions` });
  }
  for (const it of s.schedule) {
    push({ id: `sc_${it.id}`, actorId: it.authorId, icon: it.icon || '🗓️', at: it.updatedAt ?? it.createdAt, route: 'Schedule', text: `${who(it.authorId)} planned ${trim(it.title)}` });
  }
  for (const o of s.occasions) {
    push({ id: `oc_${o.id}`, actorId: o.authorId, icon: o.icon || '🎀', at: o.createdAt, route: 'Occasions', text: `${who(o.authorId)} added a date: ${trim(o.title)}` });
  }
  for (const i of s.issues) {
    const open = i.status === 'open';
    const toPartner = open && !mine(i.authorId);
    push({
      id: `is_${i.id}`,
      actorId: i.authorId,
      icon: open ? '🕊️' : '🤍',
      at: i.updatedAt ?? i.createdAt,
      route: toPartner ? 'IssueDetail' : 'Issues',
      params: toPartner ? { id: i.id } : undefined,
      text: open ? `${who(i.authorId)} wants to clear the air: ${trim(i.title)}` : `${who(i.authorId)} marked something cleared`,
    });
  }
  for (const l of s.letters) {
    // Only surface delivered letters; sealed ones stay a surprise.
    if (l.deliverAt <= Date.now() && !mine(l.authorId)) {
      push({ id: `le_${l.id}`, actorId: l.authorId, icon: '💌', at: l.deliverAt, route: 'Letters', text: `A letter from ${who(l.authorId)} is ready: ${trim(l.title)}` });
    }
  }
  for (const p of s.pings) {
    push({ id: `pg_${p.id}`, actorId: p.fromId, icon: pingIcon(p.type), at: p.createdAt, route: 'MissYou', text: `${who(p.fromId)} sent ${pingWord(p.type)}`, groupKey: `ping_${p.type}`, groupText: (n) => `${who(p.fromId)} sent ${pingPlural(p.type, n)}` });
  }
  for (const w of s.wordle) {
    push({
      id: `wl_${w.id}`,
      actorId: w.authorId,
      icon: w.solved ? '🟩' : '🟥',
      at: w.updatedAt,
      route: 'Wordle',
      text: w.solved
        ? `${who(w.authorId)} solved today's Wordle in ${w.guesses.length} ${w.guesses.length === 1 ? 'guess' : 'guesses'}`
        : `${who(w.authorId)} tried today's Wordle`,
    });
  }
  if (s.tictactoe) {
    const mark = tttWinner(s.tictactoe.board);
    if (mark === 'X' || mark === 'O') {
      const winnerId = mark === 'X' ? s.tictactoe.xId : s.tictactoe.oId;
      push({
        id: `ttt_${s.tictactoe.updatedAt}`,
        actorId: winnerId,
        icon: '🎮',
        at: s.tictactoe.updatedAt,
        route: 'TicTacToe',
        text: `${who(winnerId)} won tic-tac-toe`,
      });
    }
  }

  return ev.sort((a, b) => b.at - a.at);
}

/** Keep only events from the last `hours` hours. */
export function withinHours(events: ActivityEvent[], hours: number): ActivityEvent[] {
  const cut = Date.now() - hours * 3_600_000;
  return events.filter((e) => e.at >= cut);
}

/**
 * Fold back-to-back repeats into one row ("Riya added 3 reasons they love you")
 * so a burst of small gestures doesn't push everything else off the feed. Only
 * neighbours fold: anything in between keeps the timeline honest.
 */
export function collapseRuns(events: ActivityEvent[]): ActivityEvent[] {
  const out: ActivityEvent[] = [];
  for (const e of events) {
    const last = out[out.length - 1];
    if (last && e.groupKey && last.groupKey === e.groupKey && last.actorId === e.actorId) {
      const n = (last.count ?? 1) + 1;
      out[out.length - 1] = { ...last, count: n, text: e.groupText ? e.groupText(n) : last.text };
    } else {
      out.push(e);
    }
  }
  return out;
}
