// ─────────────────────────────────────────────────────────────────────────
// Emergency push notifications.
//
// So an SOS reaches your partner even when the app is fully closed, each phone
// registers an Expo push token (stored in the shared space). Triggering an SOS
// sends a high-priority push, loud alarm sound + strong vibration, straight to
// your partner's phone through Expo's push service.
//
// Everything here is best-effort and wrapped so it can never crash or block the
// app. If push is not set up yet (no Firebase Cloud Messaging credentials), the
// in-app alarm still fires through live sync whenever the app is open.
// ─────────────────────────────────────────────────────────────────────────
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { EAS_PROJECT_ID } from '../config';
import { ensureNotificationPermission } from './permission';

const SOS_CHANNEL = 'sos';
const PING_CHANNEL = 'pings';
const supported = Platform.OS !== 'web';

/** A normal (non-alarm) channel for hugs, kisses, thoughts and shared moments. */
export async function ensurePingChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(PING_CHANNEL, {
      name: 'Hugs & moments',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200],
      enableVibrate: true,
    });
  } catch {
    /* ignore */
  }
}

/** Create (or update) the high-importance Android channel used for SOS. */
export async function ensureSosChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(SOS_CHANNEL, {
      name: 'Emergency alerts',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'alarm.wav',
      // Play on the ALARM audio stream so it sounds at alarm volume and rings
      // through silent/vibrate (alarms are designed to always be heard).
      audioAttributes: {
        usage: Notifications.AndroidAudioUsage.ALARM,
        contentType: Notifications.AndroidAudioContentType.SONIFICATION,
      },
      vibrationPattern: [0, 600, 300, 600, 300, 600],
      enableVibrate: true,
      bypassDnd: true,
      lightColor: '#D9534F',
    });
  } catch {
    /* ignore */
  }
}

/**
 * Ask for notification permission (if needed), set up the SOS channel, and
 * return this phone's Expo push token, or null if unavailable.
 */
export async function registerForPush(): Promise<string | null> {
  if (!supported) return null;
  try {
    // Shared, single-flight permission request, so this never races with the
    // reminder schedulers that also need notification permission at launch.
    const granted = await ensureNotificationPermission();
    if (!granted) return null;
    await ensureSosChannel();
    await ensurePingChannel();
    const res = await Notifications.getExpoPushTokenAsync({ projectId: EAS_PROJECT_ID });
    return res.data ?? null;
  } catch {
    // Push not configured yet (e.g. no FCM credentials), so fail quietly.
    return null;
  }
}

/** Send a normal notification (hug, kiss, thought, shared moment). Best-effort. */
export async function sendPush(tokens: string[], title: string, body: string): Promise<void> {
  const valid = tokens.filter((t) => typeof t === 'string' && t.startsWith('ExponentPushToken'));
  if (valid.length === 0) return;
  const payload = valid.map((to) => ({
    to,
    title,
    body,
    sound: 'default',
    priority: 'high',
    channelId: PING_CHANNEL,
    data: { type: 'ping' },
  }));
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    /* network error; the in-app banner via live sync still appears when open */
  }
}

/** Send an emergency push to one or more Expo push tokens. Best-effort. */
export async function sendSosPush(tokens: string[], fromName: string, message?: string): Promise<void> {
  const valid = tokens.filter((t) => typeof t === 'string' && t.startsWith('ExponentPushToken'));
  if (valid.length === 0) return;
  const body = message?.trim() ? `${fromName}: ${message.trim()}` : `${fromName} needs you right now.`;
  const payload = valid.map((to) => ({
    to,
    title: '🆘 Emergency',
    body,
    sound: 'alarm.wav',
    priority: 'high',
    channelId: SOS_CHANNEL,
    data: { type: 'sos' },
  }));
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    /* network error; the in-app alarm via live sync still fires when open */
  }
}
