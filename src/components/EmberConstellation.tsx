// ─────────────────────────────────────────────────────────────────────────
// The ember constellation — the lantern month. Every evening you BOTH came
// to the burning lantern leaves one gold ember; the month reads as a quiet
// picture of showing up for each other. Deliberately not a streak: nothing
// here can break, embers only accumulate.
// ─────────────────────────────────────────────────────────────────────────
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { todayISO } from '../lib/date';
import { colors, font, radius, shadow, spacing } from '../theme';
import { Muted } from './ui';
import { Ember } from '../types/models';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function EmberConstellation({ embers }: { embers: Ember[] }) {
  const today = todayISO();
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7)) - 1;
  const monthKey = today.slice(0, 7);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayDay = Number(today.slice(8, 10));

  const lit = new Set(
    embers.filter((e) => typeof e.date === 'string' && e.date.startsWith(monthKey)).map((e) => Number(e.date.slice(8, 10))),
  );
  const count = lit.size;

  return (
    <View style={[styles.card, shadow.card]}>
      <Text style={styles.title}>The lantern month</Text>
      <Muted style={{ marginTop: 2 }}>
        {count === 0
          ? `No embers yet in ${MONTHS[month]}. They appear when you both come to the lantern.`
          : `${count} evening${count === 1 ? '' : 's'} you both came to the lantern in ${MONTHS[month]} 🤍`}
      </Muted>
      <View style={styles.grid}>
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const isLit = lit.has(day);
          const isToday = day === todayDay;
          const isFuture = day > todayDay;
          return (
            <View key={day} style={styles.cellWrap}>
              {isLit ? (
                <View style={styles.emberGlow}>
                  <View style={styles.ember} />
                </View>
              ) : (
                <View style={[styles.dot, isFuture && styles.dotFuture, isToday && styles.dotToday]} />
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(90,46,64,0.06)',
    padding: spacing.lg + spacing.xs,
    marginTop: spacing.lg,
  },
  // The month speaks in the house voice.
  title: {
    fontSize: font.size.lg,
    fontFamily: font.family.displaySemi,
    color: colors.text,
    letterSpacing: font.tracking.heading,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.md,
  },
  cellWrap: {
    // Seven across, like weeks, without the calendar ceremony.
    width: `${100 / 7}%`,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.border },
  dotFuture: { backgroundColor: colors.surfaceAlt },
  dotToday: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.textFaint },
  emberGlow: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ember: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold },
});
