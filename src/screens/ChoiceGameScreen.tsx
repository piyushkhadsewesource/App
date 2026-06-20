import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader, Muted, Screen } from '../components/ui';
import { shuffle, THIS_OR_THAT, TwoChoice, WOULD_YOU_RATHER } from '../lib/games';
import { useApp } from '../state/AppContext';
import { colors, font, gradients, radius, shadow, spacing } from '../theme';
import { GameKind } from '../types/models';

export default function ChoiceGameScreen({ navigation, route }: any) {
  const app = useApp();
  const game: GameKind = route?.params?.game === 'wyr' ? 'wyr' : 'thisorthat';
  const items = game === 'wyr' ? WOULD_YOU_RATHER : THIS_OR_THAT;
  const title = game === 'wyr' ? 'Would You Rather' : 'This or That';
  const partner = app.identity?.partnerName ?? 'them';

  const [order, setOrder] = useState<TwoChoice[]>(() => shuffle(items));
  const [idx, setIdx] = useState(0);
  const total = order.length;

  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 260, useNativeDriver: true }).start();
  }, [idx, anim]);

  const mineFor = (pid: string) =>
    app.gameAnswers.find((a) => a.game === game && a.promptId === pid && a.authorId === app.meId);
  const theirsFor = (pid: string) =>
    app.gameAnswers.find((a) => a.game === game && a.promptId === pid && a.authorId === app.partnerId);

  const bothDone = items.filter((it) => mineFor(it.id) && theirsFor(it.id));
  const matches = bothDone.filter((it) => mineFor(it.id)!.choice === theirsFor(it.id)!.choice).length;
  const answeredMine = items.filter((it) => mineFor(it.id)).length;

  const reshuffle = () => {
    setOrder(shuffle(items));
    setIdx(0);
  };

  const cardStyle = {
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
  };

  // ── Results ──
  if (idx >= total) {
    const pct = bothDone.length ? Math.round((matches / bothDone.length) * 100) : 0;
    const verdict =
      bothDone.length === 0
        ? `Answer a few and ${partner} will reveal theirs.`
        : pct >= 80
        ? 'Two peas in a pod 💞'
        : pct >= 55
        ? 'Beautifully in sync ✨'
        : pct >= 35
        ? 'Opposites attract 🧲'
        : 'You keep it interesting 😄';
    return (
      <Screen>
        <View style={styles.page}>
          <AppHeader title={title} subtitle="That's a wrap" onBack={() => navigation.goBack()} />
          <View style={styles.center}>
            <LinearGradient colors={gradients.gameRose} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.scoreRing, shadow.hero]}>
              <Text style={styles.scoreBig}>{bothDone.length ? `${matches}/${bothDone.length}` : `${answeredMine}`}</Text>
              <Text style={styles.scoreCap}>{bothDone.length ? 'matched' : 'answered'}</Text>
            </LinearGradient>
            <Text style={styles.verdict}>{verdict}</Text>
            <Muted style={{ textAlign: 'center', marginTop: spacing.sm }}>
              You answered {answeredMine} of {items.length}. {partner} has answered{' '}
              {items.filter((it) => theirsFor(it.id)).length}.
            </Muted>
          </View>
          <View style={styles.controls}>
            <Pressable onPress={reshuffle} style={[styles.btn, styles.btnPrimary]}>
              <Text style={styles.btnPrimaryText}>Shuffle &amp; play again</Text>
            </Pressable>
            <Pressable onPress={() => navigation.goBack()} style={[styles.btn, styles.btnGhost]}>
              <Text style={styles.btnGhostText}>Back to games</Text>
            </Pressable>
          </View>
        </View>
      </Screen>
    );
  }

  // ── Active prompt ──
  const current = order[idx];
  const mine = mineFor(current.id);
  const theirs = theirsFor(current.id);
  const pct = ((idx + 1) / total) * 100;

  return (
    <Screen>
      <View style={styles.page}>
        <AppHeader
          title={title}
          subtitle={game === 'wyr' ? 'Would you rather…' : 'Tap your pick'}
          onBack={() => navigation.goBack()}
        />

        {/* Progress + live match meter */}
        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {idx + 1}/{total}
          </Text>
          {bothDone.length > 0 ? (
            <View style={styles.matchPill}>
              <Text style={styles.matchPillText}>💞 {matches}/{bothDone.length}</Text>
            </View>
          ) : null}
        </View>

        {/* Card */}
        <Animated.View style={[styles.center, cardStyle]}>
          <View style={styles.stack}>
            <OptionPanel
              text={current.a}
              selected={mine?.choice === 0}
              partnerHere={theirs?.choice === 0}
              partner={partner}
              onPress={() => app.answerGame(game, current.id, 0)}
            />
            <View style={{ height: spacing.lg }} />
            <OptionPanel
              text={current.b}
              selected={mine?.choice === 1}
              partnerHere={theirs?.choice === 1}
              partner={partner}
              onPress={() => app.answerGame(game, current.id, 1)}
            />
            <View style={styles.orWrap} pointerEvents="none">
              <View style={styles.orBadge}>
                <Text style={styles.orText}>OR</Text>
              </View>
            </View>
          </View>

          {/* Reveal strip */}
          <View style={styles.reveal}>
            {mine && theirs ? (
              mine.choice === theirs.choice ? (
                <View style={[styles.revealPill, { backgroundColor: colors.primarySoft }]}>
                  <Text style={[styles.revealText, { color: colors.primaryDark }]}>You both picked this 💞</Text>
                </View>
              ) : (
                <View style={[styles.revealPill, { backgroundColor: colors.accentSoft }]}>
                  <Text style={[styles.revealText, { color: colors.accent }]}>
                    {partner} went the other way 😄
                  </Text>
                </View>
              )
            ) : mine ? (
              <View style={[styles.revealPill, { backgroundColor: colors.surfaceAlt }]}>
                <Text style={[styles.revealText, { color: colors.textSoft }]}>Locked in · waiting for {partner}</Text>
              </View>
            ) : (
              <Muted>Tap the one that's more you</Muted>
            )}
          </View>
        </Animated.View>

        {/* Controls */}
        <View style={styles.controls}>
          <View style={styles.navRow}>
            <Pressable onPress={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0} style={styles.navBtn}>
              <Text style={[styles.navText, idx === 0 && { color: colors.border }]}>‹ Back</Text>
            </Pressable>
            <Pressable onPress={() => setIdx((i) => i + 1)} style={[styles.btn, styles.btnPrimary, { flex: 1, marginLeft: spacing.md }]}>
              <Text style={styles.btnPrimaryText}>{idx === total - 1 ? 'See results' : mine ? 'Next' : 'Skip'} ›</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Screen>
  );
}

