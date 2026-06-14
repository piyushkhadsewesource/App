import AsyncStorage from '@react-native-async-storage/async-storage';
import { addDaysISO, now, todayISO } from '../lib/date';
import { Identity } from '../types/models';
import { Db } from './db';
import { genId } from './identity';

/** A stable id for the demo partner used only in local (no-cloud) mode. */
export const DEMO_PARTNER_ID = 'partner_demo';

/**
 * In local mode there's only one phone, so we plant a little life from your
 * partner — a check-in, a few reasons they love you, a memory, a letter — so
 * every feature has something to show. Runs once per space; never in cloud
 * mode, where your real partner provides the other side.
 */
export async function maybeSeed(db: Db, identity: Identity): Promise<void> {
  if (db.cloud) return;
  const flagKey = `@tether/seeded/${identity.spaceId}`;
  if (await AsyncStorage.getItem(flagKey)) return;

  const P = DEMO_PARTNER_ID;
  const t = now();
  const day = todayISO();

  await db.add('checkins', {
    id: genId('c_'),
    authorId: P,
    date: day,
    createdAt: t - 2 * 3_600_000,
    mood: 'tired',
    need: 'Just to hear your voice tonight',
    energy: 2,
    stress: 4,
    affection: 5,
    note: 'Long day here, but counting down to our call. 🤍',
  });

  for (const text of [
    'The way you check in on me even when your own day is hard.',
    'Your laugh on our 1am calls.',
    'How safe you make the future feel.',
  ]) {
    await db.add('reasons', { id: genId('r_'), authorId: P, text, createdAt: t });
  }

  await db.add('memories', {
    id: genId('m_'),
    authorId: P,
    date: addDaysISO(day, -365),
    createdAt: t,
    title: 'The day at the pier',
    description: 'We missed the last train and didn’t even care.',
    emoji: '🎡',
    kind: 'milestone',
  });

  await db.add('future', {
    id: genId('f_'),
    authorId: P,
    category: 'travel',
    text: 'Watch the northern lights together',
    done: false,
    createdAt: t,
  });

  await db.add('letters', {
    id: genId('l_'),
    authorId: P,
    createdAt: t,
    deliverAt: t - 1000,
    title: 'Open me when you miss us',
    body:
      'If you’re reading this, I’m probably missing you too. Close your eyes ' +
      'and remember the pier — the cold air, your hand in mine, that ridiculous ' +
      'laugh. The distance is temporary. Us, I’m sure about. — yours, always.',
    occasion: 'When you miss me',
    openedAt: null,
  });

  await AsyncStorage.setItem(flagKey, '1');
}
