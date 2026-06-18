import { Platform } from 'react-native';
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Firestore, getFirestore, initializeFirestore } from 'firebase/firestore';
import { firebaseConfig, isFirebaseConfigured } from '../config';

/** True when real Firebase config is present and cloud sync is active. */
export const cloudEnabled = isFirebaseConfigured();

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

// Everything here is wrapped so that a Firebase init failure can never crash
// the app on launch — at worst it falls back to on-device storage.
if (cloudEnabled) {
  try {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    // On React Native, forced long-polling is the reliable transport; the web
    // can auto-detect.
    db = initializeFirestore(
      app,
      Platform.OS === 'web'
        ? { experimentalAutoDetectLongPolling: true }
        : { experimentalForceLongPolling: true },
    );
  } catch (e) {
    console.warn('[tether] Firebase init failed; continuing in local mode.', e);
    try {
      db = app ? getFirestore(app) : null;
    } catch {
      db = null;
    }
  }
}

export const firestore = db;
