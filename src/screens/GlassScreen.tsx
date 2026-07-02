// ─────────────────────────────────────────────────────────────────────────
// Through the Glass — the closest two phones can get to touch.
//
// Top half: rest your thumb on the ring. While BOTH of you are holding, both
// screens bloom warm from under your thumbs and both phones hum a soft
// heartbeat haptic — simultaneous touch, felt on both sides. The hold signal
// is a tiny synced doc refreshed every ~2.5s while pressed (release writes 0),
// so it costs almost nothing and needs no new infrastructure.
//
// Bottom half: The Second Heartbeat. Each of you records your own pulse by
// tapping along with it (two fingers on your neck); only the intervals between
// beats are stored — no audio, no health data, just rhythm. Holding the
// partner's circle plays their true rhythm back through the haptic engine.
// Haptics no-op on web via the guarded helpers; the visuals carry it there.
// ─────────────────────────────────────────────────────────────────────────
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader, Body, Button, Card, Muted, Screen, SectionTitle } from '../components/ui';
import { useToast } from '../components/ToastHost';
import { hLight, hMedium, hSuccess } from '../lib/haptics';
import { useNow } from '../lib/useNow';
import { useApp } from '../state/AppContext';
import { colors, font, gradients, radius, shadow, spacing } from '../theme';
import { spring } from '../theme/motion';

/** A partner hold signal is "live" if refreshed within this window. */
const HOLD_FRESH_MS = 6_000;
/** Re-assert my own hold this often while pressed. */
const HOLD_REFRESH_MS = 2_500;

export default function GlassScreen({ navigation }: any) {
  const app = useApp();
  const partner = app.identity?.partnerName ?? 'them';
  const toast = useToast();

  // ── Through the glass ────────────────────────────────────────────────────
  const [holding, setHolding] = useState(false);
  const now = useNow(1_500); // fast tick only while this screen is mounted
  const partnerHolding = !!app.partnerTouchAt && now - app.partnerTouchAt < HOLD_FRESH_MS;
  const together = holding && partnerHolding;
  const partnerHere = app.partnerSeenAt != null && now - app.partnerSeenAt < 2 * 60 * 1000;

  const refreshTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const startHold = () => {
    setHolding(true);
    void app.setTouchHolding(true);
    if (refreshTimer.current) clearInterval(refreshTimer.current);
    refreshTimer.current = setInterval(() => void app.setTouchHolding(true), HOLD_REFRESH_MS);
  };
  const endHold = () => {
    setHolding(false);
    if (refreshTimer.current) {
      clearInterval(refreshTimer.current);
      refreshTimer.current = null;
    }
    void app.setTouchHolding(false);
  };
  // Always release on unmount so a stale "holding" never lingers for the partner.
  useEffect(
    () => () => {
      if (refreshTimer.current) clearInterval(refreshTimer.current);
      void app.setTouchHolding(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Warmth blooms in when you're touching together; a soft heartbeat hum plays
  // for as long as you both hold.
  const warm = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(warm, { toValue: together ? 1 : 0, useNativeDriver: true, ...spring.gentle }).start();
    if (!together) return;
    hSuccess(); // the moment you find each other
    const hum = setInterval(() => hMedium(), 850);
    return () => clearInterval(hum);
  }, [together, warm]);

  const ringStatus = together
    ? `You're touching 🤍`
    : holding
      ? partnerHere
        ? `${partner} is here — waiting for their thumb…`
        : `Holding… ${partner} will feel it when they arrive`
      : partnerHolding
        ? `${partner}'s thumb is on the glass right now`
        : 'Rest your thumb here';

  // ── The second heartbeat ─────────────────────────────────────────────────
  const [recording, setRecording] = useState(false);
  const [taps, setTaps] = useState<number[]>([]);
  const beats = Math.max(0, taps.length - 1);

  const tapBeat = () => {
    hLight();
    setTaps((t) => [...t, Date.now()]);
  };
  const saveRhythm = async () => {
    const intervals = taps.slice(1).map((t, i) => t - taps[i]);
    // Validate locally first so "not enough beats" feedback is instant.
    const plausible = intervals.filter((n) => n >= 250 && n <= 2500);
    if (plausible.length < 4) {
      toast.show('Keep tapping with your pulse a little longer', 2200);
      return;
    }
    // Close optimistically (house pattern: never block a tender moment on the
    // network ack); if the write genuinely fails, reopen with the taps intact.
    const kept = taps;
    setRecording(false);
    setTaps([]);
    hSuccess();
    toast.show(`Your heartbeat is kept for ${partner} 🤍`, 2600);
    const ok = await app.saveHeartbeat(intervals);
    if (!ok) {
      setTaps(kept);
      setRecording(true);
      toast.show("Couldn't save — check your connection and try again", 2400);
    }
  };

  return (
    <Screen scroll>
      <AppHeader
        title="Through the Glass"
        subtitle="Touch, from wherever you are"
        onBack={() => navigation.goBack()}
      />

      {/* ── The glass ── */}
      <View style={styles.glassWrap}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: warm }]}>
          <LinearGradient colors={gradients.ambientHere} style={StyleSheet.absoluteFill} />
        </Animated.View>

        <Pressable
          onPressIn={startHold}
          onPressOut={endHold}
          accessibilityRole="button"
          accessibilityLabel="Rest your thumb here"
          style={styles.ringTap}
        >
          <ThumbRing holding={holding} together={together} partnerWaiting={partnerHolding && !holding} />
        </Pressable>

        <Text style={[styles.ringStatus, together && { color: colors.primaryDark }]}>{ringStatus}</Text>
        {partnerHere && !together ? (
          <Muted style={{ textAlign: 'center', marginTop: spacing.xs }}>
            {partner} is in the app right now 💚
          </Muted>
        ) : null}
      </View>

      {/* ── The second heartbeat ── */}
      <SectionTitle>The second heartbeat</SectionTitle>

      {app.partnerHeartbeat ? (
        <HeartbeatOrb
          label={`Hold to feel ${partner}'s heartbeat`}
          intervals={app.partnerHeartbeat.intervals}
          photo={app.partnerProfile?.image}
        />
      ) : (
        <Card>
          <Muted>
            {partner} hasn't recorded their heartbeat yet. Yours can be waiting for them when they
            do. 🤍
          </Muted>
        </Card>
      )}

      <View style={{ height: spacing.md }} />

      {recording ? (
        <Card tone="rose">
          <Body style={{ fontFamily: font.family.semibold }}>
            Two fingers on your neck. Tap with every beat you feel.
          </Body>
          <Pressable onPress={tapBeat} style={styles.tapPad} accessibilityRole="button" accessibilityLabel="Tap with your pulse">
            <Text style={styles.tapPadHeart}>🤍</Text>
            <Text style={styles.tapPadCount}>{beats === 0 ? 'tap…' : `${beats} beat${beats === 1 ? '' : 's'}`}</Text>
          </Pressable>
          <Button label="Keep this rhythm" disabled={beats < 5} onPress={saveRhythm} />
          <View style={{ height: spacing.sm }} />
          <Button label="Cancel" variant="ghost" onPress={() => { setRecording(false); setTaps([]); }} />
        </Card>
      ) : (
        <Card
          onPress={() => { setRecording(true); setTaps([]); }}
          tone={app.myHeartbeat ? 'surface' : 'violet'}
        >
          <Body style={{ fontFamily: font.family.semibold }}>
            {app.myHeartbeat ? 'Your heartbeat is kept 🤍' : `Leave your heartbeat for ${partner}`}
          </Body>
          <Muted style={{ marginTop: 4 }}>
            {app.myHeartbeat
              ? 'Tap to record it again — rhythms change with seasons.'
              : 'Tap along with your pulse for a few seconds; they can hold it whenever they miss you.'}
          </Muted>
        </Card>
      )}
    </Screen>
  );
}

