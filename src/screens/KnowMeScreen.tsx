import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader, Muted, Screen } from '../components/ui';
import { KNOW_ME } from '../lib/games';
import { useApp } from '../state/AppContext';
import { colors, font, gradients, radius, shadow, spacing } from '../theme';

type Tab = 'me' | 'them' | 'scores';

export default function KnowMeScreen({ navigation }: any) {
  const app = useApp();
  const partner = app.identity?.partnerName ?? 'them';
  const [tab, setTab] = useState<Tab>('me');
  const [idx, setIdx] = useState(0);
  const total = KNOW_ME.length;

  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 240, useNativeDriver: true }).start();
  }, [idx, tab, anim]);

  const ans = (prefix: 't' | 'g', qid: string, who: string) =>
    app.gameAnswers.find((a) => a.game === 'knowme' && a.promptId === `${prefix}:${qid}` && a.authorId === who);
  const myTruth = (qid: string) => ans('t', qid, app.meId);
  const myGuess = (qid: string) => ans('g', qid, app.meId);
  const partnerTruth = (qid: string) => ans('t', qid, app.partnerId);
  const partnerGuess = (qid: string) => ans('g', qid, app.partnerId);

  const youKnow = KNOW_ME.filter((q) => myGuess(q.id) && partnerTruth(q.id));
  const youCorrect = youKnow.filter((q) => myGuess(q.id)!.choice === partnerTruth(q.id)!.choice).length;
  const theyKnow = KNOW_ME.filter((q) => partnerGuess(q.id) && myTruth(q.id));
  const theyCorrect = theyKnow.filter((q) => partnerGuess(q.id)!.choice === myTruth(q.id)!.choice).length;

  const go = (t: Tab) => { setTab(t); setIdx(0); };

  const segment = (
    <View style={styles.segment}>
      {(['me', 'them', 'scores'] as Tab[]).map((t) => (
        <Pressable key={t} onPress={() => go(t)} style={[styles.seg, tab === t && styles.segOn]}>
          <Text style={[styles.segText, tab === t && styles.segTextOn]} numberOfLines={1}>
            {t === 'me' ? 'About you' : t === 'them' ? `Guess ${partner}` : 'Scores'}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  // ── Scores ──
  if (tab === 'scores') {
    return (
      <Screen scroll>
        <AppHeader title="How well do you know me?" subtitle="The reveal" onBack={() => navigation.goBack()} />
        {segment}
        <View style={{ gap: spacing.md }}>
          <ScoreCard grad={gradients.gameRose} cap={`How well you know ${partner}`} value={youKnow.length ? `${youCorrect}/${youKnow.length}` : '-'} hint={youKnow.length ? '' : `Guess ${partner}'s answers, then they reveal their truth.`} />
          <ScoreCard grad={gradients.gameViolet} cap={`How well ${partner} knows you`} value={theyKnow.length ? `${theyCorrect}/${theyKnow.length}` : '-'} hint={theyKnow.length ? '' : `Set your own answers in "About you" so they can be scored.`} />
        </View>
      </Screen>
    );
  }

  // ── Completion ──
  if (idx >= total) {
    return (
      <Screen>
        <View style={styles.page}>
          <AppHeader title="How well do you know me?" subtitle={tab === 'me' ? 'About you' : `Guess ${partner}`} onBack={() => navigation.goBack()} />
          {segment}
          <View style={styles.center}>
            <Text style={{ fontSize: 56 }}>🎉</Text>
            <Text style={styles.verdict}>All done!</Text>
            <Muted style={{ textAlign: 'center', marginTop: spacing.sm }}>
              {tab === 'me' ? `Your answers are saved. See how well ${partner} guessed them.` : `Nice guessing! See how you scored.`}
            </Muted>
          </View>
          <View style={styles.controls}>
            <Pressable onPress={() => go('scores')} style={[styles.btn, styles.btnPrimary]}>
              <Text style={styles.btnPrimaryText}>See scores</Text>
            </Pressable>
            <Pressable onPress={() => setIdx(0)} style={[styles.btn, styles.btnGhost]}>
              <Text style={styles.btnGhostText}>Review answers</Text>
            </Pressable>
          </View>
        </View>
      </Screen>
    );
  }

  // ── Question deck ──
  const q = KNOW_ME[idx];
  const selected = tab === 'me' ? myTruth(q.id) : myGuess(q.id);
  const truth = partnerTruth(q.id);
  const revealed = tab === 'them' && !!selected && !!truth;
  const pct = ((idx + 1) / total) * 100;
  const cardStyle = {
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
  };

  return (
    <Screen>
      <View style={styles.page}>
        <AppHeader title="How well do you know me?" subtitle={tab === 'me' ? 'About you' : `Guess ${partner}`} onBack={() => navigation.goBack()} />
        {segment}

        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
          <Text style={styles.progressText}>{idx + 1}/{total}</Text>
        </View>

        <Animated.View style={[styles.center, cardStyle]}>
          <Text style={styles.context}>{tab === 'me' ? 'About you' : `You think ${partner} would say…`}</Text>
          <Text style={styles.question}>{q.q}…</Text>
          <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
            {q.options.map((opt, k) => {
              const isPick = selected?.choice === k;
              const isTruth = revealed && truth?.choice === k;
              const isWrong = revealed && isPick && truth?.choice !== k;
              return (
                <Choice
                  key={k}
                  text={opt}
                  isPick={isPick}
                  isTruth={!!isTruth}
                  isWrong={!!isWrong}
                  locked={revealed}
                  onPress={() => app.answerGame('knowme', `${tab === 'me' ? 't' : 'g'}:${q.id}`, k)}
                />
              );
            })}
          </View>

          <View style={styles.reveal}>
            {revealed ? (
              selected!.choice === truth!.choice ? (
                <View style={[styles.revealPill, { backgroundColor: colors.goodSoft }]}>
                  <Text style={[styles.revealText, { color: colors.good }]}>✓ Correct! You nailed it 💞</Text>
                </View>
              ) : (
                <View style={[styles.revealPill, { backgroundColor: colors.warnSoft }]}>
                  <Text style={[styles.revealText, { color: colors.warn }]}>
                    {partner} actually said "{q.options[truth!.choice] ?? '?'}"
                  </Text>
                </View>
              )
            ) : tab === 'them' && selected ? (
              <View style={[styles.revealPill, { backgroundColor: colors.surfaceAlt }]}>
                <Text style={[styles.revealText, { color: colors.textSoft }]}>Waiting for {partner} to answer…</Text>
              </View>
            ) : (
              <Muted>{tab === 'me' ? 'Pick your honest answer' : 'Pick your best guess'}</Muted>
            )}
          </View>
        </Animated.View>

        <View style={styles.controls}>
          <View style={styles.navRow}>
            <Pressable onPress={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0} style={styles.navBtn} accessibilityRole="button" accessibilityLabel="Previous question" accessibilityState={{ disabled: idx === 0 }}>
              <Text style={[styles.navText, idx === 0 && { color: colors.border }]}>‹ Back</Text>
            </Pressable>
            <Pressable onPress={() => setIdx((i) => i + 1)} style={[styles.btn, styles.btnPrimary, { flex: 1, marginLeft: spacing.md }]}>
              <Text style={styles.btnPrimaryText}>{idx === total - 1 ? 'Finish' : selected ? 'Next' : 'Skip'} ›</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Screen>
  );
}

function Choice({
  text,
  isPick,
  isTruth,
  isWrong,
  locked,
  onPress,
}: {
  text: string;
  isPick: boolean;
  isTruth: boolean;
  isWrong: boolean;
  locked: boolean;
  onPress: () => void;
}) {
  if (isTruth) {
    return (
      <View style={[styles.choice, { backgroundColor: colors.goodSoft, borderColor: colors.good }]}>
        <Text style={[styles.choiceText, { color: colors.good }]}>{text}</Text>
        <Text style={{ color: colors.good, fontFamily: font.family.bold }}>✓</Text>
      </View>
    );
  }
  if (isWrong) {
    return (
      <View style={[styles.choice, { backgroundColor: colors.warnSoft, borderColor: colors.warn }]}>
        <Text style={[styles.choiceText, { color: colors.warn }]}>{text}</Text>
        <Text style={{ color: colors.warn, fontFamily: font.family.bold }}>✗</Text>
      </View>
    );
  }
  const inner = isPick ? (
    <LinearGradient colors={gradients.gameGold} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.choice, { borderColor: 'transparent' }, shadow.soft]}>
      <Text style={[styles.choiceText, { color: colors.white }]}>{text}</Text>
      <Text style={{ color: colors.white, fontFamily: font.family.bold }}>✓</Text>
    </LinearGradient>
  ) : (
    <View style={[styles.choice, styles.choicePlain]}>
      <Text style={styles.choiceText}>{text}</Text>
    </View>
  );
  // Once the answer is revealed, the guess is final: render it non-pressable so
  // it cannot be changed after seeing the truth.
  if (locked) return inner;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && { transform: [{ scale: 0.99 }] }]}>
      {inner}
    </Pressable>
  );
}

