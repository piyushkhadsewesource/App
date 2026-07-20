// ─────────────────────────────────────────────────────────────────────────
// Through the Glass — the closest two phones can get to touch.
//
// The top of the screen IS the glass: a full pane you rest your thumb on,
// anywhere. Your warmth blooms exactly under your finger; your partner's
// presses through from the other side. While BOTH of you are holding, the
// pane glows warm, a seconds-together count etches into the glass, and both
// phones thump a lub-dub heartbeat — at the partner's REAL recorded rhythm
// when they've left one below, a calm default when they haven't. The hold
// signal is a tiny synced doc refreshed every ~2.5s while pressed (release
// writes 0), so it costs almost nothing and needs no new infrastructure.
//
// Bottom half: The Second Heartbeat. Each of you records your own pulse by
// tapping along with it (two fingers on your neck); only the intervals
// between beats are stored — no audio, no health data, just rhythm. Holding
// the partner's orb plays their true rhythm back through the haptic engine.
// Haptics no-op on web via the guarded helpers; the visuals carry it there.
// ─────────────────────────────────────────────────────────────────────────
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import { AppHeader, Body, Button, Card, Muted, Screen, SectionTitle } from '../components/ui';
import { useToast } from '../components/ToastHost';
import { formatRelative } from '../lib/date';
import { hLight, hMedium, hSuccess } from '../lib/haptics';
import { useNow } from '../lib/useNow';
import { useApp } from '../state/AppContext';
import { colors, font, gradients, radius, shadow, spacing } from '../theme';
import { easeOut, spring, useReducedMotion } from '../theme/motion';

/** A partner hold signal is "live" if refreshed within this window. */
const HOLD_FRESH_MS = 6_000;
/** Re-assert my own hold this often while pressed. */
const HOLD_REFRESH_MS = 2_500;
/** Diameter of the warmth bloom that follows my finger. */
const BLOOM = 150;

/** Humanly-plausible beat gaps only, or null when there's nothing usable. */
function plausibleIntervals(arr?: number[] | null): number[] | null {
  const safe = (arr ?? []).filter((n) => typeof n === 'number' && n >= 250 && n <= 2500);
  return safe.length >= 2 ? safe : null;
}

/** Median-based beats-per-minute — robust against one mistimed tap. */
function bpmOf(intervals: number[]): number | null {
  if (intervals.length === 0) return null;
  const sorted = [...intervals].sort((a, b) => a - b);
  return Math.round(60_000 / sorted[Math.floor(sorted.length / 2)]);
}

