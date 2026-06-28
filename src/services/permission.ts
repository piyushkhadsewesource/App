// ─────────────────────────────────────────────────────────────────────────
// One shared notification-permission request for the whole app session.
//
// Three independent call sites can each need notification permission at cold
// launch (push registration, photo reminders, plan reminders) and they fire
// almost simultaneously. Calling requestPermissionsAsync() concurrently is
// undefined behaviour: the OS serialises one dialog while the other promises
// resolve against a stale status, so a user who DID grant can be recorded as
// denied, and reminders silently fail to schedule / the push token is never
// fetched. Funnel every caller through a single in-flight promise so there is
// exactly one dialog and one source of truth per session.
// ─────────────────────────────────────────────────────────────────────────
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

let inflight: Promise<boolean> | null = null;
let grantedOnce = false;

/**
 * Ask for notification permission, coalescing concurrent callers onto a single
 * request. The launch-time schedulers (push, photo reminders, plan reminders)
 * all fire at once and share the one in-flight promise, so the OS shows exactly
 * one dialog. A granted result is cached for the session; a not-granted result
 * clears the in-flight handle so a later, deliberate user toggle can prompt
 * again (the OS itself no-ops if it can no longer ask).
 */
export function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(false);
  if (grantedOnce) return Promise.resolve(true);
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const cur = await Notifications.getPermissionsAsync();
      if (cur.granted) {
        grantedOnce = true;
        return true;
      }
      // Only prompt if the OS will actually show a dialog; once denied with
      // canAskAgain=false, requesting again is a silent no-op.
      if (cur.status === 'undetermined' || cur.canAskAgain) {
        const req = await Notifications.requestPermissionsAsync();
        grantedOnce = req.granted;
        return req.granted;
      }
      return false;
    } catch {
      return false;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** True if permission is already granted, without ever prompting. */
export async function hasNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const cur = await Notifications.getPermissionsAsync();
    return cur.granted;
  } catch {
    return false;
  }
}
