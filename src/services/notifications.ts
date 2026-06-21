// ─────────────────────────────────────────────────────────────────────────
// Smart, customizable daily photo reminders (local notifications).
//
// Each phone reminds its own owner to share a photo. Times are user-chosen.
// "Smart": we schedule a rolling window of one-off reminders and skip any day
// the user has already posted, so you are not nagged once you have shared.
// The window is re-scheduled on launch and whenever your posted days change.
// ─────────────────────────────────────────────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const CONFIG_KEY = '@tether/reminders.v2';
const LEGACY_KEY = '@tether/reminders';
const CHANNEL_ID = 'daily-moments';
const WINDOW_DAYS = 8;
const supported = Platform.OS !== 'web';

export interface ReminderTime {
  hour: number;
  minute: number;
}
export interface ReminderConfig {
  enabled: boolean;
  times: ReminderTime[];
}

export const DEFAULT_TIMES: ReminderTime[] = [
  { hour: 9, minute: 0 },
  { hour: 14, minute: 0 },
  { hour: 20, minute: 0 },
];

export const remindersSupported = supported;

export function formatTime(t: ReminderTime): string {
  const h12 = t.hour % 12 === 0 ? 12 : t.hour % 12;
  const ampm = t.hour < 12 ? 'AM' : 'PM';
  return `${h12}:${String(t.minute).padStart(2, '0')} ${ampm}`;
}

if (supported) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch (e) {
    console.warn('[tether] notification handler setup failed', e);
  }
}

export async function getReminderConfig(): Promise<ReminderConfig> {
  try {
    const raw = await AsyncStorage.getItem(CONFIG_KEY);
    if (raw) {
      const c = JSON.parse(raw);
      if (Array.isArray(c.times) && c.times.length) {
        return { enabled: !!c.enabled, times: c.times };
      }
    }
    const legacy = await AsyncStorage.getItem(LEGACY_KEY);
    if (legacy === '1') return { enabled: true, times: DEFAULT_TIMES };
  } catch {
    /* ignore */
  }
  return { enabled: false, times: DEFAULT_TIMES };
}

async function saveConfig(cfg: ReminderConfig) {
  await AsyncStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
}

async function ensureChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Daily moments',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

function isoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function reminderBody(who: string, seed: number): string {
  const lines = [
    `Snap today's moment and share it with ${who}.`,
    `${who} would love a glimpse of your day. Share a photo.`,
    `One photo keeps your shared gallery and your streak alive.`,
    `What does your world look like right now? Show ${who}.`,
    `A picture says what texts can't. Send ${who} a moment.`,
    `Capture something small and ordinary for ${who} today.`,
    `${who} is out there missing you. Send a photo.`,
    `Your day through your eyes, ${who} would treasure it.`,
    `Even a photo of your coffee counts. Share it.`,
    `Give ${who} a little window into today.`,
    `One moment, one tap, and ${who} will smile.`,
    `What made you pause today? Photograph it for ${who}.`,
    `Keep the distance small. Share a photo with ${who}.`,
    `${who} wants the boring beautiful details. Send one.`,
    `A year from now you'll be glad you captured today.`,
    `Show ${who} the sky where you are right now.`,
    `Tiny daily photo, big daily closeness. Share it.`,
    `Let ${who} see what you're up to.`,
    `Don't let today go undocumented. Snap it for ${who}.`,
    `Your face, your street, your lunch, ${who} wants all of it.`,
    `Send ${who} proof that you thought of them today.`,
    `A photo is a little "wish you were here." Send it.`,
    `Make ${who}'s day with one quick picture.`,
    `What's in front of you right now? ${who} would love to know.`,
    `Keep your streak glowing, share today's moment.`,
    `${who} checks the gallery for you. Give them something.`,
    `Capture the light wherever you are, for ${who}.`,
    `One snapshot of your today, for the two of you.`,
    `The smallest moment shared beats the best one kept.`,
    `Photograph the thing that made you think of ${who}.`,
    `${who} is only a photo away from your day.`,
    `Add today to your shared story with one picture.`,
    `Show ${who} something they'd never see otherwise.`,
    `A quiet moment? Capture it and send it to ${who}.`,
    `Your day deserves a place in the gallery. Share it.`,
    `${who} would love to see your smile right now.`,
    `Bring ${who} along for a second, snap a photo.`,
    `Distance shrinks one shared photo at a time.`,
    `What's the view from where you're sitting? Send it.`,
    `Give ${who} a reason to grin at their phone today.`,
    `Today only happens once. Save a piece for ${who}.`,
    `A photo now keeps ${who} close tonight.`,
    `Let your day speak to ${who} in pictures.`,
    `Even the ordinary is special when ${who} sees it.`,
    `Snap it before the moment passes, ${who} is waiting.`,
    `Your little corner of the world, shared with ${who}.`,
    `Make today findable later, capture it for ${who}.`,
    `One tap to feel close to ${who}. Share a photo.`,
  ];
  return lines[((seed % lines.length) + lines.length) % lines.length];
}

/** Cancel only the scheduled notifications we tagged with a given kind. */
async function cancelKind(kind: string) {
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      all
        .filter((n) => (n.content?.data as Record<string, unknown> | undefined)?.kind === kind)
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
    );
  } catch {
    /* ignore */
  }
}