export default function GlassScreen({ navigation }: any) {
  const app = useApp();
  const partner = app.identity?.partnerName ?? 'them';
  const toast = useToast();
  const reduceMotion = useReducedMotion();
  const { height: winH } = useWindowDimensions();
  const paneH = Math.max(320, Math.min(430, Math.round(winH * 0.48)));

  // ── Through the glass ────────────────────────────────────────────────────
  const [holding, setHolding] = useState(false);
  const now = useNow(1_000); // fast tick only while this screen is mounted
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

  // My warmth follows my actual finger: position via setValue (works on
  // native-driven nodes), presence via a spring on `bloom`.
  const pos = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const bloom = useRef(new Animated.Value(0)).current;
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const rippleSeq = useRef(0);

  const grant = (x: number, y: number) => {
    pos.setValue({ x, y });
    Animated.spring(bloom, { toValue: 1, useNativeDriver: true, ...spring.gentle }).start();
    if (!reduceMotion) {
      const id = ++rippleSeq.current;
      setRipples((r) => [...r.slice(-3), { id, x, y }]);
    }
    startHold();
  };
  const release = () => {
    Animated.spring(bloom, { toValue: 0, useNativeDriver: true, ...spring.gentle }).start();
    endHold();
  };

  // Warmth blooms in when you're touching together, and the glass beats a
  // lub-dub for as long as you both hold — at their true recorded rhythm when
  // they've left one, a calm resting default when they haven't.
  const warm = useRef(new Animated.Value(0)).current;
  const beatV = useRef(new Animated.Value(1)).current; // 1 = halo faded out
  const partnerRhythm = useMemo(
    () => plausibleIntervals(app.partnerHeartbeat?.intervals),
    [app.partnerHeartbeat],
  );
  useEffect(() => {
    Animated.spring(warm, { toValue: together ? 1 : 0, useNativeDriver: true, ...spring.gentle }).start();
    if (!together) return;
    hSuccess(); // the moment you find each other
    let dub: ReturnType<typeof setTimeout> | null = null;
    let next: ReturnType<typeof setTimeout> | null = null;
    let idx = 0;
    const beat = () => {
      hMedium();
      dub = setTimeout(() => hLight(), 140); // …the second half of the lub-dub
      beatV.setValue(0);
      Animated.timing(beatV, { toValue: 1, duration: 700, easing: easeOut, useNativeDriver: true }).start();
      const gap = partnerRhythm ? partnerRhythm[idx++ % partnerRhythm.length] : 880;
      next = setTimeout(beat, Math.min(2_000, Math.max(450, gap)));
    };
    beat();
    return () => {
      if (dub) clearTimeout(dub);
      if (next) clearTimeout(next);
    };
  }, [together, partnerRhythm, warm, beatV]);

  // Seconds together: counted honestly from the moment both thumbs met. Long
  // holds get their number back as a small keepsake toast on release.
  const togetherSinceRef = useRef<number | null>(null);
  useEffect(() => {
    if (!together) return;
    togetherSinceRef.current = Date.now();
    return () => {
      const startedAt = togetherSinceRef.current;
      togetherSinceRef.current = null;
      const s = startedAt ? Math.round((Date.now() - startedAt) / 1000) : 0;
      if (s >= 10) toast.show(`${s} seconds together 🤍`, 2600);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [together]);
  const togetherFor =
    together && togetherSinceRef.current != null
      ? Math.max(0, Math.floor((now - togetherSinceRef.current) / 1000))
      : 0;

  const ringStatus = together
    ? `You're touching 🤍`
    : holding
      ? partnerHere
        ? `${partner} is here, waiting for their thumb…`
        : `Holding… ${partner} will feel it when they arrive`
      : partnerHolding
        ? `${partner}'s thumb is on the glass right now`
        : 'Rest your thumb anywhere on the glass';

  // ── The second heartbeat ─────────────────────────────────────────────────
  const [recording, setRecording] = useState(false);
  const [taps, setTaps] = useState<number[]>([]);
  const beats = Math.max(0, taps.length - 1);
  const liveBpm = useMemo(() => {
    const intervals = plausibleIntervals(taps.slice(1).map((t, i) => t - taps[i]));
    return intervals && intervals.length >= 3 ? bpmOf(intervals) : null;
  }, [taps]);

  // Each tap answers back: a ring blooms off the heart and the heart pops.
  const tapPulse = useRef(new Animated.Value(1)).current;
  const tapHeart = useRef(new Animated.Value(1)).current;
  const tapBeat = () => {
    hLight();
    setTaps((t) => [...t, Date.now()]);
    tapPulse.setValue(0);
    Animated.timing(tapPulse, { toValue: 1, duration: 500, easing: easeOut, useNativeDriver: true }).start();
    Animated.sequence([
      Animated.spring(tapHeart, { toValue: 1.18, useNativeDriver: true, ...spring.snappy }),
      Animated.spring(tapHeart, { toValue: 1, useNativeDriver: true, ...spring.gentle }),
    ]).start();
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
      toast.show("Couldn't save. Check your connection and try again", 2400);
    }
  };

  return (
    <Screen scroll>
      <AppHeader
        title="Through the Glass"
        subtitle="Touch, from wherever you are"
        onBack={() => navigation.goBack()}
      />

      {/* ── The glass: a full pane, touch it anywhere ── */}
      <View style={[styles.pane, { height: paneH }]}>
        {/* Ambient atmosphere: their side breathes violet from above, yours
            rose from below, so the glass is alive before either thumb lands. */}
        <AmbientPool color={colors.accentSoft} size={210} delay={1800} reduce={reduceMotion} style={{ top: -36 }} />
        <AmbientPool color={colors.primarySoft} size={240} delay={0} reduce={reduceMotion} style={{ bottom: -56 }} />

        {/* Warmth when you're touching together */}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: warm }]}>
          <LinearGradient colors={gradients.ambientHere} style={StyleSheet.absoluteFill} />
        </Animated.View>

        {/* Their thumb, pressing through from the other side of the glass */}
        <PartnerBloom visible={partnerHolding} reduce={reduceMotion} />

        {/* One halo per heartbeat while you're touching */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.beatHalo,
            {
              opacity: beatV.interpolate({ inputRange: [0, 0.12, 1], outputRange: [0, 0.5, 0] }),
              transform: [{ scale: beatV.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1.5] }) }],
            },
          ]}
        />

        {/* The quiet invitation; it steps aside once your thumb is the ring */}
        <InviteRing holding={holding} partnerWaiting={partnerHolding && !holding} reduce={reduceMotion} />

        {/* My warmth, exactly under my finger */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.myBloom,
            {
              opacity: bloom,
              transform: [
                { translateX: Animated.subtract(pos.x, BLOOM / 2) },
                { translateY: Animated.subtract(pos.y, BLOOM / 2) },
                { scale: bloom.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) },
              ],
            },
          ]}
        >
          <View style={styles.myBloomCore} />
        </Animated.View>

        {ripples.map((r) => (
          <Ripple key={r.id} x={r.x} y={r.y} onDone={() => setRipples((rs) => rs.filter((q) => q.id !== r.id))} />
        ))}

        <View pointerEvents="none" style={styles.togetherCountWrap}>
          {togetherFor >= 3 ? (
            <Text style={styles.togetherCount}>
              {togetherFor >= 60 ? 'more than a minute. stay.' : `${togetherFor} seconds, skin to glass`}
            </Text>
          ) : null}
        </View>

        {/* Touch capture: the whole pane responds, and refuses to let the
            scroll view steal a resting thumb mid-hold. */}
        <View
          style={StyleSheet.absoluteFill}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Rest your thumb on the glass"
          onStartShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
          onResponderGrant={(e) => grant(e.nativeEvent.locationX, e.nativeEvent.locationY)}
          onResponderMove={(e) => pos.setValue({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY })}
          onResponderRelease={release}
          onResponderTerminate={release}
        />
      </View>

      <Text style={[styles.ringStatus, together && { color: colors.primaryDark }]}>{ringStatus}</Text>
      {together && partnerRhythm ? (
        <Muted style={styles.underStatus}>the pulse you feel is really theirs</Muted>
      ) : partnerHere && !together ? (
        <Muted style={styles.underStatus}>{partner} is in the app right now 💚</Muted>
      ) : null}

      {/* ── The second heartbeat ── */}
      <SectionTitle>The second heartbeat</SectionTitle>

      {app.partnerHeartbeat ? (
        <HeartbeatOrb
          partner={partner}
          intervals={app.partnerHeartbeat.intervals}
          updatedAt={app.partnerHeartbeat.updatedAt}
          photo={app.partnerProfile?.image}
        />
      ) : (
        <Card>
          <Muted>
            {partner} hasn't recorded their heartbeat yet. Yours can be waiting for them when they
            do. 🤍
          </Muted>
          <View style={{ height: spacing.sm }} />
          <Button
            label="Send a nudge 💭"
            variant="ghost"
            onPress={() => {
              void app.sendPing('thinking', 'Leave me your heartbeat? 🤍');
              toast.show(`Nudge on its way to ${partner} 🤍`, 2200);
            }}
          />
        </Card>
      )}

      <View style={{ height: spacing.md }} />

      {recording ? (
        <Card tone="rose">
          <Body style={{ fontFamily: font.family.semibold }}>
            Two fingers on your neck. Tap with every beat you feel.
          </Body>
          <Pressable onPress={tapBeat} style={styles.tapPad} accessibilityRole="button" accessibilityLabel="Tap with your pulse">
            <View style={styles.tapHeartWrap}>
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.tapRing,
                  {
                    opacity: tapPulse.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0, 0.5, 0] }),
                    transform: [{ scale: tapPulse.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.6] }) }],
                  },
                ]}
              />
              <Animated.Text style={[styles.tapPadHeart, { transform: [{ scale: tapHeart }] }]}>🤍</Animated.Text>
            </View>
            <Text style={styles.tapPadCount}>{beats === 0 ? 'tap…' : `${beats} beat${beats === 1 ? '' : 's'}`}</Text>
            {liveBpm ? <Text style={styles.tapPadBpm}>feels like about {liveBpm} a minute</Text> : null}
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
          {app.myHeartbeat ? (
            <View style={styles.keptHeader}>
              <Body style={{ fontFamily: font.family.semibold, flex: 1 }}>Your heartbeat is kept 🤍</Body>
              <Muted>{formatRelative(app.myHeartbeat.updatedAt)}</Muted>
            </View>
          ) : (
            <Body style={{ fontFamily: font.family.semibold }}>Leave your heartbeat for {partner}</Body>
          )}
          <Muted style={{ marginTop: 4 }}>
            {app.myHeartbeat
              ? 'Tap to record it again. Rhythms change with seasons.'
              : 'Tap along with your pulse for a few seconds; they can hold it whenever they miss you.'}
          </Muted>
          {app.myHeartbeat ? <Waveform intervals={app.myHeartbeat.intervals} /> : null}
        </Card>
      )}
    </Screen>
  );
}

