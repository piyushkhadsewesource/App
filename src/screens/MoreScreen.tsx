import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader, Muted, Screen, SectionTitle } from '../components/ui';
import { useApp } from '../state/AppContext';
import { colors, font, radius, shadow, spacing } from '../theme';

// The "reach for each other" quick squares, moved here from Home.
const TILES: { route: string; emoji: string; label: string; tint: string }[] = [
  { route: 'MissYou', emoji: '🤍', label: 'When I miss you', tint: colors.accentSoft },
  { route: 'Glass', emoji: '🫶', label: 'Through the glass', tint: colors.primarySoft },
  { route: 'Moments', emoji: '📸', label: 'Moments', tint: colors.goldSoft },
  { route: 'Countdown', emoji: '💞', label: 'Countdown', tint: colors.primarySoft },
  { route: 'Letters', emoji: '💌', label: 'Love letters', tint: colors.primarySoft },
  { route: 'Deck', emoji: '🃏', label: 'Intimacy deck', tint: colors.accentSoft },
  { route: 'Schedule', emoji: '🗓️', label: 'Our day', tint: colors.goodSoft },
  { route: 'Occasions', emoji: '🎀', label: 'Dates', tint: colors.primarySoft },
  { route: 'Issues', emoji: '🕊️', label: 'Clear the air', tint: colors.accentSoft },
  { route: 'Future', emoji: '✨', label: 'Future board', tint: colors.goodSoft },
  { route: 'Journal', emoji: '📖', label: 'Our journal', tint: colors.goldSoft },
  { route: 'Insights', emoji: '💜', label: 'Companion', tint: colors.accentSoft },
  { route: 'Games', emoji: '🎮', label: 'Play together', tint: colors.primarySoft },
  { route: 'Vault', emoji: '🗂️', label: 'Memory vault', tint: colors.goldSoft },
];

const LINKS: { route: string; emoji: string; label: string; sub: string }[] = [
  { route: 'Reminders', emoji: '🔔', label: 'Daily reminders', sub: 'Plan-your-day & photo nudges' },
  { route: 'Settings', emoji: '⚙️', label: 'Settings', sub: 'Sync, names & pairing code' },
];

export default function MoreScreen({ navigation }: any) {
  const { identity } = useApp();
  return (
    <Screen scroll>
      <AppHeader title="More" subtitle={`You & ${identity?.partnerName ?? 'your love'}`} />

      <SectionTitle>Reach for each other</SectionTitle>
      <View style={styles.grid}>
        {TILES.map((t, i) => (
          <Pressable
            key={`${t.route}-${i}`}
            onPress={() => navigation.navigate(t.route)}
            accessibilityRole="button"
            accessibilityLabel={t.label}
            style={({ pressed }) => [styles.tile, pressed ? styles.tilePressed : null]}
          >
            <View style={[styles.tileBadge, { backgroundColor: t.tint }]}>
              <Text style={styles.tileEmoji}>{t.emoji}</Text>
            </View>
            <Text style={styles.tileLabel} numberOfLines={2}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <SectionTitle>Settings & more</SectionTitle>
      <View style={{ gap: spacing.md }}>
        {LINKS.map((l) => (
          <Pressable
            key={l.route}
            onPress={() => navigation.navigate(l.route)}
            accessibilityRole="button"
            accessibilityLabel={l.label}
            style={({ pressed }) => [styles.row, shadow.card, pressed ? { opacity: 0.85 } : null]}
          >
            <Text style={{ fontSize: 28 }}>{l.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{l.label}</Text>
              <Muted>{l.sub}</Muted>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.sm },
  tile: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(90,46,64,0.05)',
    ...shadow.card,
  },
  tilePressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  tileBadge: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  tileEmoji: { fontSize: 25 },
  tileLabel: { fontSize: font.size.md, fontFamily: font.family.semibold, color: colors.text, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  label: { fontSize: font.size.lg, fontFamily: font.family.semibold, color: colors.text },
  chevron: { fontSize: 26, color: colors.textFaint },
});
