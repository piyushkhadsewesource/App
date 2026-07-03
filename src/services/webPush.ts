// ─────────────────────────────────────────────────────────────────────────
// Browser push registration via Firebase Cloud Messaging (web only).
//
// This is the web counterpart to the native Expo push in push.ts. It is loaded
// only on web (push.ts branches on Platform.OS), and even here the heavy
// firebase/messaging SDK is pulled in with a dynamic import() so nothing about
// it is evaluated on native or at app-launch.
//
// Flow: check the browser actually supports web push → ask permission → register
// the service worker (emitted into the web build by scripts/setup-pwa.mjs) →
// mint an FCM registration token with our VAPID key. The token is handed back to
// AppContext, which stores it in the shared space; the Cloud Function then
// delivers pushes to it. Everything is best-effort and never throws.
// ─────────────────────────────────────────────────────────────────────────
import { fcmVapidKey, firebaseConfig, isWebPushConfigured } from '../config';

/**
 * True on an iPhone/iPad browser. Deliberately UA-sniffed: iOS's push
 * restriction (below) has no feature-detectable API — the only way to know
 * is to know you're on iOS.
 */
export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

/**
 * True once the page is running as an installed PWA (opened from the Home
 * Screen icon), not a regular browser tab. `navigator.standalone` is Safari's
 * own non-standard flag; `display-mode: standalone` is the cross-browser one.
 */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    (navigator as any).standalone === true ||
    (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches)
  );
}

/**
 * True only on iOS *outside* an installed PWA. On iOS, Safari exposes the
 * Notification/serviceWorker/PushManager APIs in a plain browser tab and will
 * even grant permission there — but WebKit only actually DELIVERS push to a
 * page added to the Home Screen (shipped in iOS 16.4). Requesting permission
 * from a regular tab burns the one-shot OS prompt for a subscription that can
 * never receive anything, so callers must check this before offering "Enable
 * alerts" and point the user at Add to Home Screen instead.
 */
export function needsHomeScreenForPush(): boolean {
  return isIOS() && !isStandalone();
}

/** True if this browser can do web push at all (Notification + service worker). */
export function webPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    !needsHomeScreenForPush()
  );
}

/** Current browser permission, without prompting. */
export function webNotificationsGranted(): boolean {
  return webPushSupported() && Notification.permission === 'granted';
}

/**
 * Request permission (if needed), register the service worker, and return this
 * browser's FCM token — or null if unsupported, unconfigured, or denied.
 */
export async function registerWebPush(): Promise<string | null> {
  try {
    if (!isWebPushConfigured() || !webPushSupported()) return null;

    const { getMessaging, getToken, isSupported } = await import('firebase/messaging');
    if (!(await isSupported())) return null;

    // Notification.requestPermission resolves immediately (no dialog) if the
    // user has already chosen, so this is safe to call on every launch.
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

    const { getApp, getApps, initializeApp } = await import('firebase/app');
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    const messaging = getMessaging(app);

    const token = await getToken(messaging, {
      vapidKey: fcmVapidKey,
      serviceWorkerRegistration: registration,
    });
    return token || null;
  } catch (e) {
    console.warn('[tether] web push registration failed', e);
    return null;
  }
}

/**
 * Listen for pushes that arrive while the tab is focused. The service worker
 * only shows a system notification when the app is in the background; in the
 * foreground FCM hands the message here instead, so we surface it as an in-app
 * toast. Returns an unsubscribe (a no-op if web push isn't available).
 */
export async function listenForegroundMessages(
  handler: (msg: { title?: string; body?: string; type?: string }) => void,
): Promise<() => void> {
  try {
    if (!isWebPushConfigured() || !webPushSupported()) return () => {};
    const { getMessaging, onMessage, isSupported } = await import('firebase/messaging');
    if (!(await isSupported())) return () => {};

    const { getApp, getApps, initializeApp } = await import('firebase/app');
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    const messaging = getMessaging(app);

    // Messages are sent data-only, so the payload lives under `data`.
    return onMessage(messaging, (payload) => {
      const d = (payload && payload.data) || {};
      handler({ title: d.title, body: d.body, type: d.type });
    });
  } catch (e) {
    console.warn('[tether] foreground message listener failed', e);
    return () => {};
  }
}
