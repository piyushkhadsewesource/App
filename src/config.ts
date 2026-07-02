// ─────────────────────────────────────────────────────────────────────────
// Tether, central configuration
// ─────────────────────────────────────────────────────────────────────────
//
// The app runs fully on-device out of the box. To turn on real-time cloud
// sync between you and your partner's phones, create a free Firebase project
// (https://console.firebase.google.com), enable Cloud Firestore, and paste
// your web app's config values below. See SETUP.md for a 5-minute walkthrough.
//
// Nothing else needs to change, the moment these values are real, the app
// switches from local storage to live sync automatically.

export const APP_NAME = 'Tether';
export const APP_TAGLINE = 'Close, across any distance.';

/** EAS project id (from app.json) used to fetch the Expo push token. */
export const EAS_PROJECT_ID = '7cd8d851-0a11-4d82-aa4c-72a7cfcc8cfa';

export type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

export const firebaseConfig: FirebaseConfig = {
  apiKey: 'AIzaSyCB8dbWzupXELEPxW0xLbDdbCdvR6_gAXk',
  authDomain: 'tether-aee5d.firebaseapp.com',
  projectId: 'tether-aee5d',
  storageBucket: 'tether-aee5d.firebasestorage.app',
  messagingSenderId: '689555512099',
  appId: '1:689555512099:web:99f9a36c20ffe8bda00a96',
};

/** True once real Firebase values have been filled in above. */
export function isFirebaseConfigured(): boolean {
  const { apiKey, projectId } = firebaseConfig;
  return (
    !!apiKey &&
    !apiKey.startsWith('YOUR_') &&
    !!projectId &&
    !projectId.startsWith('YOUR_')
  );
}

// ─── Web push (browser notifications via Firebase Cloud Messaging) ──────────
// Browser notifications need a VAPID public key, generated once in the Firebase
// console: Project settings → Cloud Messaging → "Web Push certificates" →
// Generate key pair. Paste the key string below. Until it's set, web push stays
// off (native iOS/Android push is unaffected either way). This key is public by
// design — it only lets the browser subscribe; sending still requires the
// server-side Cloud Function.
export const fcmVapidKey = 'YOUR_VAPID_KEY';

/** True once a real VAPID key is present, so the browser can register for push. */
export function isWebPushConfigured(): boolean {
  return isFirebaseConfigured() && !!fcmVapidKey && !fcmVapidKey.startsWith('YOUR_');
}
