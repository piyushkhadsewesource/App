// ─────────────────────────────────────────────────────────────────────────
// Portal widget glue, deliberately quarantined: every touch of the
// react-native-android-widget module happens through a lazy require behind a
// Platform check, so web, iOS, and — critically — Android binaries built
// BEFORE the widget module existed (receiving this code via OTA update) can
// never crash on a missing native module.
// ─────────────────────────────────────────────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { Platform } from 'react-native';
import { PortalSnapshot, WIDGET_SNAPSHOT_KEY } from '../lib/portalSnapshot';

/** Register the headless task handler (call once, at app-module load). */
export function registerPortalWidget(): void {
  if (Platform.OS !== 'android') return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { registerWidgetTaskHandler } = require('react-native-android-widget');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { widgetTaskHandler } = require('./handler');
    registerWidgetTaskHandler(widgetTaskHandler);
  } catch {
    /* binary predates the widget module — the app runs fine without it */
  }
}

/** Park a fresh snapshot and ask any placed widgets to redraw from it. */
export async function publishPortalSnapshot(snapshot: PortalSnapshot): Promise<void> {
  try {
    await AsyncStorage.setItem(WIDGET_SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    /* storage hiccup: the widget keeps its last drawing */
  }
  if (Platform.OS !== 'android') return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { requestWidgetUpdate } = require('react-native-android-widget');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PortalWidget } = require('./PortalWidget');
    await requestWidgetUpdate({
      widgetName: 'TetherPortal',
      renderWidget: () => React.createElement(PortalWidget, { snapshot }),
      widgetNotFound: () => {}, // no widget placed yet — perfectly fine
    });
  } catch {
    /* binary predates the widget module — snapshot still parked for later */
  }
}
