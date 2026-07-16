// ─────────────────────────────────────────────────────────────────────────
// The secret-knock seal. When something is waiting in the Time Capsule and
// the partner has a recorded knock, the capsule asks you to answer it: their
// rhythm plays (haptics + ripples), you knock it back, and recognition opens
// the gift. Matching is generous (rhythm, never precision), and "just open
// it" is always one tap away: a feeling is never locked behind a game.
// ─────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { hSuccess, hWarn } from '../lib/haptics';
import { matchKnock, playKnock, validKnock } from '../lib/knock';
import { colors, font, spacing } from '../theme';
import { easeOut } from '../theme/motion';
import { RippleBurst } from './KnockCard';
import Sheet from './Sheet';
import { Button, Muted } from './ui';

const ANSWER_SETTLE_MS = 1500; // silence after your last tap = your answer is in

export default function KnockSeal({
  visible,
  partnerName,
  intervals,
  onSuccess,
  onSkip,
  onClose,
}: {
  visible: boolean;
  partnerName: string;
  /** The partner's knock signature (validated by the caller). */
  intervals: number[];
  onSuccess: () => void;
  onSkip: () => void;
  onClose: () => void;
}) {
  const [ripple, setRipple] = useState(0);
  const [phase, setPhase] = useState<'listen' | 'answer' | 'wrong'>('listen');
  const tapsRef = useRef<number[]>([]);
  const cancelRef = useRef<(() => void) | null>(null);
  const settleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shake = useRef(new Animated.Value(0)).current;

  const stopAll = () => {
    cancelRef.current?.();
    cancelRef.current = null;
    if (settleRef.current) clearTimeout(settleRef.current);
    settleRef.current = null;
  };
  useEffect(() => stopAll, []);

  const playTheirs = () => {
    if (!validKnock(intervals)) return;
    stopAll();
    setPhase('listen');
    tapsRef.current = [];
    cancelRef.current = playKnock(intervals, () => setRipple((r) => r + 1));
    const total = intervals.reduce((a, b) => a + b, 0);
    settleRef.current = setTimeout(() => setPhase('answer'), total + 600);
  };

  // Their knock introduces itself when the seal appears.
  useEffect(() => {
    if (!visible) {
      stopAll();
      return;
    }
    const id = setTimeout(playTheirs, 600);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const evaluate = () => {
    if (matchKnock(intervals, tapsRef.current)) {
      hSuccess();
      stopAll();
      onSuccess();
    } else {
      hWarn();
      setPhase('wrong');
      tapsRef.current = [];
      shake.setValue(0);
      Animated.sequence([
        Animated.timing(shake, { toValue: 1, duration: 55, useNativeDriver: true }),
        Animated.timing(shake, { toValue: -1, duration: 55, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 1, duration: 55, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 0, duration: 55, easing: easeOut, useNativeDriver: true }),
      ]).start();
    }
  };

  const answerTap = () => {
    if (phase === 'listen') return; // let their knock finish first
    if (phase === 'wrong') setPhase('answer');
    tapsRef.current.push(Date.now());
    setRipple((r) => r + 1);
    if (settleRef.current) clearTimeout(settleRef.current);
    // The full tap-count answers immediately; otherwise silence settles it.
    if (tapsRef.current.length >= intervals.length + 1) {
      settleRef.current = setTimeout(evaluate, 350);
    } else {
      settleRef.current = setTimeout(evaluate, ANSWER_SETTLE_MS);
    }
  };

  return (
    <Sheet visible={visible} onClose={() => { stopAll(); onClose(); }}>
      <Text style={styles.title}>Answer {partnerName}'s knock</Text>
      <Muted style={{ marginTop: 2 }}>
        {phase === 'listen'
          ? 'Listen… this is how they knock.'
          : phase === 'wrong'
            ? 'Not quite their rhythm. Try again, or listen once more.'
            : 'Now knock it back to open what they left you.'}
      </Muted>

      <Animated.View
        style={{ transform: [{ translateX: shake.interpolate({ inputRange: [-1, 1], outputRange: [-8, 8] }) }] }}
      >
        <Pressable
          onPress={answerTap}
          accessibilityRole="button"
          accessibilityLabel="Knock here"
          style={[styles.door, phase !== 'listen' && styles.doorReady]}
        >
          <RippleBurst pulse={ripple} />
          <Text style={{ fontSize: 40 }}>🚪</Text>
        </Pressable>
      </Animated.View>

      <View style={{ gap: spacing.sm }}>
        <Button label="Hear it again" variant="soft" onPress={playTheirs} />
        <Button label="Just open it 🤍" variant="ghost" onPress={() => { stopAll(); onSkip(); }} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  // The seal asks in the house voice.
  title: {
    fontSize: font.size.xl,
    lineHeight: 28,
    fontFamily: font.family.displaySemi,
    color: colors.text,
    letterSpacing: font.tracking.heading,
  },
  door: {
    alignSelf: 'center',
    width: 120,
    height: 120,
    borderRadius: 60,
    marginVertical: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  doorReady: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
});
