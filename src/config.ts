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