async function scheduleSmart(cfg: ReminderConfig, postedDates: string[], partnerName?: string) {
  await cancelKind('moment');
  if (!cfg.enabled || cfg.times.length === 0) return;
  await ensureChannel();

  const who = partnerName?.trim() || 'your partner';
  const posted = new Set(postedDates);
  const base = new Date();

  for (let d = 0; d < WINDOW_DAYS; d += 1) {
    const day = new Date(base.getFullYear(), base.getMonth(), base.getDate() + d);
    if (posted.has(isoOf(day))) continue; // smart skip: already shared that day
    const epochDay = Math.floor(day.getTime() / 86_400_000);
    for (let si = 0; si < cfg.times.length; si += 1) {
      const t = cfg.times[si];
      const when = new Date(day.getFullYear(), day.getMonth(), day.getDate(), t.hour, t.minute, 0, 0);
      if (when.getTime() <= Date.now() + 1000) continue; // skip times already passed
      await Notifications.scheduleNotificationAsync({
        // Deterministic per day+slot so each reminder differs and they rotate.
        content: { title: '📸 Tether', body: reminderBody(who, epochDay * 10 + si), data: { kind: 'moment' } },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: when,
          channelId: CHANNEL_ID,
        },
      });
    }
  }
}

/** Re-schedule the reminder window (call on launch and when posted days change). */
export async function refreshReminders(postedDates: string[], partnerName?: string): Promise<void> {
  if (!supported) return;
  try {
    const cfg = await getReminderConfig();
    if (!cfg.enabled) return;
    const perm = await Notifications.getPermissionsAsync();
    if (perm.granted) await scheduleSmart(cfg, postedDates, partnerName);
  } catch {
    /* notifications unavailable */
  }
}

/** Turn reminders on/off. Returns true only if now active (permission granted). */
export async function setRemindersEnabled(
  enabled: boolean,
  postedDates: string[],
  partnerName?: string,
): Promise<boolean> {
  const cfg = await getReminderConfig();
  if (!supported) {
    await saveConfig({ ...cfg, enabled });
    return false;
  }
  if (!enabled) {
    await cancelKind('moment');
    await saveConfig({ ...cfg, enabled: false });
    return false;
  }
  const perm = await Notifications.requestPermissionsAsync();
  if (!perm.granted) {
    await saveConfig({ ...cfg, enabled: false });
    return false;
  }
  const next = { ...cfg, enabled: true };
  await saveConfig(next);
  await scheduleSmart(next, postedDates, partnerName);
  return true;
}

// ── Anniversaries & recurring dates ──────────────────────────────────────
const OCC_CHANNEL = 'occasions';

export interface OccasionLite {
  id: string;
  title: string;
  date: string; // ISODate
  recurrence: 'yearly' | 'monthly' | 'once';
  remindDaysBefore: number;
  icon?: string;
}

async function ensureOccasionChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(OCC_CHANNEL, {
      name: 'Anniversaries & dates',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
}

function parseISO(s: string): Date {
  const [y, m, d] = s.split('-').map((x) => parseInt(x, 10));
  return new Date(y || 2024, (m || 1) - 1, d || 1);
}

async function scheduleOccasion(o: OccasionLite) {
  const anchor = parseISO(o.date);
  const remind = Math.max(0, Math.min(60, Math.round(o.remindDaysBefore || 0)));
  const icon = o.icon || '💗';
  const when = remind === 0 ? 'today' : remind === 1 ? 'tomorrow' : `in ${remind} days`;
  const content = {
    title: `${icon} ${o.title}`,
    body: remind === 0 ? `${o.title} is today! 🎉` : `${o.title} is ${when}.`,
    data: { kind: 'occasion', id: o.id },
  };
  const T = Notifications.SchedulableTriggerInputTypes;

  if (o.recurrence === 'once') {
    const d = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - remind, 9, 0, 0, 0);
    if (d.getTime() > Date.now() + 1000) {
      await Notifications.scheduleNotificationAsync({ content, trigger: { type: T.DATE, date: d, channelId: OCC_CHANNEL } });
    }
    return;
  }
  if (o.recurrence === 'yearly') {
    const r = new Date(2024, anchor.getMonth(), anchor.getDate());
    r.setDate(r.getDate() - remind);
    await Notifications.scheduleNotificationAsync({
      content,
      trigger: { type: T.YEARLY, month: r.getMonth(), day: r.getDate(), hour: 9, minute: 0, channelId: OCC_CHANNEL },
    });
    return;
  }
  // monthly
  let day = anchor.getDate() - remind;
  if (day < 1) day = 1;
  if (day > 28) day = 28;
  await Notifications.scheduleNotificationAsync({
    content,
    trigger: { type: T.MONTHLY, day, hour: 9, minute: 0, channelId: OCC_CHANNEL },
  });
}

/** Re-schedule local reminders for the couple's saved occasions. */
export async function syncOccasionReminders(occasions: OccasionLite[]): Promise<void> {
  if (!supported) return;
  try {
    let perm = await Notifications.getPermissionsAsync();
    if (perm.status === 'undetermined' && occasions.length > 0) {
      perm = await Notifications.requestPermissionsAsync();
    }
    if (!perm.granted) return;
    await ensureOccasionChannel();
    await cancelKind('occasion');
    for (const o of occasions) await scheduleOccasion(o);
  } catch {
    /* notifications unavailable */
  }
}

/** Save new reminder times and reschedule. */
export async function setReminderTimes(
  times: ReminderTime[],
  postedDates: string[],
  partnerName?: string,
): Promise<void> {
  const cfg = await getReminderConfig();
  const sorted = [...times].sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));
  const next: ReminderConfig = { enabled: cfg.enabled, times: sorted.length ? sorted : DEFAULT_TIMES };
  await saveConfig(next);
  if (supported && next.enabled) {
    const perm = await Notifications.getPermissionsAsync();
    if (perm.granted) await scheduleSmart(next, postedDates, partnerName);
  }
}