/**
 * An ambient pool of colour that breathes behind the glass — slow sine ease
 * (a tide, not a micro-interaction), transform/opacity only, native driver.
 * Under reduced motion it rests at mid-glow instead of looping.
 */
function AmbientPool({
  color,
  size,
  delay,
  reduce,
  style,
}: {
  color: string;
  size: number;
  delay: number;
  reduce: boolean;
  style?: ViewStyle;
}) {
  const v = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    if (reduce) {
      v.setValue(0.5);
      return;
    }
    v.setValue(0);
    const ease = Easing.inOut(Easing.sin);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 3600, delay, easing: ease, useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 3600, easing: ease, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, delay, reduce]);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.75] }),
          transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }],
        },
        style,
      ]}
    />
  );
}

/** Their presence on the other side of the glass: a violet warmth pressing
 *  through from above, breathing while their thumb rests there. */
function PartnerBloom({ visible, reduce }: { visible: boolean; reduce: boolean }) {
  const v = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    Animated.spring(v, { toValue: visible ? 1 : 0, useNativeDriver: true, ...spring.gentle }).start();
  }, [visible, v]);
  useEffect(() => {
    if (reduce) {
      breathe.setValue(0.5);
      return;
    }
    breathe.setValue(0);
    const ease = Easing.inOut(Easing.sin);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 2600, easing: ease, useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 2600, easing: ease, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breathe, reduce]);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.partnerBloom,
        {
          opacity: Animated.multiply(v, breathe.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0.9] })),
          transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
        },
      ]}
    >
      <View style={styles.partnerBloomCore} />
    </Animated.View>
  );
}

