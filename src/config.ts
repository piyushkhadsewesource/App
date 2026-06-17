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
  apiKey: 'YOUR_FIREBASE_API_KEY',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID',
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
