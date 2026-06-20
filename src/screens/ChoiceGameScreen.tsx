import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader, Body, Card, Muted, Screen } from '../components/ui';
import { THIS_OR_THAT, WOULD_YOU_RATHER } from '../lib/games';
import { useApp } from '../state/AppContext';
import { colors, font, radius, spacing } from '../theme';
import { GameKind } from '../types/models';

export default function ChoiceGameScreen({ navigation, route }: any) {
  const app = useApp();
  const game: GameKind = route?.params?.game === 'wyr' ? 'wyr' : 'thisorthat';
  const items = game === 'wyr' ? WOULD_YOU_RATHER : THIS_OR_THAT;
  const title = game === 'wyr' ? 'Would You Rather' : 'This or That';
  const partner = app.identity?.partnerName ?? 'them';

  const mineFor = (pid: string) =>
    app.gameAnswers.find((a) => a.game === game && a.promptId === pid && a.authorId === app.meId);
  const theirsFor = (pid: string) =>
    app.gameAnswers.find((a) => a.game === game && a.promptId === pid && a.authorId === app.partnerId);

  const bothDone = items.filter((it) => mineFor(it.id) && theirsFor(it.id));
  const matches = bothDone.filter((it) => mineFor(it.id)!.choice === theirsFor(it.id)!.choice).length;

  return (
    <Screen scroll>
      <AppHeader
        title={title}
        subtitle={game === 'wyr' ? 'Both answer, then compare' : 'Tap your pick on each'}
        onBack={() => navigation.goBack()}
      />

      {bothDone.length > 0 ? (
        <Card tone="rose" style={{ marginBottom: spacing.lg }}>
          <Body style={{ fontFamily: font.family.semibold }}>
            You matched on {matches} of {bothDone.length} 💞
          </Body>
        </Card>
      ) : null}

      <View style={{ gap: spacing.md }}>
        {items.map((it) => {
          const mine = mineFor(it.id);
          const theirs = theirsFor(it.id);
          return (
            <Card key={it.id} style={styles.promptCard}>
              <View style={styles.optRow}>
                <Option text={it.a} picked={mine?.choice === 0} onPress={() => app.answerGame(game, it.id, 0)} />
                <Text style={styles.orText}>or</Text>
                <Option text={it.b} picked={mine?.choice === 1} onPress={() => app.answerGame(game, it.id, 1)} />
              </View>
              {mine && theirs ? (
                <Muted style={{ marginTop: spacing.sm, textAlign: 'center' }}>
                  {mine.choice === theirs.choice
                    ? '✓ You both chose the same 💞'
                    : `${partner} chose “${theirs.choice === 0 ? it.a : it.b}”`}
                </Muted>
              ) : mine ? (
                <Muted style={{ marginTop: spacing.sm, textAlign: 'center' }}>Waiting for {partner}…</Muted>
              ) : null}
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}

function Option({ text, picked, onPress }: { text: string; picked: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.opt, picked && styles.optPicked]}>
      <Text style={[styles.optText, picked && { color: colors.white }]} numberOfLines={2}>
        {text}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  promptCard: { paddingVertical: spacing.md },
  optRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  opt: {
    flex: 1,
    minHeight: 58,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  optPicked: { backgroundColor: colors.primary, borderColor: colors.primary },
  optText: { fontSize: font.size.md, fontFamily: font.family.semibold, color: colors.text, textAlign: 'center' },
  orText: {
    fontSize: font.size.xs,
    fontFamily: font.family.bold,
    color: colors.textFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
