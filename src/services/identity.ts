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

// 32 unambiguous characters (no I, O, 0, 1) so codes are easy to read aloud.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * A high-entropy, human-shareable pairing code like "K9FJ-2MWX-3RQ8".
 * 12 random chars from a 32-symbol alphabet is ~60 bits of keyspace, which
 * makes guessing/brute-forcing a couple's private space infeasible (the old
 * WORD-1234 scheme was only ~16 bits). This is the only secret protecting your
 * shared data, so it is generated long on purpose.
 */
export function genPairingCode(): string {
  const pick = () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  const group = () => pick() + pick() + pick() + pick();
  return `${group()}-${group()}-${group()}`;
}

/** Keep only the valid code charset (A–Z, 0–9, dash); drop spaces and junk. */
export function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
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

/**
 * A stable per-person id derived from the name, so reinstalling and re-entering
 * the same name reconnects you to your own history instead of starting fresh.
 * (Local storage is wiped on uninstall, so name + code are the only stable
 * anchors in a no-account app. The two partners must use different names.)
 */
function personId(name: string): string {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 24);
  return `p_${slug || 'me'}`;
}

export function makeIdentity(input: {
  name: string;
  partnerName: string;
  spaceId: string;
  anniversary?: string;
}): Identity {
  return {
    userId: personId(input.name),
    name: input.name.trim().slice(0, 60),
    partnerName: input.partnerName.trim().slice(0, 60),
    spaceId: normalizeCode(input.spaceId).slice(0, 64),
    anniversary: input.anniversary?.slice(0, 16),
    createdAt: now(),
  };
}
