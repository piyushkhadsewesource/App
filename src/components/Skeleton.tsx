import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { prefersReducedMotion } from '../theme/motion';
import { colors, radius } from '../theme';

/**
 * True for the first `ms` after mount — a presentation-only "still settling"
 * window. The data layer exposes no per-collection loading flag (and adding one
 * is core state we don't touch), so this lets a screen show skeletons during an
 * initial cloud sync and then fall back to real content/empty state. Gate its
 * use on `app.cloud` so on-device (instant) loads never flash a skeleton.
 */
export function useInitialHydrate(ms = 650): boolean {
  const [hydrating, setHydrating] = useState(true);
  useEffect(() => {
    const id = setTimeout(() => setHydrating(false), ms);
    return () => clearTimeout(id);
  }, [ms]);
  return hydrating;
}

/**
 * A single shimmering placeholder block. Pass sizing (width/aspectRatio/radius)
 * via `style`; height can come from the prop or the style.
 */
export function Skeleton({ height, style }: { height?: number; style?: StyleProp<ViewStyle> }) {
  const pulse = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    if (prefersReducedMotion()) {
      pulse.setValue(1); // rest bright rather than mid-shimmer
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[styles.base, height != null ? { height } : null, { opacity: pulse }, style]}
    />
  );
}

const styles = StyleSheet.create({
  base: { width: '100%', borderRadius: radius.sm, backgroundColor: colors.surfaceAlt },
});
