// ─────────────────────────────────────────────────────────────────────────
// One motion language for the whole app, so every press, reveal and transition
// feels like the same designed instrument. Built on the native-driver Animated
// API (transform/opacity run on the UI thread = 60fps), so it is fast on device
// and fully renderable on web.
// ─────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Easing } from 'react-native';

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

// ── Reduced motion ─────────────────────────────────────────────────────────
// One shared source of truth for the OS "reduce motion" setting (on web this
// reads prefers-reduced-motion via react-native-web). Ambient loops, confetti,
// staggers and flips degrade to fades/instant states when it's on; feedback
// that carries meaning (opacity, color) stays.
let reduceMotionNow = false;
AccessibilityInfo.isReduceMotionEnabled?.()
  .then((v) => {
    reduceMotionNow = !!v;
  })
  .catch(() => {});
AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v: boolean) => {
  reduceMotionNow = !!v;
});

/** Snapshot read for non-React code paths (loop guards, one-shot effects). */
export function prefersReducedMotion(): boolean {
  return reduceMotionNow;
}

/** Live subscription for components that should re-render on change. */
export function useReducedMotion(): boolean {
  const [v, setV] = useState(reduceMotionNow);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((x) => alive && setV(!!x))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (x: boolean) => setV(!!x));
    return () => {
      alive = false;
      (sub as { remove?: () => void } | undefined)?.remove?.();
    };
  }, []);
  return v;
}