/** The resting invitation at the centre of the pane. Breathes while waiting
 *  (violet-edged when their thumb is already there), fades once you hold. */
function InviteRing({ holding, partnerWaiting, reduce }: { holding: boolean; partnerWaiting: boolean; reduce: boolean }) {
  const breathe = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduce) {
      breathe.setValue(0);
      return;
    }
    const ease = Easing.inOut(Easing.sin);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 1700, easing: ease, useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 1700, easing: ease, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breathe, reduce]);
  useEffect(() => {
    Animated.timing(fade, { toValue: holding ? 0 : 1, duration: 260, easing: easeOut, useNativeDriver: true }).start();
  }, [holding, fade]);
  const scale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, partnerWaiting ? 1.07 : 1.03] });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.invite,
        { borderColor: partnerWaiting ? colors.accent : colors.border, opacity: fade, transform: [{ scale }] },
      ]}
    >
      <Text style={styles.inviteHeart}>🤍</Text>
    </Animated.View>
  );
}

/** One ring of contact, expanding from exactly where the finger landed. */
function Ripple({ x, y, onDone }: { x: number; y: number; onDone: () => void }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 900, easing: easeOut, useNativeDriver: true }).start(() => onDone());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x - 60,
        top: y - 60,
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 1.5,
        borderColor: colors.primary,
        opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }),
        transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.6] }) }],
      }}
    />
  );
}

/**
 * Your recorded rhythm, drawn honestly: one bar per beat, width from the real
 * interval between beats. A keepsake you can see, not decoration.
 */
function Waveform({ intervals }: { intervals: number[] }) {
  const safe = intervals.filter((n) => typeof n === 'number' && n >= 250 && n <= 2500).slice(0, 18);
  if (safe.length === 0) return null;
  return (
    <View style={styles.waveRow}>
      {safe.map((ms, i) => (
        <View key={i} style={[styles.waveBar, { width: 6 + ((ms - 250) / 2250) * 18 }]} />
      ))}
    </View>
  );
}

/** Hold to feel the partner's true rhythm — a beating orb, halo per beat,
 *  honest BPM from the stored intervals. Partner data lives in violet. */
