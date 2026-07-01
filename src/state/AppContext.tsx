import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Platform } from 'react-native';
import { now, todayISO } from '../lib/date';
import { createDb, Db, onSyncHealth, Unsubscribe } from '../services/db';
import { cloudEnabled } from '../services/firebase';
import { hasNotificationPermission } from '../services/permission';
import { registerForPush, sendPush, sendSosPush } from '../services/push';
import {
  clearIdentity,
  genId,
  loadIdentity,
  makeIdentity,
  personId,
  saveIdentity,
} from '../services/identity';
import { DEMO_PARTNER_ID, maybeSeed } from '../services/seed';
import {
  Canvas,
  CheckIn,
  DeckResponse,
  DeviceToken,
  FeelingEntry,
  FutureCategory,
  FutureItem,
  GameAnswer,
  GameKind,
  Identity,
  Issue,
  IssueStep,
  Letter,
  LudoGame,
  Meeting,
  Memory,
  Moment,
  Mood,
  Occasion,
  Ping,
  PingType,
  Reason,
  ScheduleItem,
  SnakesGame,
  SosAlert,
  TicTacToe,
  WordleResult,
} from '../types/models';
import { EMPTY_BOARD } from '../lib/games';
import { applyRoll } from '../lib/snakes';
import { absCell, legalTokens, movedPos, SAFE, Side } from '../lib/ludo';

interface AppValue {
  ready: boolean;
  cloud: boolean;
  syncTrouble: boolean;
  identity: Identity | null;
  meId: string;
  partnerId: string;

  checkins: CheckIn[];
  feelings: FeelingEntry[];
  pings: Ping[];
  letters: Letter[];
  memories: Memory[];
  reasons: Reason[];
  future: FutureItem[];
  deck: DeckResponse[];
  moments: Moment[];
  alerts: SosAlert[];
  meeting: Meeting | null;
  gameAnswers: GameAnswer[];
  tictactoe: TicTacToe | null;
  canvas: Canvas | null;
  wordle: WordleResult[];
  snakes: SnakesGame | null;
  ludo: LudoGame | null;
  schedule: ScheduleItem[];
  occasions: Occasion[];
  issues: Issue[];
  issueSteps: IssueStep[];

  isMine(authorId: string): boolean;
  authorName(authorId: string): string;

  createIdentity(input: {
    name: string;
    partnerName: string;
    spaceId: string;
    anniversary?: string;
  }): Promise<void>;
  updateIdentity(patch: Partial<Identity>): Promise<void>;
  resetEverything(): Promise<void>;

  saveCheckin(data: {
    mood: Mood;
    need: string;
    energy: number;
    stress: number;
    affection: number;
    note?: string;
  }): Promise<boolean>;
  logFeeling(data: { mood: Mood; intensity: number; note?: string }): Promise<void>;
  removeFeeling(id: string): Promise<void>;
  sendPing(type: PingType, message?: string): Promise<void>;
  markPingsSeen(): Promise<void>;
  addLetter(data: {
    title: string;
    body: string;
    deliverAt: number;
    occasion?: string;
  }): Promise<void>;
  openLetter(id: string): Promise<void>;
  updateLetter(id: string, patch: { title?: string; body?: string; occasion?: string; deliverAt?: number }): Promise<void>;
  removeLetter(id: string): Promise<void>;
  addMemory(data: {
    title: string;
    description?: string;
    date: string;
    emoji?: string;
    kind: Memory['kind'];
  }): Promise<void>;
  updateMemory(id: string, patch: { title?: string; description?: string; date?: string; emoji?: string; kind?: Memory['kind'] }): Promise<void>;
  removeMemory(id: string): Promise<void>;
  addReason(text: string): Promise<void>;
  removeReason(id: string): Promise<void>;
  addFuture(category: FutureCategory, text: string): Promise<void>;
  toggleFuture(id: string, done: boolean): Promise<void>;
  updateFuture(id: string, text: string): Promise<void>;
  removeFuture(id: string): Promise<void>;
  addDeckResponse(promptId: string, promptText: string, answer: string): Promise<boolean>;
  addMoment(data: { image: string; caption?: string; date?: string }): Promise<void>;
  removeMoment(id: string): Promise<void>;
  sendSos(message?: string): Promise<void>;
  markAlertsSeen(): Promise<void>;
  setMeeting(at: number, label?: string): Promise<void>;
  clearMeeting(): Promise<void>;
  answerGame(game: GameKind, promptId: string, choice: number): Promise<void>;
  newTicTacToe(): Promise<void>;
  playTicTacToe(index: number): Promise<void>;
  saveCanvas(pixels: string): Promise<void>;
  clearCanvas(): Promise<void>;
  recordWordle(data: { date: string; guesses: string[]; solved: boolean }): Promise<void>;
  newSnakes(): Promise<void>;
  rollSnakes(): Promise<void>;
  newLudo(): Promise<void>;
  rollLudo(): Promise<void>;
  moveLudo(tokenIndex: number): Promise<void>;
  addScheduleItem(data: { date: string; startMin: number; title: string; endMin?: number; icon?: string; note?: string }): Promise<void>;
  updateScheduleItem(id: string, patch: { startMin?: number; title?: string; icon?: string; note?: string; date?: string }): Promise<void>;
  removeScheduleItem(id: string): Promise<void>;
  copyScheduleDay(fromDate: string, toDate: string): Promise<void>;
  addOccasion(data: { title: string; date: string; recurrence: 'yearly' | 'monthly' | 'once'; remindDaysBefore: number; icon?: string }): Promise<void>;
  updateOccasion(id: string, patch: { title?: string; date?: string; recurrence?: 'yearly' | 'monthly' | 'once'; remindDaysBefore?: number; icon?: string }): Promise<void>;
  removeOccasion(id: string): Promise<void>;
  raiseIssue(data: { title: string; detail?: string; feeling?: string; weight: number }): Promise<string | null>;
  updateIssue(id: string, patch: { title?: string; detail?: string; feeling?: string; weight?: number }): Promise<void>;
  acknowledgeIssue(id: string): Promise<void>;
  resolveIssue(id: string): Promise<void>;
  reopenIssue(id: string): Promise<void>;
  removeIssue(id: string): Promise<void>;
  addIssueStep(issueId: string, text: string, done?: boolean): Promise<void>;
  toggleIssueStep(id: string, done: boolean): Promise<void>;
  removeIssueStep(id: string): Promise<void>;
}

