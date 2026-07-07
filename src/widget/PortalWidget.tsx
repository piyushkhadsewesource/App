// ─────────────────────────────────────────────────────────────────────────
// The Portal widget — Tether on the Android home screen, zero taps.
//
// Renders the snapshot the app last parked (see lib/portalSnapshot.ts):
// one warm headline about your partner, one quiet subline, and a 🤍 badge
// when something is waiting. Rose & Bloom carried into the launcher: cream
// card, rose accents. (Widget text uses the system font — custom font
// loading inside RemoteViews isn't worth the weight; the palette and voice
// do the branding here.) Tapping anywhere opens the app.
// ─────────────────────────────────────────────────────────────────────────
import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { PortalSnapshot } from '../lib/portalSnapshot';

const INK = '#2E2A2A';
const SOFT = '#6F6663';
const CREAM = '#FBF8F6';
const ROSE = '#E8638C';
const ROSE_DARK = '#C7416B';

export function PortalWidget({ snapshot }: { snapshot: PortalSnapshot | null }) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: CREAM,
        borderRadius: 24,
        padding: 16,
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent' }}>
        <TextWidget
          text={snapshot?.waiting ? '🤍' : '💞'}
          style={{ fontSize: 22, marginRight: 10 }}
        />
        <FlexWidget style={{ flexDirection: 'column', flex: 1 }}>
          <TextWidget
            text={snapshot?.line ?? 'Open Tether once to light the portal 🤍'}
            maxLines={1}
            style={{ fontSize: 14, color: INK, fontWeight: '600' }}
          />
          <TextWidget
            text={snapshot?.subline ?? ''}
            maxLines={1}
            style={{ fontSize: 12, color: snapshot?.waiting ? ROSE_DARK : SOFT, marginTop: 2 }}
          />
        </FlexWidget>
        <TextWidget text={'›'} style={{ fontSize: 20, color: ROSE, marginLeft: 8 }} />
      </FlexWidget>
    </FlexWidget>
  );
}
