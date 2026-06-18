import { Platform } from 'react-native';
import type { Firestore } from 'firebase/firestore';
import { firebaseConfig, isFirebaseConfigured } from '../config';

/** True when real Firebase config is present. Pure check, loads no SDK. */
export const cloudEnabled = isFirebaseConfigured();

type FirestoreFns = typeof import('firebase/firestore');
export interface Cloud {
  db: Firestore;
  fns: FirestoreFns;
}

let cloud: Cloud | null = null;
let initialized = false;

// IMPORTANT: the Firebase web SDK is loaded lazily (via require, inside this
// function) the first time the cloud database is actually needed, and NEVER at
// app-launch / module-load time. The SDK is large and built for browsers;
// evaluating it during startup on the native (Hermes) engine was crashing the
// standalone Android app before the first screen could draw. The whole launch
// path (including onboarding) now runs without touching any Firebase code.
export function getCloud(): Cloud | null {
  if (initialized) return cloud;
  initialized = true;
  if (!cloudEnabled) return null;
  try {
    const { getApp, getApps, initializeApp } = require('firebase/app');
    const fns: FirestoreFns = require('firebase/firestore');
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    const db = fns.initializeFirestore(
      app,
      Platform.OS === 'web'
        ? { experimentalAutoDetectLongPolling: true }
        : { experimentalForceLongPolling: true },
    );
    cloud = { db, fns };
  } catch (e) {
    console.warn('[tether] Firebase init failed; continuing on-device.', e);
    cloud = null;
  }
  return cloud;
}
