// ─────────────────────────────────────────────────────────────────────────
// Tonight's Reveal — the daily blind-answer ritual.
//
// The loop: one shared question a day; you answer without seeing theirs; the
// moment both answers exist, a sealed envelope waits, and you HOLD it to break
// the seal. The hold is deliberately heavy (Emil's asymmetric timing: slow,
// building press with quickening haptics → a weighty spring split on release),
// because the reveal IS the ritual. Answers live as ordinary deck responses
// (promptId `daily-YYYY-MM-DD`) — the blindness is a UI contract, enforced by
// never rendering the partner's answer until yours exists.
// ─────────────────────────────────────────────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader, Avatar, Body, Button, Card, Field, Muted, Screen } from '../components/ui';
import { useToast } from '../components/ToastHost';
import { todayISO } from '../lib/date';
import { hLight, hMedium, hSuccess } from '../lib/haptics';
import { questionForDate, revealAnswers, revealPromptId } from '../lib/reveal';
import { useApp } from '../state/AppContext';
import { colors, font, radius, shadow, spacing } from '../theme';
import { spring } from '../theme/motion';

const HOLD_MS = 1100; // how long the seal resists

export default function RevealScreen({ navigation }: any) {
  const app = useApp();
  const partner = app.identity?.partnerName ?? 'them';
  const toast = useToast();
  const today = todayISO();
  const question = questionForDate(today);
  const { mine, theirs } = useMemo(
    () => revealAnswers(app.deck, today, app.meId),
    [app.deck, today, app.meId],
  );

  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  // Has the envelope been opened on this device for today's prompt?
  const openedKey = `@tether/revealOpened/${revealPromptId(today)}`;
  const [opened, setOpened] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(openedKey)
      .then((v) => alive && setOpened(v === '1'))
      .catch(() => alive && setOpened(false));
    return () => {
      alive = false;
    };
  }, [openedKey]);

  async function seal() {
    const a = draft.trim();
    if (!a || saving) return;
    setSaving(true);
    hMedium();
    const ok = await app.addDeckResponse(revealPromptId(today), question, a);
    setSaving(false);
    if (ok) {
      setDraft('');
      toast.show(theirs ? 'Sealed. Now open theirs 🤍' : `Sealed until ${partner} answers 🤍`, 2600);
    } else {
      toast.show("Couldn't seal it — check your connection and try again", 2400);
    }
  }

  function markOpened() {
    setOpened(true);
    AsyncStorage.setItem(openedKey, '1').catch(() => {});
  }

  const react = (emoji: string) => {
    hSuccess();
    toast.show(`Sent ${emoji} to ${partner}`, 2000);
    void app.sendPing('thinking', `${emoji} to your answer tonight`);
  };

  const state: 'answer' | 'waiting' | 'sealed' | 'open' = !mine
    ? 'answer'
    : !theirs
      ? 'waiting'
      : opened
        ? 'open'
        : 'sealed';

  return (
    <Screen scroll>
      <AppHeader title="Tonight's Reveal" subtitle="One question. Two sealed answers." onBack={() => navigation.goBack()} />

      {/* The question, always the headline of the ritual */}
      <View style={styles.qCard}>
        <Text style={styles.qKicker}>Tonight</Text>
        <Text style={styles.qText}>{question}</Text>
      </View>

      {state === 'answer' ? (
        <Card>
          {theirs ? (
            <View style={styles.teaseRow}>
              <Avatar name={partner} size={26} uri={app.partnerProfile?.image} color={colors.accent} />
              <Muted style={{ flex: 1 }}>
                {partner} has already answered. Their words unlock the moment you seal yours.
              </Muted>
            </View>
          ) : (
            <Muted style={{ marginBottom: spacing.sm }}>
              {partner} can't see your answer until they've written theirs. Be honest — that's the point.
            </Muted>
          )}
          <Field
            value={draft}
            onChangeText={setDraft}
            placeholder="Write it the way you'd whisper it…"
            multiline
          />
          <Button label={saving ? 'Sealing…' : '✉️  Seal my answer'} disabled={!draft.trim() || saving} onPress={seal} />
        </Card>
      ) : null}

      {state === 'waiting' ? (
        <Card tone="violet">
          <Body style={{ fontFamily: font.family.semibold }}>Yours is sealed 🤍</Body>
          <Muted style={{ marginTop: 4 }}>
            The envelope opens for both of you the moment {partner} answers. No peeking — for either of you.
          </Muted>
          <Muted style={{ marginTop: spacing.sm, fontStyle: 'italic' }}>"{mine?.answer}"</Muted>
        </Card>
      ) : null}

      {state === 'sealed' && opened !== null ? (
        <SealedEnvelope partnerName={partner} onOpened={markOpened} />
      ) : null}

      {state === 'open' ? (
        <>
          <AnswerCard
            name={partner}
            photo={app.partnerProfile?.image}
            color={colors.accent}
            text={theirs?.answer ?? ''}
            tone="violet"
          />
          <View style={{ height: spacing.md }} />
          <AnswerCard
            name={app.identity?.name ?? 'You'}
            photo={app.myProfile?.image}
            color={colors.primary}
            text={mine?.answer ?? ''}
            tone="rose"
          />
          <View style={styles.reactRow}>
            {['🤍', '🥺', '😂', '😳'].map((e) => (
              <Pressable
                key={e}
                onPress={() => react(e)}
                accessibilityRole="button"
                accessibilityLabel={`React ${e}`}
                style={({ pressed }) => [styles.reactBtn, pressed && { transform: [{ scale: 0.9 }] }]}
              >
                <Text style={{ fontSize: 24 }}>{e}</Text>
              </Pressable>
            ))}
          </View>
          <Muted style={{ textAlign: 'center', marginTop: spacing.sm }}>
            A new question arrives at midnight. 🤍
          </Muted>
        </>
      ) : null}
    </Screen>
  );
}