/** The thumbprint ring: breathes while waiting, glows when together. */
function ThumbRing({ holding, together, partnerWaiting }: { holding: boolean; together: boolean; partnerWaiting: boolean }) {
  const breathe = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 1600, useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 1600, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breathe]);
  const scale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, holding || partnerWaiting ? 1.08 : 1.03] });
  const ringColor = together ? colors.primary : partnerWaiting ? colors.good : colors.border;
  return (
    <Animated.View style={[styles.ring, { borderColor: ringColor, transform: [{ scale }] }]}>
      <View style={[styles.ringInner, together && { backgroundColor: colors.primarySoft }]} />
    </Animated.View>
  );
}

/** Hold to play the partner's true rhythm — visual pulse + haptic thumps. */
function HeartbeatOrb({ label, intervals, photo }: { label: string; intervals: number[]; photo?: string | null }) {
  const scale = useRef(new Animated.Value(1)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [feeling, setFeeling] = useState(false);

  const beatOnce = () => {
    hMedium();
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.16, useNativeDriver: true, ...spring.snappy }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, ...spring.gentle }),
    ]).start();
  };
  const playFrom = (idx: number) => {
    const safe = intervals.filter((n) => typeof n === 'number' && n >= 250 && n <= 2500);
    if (safe.length === 0) return;
    beatOnce();
    timer.current = setTimeout(() => playFrom((idx + 1) % safe.length), safe[idx % safe.length]);
  };
  const start = () => {
    setFeeling(true);
    playFrom(0);
  };
  const stop = () => {
    setFeeling(false);
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return (
    <Pressable
      onPressIn={start}
      onPressOut={stop}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.orbCard, shadow.card, pressed && { opacity: 0.96 }]}
    >
      <Animated.View style={[styles.orb, { transform: [{ scale }] }]}>
        {photo ? (
          <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
        ) : (
          <LinearGradient colors={gradients.primary} style={StyleSheet.absoluteFill} />
        )}
      </Animated.View>
      <View style={{ flex: 1 }}>
        <Body style={{ fontFamily: font.family.semibold }}>{label}</Body>
        <Muted style={{ marginTop: 2 }}>{feeling ? 'that rhythm is really theirs…' : 'press and hold, close your eyes'}</Muted>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  glassWrap: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)', // light-catching rim
    ...shadow.card,
  },
  ringTap: { padding: spacing.lg },
  ring: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surfaceAlt,
  },
  ringStatus: {
    marginTop: spacing.md,
    fontFamily: font.family.displaySemi,
    fontSize: font.size.lg,
    color: colors.text,
    textAlign: 'center',
    letterSpacing: font.tracking.heading,
  },

  orbCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg + spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(90,46,64,0.06)',
  },
  orb: { width: 54, height: 54, borderRadius: 27, overflow: 'hidden' },

  tapPad: {
    marginVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    borderWidth: 1.5,
    borderColor: colors.primarySoft,
  },
  tapPadHeart: { fontSize: 40 },
  tapPadCount: { marginTop: spacing.sm, color: colors.textSoft, fontFamily: font.family.semibold },
});