function ScoreCard({ grad, cap, value, hint }: { grad: readonly [string, string]; cap: string; value: string; hint: string }) {
  return (
    <LinearGradient colors={grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.scoreCard, shadow.card]}>
      <Text style={styles.scoreCap}>{cap}</Text>
      <Text style={styles.scoreVal}>{value}</Text>
      {hint ? <Text style={styles.scoreHint}>{hint}</Text> : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: 20 },
  center: { flex: 1, justifyContent: 'center' },
  controls: { paddingTop: spacing.md },

  segment: { flexDirection: 'row', backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, padding: 4, marginBottom: spacing.lg },
  seg: { flex: 1, paddingVertical: spacing.sm, paddingHorizontal: 4, borderRadius: radius.pill, alignItems: 'center' },
  segOn: { backgroundColor: colors.surface, ...shadow.soft },
  segText: { fontSize: font.size.sm, fontFamily: font.family.semibold, color: colors.textSoft },
  segTextOn: { color: colors.text },

  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  progressTrack: { flex: 1, height: 8, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.gold },
  progressText: { fontSize: font.size.xs, color: colors.textSoft, fontFamily: font.family.bold },

  context: { fontSize: font.size.sm, color: colors.textFaint, fontFamily: font.family.semibold, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.6 },
  question: { fontSize: font.size.xxl, fontFamily: font.family.displaySemi, color: colors.text, textAlign: 'center', marginTop: spacing.sm, letterSpacing: -0.3 },

  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  choicePlain: { backgroundColor: colors.surface, borderColor: colors.border },
  choiceText: { fontSize: font.size.md, fontFamily: font.family.semibold, color: colors.text, flex: 1 },

  reveal: { alignItems: 'center', marginTop: spacing.lg, minHeight: 34 },
  revealPill: { borderRadius: radius.pill, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  revealText: { fontSize: font.size.sm, fontFamily: font.family.semibold, textAlign: 'center' },

  navRow: { flexDirection: 'row', alignItems: 'center' },
  navBtn: { paddingVertical: spacing.md, paddingHorizontal: spacing.sm },
  navText: { fontSize: font.size.md, fontFamily: font.family.semibold, color: colors.textSoft },
  btn: { height: 54, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  btnPrimary: { backgroundColor: colors.gold, ...shadow.soft },
  btnPrimaryText: { color: colors.white, fontFamily: font.family.bold, fontSize: font.size.md, letterSpacing: 0.2 },
  btnGhost: { marginTop: spacing.sm },
  btnGhostText: { color: colors.textSoft, fontFamily: font.family.semibold, fontSize: font.size.md },

  verdict: { fontSize: font.size.xxl, fontFamily: font.family.displaySemi, color: colors.text, textAlign: 'center', marginTop: spacing.md },

  scoreCard: { borderRadius: radius.lg, padding: spacing.xl },
  scoreCap: { color: 'rgba(255,255,255,0.92)', fontSize: font.size.sm, fontFamily: font.family.semibold },
  scoreVal: { color: colors.white, fontSize: 44, fontFamily: font.family.display, marginTop: 4 },
  scoreHint: { color: 'rgba(255,255,255,0.92)', fontSize: font.size.sm, fontFamily: font.family.body, marginTop: 4, lineHeight: 20 },
});
