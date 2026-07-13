// ─────────────────────────────────────────────────────────────────────────
// The Golden Band — the golden window, finally visible. Two lanes on one
// 06:00→midnight track: my busy blocks in rose, theirs in violet, and the
// first stretch you're BOTH free glowing gold between them, breathing softly.
// The ritual copy stays the caption; this is the shape of the day itself.
// ─────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { busyIntervals } from '../lib/ourDay';
import { colors, radius } from '../theme';
import { prefersReducedMotion } from '../theme/motion';
import { ScheduleItem } from '../types/models';

const DAY_START = 6 * 60; // 06:00 — the track starts where days do
const DAY_END = 24 * 60;
const SPAN = DAY_END - DAY_START;

const pctOf = (min: number) => Math.max(0, Math.min(1, (min - DAY_START) / SPAN)) * 100;

function Lane({ items, color }: { items: ScheduleItem[]; color: string }) {
  return (
    <View style={styles.lane}>
      {busyIntervals(items)
        .filter((iv) => iv.end > DAY_START && iv.start < DAY_END)
        .map((iv, i) => (
          <View
            key={i}
            style={[
              styles.block,
              { backgroundColor: color, left: `${pctOf(iv.start)}%`, width: `${Math.max(1.5, pctOf(iv.end) - pctOf(iv.start))}%` },
            ]}
          />
        ))}
    </View>
  );
}

export default function GoldenBand({
  mine,
  theirs,
  window,
  nowMin,
  style,
}: {
  mine: ScheduleItem[];
  theirs: ScheduleItem[];
  window: { start: number; end: number } | null;
  /** Current minute-of-day; draws the quiet "now" hairline when on-screen day is today. */
  nowMin?: number;
  style?: StyleProp<ViewStyle>;
}) {
  // The gold glow breathes on the ambient sine loop; under reduced motion it
  // simply holds its warm middle value.
  const breathe = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 2600, useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 2600, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breathe]);
  const glow = prefersReducedMotion()
    ? 0.65
    : breathe.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.85] });

  const windowVisible = window && window.end > DAY_START && window.start < DAY_END;

  return (
    <View style={[styles.track, style]}>
      {windowVisible ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.window,
            {
              left: `${pctOf(window!.start)}%`,
              width: `${Math.max(2, pctOf(window!.end) - pctOf(window!.start))}%`,
              opacity: glow,
            },
          ]}
        />
      ) : null}
      <Lane items={mine} color={colors.primary} />
      <View style={{ height: 3 }} />
      <Lane items={theirs} color={colors.accent} />
      {nowMin != null && nowMin >= DAY_START && nowMin <= DAY_END ? (
        <View pointerEvents="none" style={[styles.now, { left: `${pctOf(nowMin)}%` }]} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    paddingVertical: 5,
    paddingHorizontal: 4,
    overflow: 'hidden',
  },
  lane: { height: 7, borderRadius: radius.pill, overflow: 'hidden' },
  block: { position: 'absolute', top: 0, bottom: 0, borderRadius: radius.pill, opacity: 0.75 },
  window: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.gold,
  },
  now: { position: 'absolute', top: 1, bottom: 1, width: StyleSheet.hairlineWidth * 2, backgroundColor: colors.text, opacity: 0.5 },
});
