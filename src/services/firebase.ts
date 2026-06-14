import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import {
  Firestore,
  getFirestore,
  initializeFirestore,
} from 'firebase/firestore';
import { firebaseConfig, isFirebaseConfigured } from '../config';

/** True when real Firebase config is present and cloud sync is active. */
export const cloudEnabled = isFirebaseConfigured();

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

if (cloudEnabled) {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  try {
    // Auto-detected long polling is more reliable across mobile networks.
    db = initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
    });
  } catch {
    db = getFirestore(app);
  }
}

export const firestore = db;
