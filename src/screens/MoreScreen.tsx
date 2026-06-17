import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader, Muted, Screen } from '../components/ui';
import { useApp } from '../state/AppContext';
import { colors, font, radius, shadow, spacing } from '../theme';

const LINKS: { route: string; emoji: string; label: string; sub: string }[] = [
  { route: 'Letters', emoji: '💌', label: 'Love letters', sub: 'Write now, deliver later' },
  { route: 'Deck', emoji: '🃏', label: 'Intimacy deck', sub: 'Questions that bring you closer' },
  { route: 'Journal', emoji: '📖', label: 'Our journal', sub: 'Your month, narrated' },
  { route: 'Insights', emoji: '💜', label: 'Companion', sub: 'Gentle attachment-aware nudges' },
  { route: 'Future', emoji: '✨', label: 'Future board', sub: 'The life you’re building' },
  { route: 'Vault', emoji: '🗂️', label: 'Memory vault', sub: 'Milestones and keepsakes' },
  { route: 'Settings', emoji: '⚙️', label: 'Settings', sub: 'Sync, names & pairing code' },
];

export default function MoreScreen({ navigation }: any) {
  const { identity } = useApp();
  return (
    <Screen scroll>
      <AppHeader title="More" subtitle={`You & ${identity?.partnerName ?? 'your love'}`} />
      <View style={{ gap: spacing.md }}>
        {LINKS.map((l) => (
          <Pressable
            key={l.route}
            onPress={() => navigation.navigate(l.route)}
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  label: { fontSize: font.size.lg, fontWeight: font.weight.semibold, color: colors.text },
  chevron: { fontSize: 26, color: colors.textFaint },
});
