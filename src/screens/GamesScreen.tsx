import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader, Muted, Screen, SectionTitle } from '../components/ui';
import { useApp } from '../state/AppContext';
import { colors, font, gradients, radius, shadow, spacing } from '../theme';

export default function GamesScreen({ navigation }: any) {
  const { identity } = useApp();
  const partner = identity?.partnerName ?? 'them';

  // The games you PLAY: boards, words, drawings. Each keeps its signature
  // gradient; question decks live in their own quieter cluster below.
  const play = [
    {
      grad: gradients.gameBerry,
      emoji: '🎨',
      title: 'Our Shared Canvas',
      sub: 'Draw together on a co-op pixel grid',
      meta: 'Live & async',
      go: () => navigation.navigate('Canvas'),
    },
    {
      grad: gradients.gameGreen,
      emoji: '🟩',
      title: 'Daily Wordle',
      sub: 'One shared word, guess it in six',
      meta: 'New daily',
      go: () => navigation.navigate('Wordle'),
    },
    {
      grad: gradients.gameTeal,
      emoji: '⭕',
      title: 'Tic-Tac-Toe',
      sub: 'Classic, played across the distance',
      meta: 'Live match',
      go: () => navigation.navigate('TicTacToe'),
    },
    {
      grad: gradients.gameSunset,
      emoji: '🎲',
      title: 'Snakes & Ladders',
      sub: 'Roll, climb, slide, first to 100',
      meta: 'Live match',
      go: () => navigation.navigate('Snakes'),
    },
    {
      grad: gradients.gameBerry,
      emoji: '🏠',
      title: 'Ludo',
      sub: 'Race all four tokens home',
      meta: 'Live match',
      go: () => navigation.navigate('Ludo'),
    },
  ];

  // The games you ANSWER: one shared shell, three decks. Grouped so the hub
  // reads as two intents (play / ask), not eight equal tiles.
  const ask = [
    { emoji: '🎯', title: 'This or That', sub: 'Quick picks, see how aligned you are', go: () => navigation.navigate('ChoiceGame', { game: 'thisorthat' }) },
    { emoji: '🤔', title: 'Would You Rather', sub: 'Playful dilemmas, then compared', go: () => navigation.navigate('ChoiceGame', { game: 'wyr' }) },
    { emoji: '💝', title: 'How Well Do You Know Me?', sub: `Answer about you, guess ${partner}`, go: () => navigation.navigate('KnowMe') },
  ];

  return (
    <Screen scroll>
      <AppHeader title="Play together" subtitle="Little games for the two of you" onBack={() => navigation.goBack()} />
      <View style={{ gap: spacing.md }}>
        {play.map((g) => (
          <Pressable
            key={g.title}
            onPress={g.go}
            accessible
            accessibilityRole="button"
            accessibilityLabel={g.title}
            style={({ pressed }) => (pressed ? { transform: [{ scale: 0.985 }] } : null)}
          >
            <LinearGradient colors={g.grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.card, shadow.card]}>
              <View style={styles.badge}>
                <Text style={{ fontSize: 30 }}>{g.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{g.title}</Text>
                <Text style={styles.sub}>{g.sub}</Text>
                <View style={styles.metaPill}>
                  <Text style={styles.metaText}>{g.meta}</Text>
                </View>
              </View>
              <Text style={styles.arrow}>›</Text>
            </LinearGradient>
          </Pressable>
        ))}
      </View>

      <SectionTitle>Ask each other</SectionTitle>
      <View style={[styles.askCluster, shadow.card]}>
        {ask.map((g, i) => (
          <Pressable
            key={g.title}
            onPress={g.go}
            accessibilityRole="button"
            accessibilityLabel={g.title}
            style={({ pressed }) => [styles.askRow, i > 0 && styles.askDivider, pressed && styles.askPressed]}
          >
            <View style={styles.askBadge}>
              <Text style={{ fontSize: 20 }}>{g.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.askTitle}>{g.title}</Text>
              <Muted>{g.sub}</Muted>
            </View>
            <Text style={styles.askChevron}>›</Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  badge: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: font.size.lg, fontFamily: font.family.displaySemi, color: colors.white, letterSpacing: -0.2 },
  sub: { fontSize: font.size.sm, color: 'rgba(255,255,255,0.92)', fontFamily: font.family.body, marginTop: 2 },
  metaPill: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md, // grid-aligned (was 10)
    paddingVertical: 3, // optical: a slim pill reads better than a grid 4
  },
  metaText: { fontSize: 10, color: colors.white, fontFamily: font.family.bold, textTransform: 'uppercase', letterSpacing: 0.6 },
  arrow: { fontSize: 28, color: 'rgba(255,255,255,0.9)', fontFamily: font.family.bold },

  askCluster: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(90,46,64,0.06)',
    overflow: 'hidden',
  },
  askRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  askDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  askPressed: { backgroundColor: colors.surfaceAlt },
  askBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
  },
  askTitle: { fontSize: font.size.md, fontFamily: font.family.semibold, color: colors.text },
  askChevron: { fontSize: 24, color: colors.textFaint },
});
