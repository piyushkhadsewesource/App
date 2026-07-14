// ─────────────────────────────────────────────────────────────────────────
// Our Knock — the card that records and plays haptic signatures. Recording:
// tap your knock on the door pad, exactly how you'd knock on their real
// door. Playback: the phone knocks the way THEY knock (medium haptic per
// tap on Android; the ripple carries the rhythm visually everywhere, which
// is the whole story on the iOS PWA). When hugs are waiting, their knock
// plays once on arrival: their hand at your door.
// ─────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { intervalsFromTaps, KNOCK_MIN_TAPS, playKnock, validKnock } from '../lib/knock';
import { hMedium } from '../lib/haptics';
import { useApp } from '../state/AppContext';
import { colors, font, radius, spacing } from '../theme';
import { easeOut, prefersReducedMotion } from '../theme/motion';
import { useToast } from './ToastHost';
import { Button, Card, Muted, Title } from './ui';

export default function KnockCard() {
  const app = useApp();
  const toast = useToast();
  const partner = app.identity?.partnerName ?? 'them';
  const [recording, setRecording] = useState(false);
  const tapsRef = useRef<number[]>([]);
  const [tapCount, setTapCount] = useState(0);
  const [ripple, setRipple] = useState(0); // increments per played tap
  const cancelRef = useRef<(() => void) | null>(null);
  useEffect(() => () => cancelRef.current?.(), []);

  // Their knock arrives WITH their hugs: play it once when the card mounts
  // while something of theirs is waiting.
  const hasUnseen = app.pings.some((p) => p.fromId !== app.meId && !p.seenAt);
  const playedOnArrival = useRef(false);
  useEffect(() => {
    if (playedOnArrival.current || !hasUnseen) return;
    const k = app.partnerKnock;
    if (!k || !validKnock(k.intervals)) return;
    playedOnArrival.current = true;
    const id = setTimeout(() => {
      cancelRef.current?.();
      cancelRef.current = playKnock(k.intervals, () => setRipple((r) => r + 1));
    }, 700);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUnseen, app.partnerKnock]);

  const startRecording = () => {
    tapsRef.current = [];
    setTapCount(0);
    setRecording(true);
  };
  const recordTap = () => {
    if (!recording) return;
    tapsRef.current.push(Date.now());
    setTapCount(tapsRef.current.length);
    hMedium();
    setRipple((r) => r + 1);
  };
  const saveRecording = async () => {
    const taps = tapsRef.current;
    setRecording(false);
    if (taps.length < KNOCK_MIN_TAPS) {
      toast.show('A knock needs at least two taps 🤍', 2200);
      return;
    }
    const ok = await app.saveKnock(intervalsFromTaps(taps));
    toast.show(ok ? `That's your knock now. ${partner} will feel it 🤍` : "Couldn't save it. Try again in a moment", 2600);
  };
  const playTheirs = () => {
    const k = app.partnerKnock;
    if (!k || !validKnock(k.intervals)) return;
    cancelRef.current?.();
    cancelRef.current = playKnock(k.intervals, () => setRipple((r) => r + 1));
  };
  const playMine = () => {
    const k = app.myKnock;
    if (!k || !validKnock(k.intervals)) return;
    cancelRef.current?.();
    cancelRef.current = playKnock(k.intervals, () => setRipple((r) => r + 1));
  };

  return (
    <Card style={{ marginTop: spacing.lg }}>
      <Title>Our knock</Title>
      <Muted style={{ marginTop: 2 }}>
        {app.partnerKnock
          ? `Everyone knocks differently. This is how ${partner} knocks on your door.`
          : `Record how you knock on a door, and ${partner}'s phone will knock your way.`}
      </Muted>

      {/* The door */}
      <Pressable
        onPress={recordTap}
        disabled={!recording}
        accessibilityRole="button"
        accessibilityLabel={recording ? 'Tap your knock' : 'The door'}
        style={[styles.door, recording && styles.doorRecording]}
      >
        <RippleBurst pulse={ripple} />
        <Text style={styles.doorEmoji}>{recording ? '✊' : '🚪'}</Text>
        {recording ? (
          <Text style={styles.doorHint}>
            {tapCount === 0 ? 'Knock, exactly how you would' : `${tapCount} tap${tapCount === 1 ? '' : 's'}`}
          </Text>
        ) : null}
      </Pressable>

      {recording ? (
        <Button label="That's my knock" onPress={saveRecording} />
      ) : (
        <View style={{ gap: spacing.sm }}>
          {app.partnerKnock && validKnock(app.partnerKnock.intervals) ? (
            <Button label={`Feel ${partner}'s knock`} onPress={playTheirs} />
          ) : null}
          <Button
            label={app.myKnock ? 'Re-record my knock' : 'Record my knock'}
            variant="soft"
            onPress={startRecording}
          />
          {app.myKnock && validKnock(app.myKnock.intervals) ? (
            <Button label="Hear my own knock back" variant="ghost" onPress={playMine} />
          ) : null}
        </View>
      )}
    </Card>
  );
}

/** One ripple ring per knock-tap, expanding out of the door and fading. */
function RippleBurst({ pulse }: { pulse: number }) {
  const v = useRef(new Animated.Value(1)).current;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    v.setValue(0);
    Animated.timing(v, {
      toValue: 1,
      duration: prefersReducedMotion() ? 1 : 420,
      easing: easeOut,
      useNativeDriver: true,
    }).start();
  }, [pulse, v]);
  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1.5] });
  const opacity = v.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.55, 0] });
  return (
    <Animated.View pointerEvents="none" style={[styles.ripple, { opacity, transform: [{ scale }] }]} />
  );
}

const styles = StyleSheet.create({
  door: {
    alignSelf: 'center',
    width: 120,
    height: 120,
    borderRadius: 60,
    marginTop: spacing.lg,
    marginBottom: spacing.xl + spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
    overflow: 'visible',
  },
  doorRecording: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  doorEmoji: { fontSize: 40 },
  doorHint: {
    position: 'absolute',
    bottom: -24,
    fontSize: font.size.xs,
    fontFamily: font.family.semibold,
    color: colors.textSoft,
    width: 220,
    textAlign: 'center',
  },
  ripple: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: colors.primary,
  },
});