function HeartbeatOrb({
  partner,
  intervals,
  updatedAt,
  photo,
}: {
  partner: string;
  intervals: number[];
  updatedAt: number;
  photo?: string | null;
}) {
  const safe = useMemo(() => plausibleIntervals(intervals) ?? [], [intervals]);
  const bpm = safe.length ? bpmOf(safe) : null;
  const scale = useRef(new Animated.Value(1)).current;
  const halo = useRef(new Animated.Value(1)).current; // 1 = faded out
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dub = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [feeling, setFeeling] = useState(false);

  const beatOnce = () => {
    hMedium();
    dub.current = setTimeout(() => hLight(), 140);
    halo.setValue(0);
    Animated.timing(halo, { toValue: 1, duration: 650, easing: easeOut, useNativeDriver: true }).start();
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.14, useNativeDriver: true, ...spring.snappy }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, ...spring.gentle }),
    ]).start();
  };
  const playFrom = (idx: number) => {
    if (safe.length === 0) return;
    beatOnce();
    timer.current = setTimeout(() => playFrom(idx + 1), safe[idx % safe.length]);
  };
  const start = () => {
    if (safe.length === 0) return;
    setFeeling(true);
    playFrom(0);
  };
  const stop = () => {
    setFeeling(false);
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (dub.current) {
      clearTimeout(dub.current);
      dub.current = null;
    }
  };
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (dub.current) clearTimeout(dub.current);
    },
    [],
  );

  return (
    <Pressable
      onPressIn={start}
      onPressOut={stop}
      accessibilityRole="button"
      accessibilityLabel={`Hold to feel ${partner}'s heartbeat`}
      style={({ pressed }) => [styles.orbCard, shadow.card, pressed && { opacity: 0.98 }]}
    >
      <View style={styles.orbStage}>
        <Animated.View
          style={[
            styles.orbHalo,
            {
              opacity: halo.interpolate({ inputRange: [0, 0.12, 1], outputRange: [0, 0.45, 0] }),
              transform: [{ scale: halo.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.45] }) }],
            },
          ]}
        />
        <Animated.View style={[styles.orb, { transform: [{ scale }] }]}>
          {photo ? (
            <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
          ) : (
            <LinearGradient colors={gradients.violet} style={StyleSheet.absoluteFill} />
          )}
        </Animated.View>
      </View>
      <Body style={styles.orbTitle}>Hold to feel {partner}'s heartbeat</Body>
      <Muted style={styles.orbMeta}>
        {feeling
          ? 'that rhythm is really theirs…'
          : bpm
            ? `about ${bpm} beats a minute · kept ${formatRelative(updatedAt)}`
            : `kept ${formatRelative(updatedAt)}`}
      </Muted>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pane: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)', // light-catching rim
    ...shadow.card,
  },
  invite: {
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: 1.5,
    backgroundColor: 'rgba(255,255,255,0.55)', // frosted glass over the pools
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteHeart: { fontSize: 30 },
  partnerBloom: {
    position: 'absolute',
    top: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerBloomCore: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(124,107,214,0.28)',
  },
  beatHalo: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  myBloom: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: BLOOM,
    height: BLOOM,
    borderRadius: BLOOM / 2,
    backgroundColor: 'rgba(252,232,238,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  myBloomCore: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(232,99,140,0.32)',
  },
  togetherCountWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: spacing.lg,
    alignItems: 'center',
  },
  togetherCount: {
    fontFamily: font.family.displaySemi,
    fontSize: font.size.md,
    color: colors.primaryDark,
    letterSpacing: font.tracking.heading,
  },
  ringStatus: {
    marginTop: spacing.md,
    fontFamily: font.family.displaySemi,
    fontSize: font.size.lg,
    color: colors.text,
    textAlign: 'center',
    letterSpacing: font.tracking.heading,
  },
  underStatus: { textAlign: 'center', marginTop: spacing.xs },

  keptHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  waveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.md,
    flexWrap: 'wrap',
  },
  waveBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    opacity: 0.8,
  },

  orbCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(90,46,64,0.06)',
  },
  orbStage: { width: 150, height: 150, alignItems: 'center', justifyContent: 'center' },
  orbHalo: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  orb: {
    width: 116,
    height: 116,
    borderRadius: 58,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  orbTitle: { fontFamily: font.family.semibold, marginTop: spacing.md, textAlign: 'center' },
  orbMeta: { marginTop: 2, textAlign: 'center' },

  tapPad: {
    marginVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    borderWidth: 1.5,
    borderColor: colors.primarySoft,
  },
  tapHeartWrap: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center' },
  tapRing: {
    position: 'absolute',
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  tapPadHeart: { fontSize: 40 },
  tapPadCount: { marginTop: spacing.xs, color: colors.textSoft, fontFamily: font.family.semibold },
  tapPadBpm: { marginTop: 2, color: colors.textFaint, fontSize: font.size.sm, fontFamily: font.family.body },
});
