// ─────────────────────────────────────────────────────────────────────────
// Live device heading (0–360° from north), best-effort and tiered:
//   • native with expo-sensors in the binary → magnetometer;
//   • web with deviceorientation events      → browser heading;
//   • otherwise                              → null (callers show north-up UI).
//
// Battery: the sensor is a real hardware drain, so the listener runs ONLY while
// `enabled` (callers pass their screen-focus state) AND the app is foregrounded.
// Navigating away, pushing another screen over the compass, or backgrounding
// the app all tear the listener down immediately; returning re-attaches it.
// The sensors require is guarded so binaries built before the dependency was
// added degrade instead of crashing. Used by the compass dial and the lens.
// ─────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

export function useHeading(enabled: boolean = true): number | null {
  const [heading, setHeading] = useState<number | null>(null);
  // Only 'background' truly pauses; iOS 'inactive' (transient, e.g. the control
  // centre) is left running so the needle doesn't stutter on every notification.
  const [foreground, setForeground] = useState(() => AppState.currentState !== 'background');

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setForeground(s !== 'background'));
    return () => sub.remove();
  }, []);

  const on = enabled && foreground;

  useEffect(() => {
    if (!on) return; // no sensor while unfocused or backgrounded — zero drain
    let cleanup: (() => void) | null = null;
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && 'ondeviceorientation' in window) {
        const onOrient = (e: any) => {
          // iOS Safari exposes webkitCompassHeading; others give alpha (inverted).
          const h =
            typeof e.webkitCompassHeading === 'number'
              ? e.webkitCompassHeading
              : e.absolute && typeof e.alpha === 'number'
                ? 360 - e.alpha
                : null;
          if (h != null && Number.isFinite(h)) setHeading(h);
        };
        window.addEventListener('deviceorientation', onOrient);
        cleanup = () => window.removeEventListener('deviceorientation', onOrient);
      }
    } else {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { Magnetometer } = require('expo-sensors');
        Magnetometer.setUpdateInterval(250);
        const sub = Magnetometer.addListener((d: { x: number; y: number }) => {
          if (typeof d?.x !== 'number' || typeof d?.y !== 'number') return;
          // Flat-held approximation; plenty for a poetic needle.
          let h = Math.atan2(d.y, d.x) * (180 / Math.PI);
          h = (90 - h + 360) % 360;
          setHeading(h);
        });
        cleanup = () => sub?.remove();
      } catch {
        /* module not in this binary yet — callers show north-up UI */
      }
    }
    return () => cleanup?.();
  }, [on]);

  // The last reading persists across a pause (so the needle holds its angle
  // instead of snapping to north); only the hardware listener is torn down.
  return heading;
}
