// ─────────────────────────────────────────────────────────────────────────
// One motion language for the whole app, so every press, reveal and transition
// feels like the same designed instrument. Built on the native-driver Animated
// API (transform/opacity run on the UI thread = 60fps), so it is fast on device
// and fully renderable on web.
// ─────────────────────────────────────────────────────────────────────────
import { Easing } from 'react-native';

/** Spring presets for Animated.spring (native-driver friendly). */
export const spring = {
  gentle: { tension: 120, friction: 18 },
  snappy: { tension: 300, friction: 22 },
  bouncy: { tension: 260, friction: 12 },
} as const;

/** Timing durations (ms). */
export const duration = { fast: 170, base: 260, slow: 440 } as const;

/** A soft ease-out (quint-ish) for entrances and settles. */
export const easeOut = Easing.bezier(0.22, 1, 0.36, 1);
