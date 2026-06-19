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

const SOS_CHANNEL = 'sos';
const supported = Platform.OS !== 'web';

/** Create (or update) the high-importance Android channel used for SOS. */
export async function ensureSosChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(SOS_CHANNEL, {
      name: 'Emergency alerts',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'alarm.wav',
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
    const perm = await Notifications.getPermissionsAsync();
    let granted = perm.granted;
    if (!granted) {
      const req = await Notifications.requestPermissionsAsync();
      granted = req.granted;
    }
    if (!granted) return null;
    await ensureSosChannel();
    const res = await Notifications.getExpoPushTokenAsync({ projectId: EAS_PROJECT_ID });
    return res.data ?? null;
  } catch {
    // Push not configured yet (e.g. no FCM credentials) — fail quietly.
    return null;
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
    /* network error — the in-app alarm via live sync still fires when open */
  }
}
