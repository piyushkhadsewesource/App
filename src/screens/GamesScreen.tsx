import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader, Muted, Screen } from '../components/ui';
import { useApp } from '../state/AppContext';
import { colors, font, radius, shadow, spacing } from '../theme';

export default function GamesScreen({ navigation }: any) {
  const { identity } = useApp();
  const partner = identity?.partnerName ?? 'them';
  const games = [
    { go: () => navigation.navigate('ChoiceGame', { game: 'thisorthat' }), emoji: '🎯', label: 'This or That', sub: 'See how aligned you two are' },
    { go: () => navigation.navigate('ChoiceGame', { game: 'wyr' }), emoji: '🤔', label: 'Would You Rather', sub: 'Playful dilemmas, compared' },
    { go: () => navigation.navigate('KnowMe'), emoji: '💝', label: 'How Well Do You Know Me?', sub: `Guess ${partner}'s answers` },
    { go: () => navigation.navigate('TicTacToe'), emoji: '⭕', label: 'Tic-Tac-Toe', sub: 'Classic, played across the distance' },
  ];
  return (
    <Screen scroll>
      <AppHeader title="Play together" subtitle="Little games for the two of you" onBack={() => navigation.goBack()} />
      <View style={{ gap: spacing.md }}>
        {games.map((g) => (
          <Pressable
            key={g.label}
            onPress={g.go}
            style={({ pressed }) => [styles.row, shadow.card, pressed ? { opacity: 0.85 } : null]}
          >
            <Text style={{ fontSize: 30 }}>{g.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{g.label}</Text>
              <Muted>{g.sub}</Muted>
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
  label: { fontSize: font.size.lg, fontFamily: font.family.semibold, color: colors.text },
  chevron: { fontSize: 26, color: colors.textFaint },
});