function OptionPanel({
  text,
  selected,
  partnerHere,
  partner,
  onPress,
}: {
  text: string;
  selected: boolean;
  partnerHere: boolean;
  partner: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.panelPress, pressed && { transform: [{ scale: 0.985 }] }]}>
      {selected ? (
        <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.panel, shadow.soft]}>
          <Text style={[styles.panelText, { color: colors.white }]}>{text}</Text>
          <View style={styles.checkBadge}>
            <Text style={styles.checkMark}>✓</Text>
          </View>
        </LinearGradient>
      ) : (
        <View style={[styles.panel, styles.panelPlain]}>
          <Text style={styles.panelText}>{text}</Text>
        </View>
      )}
      {partnerHere ? (
        <View style={styles.partnerChip}>
          <Text style={styles.partnerChipText}>{partner}'s pick</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: 20 },
  center: { flex: 1, justifyContent: 'center' },
  controls: { paddingTop: spacing.md },

  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  progressTrack: { flex: 1, height: 8, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.primary },
  progressText: { fontSize: font.size.xs, color: colors.textSoft, fontFamily: font.family.bold },
  matchPill: { backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  matchPillText: { fontSize: font.size.xs, color: colors.primaryDark, fontFamily: font.family.bold },

  stack: { position: 'relative' },
  panelPress: { position: 'relative' },
  panel: {
    minHeight: 116,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  panelPlain: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, ...shadow.card },
  panelText: { fontSize: font.size.xl, fontFamily: font.family.displaySemi, color: colors.text, textAlign: 'center', letterSpacing: -0.2 },
  checkBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { color: colors.white, fontFamily: font.family.bold, fontSize: 15 },
  partnerChip: {
    position: 'absolute',
    bottom: -8,
    alignSelf: 'center',
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
    ...shadow.soft,
  },
  partnerChipText: { color: colors.white, fontSize: 11, fontFamily: font.family.bold },

  orWrap: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  orBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  orText: { fontSize: font.size.sm, fontFamily: font.family.bold, color: colors.textFaint, letterSpacing: 0.5 },

  reveal: { alignItems: 'center', marginTop: spacing.xl, minHeight: 34 },
  revealPill: { borderRadius: radius.pill, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  revealText: { fontSize: font.size.sm, fontFamily: font.family.semibold },

  navRow: { flexDirection: 'row', alignItems: 'center' },
  navBtn: { paddingVertical: spacing.md, paddingHorizontal: spacing.sm },
  navText: { fontSize: font.size.md, fontFamily: font.family.semibold, color: colors.textSoft },
  btn: { height: 54, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  btnPrimary: { backgroundColor: colors.primary, ...shadow.soft },
  btnPrimaryText: { color: colors.white, fontFamily: font.family.bold, fontSize: font.size.md, letterSpacing: 0.2 },
  btnGhost: { marginTop: spacing.sm },
  btnGhostText: { color: colors.textSoft, fontFamily: font.family.semibold, fontSize: font.size.md },

  scoreRing: { width: 168, height: 168, borderRadius: 84, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  scoreBig: { color: colors.white, fontSize: 52, fontFamily: font.family.display, lineHeight: 56 },
  scoreCap: { color: 'rgba(255,255,255,0.9)', fontSize: font.size.sm, fontFamily: font.family.semibold, textTransform: 'uppercase', letterSpacing: 1 },
  verdict: { fontSize: font.size.xxl, fontFamily: font.family.displaySemi, color: colors.text, textAlign: 'center', marginTop: spacing.xl },
});
