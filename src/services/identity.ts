import AsyncStorage from '@react-native-async-storage/async-storage';
import { now } from '../lib/date';
import { Identity } from '../types/models';

const KEY = '@tether/identity';

/** Short, collision-resistant id. */
export function genId(prefix = ''): string {
  const r = Math.random().toString(36).slice(2, 10);
  const t = Date.now().toString(36).slice(-5);
  return `${prefix}${t}${r}`;
}

const CODE_WORDS = ['ROSE', 'LUNA', 'EMBER', 'TIDE', 'NOVA', 'FERN', 'WREN', 'SAGE', 'HALO', 'DUNE'];

/** Friendly, shareable pairing code like "EMBER-4821". */
export function genPairingCode(): string {
  const w = CODE_WORDS[Math.floor(Math.random() * CODE_WORDS.length)];
  const n = Math.floor(1000 + Math.random() * 9000);
  return `${w}-${n}`;
}

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '');
}

export async function loadIdentity(): Promise<Identity | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Identity) : null;
  } catch {
    return null;
  }
}

export async function saveIdentity(identity: Identity): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(identity));
}

export async function clearIdentity(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

export function makeIdentity(input: {
  name: string;
  partnerName: string;
  spaceId: string;
  anniversary?: string;
}): Identity {
  return {
    userId: genId('u_'),
    name: input.name.trim(),
    partnerName: input.partnerName.trim(),
    spaceId: normalizeCode(input.spaceId),
    anniversary: input.anniversary,
    createdAt: now(),
  };
}
