// ─────────────────────────────────────────────────────────────────────────
// Widget task handler: runs headlessly whenever Android asks the widget to
// draw (placement, periodic refresh, or an explicit requestWidgetUpdate from
// the app). No listeners here — it reads the snapshot the app last parked in
// AsyncStorage and renders it. Missing snapshot (fresh install, widget added
// before first app open) renders the invitation state instead of crashing.
// ─────────────────────────────────────────────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { PortalSnapshot, WIDGET_SNAPSHOT_KEY } from '../lib/portalSnapshot';
import { PortalWidget } from './PortalWidget';

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  let snapshot: PortalSnapshot | null = null;
  try {
    const raw = await AsyncStorage.getItem(WIDGET_SNAPSHOT_KEY);
    if (raw) snapshot = JSON.parse(raw) as PortalSnapshot;
  } catch {
    /* unreadable snapshot → invitation state */
  }
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      props.renderWidget(<PortalWidget snapshot={snapshot} />);
      break;
    default:
      break;
  }
}
