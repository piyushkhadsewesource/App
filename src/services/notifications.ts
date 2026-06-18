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

function reminderBody(who: string): string {
  const options = [
    `Snap today's moment and share it with ${who}.`,
    `${who} would love a glimpse of your day. Share a photo.`,
    `One photo keeps your shared gallery and your streak alive.`,
  ];
  return options[Math.floor(Math.random() * options.length)];
}

async function scheduleSmart(cfg: ReminderConfig, postedDates: string[], partnerName?: string) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!cfg.enabled || cfg.times.length === 0) return;
  await ensureChannel();

  const who = partnerName?.trim() || 'your partner';
  const posted = new Set(postedDates);
  const base = new Date();

  for (let d = 0; d < WINDOW_DAYS; d += 1) {
    const day = new Date(base.getFullYear(), base.getMonth(), base.getDate() + d);
    if (posted.has(isoOf(day))) continue; // smart skip: already shared that day
    for (const t of cfg.times) {
      const when = new Date(day.getFullYear(), day.getMonth(), day.getDate(), t.hour, t.minute, 0, 0);
      if (when.getTime() <= Date.now() + 1000) continue; // skip times already passed
      await Notifications.scheduleNotificationAsync({
        content: { title: '📸 Tether', body: reminderBody(who) },
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
    await Notifications.cancelAllScheduledNotificationsAsync();
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