/**
 * The sealed envelope: hold to break the seal. Pressing charges it slowly
 * (scale creeps, haptics quicken like a pulse); a full hold splits it with a
 * heavy spring. Letting go early lets it settle back, unhurt.
 */
function SealedEnvelope({ partnerName, onOpened }: { partnerName: string; onOpened: () => void }) {
  const charge = useRef(new Animated.Value(0)).current;
  const chargedRef = useRef(false);
  const hapticTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gapRef = useRef(300);

  const stopHaptics = () => {
    if (hapticTimer.current) {
      clearTimeout(hapticTimer.current);
      hapticTimer.current = null;
    }
  };
  const pulse = () => {
    hLight();
    gapRef.current = Math.max(90, gapRef.current * 0.82); // quickening heartbeat
    hapticTimer.current = setTimeout(pulse, gapRef.current);
  };

  const start = () => {
    chargedRef.current = false;
    gapRef.current = 300;
    pulse();
    Animated.timing(charge, {
      toValue: 1,
      duration: HOLD_MS,
      easing: Easing.in(Easing.quad), // resists at first, gives at the end
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) chargedRef.current = true;
    });
  };
  const release = () => {
    stopHaptics();
    if (chargedRef.current) {
      hSuccess();
      onOpened(); // parent swaps to the open state; the spring lives there
    } else {
      Animated.spring(charge, { toValue: 0, useNativeDriver: true, ...spring.snappy }).start();
    }
  };
  useEffect(() => stopHaptics, []);

  return (
    <Pressable
      onPressIn={start}
      onPressOut={release}
      accessibilityRole="button"
      accessibilityLabel="Hold to open the envelope"
    >
      <Animated.View
        style={[
          styles.envelope,
          shadow.card,
          {
            transform: [
              { scale: charge.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) },
              { rotate: charge.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-2deg'] }) },
            ],
          },
        ]}
      >
        <Text style={{ fontSize: 44 }}>✉️</Text>
        <Text style={styles.envTitle}>{partnerName}'s answer is inside</Text>
        <Text style={styles.envSub}>press and hold to break the seal</Text>
        <View style={styles.envTrack}>
          <Animated.View
            style={[
              styles.envFill,
              {
                transform: [
                  { translateX: charge.interpolate({ inputRange: [0, 1], outputRange: [-72, 0] }) },
                ],
              },
            ]}
          />
        </View>
      </Animated.View>
    </Pressable>
  );
}

/** One partner's answer, arriving with a heavy, satisfying spring. */
function AnswerCard({
  name,
  photo,
  color,
  text,
  tone,
}: {
  name: string;
  photo?: string | null;
  color: string;
  text: string;
  tone: 'rose' | 'violet';
}) {
  const rise = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    // Heavy mass feel: low tension, real weight, a touch of overshoot.
    Animated.spring(rise, { toValue: 1, tension: 120, friction: 13, useNativeDriver: true }).start();
  }, [rise]);
  return (
    <Animated.View
      style={[
        styles.answerCard,
        tone === 'violet' ? { backgroundColor: colors.accentSoft } : { backgroundColor: colors.primarySoft },
        shadow.soft,
        {
          opacity: rise,
          transform: [
            { translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [26, 0] }) },
            { scale: rise.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
          ],
        },
      ]}
    >
      <View style={styles.answerHead}>
        <Avatar name={name} size={26} uri={photo} color={color} />
        <Text style={[styles.answerWho, { color }]}>{name}</Text>
      </View>
      <Text style={styles.answerText}>"{text}"</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  qCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    ...shadow.card,
  },
  qKicker: {
    fontSize: font.size.sm,
    fontFamily: font.family.semibold,
    color: colors.primaryDark,
    marginBottom: spacing.xs,
    letterSpacing: font.tracking.label,
  },
  qText: {
    fontSize: font.size.xl + 2,
    lineHeight: 32,
    fontFamily: font.family.displaySemi,
    color: colors.text,
    letterSpacing: font.tracking.heading,
  },

  teaseRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },

  envelope: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(232,99,140,0.25)',
  },
  envTitle: {
    marginTop: spacing.md,
    fontSize: font.size.lg,
    fontFamily: font.family.displaySemi,
    color: colors.text,
    letterSpacing: font.tracking.heading,
    textAlign: 'center',
  },
  envSub: { marginTop: 4, fontSize: font.size.sm, color: colors.textSoft, fontFamily: font.family.body },
  envTrack: {
    marginTop: spacing.lg,
    width: 72,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  envFill: { width: 72, height: 6, borderRadius: radius.pill, backgroundColor: colors.primary },

  answerCard: { borderRadius: radius.lg, padding: spacing.lg + spacing.xs },
  answerHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  answerWho: { fontSize: font.size.xs, fontFamily: font.family.bold, textTransform: 'uppercase', letterSpacing: font.tracking.caps },
  answerText: { fontSize: font.size.lg, lineHeight: 27, fontFamily: font.family.displaySemi, color: colors.text, letterSpacing: font.tracking.heading },

  reactRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.md, marginTop: spacing.lg },
  reactBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.soft,
  },
});
