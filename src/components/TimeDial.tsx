// ─────────────────────────────────────────────────────────────────────────
// TimeDial — the web-safe time picker.
//
// The scroll-wheel commits its value from ScrollView momentum events, which
// react-native-web never reliably fires on iOS Safari: the wheel spins, the
// state silently keeps its default. This replaces it on web with taps, which
// set state synchronously — impossible to break with scroll physics.
//
// Design intent (high-frequency input): no entrance animation, no selection
// animation beyond the press-down itself; big targets; the chosen time reads
// back instantly in the modal's serif readout. Native keeps the wheel, which
// genuinely feels right in hand there.
// ─────────────────────────────────────────────────────────────────────────
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, spacing } from '../theme';

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const QUARTERS = [0, 15, 30, 45];

export default function TimeDial({
  h12,
  minute,
  isPM,
  onChange,
}: {
  h12: number; // 1..12
  minute: number; // 0..59
  isPM: boolean;
  onChange: (h12: number, isPM: boolean, minute: number) => void;
}) {
  const nudge = (delta: number) => {
    let m = minute + delta;
    let h = h12;
    let pm = isPM;
    if (m > 59) {
      m -= 60;
      ({ h, pm } = hourUp(h, pm));
    } else if (m < 0) {
      m += 60;
      ({ h, pm } = hourDown(h, pm));
    }
    onChange(h, pm, m);
  };

  return (
    <View style={styles.wrap}>
      {/* Hours */}
      <View style={styles.grid}>
        {HOURS.map((h) => (
          <Pressable
            key={h}
            onPress={() => onChange(h, isPM, minute)}
            accessibilityRole="button"
            accessibilityLabel={`${h} o'clock`}
            accessibilityState={{ selected: h === h12 }}
            style={({ pressed }) => [
              styles.cell,
              h === h12 && styles.cellOn,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.cellText, h === h12 && styles.cellTextOn]}>{h}</Text>
          </Pressable>
        ))}
      </View>

      {/* Minutes: quarter chips + fine nudge */}
      <View style={styles.row}>
        {QUARTERS.map((m) => (
          <Pressable
            key={m}
            onPress={() => onChange(h12, isPM, m)}
            accessibilityRole="button"
            accessibilityLabel={`${m} minutes`}
            accessibilityState={{ selected: minute === m }}
            style={({ pressed }) => [
              styles.cell,
              styles.minCell,
              minute === m && styles.cellOn,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.cellText, minute === m && styles.cellTextOn]}>:{String(m).padStart(2, '0')}</Text>
          </Pressable>
        ))}
        <Pressable
          onPress={() => nudge(-5)}
          accessibilityRole="button"
          accessibilityLabel="Five minutes earlier"
          style={({ pressed }) => [styles.cell, styles.nudge, pressed && styles.pressed]}
        >
          <Text style={styles.nudgeText}>−5</Text>
        </Pressable>
        <Pressable
          onPress={() => nudge(5)}
          accessibilityRole="button"
          accessibilityLabel="Five minutes later"
          style={({ pressed }) => [styles.cell, styles.nudge, pressed && styles.pressed]}
        >
          <Text style={styles.nudgeText}>+5</Text>
        </Pressable>
      </View>

      {/* AM / PM */}
      <View style={styles.segment}>
        {(['AM', 'PM'] as const).map((p) => {
          const on = (p === 'PM') === isPM;
          return (
            <Pressable
              key={p}
              onPress={() => onChange(h12, p === 'PM', minute)}
              accessibilityRole="button"
              accessibilityLabel={p}
              accessibilityState={{ selected: on }}
              style={[styles.seg, on && styles.segOn]}
            >
              <Text style={[styles.segText, on && styles.segTextOn]}>{p}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function hourUp(h: number, pm: boolean): { h: number; pm: boolean } {
  if (h === 11) return { h: 12, pm: !pm };
  return { h: h === 12 ? 1 : h + 1, pm };
}
function hourDown(h: number, pm: boolean): { h: number; pm: boolean } {
  if (h === 12) return { h: 11, pm: !pm };
  return { h: h === 1 ? 12 : h - 1, pm };
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  row: { flexDirection: 'row', gap: 6 },
  cell: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '14%', // 6 per row with gaps
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  minCell: { flexBasis: '16%' },
  cellOn: { backgroundColor: colors.primary },
  pressed: { transform: [{ scale: 0.96 }] },
  cellText: { fontSize: font.size.md, fontFamily: font.family.semibold, color: colors.text },
  cellTextOn: { color: colors.white, fontFamily: font.family.bold },
  nudge: { flexBasis: '10%', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  nudgeText: { fontSize: font.size.md, fontFamily: font.family.bold, color: colors.textSoft },

  segment: { flexDirection: 'row', backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, padding: 4 },
  seg: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.pill, alignItems: 'center' },
  segOn: { backgroundColor: colors.surface },
  segText: { fontSize: font.size.sm, fontFamily: font.family.semibold, color: colors.textSoft },
  segTextOn: { color: colors.text },
});