// Caps on user/partner-supplied content: keeps any single Firestore document
// well under the 1 MB limit and protects against pathological or abusive input.
const clampReq = (s: string, max: number): string => (s.length > max ? s.slice(0, max) : s);
const clamp = (s: string | undefined, max: number): string | undefined =>
  s == null ? s : s.length > max ? s.slice(0, max) : s;
const MAX_IMAGE_CHARS = 900_000; // ~675 KB of base64, safely under Firestore's 1 MB cap

const Ctx = createContext<AppValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [identity, setIdentity] = useState<Identity | null>(null);
  // True when a Firestore listener has reported an actual error (dropped
  // connection, permission failure, etc) — not the normal, brief "still on
  // local cache while the network catches up" moment every cold start has.
  const [syncTrouble, setSyncTrouble] = useState(false);
  useEffect(() => onSyncHealth(setSyncTrouble), []);

  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [feelings, setFeelings] = useState<FeelingEntry[]>([]);
  const [pings, setPings] = useState<Ping[]>([]);
  const [letters, setLetters] = useState<Letter[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [reasons, setReasons] = useState<Reason[]>([]);
  const [future, setFuture] = useState<FutureItem[]>([]);
  const [deck, setDeck] = useState<DeckResponse[]>([]);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [alerts, setAlerts] = useState<SosAlert[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [tokens, setTokens] = useState<DeviceToken[]>([]);
  const [gameAnswers, setGameAnswers] = useState<GameAnswer[]>([]);
  const [ttt, setTtt] = useState<TicTacToe[]>([]);
  const [wordle, setWordle] = useState<WordleResult[]>([]);
  const [snakes, setSnakes] = useState<SnakesGame[]>([]);
  const [ludo, setLudo] = useState<LudoGame[]>([]);
  const [canvasArr, setCanvas] = useState<Canvas[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [occasions, setOccasions] = useState<Occasion[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [issueSteps, setIssueSteps] = useState<IssueStep[]>([]);

  const dbRef = useRef<Db | null>(null);

  // Load saved identity once on startup.
  useEffect(() => {
    loadIdentity()
      .then(setIdentity)
      .finally(() => setReady(true));
  }, []);

  // (Re)subscribe whenever the shared space changes.
  useEffect(() => {
    if (!identity) {
      dbRef.current = null;
      return;
    }
    const db = createDb(identity.spaceId);
    dbRef.current = db;
    let unsubs: Unsubscribe[] = [];
    let active = true;
    (async () => {
      await maybeSeed(db, identity);
      if (!active) return;
      // TEMP diagnostic: on every snapshot of the two collections behind this
      // bug report, log doc count + which authors are present. If a partner's
      // write never shows up here, the listener/space is the problem; if it
      // shows up here but not on screen, the problem is in the screen's own
      // filtering (e.g. a stale partnerId).
      const logSnapshot = (name: 'checkins' | 'deck') => (items: { authorId?: string }[]) => {
        if (__DEV__) {
          const authors = [...new Set(items.map((i) => i.authorId).filter(Boolean))];
          console.log(`[tether:sync] ${name} snapshot ← ${items.length} doc(s), authors: ${JSON.stringify(authors)}`);
        }
      };
      unsubs = [
        db.watch<CheckIn>('checkins', (items) => { logSnapshot('checkins')(items); setCheckins(items); }),
        db.watch<FeelingEntry>('feelings', setFeelings),
        db.watch<Ping>('pings', setPings),
        db.watch<Letter>('letters', setLetters),
        db.watch<Memory>('memories', setMemories),
        db.watch<Reason>('reasons', setReasons),
        db.watch<FutureItem>('future', setFuture),
        db.watch<DeckResponse>('deck', (items) => { logSnapshot('deck')(items); setDeck(items); }),
        db.watch<Moment>('moments', setMoments),
        db.watch<SosAlert>('alerts', setAlerts),
        db.watch<Meeting>('meetings', setMeetings),
        db.watch<DeviceToken>('tokens', setTokens),
        db.watch<GameAnswer>('gameAnswers', setGameAnswers),
        db.watch<TicTacToe>('tictactoe', setTtt),
        db.watch<WordleResult>('wordle', setWordle),
        db.watch<SnakesGame>('snakes', setSnakes),
        db.watch<LudoGame>('ludo', setLudo),
        db.watch<Canvas>('canvas', setCanvas),
        db.watch<ScheduleItem>('schedule', setSchedule),
        db.watch<Occasion>('occasions', setOccasions),
        db.watch<Issue>('issues', setIssues),
        db.watch<IssueStep>('issueSteps', setIssueSteps),
      ];
    })();
    return () => {
      active = false;
      unsubs.forEach((u) => u());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity?.spaceId]);

  // Register this phone for emergency push so an SOS reaches the partner even
  // when the app is closed. Best-effort: no-ops if push isn't set up yet.
  useEffect(() => {
    if (!identity || !cloudEnabled) return;
    let cancelled = false;
    (async () => {
      // Don't prompt for notifications at launch — the in-app card on Miss You
      // asks in context. Only fetch/store the push token if permission is
      // already granted (re-runs on a later launch once the user enables it).
      if (!(await hasNotificationPermission())) return;
      const token = await registerForPush();
      if (cancelled || !token) return;
      try {
        await dbRef.current?.add('tokens', {
          id: identity.userId,
          token,
          platform: Platform.OS,
          updatedAt: now(),
        });
      } catch {
        /* token storage unavailable; in-app alarm still works */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity?.userId, identity?.spaceId]);

  const meId = identity?.userId ?? '';

  // The partner's stable id is derived from their name (so it survives
  // reinstalls). We still fall back to whatever other author appears in the
  // data, then to the demo partner for local mode, so a name mismatch or legacy
  // data can never hide them.
  const partnerId = useMemo(() => {
    const named = identity ? personId(identity.partnerName) : '';
    const pools: Array<{ authorId?: string; fromId?: string }> = [
      ...checkins,
      ...feelings,
      ...reasons,
      ...memories,
      ...letters,
      ...future,
      ...deck,
      ...pings,
      ...moments,
      ...alerts,
      ...meetings,
    ];
    const others: string[] = [];
    for (const it of pools) {
      const a = it.authorId ?? it.fromId;
      if (a && a !== meId && !others.includes(a)) others.push(a);
    }
    let resolved: string;
    if (named && others.includes(named)) resolved = named; // partner is posting under it
    else {
      const stable = others.find((a) => a.startsWith('p_'));
      resolved = stable ?? (cloudEnabled && named ? named : others[0] ?? DEMO_PARTNER_ID);
    }
    // TEMP diagnostic: partnerId is derived (not a fixed value), by matching
    // your typed partner-name against whichever other authors' writes have
    // synced in. If a partner's check-in/deck answer is arriving (see the
    // "snapshot" logs above) but never appears on screen, compare `resolved`
    // here against the `authors` list in those logs — a mismatch means the
    // screen is filtering for the wrong id, not that sync itself is broken.
    if (__DEV__) console.log(`[tether:sync] partnerId resolved → "${resolved}" (named guess: "${named}", others seen: ${JSON.stringify(others)})`);
    return resolved;
  }, [meId, identity, checkins, feelings, reasons, memories, letters, future, deck, pings, moments, alerts, meetings]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value = useMemo<AppValue>(() => ({
    ready,
    cloud: cloudEnabled,
    syncTrouble,
    identity,
    meId,
    partnerId,
    checkins,
    feelings,
    pings,
    letters,
    memories,
    reasons,
    future,
    deck,
    moments,
    alerts,
    meeting: meetings.find((m) => m.id === 'next') ?? null,
    gameAnswers,
    tictactoe: ttt.find((t) => t.id === 'current') ?? null,
    wordle,
    snakes: snakes.find((s) => s.id === 'current') ?? null,
    ludo: ludo.find((l) => l.id === 'current') ?? null,
    canvas: canvasArr.find((c) => c.id === 'current') ?? null,
    schedule,
    occasions,
    issues,
    issueSteps,

    isMine: (authorId) => authorId === meId,
    authorName: (authorId) =>
      authorId === meId ? identity?.name ?? 'You' : identity?.partnerName ?? 'Partner',

    async createIdentity(input) {
      const id = makeIdentity(input);
      await saveIdentity(id);
      setIdentity(id);
    },
    async updateIdentity(patch) {
      if (!identity) return;
      const next = { ...identity, ...patch };
      next.name = clampReq(next.name, 60);
      next.partnerName = clampReq(next.partnerName, 60);
      next.spaceId = clampReq(next.spaceId, 64);
      if (next.anniversary) next.anniversary = clamp(next.anniversary, 16);
      await saveIdentity(next);
      setIdentity(next);
    },
    async resetEverything() {
      try {
        await clearIdentity();
        const keys = await AsyncStorage.getAllKeys();
        const ours = keys.filter((k) => k.startsWith('@tether/'));
        if (ours.length) await AsyncStorage.multiRemove(ours);
      } catch (e) {
        console.warn('[tether] reset storage failed', e);
      }
      setCheckins([]);
      setFeelings([]);
      setPings([]);
      setLetters([]);
      setMemories([]);
      setReasons([]);
      setFuture([]);
      setDeck([]);
      setMoments([]);
      setAlerts([]);
      setMeetings([]);
      setTokens([]);
      setGameAnswers([]);
      setTtt([]);
      setWordle([]);
      setSnakes([]);
      setLudo([]);
      setCanvas([]);
      setSchedule([]);
      setOccasions([]);
      setIssues([]);
      setIssueSteps([]);
      setIdentity(null);
    },

    async saveCheckin(data) {
      const db = dbRef.current;
      if (!db) return false;
      const date = todayISO();
      const existing = checkins.find((c) => c.authorId === meId && c.date === date);
      const item: CheckIn = {
        id: existing?.id ?? genId('c_'),
        authorId: meId,
        date,
        createdAt: now(),
        ...data,
        need: clampReq(data.need, 280),
        note: clamp(data.note, 2000),
      };
      // TEMP diagnostic: confirms the exact payload and destination path a
      // check-in write takes, so a "partner can't see my check-in" report can
      // be verified from the Expo console (which spaceId, which authorId).
      if (__DEV__) console.log('[tether:sync] checkin write →', db.cloud ? 'cloud' : 'local', item);
      const ok = await db.add('checkins', item);
      if (__DEV__) console.log('[tether:sync] checkin write result:', ok);
      return ok;
    },
    async logFeeling(data) {
      const db = dbRef.current;
      if (!db) return;
      const date = todayISO();
      await db.add('feelings', {
        id: genId('fl_'),
        authorId: meId,
        date,
        createdAt: now(),
        mood: data.mood,
        intensity: Math.max(1, Math.min(10, Math.round(data.intensity))),
        note: clamp(data.note, 500),
      });
    },
    async removeFeeling(id) {
      await dbRef.current?.remove('feelings', id);
    },
    async sendPing(type, message) {
      const db = dbRef.current;
      if (!db) return;
      await db.add('pings', {
        id: genId('g_'),
        fromId: meId,
        type,
        message: clamp(message, 500),
        createdAt: now(),
        seenAt: null,
      });
      // Notify the partner's phone (best-effort; needs push to be set up).
      const who = identity?.name ?? 'Your partner';
      const body =
        type === 'kiss'
          ? 'Sent you a kiss 💋'
          : type === 'hug'
            ? 'Sent you a hug 🤗'
            : type === 'miss'
              ? 'Misses you 🥺'
              : 'Is thinking of you 💭';
      const pingTokens = tokens.filter((t) => t.id !== meId).map((t) => t.token);
      if (pingTokens.length) void sendPush(pingTokens, who, body);
    },
    async markPingsSeen() {
      const db = dbRef.current;
      if (!db) return;
      const unseen = pings.filter((p) => p.fromId !== meId && !p.seenAt);
      await Promise.all(unseen.map((p) => db.update<Ping>('pings', p.id, { seenAt: now() })));
    },
    async addLetter(data) {
      const db = dbRef.current;
      if (!db) return;
      await db.add('letters', {
        id: genId('l_'),
        authorId: meId,
        createdAt: now(),
        openedAt: null,
        ...data,
        title: clampReq(data.title, 140),
        body: clampReq(data.body, 10000),
        occasion: clamp(data.occasion, 140),
      });
    },
    async openLetter(id) {
      await dbRef.current?.update<Letter>('letters', id, { openedAt: now() });
    },
    async updateLetter(id, patch) {
      const db = dbRef.current;
      if (!db) return;
      const clean: Record<string, unknown> = {};
      if (patch.title?.trim()) clean.title = clampReq(patch.title.trim(), 140);
      if (patch.body?.trim()) clean.body = clampReq(patch.body.trim(), 10000);
      if (patch.occasion !== undefined) clean.occasion = patch.occasion.trim() ? clampReq(patch.occasion.trim(), 140) : null;
      if (patch.deliverAt != null) clean.deliverAt = patch.deliverAt;
      await db.update<Letter>('letters', id, clean as Partial<Letter>);
    },
    async removeLetter(id) {
      await dbRef.current?.remove('letters', id);
    },
    async addMemory(data) {
      const db = dbRef.current;
      if (!db) return;
      await db.add('memories', {
        id: genId('m_'),
        authorId: meId,
        createdAt: now(),
        ...data,
        title: clampReq(data.title, 140),
        description: clamp(data.description, 4000),
        emoji: clamp(data.emoji, 8),
      });
    },
    async updateMemory(id, patch) {
      const db = dbRef.current;
      if (!db) return;
      const clean: Record<string, unknown> = {};
      if (patch.title?.trim()) clean.title = clampReq(patch.title.trim(), 140);
      if (patch.description !== undefined) clean.description = patch.description.trim() ? clampReq(patch.description.trim(), 4000) : null;
      if (patch.date) clean.date = patch.date;
      if (patch.emoji !== undefined) clean.emoji = patch.emoji ? patch.emoji.slice(0, 8) : null;
      if (patch.kind) clean.kind = patch.kind;
      await db.update<Memory>('memories', id, clean as Partial<Memory>);
    },
    async removeMemory(id) {
      await dbRef.current?.remove('memories', id);
    },
    async addReason(text) {
      const db = dbRef.current;
      if (!db) return;
      await db.add('reasons', { id: genId('r_'), authorId: meId, text: clampReq(text, 500), createdAt: now() });
    },
    async removeReason(id) {
      await dbRef.current?.remove('reasons', id);
    },
    async addFuture(category, text) {
      const db = dbRef.current;
      if (!db) return;
      await db.add('future', {
        id: genId('f_'),
        authorId: meId,
        category,
        text: clampReq(text, 500),
        done: false,
        createdAt: now(),
      });
    },
    async toggleFuture(id, done) {
      await dbRef.current?.update<FutureItem>('future', id, { done });
    },
    async updateFuture(id, text) {
      const db = dbRef.current;
      if (!db) return;
      const t = (text ?? '').trim();
      if (!t) return;
      await db.update<FutureItem>('future', id, { text: clampReq(t, 500) });
    },
    async removeFuture(id) {
      await dbRef.current?.remove('future', id);
    },
    async addDeckResponse(promptId, promptText, answer) {
      const db = dbRef.current;
      if (!db) return false;
      const item = {
        id: genId('d_'),
        authorId: meId,
        promptId,
        promptText: clampReq(promptText, 280),
        answer: clampReq(answer, 4000),
        createdAt: now(),
      };
      // TEMP diagnostic: confirms the deck answer actually reaches the shared
      // space document (spaceId + authorId visible here), so a "partner never
      // sees my answer" report can be checked against the real payload.
      if (__DEV__) console.log('[tether:sync] deck answer write →', db.cloud ? 'cloud' : 'local', item);
      const ok = await db.add('deck', item);
      if (__DEV__) console.log('[tether:sync] deck answer write result:', ok);
      return ok;
    },
    async addMoment(data) {
      const db = dbRef.current;
      if (!db) return;
      if (!data.image || data.image.length > MAX_IMAGE_CHARS) {
        throw new Error('That photo is too large to share. Please try another one.');
      }
      const date = data.date ?? todayISO();
      const ok = await db.add('moments', {
        id: genId('p_'),
        authorId: meId,
        date,
        createdAt: now(),
        image: data.image,
        caption: clamp(data.caption, 500),
      });
      if (!ok) throw new Error('Could not save that moment. Check your connection and try again.');
      // Notify the partner that a new moment is waiting (best-effort).
      const who = identity?.name ?? 'Your partner';
      const momentTokens = tokens.filter((t) => t.id !== meId).map((t) => t.token);
      if (momentTokens.length) void sendPush(momentTokens, who, '📸 Shared a new moment');
    },
    async removeMoment(id) {
      await dbRef.current?.remove('moments', id);
    },
    async sendSos(message) {
      const db = dbRef.current;
      if (!db) return;
      const safeMessage = clamp(message, 500);
      await db.add('alerts', {
        id: genId('s_'),
        fromId: meId,
        createdAt: now(),
        message: safeMessage,
        seenAt: null,
      });
      // Also push to the partner's phone so it alarms even when the app is
      // closed. Fire-and-forget: never blocks or fails the SOS itself.
      const partnerTokens = tokens.filter((t) => t.id !== meId).map((t) => t.token);
      if (partnerTokens.length) {
        void sendSosPush(partnerTokens, identity?.name ?? 'Your partner', safeMessage);
      }
    },
    async markAlertsSeen() {
      const db = dbRef.current;
      if (!db) return;
      const unseen = alerts.filter((a) => a.fromId !== meId && !a.seenAt);
      await Promise.all(unseen.map((a) => db.update<SosAlert>('alerts', a.id, { seenAt: now() })));
    },
    async setMeeting(at, label) {
      const db = dbRef.current;
      if (!db) return;
      await db.add('meetings', {
        id: 'next',
        authorId: meId,
        at,
        label: clamp(label?.trim() || undefined, 140),
        createdAt: now(),
      });
    },
    async clearMeeting() {
      await dbRef.current?.remove('meetings', 'next');
    },
    async answerGame(game, promptId, choice) {
      const db = dbRef.current;
      if (!db) return;
      await db.add('gameAnswers', {
        id: `${game}:${promptId}:${meId}`,
        authorId: meId,
        game,
        promptId,
        choice: Math.round(choice),
        createdAt: now(),
      });
    },
    async newTicTacToe() {
      const db = dbRef.current;
      if (!db) return;
      await db.add('tictactoe', {
        id: 'current',
        board: EMPTY_BOARD,
        turn: meId, // X starts
        xId: meId,
        oId: partnerId,
        createdAt: now(),
        updatedAt: now(),
      });
    },
    async playTicTacToe(index) {
      const db = dbRef.current;
      if (!db) return;
      const game = ttt.find((t) => t.id === 'current');
      if (!game) return;
      if (game.turn !== meId) return; // not your turn
      if (index < 0 || index > 8 || game.board[index] !== '-') return; // occupied/invalid
      const mark = meId === game.xId ? 'X' : 'O';
      const board = game.board.substring(0, index) + mark + game.board.substring(index + 1);
      const nextTurn = game.turn === game.xId ? game.oId : game.xId;
      await db.update<TicTacToe>('tictactoe', 'current', { board, turn: nextTurn, updatedAt: now() });
    },
    async saveCanvas(pixels) {
      const db = dbRef.current;
      if (!db) return;
      // The whole grid is one tiny doc; the screen debounces these so a stroke
      // is a single write. clampReq caps length defensively (256 chars normally).
      await db.add('canvas', {
        id: 'current',
        pixels: clampReq(pixels, 1024),
        size: 16,
        updatedAt: now(),
        updatedBy: meId,
      });
    },
    async clearCanvas() {
      const db = dbRef.current;
      if (!db) return;
      await db.add('canvas', {
        id: 'current',
        pixels: '0'.repeat(256),
        size: 16,
        updatedAt: now(),
        updatedBy: meId,
      });
    },
    async recordWordle({ date, guesses, solved }) {
      const db = dbRef.current;
      if (!db) return;
      const clean = (guesses ?? [])
        .slice(0, 6)
        .map((g) => String(g).toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5))
        .filter((g) => g.length === 5);
      const id = `${date}:${meId}`;
      const existing = wordle.find((w) => w.id === id);
      await db.add('wordle', {
        id,
        authorId: meId,
        date,
        guesses: clean,
        solved: !!solved,
        createdAt: existing?.createdAt ?? now(),
        updatedAt: now(),
      });
    },
    async newSnakes() {
      const db = dbRef.current;
      if (!db) return;
      await db.add('snakes', {
        id: 'current',
        aId: meId,
        bId: partnerId,
        aPos: 0,
        bPos: 0,
        turn: meId,
        roll: 0,
        rolledBy: '',
        winner: '',
        createdAt: now(),
        updatedAt: now(),
      });
    },
    async rollSnakes() {
      const db = dbRef.current;
      if (!db) return;
      const g = snakes.find((s) => s.id === 'current');
      if (!g || g.winner || g.turn !== meId) return;
      const die = 1 + Math.floor(Math.random() * 6);
      const isA = meId === g.aId;
      const np = applyRoll(isA ? g.aPos : g.bPos, die);
      const winner = np === 100 ? meId : '';
      const nextTurn = winner ? g.turn : g.turn === g.aId ? g.bId : g.aId;
      await db.update<SnakesGame>('snakes', 'current', {
        ...(isA ? { aPos: np } : { bPos: np }),
        roll: die,
        rolledBy: meId,
        turn: nextTurn,
        winner,
        updatedAt: now(),
      });
    },
    async newLudo() {
      const db = dbRef.current;
      if (!db) return;
      await db.add('ludo', {
        id: 'current',
        aId: meId,
        bId: partnerId,
        aTokens: [-1, -1, -1, -1],
        bTokens: [-1, -1, -1, -1],
        turn: meId,
        die: 0,
        mustMove: false,
        winner: '',
        createdAt: now(),
        updatedAt: now(),
      });
    },
    async rollLudo() {
      const db = dbRef.current;
      if (!db) return;
      const g = ludo.find((l) => l.id === 'current');
      if (!g || g.winner || g.turn !== meId || g.mustMove) return;
      const die = 1 + Math.floor(Math.random() * 6);
      const myTokens = meId === g.aId ? g.aTokens : g.bTokens;
      const legal = legalTokens(myTokens, die);
      if (legal.length > 0) {
        await db.update<LudoGame>('ludo', 'current', { die, mustMove: true, updatedAt: now() });
      } else {
        const nextTurn = g.turn === g.aId ? g.bId : g.aId;
        await db.update<LudoGame>('ludo', 'current', { die, mustMove: false, turn: nextTurn, updatedAt: now() });
      }
    },
    async moveLudo(tokenIndex) {
      const db = dbRef.current;
      if (!db) return;
      const g = ludo.find((l) => l.id === 'current');
      if (!g || g.winner || g.turn !== meId || !g.mustMove) return;
      const isA = meId === g.aId;
      const side: Side = isA ? 'a' : 'b';
      const oppSide: Side = isA ? 'b' : 'a';
      const myTokens = [...(isA ? g.aTokens : g.bTokens)];
      const oppTokens = [...(isA ? g.bTokens : g.aTokens)];
      if (!legalTokens(myTokens, g.die).includes(tokenIndex)) return;
      const np = movedPos(myTokens[tokenIndex], g.die);
      myTokens[tokenIndex] = np;
      let captured = false;
      const cell = absCell(side, np);
      if (cell !== null && !SAFE.has(cell)) {
        for (let j = 0; j < oppTokens.length; j++) {
          if (absCell(oppSide, oppTokens[j]) === cell) {
            oppTokens[j] = -1;
            captured = true;
          }
        }
      }
      const winner = myTokens.every((p) => p === 56) ? meId : '';
      const extra = (g.die === 6 || captured) && !winner;
      const nextTurn = extra ? meId : g.turn === g.aId ? g.bId : g.aId;
      await db.update<LudoGame>('ludo', 'current', {
        aTokens: isA ? myTokens : oppTokens,
        bTokens: isA ? oppTokens : myTokens,
        mustMove: false,
        turn: nextTurn,
        winner,
        updatedAt: now(),
      });
    },
    async addScheduleItem({ date, startMin, title, endMin, icon, note }) {
      const db = dbRef.current;
      if (!db) return;
      const t = (title ?? '').trim();
      if (!t) return;
      await db.add('schedule', {
        id: genId('sc_'),
        authorId: meId,
        date,
        startMin: Math.max(0, Math.min(1439, Math.round(startMin))),
        endMin: endMin == null ? undefined : Math.max(0, Math.min(1439, Math.round(endMin))),
        title: clampReq(t, 80),
        icon: icon ? icon.slice(0, 4) : undefined,
        note: clamp(note, 200),
        createdAt: now(),
        updatedAt: now(),
      });
    },
    async updateScheduleItem(id, patch) {
      const db = dbRef.current;
      if (!db) return;
      const clean: Record<string, unknown> = { updatedAt: now() };
      if (patch.title?.trim()) clean.title = clampReq(patch.title.trim(), 80);
      if (patch.startMin != null) clean.startMin = Math.max(0, Math.min(1439, Math.round(patch.startMin)));
      if (patch.date) clean.date = patch.date;
      if (patch.icon !== undefined) clean.icon = patch.icon ? patch.icon.slice(0, 4) : null;
      if (patch.note !== undefined) clean.note = patch.note.trim() ? clampReq(patch.note.trim(), 200) : null;
      await db.update<ScheduleItem>('schedule', id, clean as Partial<ScheduleItem>);
    },
    async removeScheduleItem(id) {
      await dbRef.current?.remove('schedule', id);
    },
    async copyScheduleDay(fromDate, toDate) {
      const db = dbRef.current;
      if (!db || fromDate === toDate) return;
      const mine = schedule.filter((s) => s.date === fromDate && s.authorId === meId);
      // Skip items that already exist on the target day (same title + start), so
      // tapping "Copy" twice doesn't silently double every plan.
      const existing = schedule.filter((s) => s.date === toDate && s.authorId === meId);
      const isDupe = (s: ScheduleItem) =>
        existing.some((e) => e.title === s.title && e.startMin === s.startMin);
      // Fire the copies concurrently: a single write can stall offline (the
      // cloud ack never arrives), and a sequential await would block the rest.
      await Promise.all(
        mine
          .filter((s) => !isDupe(s))
          .map((s) =>
          db.add('schedule', {
            id: genId('sc_'),
            authorId: meId,
            date: toDate,
            startMin: s.startMin,
            endMin: s.endMin,
            title: s.title,
            icon: s.icon,
            note: s.note,
            createdAt: now(),
            updatedAt: now(),
          }),
        ),
      );
    },
    async addOccasion({ title, date, recurrence, remindDaysBefore, icon }) {
      const db = dbRef.current;
      if (!db) return;
      const t = (title ?? '').trim();
      if (!t) return;
      await db.add('occasions', {
        id: genId('oc_'),
        authorId: meId,
        title: clampReq(t, 80),
        date,
        recurrence,
        remindDaysBefore: Math.max(0, Math.min(60, Math.round(remindDaysBefore))),
        icon: icon ? icon.slice(0, 4) : undefined,
        createdAt: now(),
      });
    },
    async updateOccasion(id, patch) {
      const db = dbRef.current;
      if (!db) return;
      const clean: Record<string, unknown> = {};
      if (patch.title?.trim()) clean.title = clampReq(patch.title.trim(), 80);
      if (patch.date) clean.date = patch.date;
      if (patch.recurrence) clean.recurrence = patch.recurrence;
      if (patch.remindDaysBefore != null) clean.remindDaysBefore = Math.max(0, Math.min(60, Math.round(patch.remindDaysBefore)));
      if (patch.icon !== undefined) clean.icon = patch.icon ? patch.icon.slice(0, 4) : null;
      await db.update<Occasion>('occasions', id, clean as Partial<Occasion>);
    },
    async removeOccasion(id) {
      await dbRef.current?.remove('occasions', id);
    },

    async raiseIssue({ title, detail, feeling, weight }) {
      const db = dbRef.current;
      if (!db) return null;
      const t = (title ?? '').trim();
      if (!t) return null;
      const id = genId('is_');
      // Fire the write without awaiting: offline the cloud ack can hang forever,
      // yet the optimistic local write lands at once (and syncs later). Returning
      // the id straight away lets the caller open the new issue immediately.
      void db.add('issues', {
        id,
        authorId: meId,
        title: clampReq(t, 120),
        detail: clamp(detail?.trim() || undefined, 2000),
        feeling: clamp(feeling?.trim() || undefined, 40),
        weight: Math.max(1, Math.min(5, Math.round(weight))),
        status: 'open',
        createdAt: now(),
        updatedAt: now(),
      });
      // Let the partner's phone know something needs care (best-effort).
      const who = identity?.name ?? 'Your partner';
      const issueTokens = tokens.filter((tk) => tk.id !== meId).map((tk) => tk.token);
      if (issueTokens.length) void sendPush(issueTokens, who, '🕊️ Raised something to clear the air');
      return id;
    },
    async updateIssue(id, patch) {
      const db = dbRef.current;
      if (!db) return;
      const clean: Record<string, unknown> = { updatedAt: now() };
      if (patch.title?.trim()) clean.title = clampReq(patch.title.trim(), 120);
      if (patch.detail !== undefined) clean.detail = patch.detail.trim() ? clampReq(patch.detail.trim(), 2000) : null;
      if (patch.feeling !== undefined) clean.feeling = patch.feeling.trim() ? clampReq(patch.feeling.trim(), 40) : null;
      if (patch.weight != null) clean.weight = Math.max(1, Math.min(5, Math.round(patch.weight)));
      await db.update<Issue>('issues', id, clean as Partial<Issue>);
    },
    async acknowledgeIssue(id) {
      const db = dbRef.current;
      if (!db) return;
      const it = issues.find((i) => i.id === id);
      if (!it || it.authorId === meId || it.acknowledgedBy) return; // only the partner, once
      await db.update<Issue>('issues', id, { acknowledgedBy: meId, acknowledgedAt: now(), updatedAt: now() });
    },
    async resolveIssue(id) {
      await dbRef.current?.update<Issue>('issues', id, { status: 'resolved', resolvedAt: now(), updatedAt: now() });
    },
    async reopenIssue(id) {
      await dbRef.current?.update<Issue>('issues', id, { status: 'open', resolvedAt: null as unknown as undefined, updatedAt: now() });
    },
    async removeIssue(id) {
      const db = dbRef.current;
      if (!db) return;
      // Remove the issue and its steps together. Fire concurrently so a single
      // offline write can't stall the rest (the cloud ack may never arrive).
      const steps = issueSteps.filter((s) => s.issueId === id);
      await Promise.all([db.remove('issues', id), ...steps.map((s) => db.remove('issueSteps', s.id))]);
    },
    async addIssueStep(issueId, text, done = false) {
      const db = dbRef.current;
      if (!db) return;
      const t = (text ?? '').trim();
      if (!t) return;
      // Add the step and bump the issue together, concurrently: a single write
      // can stall offline (the ack never arrives) and would block the other.
      await Promise.all([
        db.add('issueSteps', {
          id: genId('ist_'),
          issueId,
          authorId: meId,
          text: clampReq(t, 280),
          done: !!done,
          createdAt: now(),
        }),
        db.update<Issue>('issues', issueId, { updatedAt: now() }),
      ]);
    },
    async toggleIssueStep(id, done) {
      await dbRef.current?.update<IssueStep>('issueSteps', id, { done });
    },
    async removeIssueStep(id) {
      await dbRef.current?.remove('issueSteps', id);
    },
  // Recreate only when actual state changes, not on every parent render.
  }), [ready, identity, syncTrouble, meId, partnerId, checkins, feelings, pings, letters, memories, reasons, future, deck, moments, alerts, meetings, tokens, gameAnswers, ttt, wordle, snakes, ludo, canvasArr, schedule, occasions, issues, issueSteps]); // eslint-disable-line react-hooks/exhaustive-deps

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used within AppProvider');
  return v;
}
