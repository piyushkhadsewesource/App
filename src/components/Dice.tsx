// A premium dice face with real pips and a tumble animation on each new roll.
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { colors, radius, shadow } from '../theme';

// Pip layout per value, on a 3x3 grid (positions 0..8).
const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

export default function Dice({
  value,
  spinKey,
  size = 64,
  pip = colors.text,
}: {
  value: number;
  spinKey?: number | string;
  size?: number;
  pip?: string;
}) {
  const spin = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    spin.setValue(0);
    Animated.timing(spin, {
      toValue: 1,
      duration: 460,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [spinKey, value, spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['-200deg', '0deg'] });
  const scale = spin.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.7, 1.18, 1] });
  const on = PIPS[value] ?? [];
  const pipSize = Math.round(size * 0.16);

  return (
    <Animated.View
      style={[
        styles.die,
        { width: size, height: size, borderRadius: size * 0.26, transform: [{ rotate }, { scale }] },
      ]}
    >
      <View style={styles.grid}>
        {Array.from({ length: 9 }).map((_, i) => (
          <View key={i} style={styles.cell}>
            {value >= 1 && on.includes(i) ? (
              <View style={{ width: pipSize, height: pipSize, borderRadius: pipSize / 2, backgroundColor: pip }} />
            ) : null}
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  die: {
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  grid: { width: '64%', height: '64%', flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '33.33%', height: '33.33%', alignItems: 'center', justifyContent: 'center' },
});
