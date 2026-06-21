import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader, Screen } from '../components/ui';
import { useApp } from '../state/AppContext';
import { colors, font, gradients, radius, shadow, spacing } from '../theme';

export default function GamesScreen({ navigation }: any) {
  const { identity } = useApp();
  const partner = identity?.partnerName ?? 'them';
  const games = [
    {
      grad: gradients.gameGreen,
      emoji: '🟩',
      title: 'Daily Wordle',
      sub: 'One shared word, guess it in six',
      meta: 'New daily',
      go: () => navigation.navigate('Wordle'),
    },
    {
      grad: gradients.gameRose,
      emoji: '🎯',
      title: 'This or That',
      sub: 'Quick picks, see how aligned you are',
      meta: '44 rounds',
      go: () => navigation.navigate('ChoiceGame', { game: 'thisorthat' }),
    },
    {
      grad: gradients.gameViolet,
      emoji: '🤔',
      title: 'Would You Rather',
      sub: 'Playful dilemmas, then compared',
      meta: '36 dilemmas',
      go: () => navigation.navigate('ChoiceGame', { game: 'wyr' }),
    },
    {
      grad: gradients.gameGold,
      emoji: '💝',
      title: 'How Well Do You Know Me?',
      sub: `Answer about you, guess ${partner}`,
      meta: '24 questions',
      go: () => navigation.navigate('KnowMe'),
    },
    {
      grad: gradients.gameTeal,
      emoji: '⭕',
      title: 'Tic-Tac-Toe',
      sub: 'Classic, played across the distance',
      meta: 'Live match',
      go: () => navigation.navigate('TicTacToe'),
    },
  ];

  return (
    <Screen scroll>
      <AppHeader title="Play together" subtitle="Little games for the two of you" onBack={() => navigation.goBack()} />
      <View style={{ gap: spacing.md }}>
        {games.map((g) => (
          <Pressable
            key={g.title}
            onPress={g.go}
            style={({ pressed }) => (pressed ? { opacity: 0.94, transform: [{ scale: 0.99 }] } : null)}
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
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  metaText: { fontSize: 10, color: colors.white, fontFamily: font.family.bold, textTransform: 'uppercase', letterSpacing: 0.6 },
  arrow: { fontSize: 28, color: 'rgba(255,255,255,0.9)', fontFamily: font.family.bold },
});
