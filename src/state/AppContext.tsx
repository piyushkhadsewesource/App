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
import { now } from '../lib/date';
import { createDb, Db, Unsubscribe } from '../services/db';
import { cloudEnabled } from '../services/firebase';
import {
  clearIdentity,
  genId,
  loadIdentity,
  makeIdentity,
  saveIdentity,
} from '../services/identity';
import { DEMO_PARTNER_ID, maybeSeed } from '../services/seed';
import {
  CheckIn,
  DeckResponse,
  FutureCategory,
  FutureItem,
  Identity,
  Letter,
  Memory,
  Mood,
  Ping,
  PingType,
  Reason,
} from '../types/models';

interface AppValue {
  ready: boolean;
  cloud: boolean;
  identity: Identity | null;
  meId: string;
  partnerId: string;

  checkins: CheckIn[];
  pings: Ping[];
  letters: Letter[];
  memories: Memory[];
  reasons: Reason[];
  future: FutureItem[];
  deck: DeckResponse[];

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
  }): Promise<void>;
  sendPing(type: PingType, message?: string): Promise<void>;
  markPingsSeen(): Promise<void>;
  addLetter(data: {
    title: string;
    body: string;
    deliverAt: number;
    occasion?: string;
  }): Promise<void>;
  openLetter(id: string): Promise<void>;
  addMemory(data: {
    title: string;
    description?: string;
    date: string;
    emoji?: string;
    kind: Memory['kind'];
  }): Promise<void>;
  removeMemory(id: string): Promise<void>;
  addReason(text: string): Promise<void>;
  removeReason(id: string): Promise<void>;
  addFuture(category: FutureCategory, text: string): Promise<void>;
  toggleFuture(id: string, done: boolean): Promise<void>;
  removeFuture(id: string): Promise<void>;
  addDeckResponse(promptId: string, promptText: string, answer: string): Promise<void>;
}

const Ctx = createContext<AppValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [identity, setIdentity] = useState<Identity | null>(null);

  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [pings, setPings] = useState<Ping[]>([]);
  const [letters, setLetters] = useState<Letter[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [reasons, setReasons] = useState<Reason[]>([]);
  const [future, setFuture] = useState<FutureItem[]>([]);
  const [deck, setDeck] = useState<DeckResponse[]>([]);

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
      unsubs = [
        db.watch<CheckIn>('checkins', setCheckins),
        db.watch<Ping>('pings', setPings),
        db.watch<Letter>('letters', setLetters),
        db.watch<Memory>('memories', setMemories),
        db.watch<Reason>('reasons', setReasons),
        db.watch<FutureItem>('future', setFuture),
        db.watch<DeckResponse>('deck', setDeck),
      ];
    })();
    return () => {
      active = false;
      unsubs.forEach((u) => u());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity?.spaceId]);

  const meId = identity?.userId ?? '';

  // The partner is whoever else has written into the shared space.
  const partnerId = useMemo(() => {
    const pools: Array<{ authorId?: string; fromId?: string }> = [
      ...checkins,
      ...reasons,
      ...memories,
      ...letters,
      ...future,
      ...deck,
      ...pings,
    ];
    for (const it of pools) {
      const a = it.authorId ?? it.fromId;
      if (a && a !== meId) return a;
    }
    return DEMO_PARTNER_ID;
  }, [meId, checkins, reasons, memories, letters, future, deck, pings]);

  const value: AppValue = {
    ready,
    cloud: cloudEnabled,
    identity,
    meId,
    partnerId,
    checkins,
    pings,
    letters,
    memories,
    reasons,
    future,
    deck,

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
      await saveIdentity(next);
      setIdentity(next);
    },
    async resetEverything() {
      await clearIdentity();
      const keys = await AsyncStorage.getAllKeys();
      const ours = keys.filter((k) => k.startsWith('@tether/'));
      if (ours.length) await AsyncStorage.multiRemove(ours);
      setCheckins([]);
      setPings([]);
      setLetters([]);
      setMemories([]);
      setReasons([]);
      setFuture([]);
      setDeck([]);
      setIdentity(null);
    },

    async saveCheckin(data) {
      const db = dbRef.current;
      if (!db) return;
      const today = new Date();
      const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
        today.getDate(),
      ).padStart(2, '0')}`;
      const existing = checkins.find((c) => c.authorId === meId && c.date === date);
      const item: CheckIn = {
        id: existing?.id ?? genId('c_'),
        authorId: meId,
        date,
        createdAt: now(),
        ...data,
      };
      await db.add('checkins', item);
    },
    async sendPing(type, message) {
      const db = dbRef.current;
      if (!db) return;
      await db.add('pings', {
        id: genId('g_'),
        fromId: meId,
        type,
        message,
        createdAt: now(),
        seenAt: null,
      });
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
      });
    },
    async openLetter(id) {
      await dbRef.current?.update<Letter>('letters', id, { openedAt: now() });
    },
    async addMemory(data) {
      const db = dbRef.current;
      if (!db) return;
      await db.add('memories', { id: genId('m_'), authorId: meId, createdAt: now(), ...data });
    },
    async removeMemory(id) {
      await dbRef.current?.remove('memories', id);
    },
    async addReason(text) {
      const db = dbRef.current;
      if (!db) return;
      await db.add('reasons', { id: genId('r_'), authorId: meId, text, createdAt: now() });
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
        text,
        done: false,
        createdAt: now(),
      });
    },
    async toggleFuture(id, done) {
      await dbRef.current?.update<FutureItem>('future', id, { done });
    },
    async removeFuture(id) {
      await dbRef.current?.remove('future', id);
    },
    async addDeckResponse(promptId, promptText, answer) {
      const db = dbRef.current;
      if (!db) return;
      await db.add('deck', {
        id: genId('d_'),
        authorId: meId,
        promptId,
        promptText,
        answer,
        createdAt: now(),
      });
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used within AppProvider');
  return v;
}
