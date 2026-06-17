// ─────────────────────────────────────────────────────────────────────────
// Local daily reminders to share a photo. Each phone reminds its own owner
// (there is no push server), three times a day, repeating every day.
// ─────────────────────────────────────────────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const ENABLED_KEY = '@tether/reminders';
const CHANNEL_ID = 'daily-moments';
const supported = Platform.OS !== 'web';

export interface ReminderTime {
  hour: number;
  minute: number;
  label: string;
}

/** Three nudges a day. */
export const REMINDER_TIMES: ReminderTime[] = [
  { hour: 9, minute: 0, label: '9:00 AM' },
  { hour: 14, minute: 0, label: '2:00 PM' },
  { hour: 20, minute: 0, label: '8:00 PM' },
];

// How a reminder behaves while the app is open.
if (supported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function remindersEnabled(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ENABLED_KEY)) === '1';
  } catch {
    return false;
  }
}

async function ensureChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Daily moments',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

function reminderBody(partnerName?: string): string {
  const who = partnerName?.trim() || 'your partner';
  const options = [
    `Snap today's moment and share it with ${who}.`,
    `${who} would love a glimpse of your day. Share a photo.`,
    `One photo keeps your shared gallery and your streak alive.`,
  ];
  return options[Math.floor(Math.random() * options.length)];
}

async function scheduleAll(partnerName?: string) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await ensureChannel();
  for (const t of REMINDER_TIMES) {
    await Notifications.scheduleNotificationAsync({
      content: { title: '📸 Tether', body: reminderBody(partnerName) },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: t.hour,
        minute: t.minute,
        channelId: CHANNEL_ID,
      },
    });
  }
}

/**
 * Turn reminders on or off. Returns true only if they are now active
 * (permission granted on a real device).
 */
export async function setReminders(enabled: boolean, partnerName?: string): Promise<boolean> {
  if (!supported) {
    await AsyncStorage.setItem(ENABLED_KEY, enabled ? '1' : '0');
    return false;
  }
  if (!enabled) {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await AsyncStorage.setItem(ENABLED_KEY, '0');
    return false;
  }
  const perm = await Notifications.requestPermissionsAsync();
  if (!perm.granted) {
    await AsyncStorage.setItem(ENABLED_KEY, '0');
    return false;
  }
  await scheduleAll(partnerName);
  await AsyncStorage.setItem(ENABLED_KEY, '1');
  return true;
}

/** Re-arm reminders on app launch if the user has them enabled. */
export async function syncReminders(partnerName?: string): Promise<void> {
  if (!supported) return;
  try {
    if (!(await remindersEnabled())) return;
    const perm = await Notifications.getPermissionsAsync();
    if (perm.granted) await scheduleAll(partnerName);
  } catch {
    /* notifications unavailable; ignore */
  }
}

/** True on platforms where local scheduling actually works (native). */
export const remindersSupported = supported;
