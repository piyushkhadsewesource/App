// ─────────────────────────────────────────────────────────────────────────
// "Us" — the home of everything you share, organised the way the relationship
// actually works: reach for each other now, play, keep what matters, plan
// what's ahead, tend what's tender. Replaces the old undifferentiated 16-tile
// grid; every route stays reachable, nothing is orphaned.
// ─────────────────────────────────────────────────────────────────────────
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader, Muted, Screen, SectionTitle } from '../components/ui';
import { useApp } from '../state/AppContext';
import { colors, font, radius, shadow, spacing } from '../theme';

type Row = { route: string; emoji: string; label: string; sub?: string };

const CLUSTERS: { title: string; tint: string; rows: Row[] }[] = [
  {
    title: 'Feel close now',
    tint: colors.primarySoft,
    rows: [
      { route: 'MissYou', emoji: '🤍', label: 'When I miss you', sub: 'Hugs, thoughts & the emergency alert' },
      { route: 'Glass', emoji: '🫶', label: 'Through the glass', sub: 'Touch together, feel their heartbeat' },
      { route: 'Compass', emoji: '🧭', label: 'The Compass Rose', sub: 'The needle that points at them' },
      { route: 'Walk', emoji: '👣', label: 'Walking each other home', sub: 'Your steps close the distance' },
    ],
  },
  {
    title: 'Play together',
    tint: colors.accentSoft,
    rows: [
      { route: 'Games', emoji: '🎮', label: 'Play together', sub: 'Canvas, Wordle, Ludo & more' },
      { route: 'Deck', emoji: '🃏', label: 'Intimacy deck', sub: 'Questions worth an evening' },
    ],
  },
  {
    title: 'Keep & remember',
    tint: colors.goldSoft,
    rows: [
      { route: 'Moments', emoji: '📸', label: 'Moments', sub: 'A photo a day, just for you two' },
      { route: 'Letters', emoji: '💌', label: 'Love letters', sub: 'Written now, delivered when you choose' },
      { route: 'Vault', emoji: '🗂️', label: 'Memory vault', sub: 'The ones you never want to lose' },
      { route: 'Journal', emoji: '📖', label: 'Our journal', sub: 'Your weeks, written back to you' },
      { route: 'Future', emoji: '✨', label: 'Future board', sub: 'Everything you’re walking toward' },
    ],
  },
  {
    title: 'Plan together',
    tint: colors.goodSoft,
    rows: [
      { route: 'Schedule', emoji: '🗓️', label: 'Our day', sub: 'Share your day, find the shared hour' },
      { route: 'Countdown', emoji: '💞', label: 'Countdown', sub: 'Until you’re together again' },
      { route: 'Occasions', emoji: '🎀', label: 'Special dates', sub: 'Anniversaries, remembered for you' },
    ],
  },
  {
    title: 'Tend to us',
    tint: colors.accentSoft,
    rows: [
      { route: 'Issues', emoji: '🕊️', label: 'Clear the air', sub: 'Gentle repair, step by step' },
      { route: 'Insights', emoji: '💜', label: 'Companion', sub: 'What your patterns say, kindly' },
    ],
  },
];

const UTILITIES: Row[] = [
  { route: 'Reminders', emoji: '🔔', label: 'Daily reminders', sub: 'Plan-your-day & photo nudges' },
  { route: 'Settings', emoji: '⚙️', label: 'Settings', sub: 'Sync, names, calendar link & pairing' },
];

export default function MoreScreen({ navigation }: any) {
  const { identity } = useApp();
  return (
    <Screen scroll>
      <AppHeader title="Us" subtitle={`Everything you & ${identity?.partnerName ?? 'your love'} share`} />

      {CLUSTERS.map((c) => (
        <View key={c.title}>
          <SectionTitle>{c.title}</SectionTitle>
          <View style={[styles.cluster, shadow.card]}>
            {c.rows.map((r, i) => (
              <Pressable
                key={r.route}
                onPress={() => navigation.navigate(r.route)}
                accessibilityRole="button"
                accessibilityLabel={r.label}
                style={({ pressed }) => [
                  styles.row,
                  i > 0 && styles.rowDivider,
                  pressed && styles.rowPressed,
                ]}
              >
                <View style={[styles.badge, { backgroundColor: c.tint }]}>
                  <Text style={styles.badgeEmoji}>{r.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>{r.label}</Text>
                  {r.sub ? <Muted>{r.sub}</Muted> : null}
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}

      <SectionTitle>Settings</SectionTitle>
      <View style={[styles.cluster, shadow.card]}>
        {UTILITIES.map((r, i) => (
          <Pressable
            key={r.route}
            onPress={() => navigation.navigate(r.route)}
            accessibilityRole="button"
            accessibilityLabel={r.label}
            style={({ pressed }) => [styles.row, i > 0 && styles.rowDivider, pressed && styles.rowPressed]}
          >
            <View style={[styles.badge, { backgroundColor: colors.surfaceAlt }]}>
              <Text style={styles.badgeEmoji}>{r.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{r.label}</Text>
              {r.sub ? <Muted>{r.sub}</Muted> : null}
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cluster: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(90,46,64,0.06)',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  rowPressed: { backgroundColor: colors.surfaceAlt },
  badge: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  badgeEmoji: { fontSize: 21 },
  label: { fontSize: font.size.md, fontFamily: font.family.semibold, color: colors.text },
  chevron: { fontSize: 24, color: colors.textFaint },
});
