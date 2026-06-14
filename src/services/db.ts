// ─────────────────────────────────────────────────────────────────────────
// One tiny data API, two backends.
//   • LocalDb     — AsyncStorage, works instantly with no account.
//   • FirestoreDb — live cross-device sync once Firebase is configured.
// Screens never know or care which one is active.
// ─────────────────────────────────────────────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { CollectionName, HasId } from '../types/models';
import { cloudEnabled, firestore } from './firebase';

export type Unsubscribe = () => void;

export interface Db {
  readonly cloud: boolean;
  watch<T extends HasId>(name: CollectionName, cb: (items: T[]) => void): Unsubscribe;
  add<T extends HasId>(name: CollectionName, item: T): Promise<void>;
  update<T extends HasId>(name: CollectionName, id: string, patch: Partial<T>): Promise<void>;
  remove(name: CollectionName, id: string): Promise<void>;
}

// ── Local (on-device) backend ────────────────────────────────────────────
class LocalDb implements Db {
  readonly cloud = false;
  private cache = new Map<string, HasId[]>();
  private listeners = new Map<string, Set<(items: HasId[]) => void>>();

  constructor(private spaceId: string) {}

  private key(name: CollectionName) {
    return `@tether/${this.spaceId}/${name}`;
  }

  private async ensure(name: CollectionName) {
    if (this.cache.has(name)) return;
    try {
      const raw = await AsyncStorage.getItem(this.key(name));
      this.cache.set(name, raw ? (JSON.parse(raw) as HasId[]) : []);
    } catch {
      this.cache.set(name, []);
    }
  }

  private emit(name: CollectionName) {
    const items = this.cache.get(name) ?? [];
    this.listeners.get(name)?.forEach((cb) => cb([...items]));
  }

  private async persist(name: CollectionName) {
    await AsyncStorage.setItem(
      this.key(name),
      JSON.stringify(this.cache.get(name) ?? []),
    );
  }

  watch<T extends HasId>(name: CollectionName, cb: (items: T[]) => void): Unsubscribe {
    const listener = cb as (items: HasId[]) => void;
    if (!this.listeners.has(name)) this.listeners.set(name, new Set());
    this.listeners.get(name)!.add(listener);
    this.ensure(name).then(() => listener([...(this.cache.get(name) ?? [])]));
    return () => {
      this.listeners.get(name)?.delete(listener);
    };
  }

  async add<T extends HasId>(name: CollectionName, item: T) {
    await this.ensure(name);
    const items = this.cache.get(name)!.filter((i) => i.id !== item.id);
    this.cache.set(name, [...items, item]);
    await this.persist(name);
    this.emit(name);
  }

  async update<T extends HasId>(name: CollectionName, id: string, patch: Partial<T>) {
    await this.ensure(name);
    const items = this.cache.get(name)!.map((i) => (i.id === id ? { ...i, ...patch } : i));
    this.cache.set(name, items);
    await this.persist(name);
    this.emit(name);
  }

  async remove(name: CollectionName, id: string) {
    await this.ensure(name);
    this.cache.set(name, this.cache.get(name)!.filter((i) => i.id !== id));
    await this.persist(name);
    this.emit(name);
  }
}

// ── Cloud (Firestore) backend ────────────────────────────────────────────
class FirestoreDb implements Db {
  readonly cloud = true;

  constructor(private spaceId: string) {}

  private col(name: CollectionName) {
    return collection(firestore!, 'spaces', this.spaceId, name);
  }

  watch<T extends HasId>(name: CollectionName, cb: (items: T[]) => void): Unsubscribe {
    return onSnapshot(
      this.col(name),
      (snap) => cb(snap.docs.map((d) => d.data() as T)),
      (err) => console.warn('[tether] sync error:', err.message),
    );
  }

  async add<T extends HasId>(name: CollectionName, item: T) {
    await setDoc(doc(this.col(name), item.id), item as Record<string, unknown>);
  }

  async update<T extends HasId>(name: CollectionName, id: string, patch: Partial<T>) {
    await updateDoc(doc(this.col(name), id), patch as Record<string, unknown>);
  }

  async remove(name: CollectionName, id: string) {
    await deleteDoc(doc(this.col(name), id));
  }
}

/** Build the active database for a couple's shared space. */
export function createDb(spaceId: string): Db {
  return cloudEnabled && firestore ? new FirestoreDb(spaceId) : new LocalDb(spaceId);
}
