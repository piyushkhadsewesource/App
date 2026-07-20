// ─────────────────────────────────────────────────────────────────────────
// TRUE NORTH (the Tethered Lens) — turn until you're facing them.
//
// Native: a full-screen camera feed under a cinematic search tint. A thin
// glowing radial line springs toward the direction you need to turn; haptics
// pulse faster as you close in (the "haptic radar"); and at lock (±5°, with
// hysteresis so it never flickers) the tint lifts, a success haptic fires,
// and the partner's photo blooms into the air on a glass card with the
// distance set in Fraunces.
//
// Web: browsers can't be trusted with AR compasses — instead of a degraded
// camera we show a deliberate, warm analog dial (needle at the true bearing,
// north-up) with the same distance typography. Strict Platform.OS check.
//
// Crash-proofing: expo-camera is loaded via a guarded module-scope require
// (binaries that predate it get a graceful "needs a newer build" body);
// camera permission denial gets a designed fallback, not a crash; every
// partner-data read is null-safe. The search tint is an animated OPACITY
// (native driver) rather than an animated blur — an animated blur cannot run
// on the UI thread and would break the 60fps guardrail.
// ─────────────────────────────────────────────────────────────────────────
import { Image } from 'expo-image';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, AppState, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { hLight, hSuccess } from '../lib/haptics';
import { cardinal16 } from '../lib/geo';
import { useHeading } from '../lib/useHeading';
import { colors, font, radius, spacing } from '../theme';
import { spring } from '../theme/motion';
import { Glass } from './Glass';

let CameraMod: any = null;
if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    CameraMod = require('expo-camera');
  } catch {
    /* binary predates expo-camera — native fallback body below */
  }
}

/** Lock when within this many degrees… */
const LOCK_DEG = 5;
/** …and only unlock again past this, so the reveal never flickers. */
const UNLOCK_DEG = 9;

export default function LensView({
  visible,
  onClose,
  bearing,
  partnerName,
  km,
  photo,
}: {
  visible: boolean;
  onClose: () => void;
  bearing: number;
  partnerName: string;
  km: number;
  photo?: string | null;
}) {
  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
      {Platform.OS === 'web' ? (
        <WebDial onClose={onClose} bearing={bearing} partnerName={partnerName} km={km} photo={photo} />
      ) : CameraMod?.CameraView ? (
        <TrueNorthBody onClose={onClose} bearing={bearing} partnerName={partnerName} km={km} photo={photo} />
      ) : (
        <FallbackBody
          title="True North needs a newer build"
          sub={`${partnerName} is ${km.toLocaleString()} km to the ${cardinal16(bearing)}, the lens arrives with the next app update.`}
          onClose={onClose}
        />
      )}
    </Modal>
  );
}

// ─── Native: the cinematic lens ────────────────────────────────────────────

/** Separate component so camera hooks only ever run when the module exists. */
function TrueNorthBody({
  onClose,
  bearing,
  partnerName,
  km,
  photo,
}: {
  onClose: () => void;
  bearing: number;
  partnerName: string;
  km: number;
  photo?: string | null;
}) {
  const { CameraView, useCameraPermissions } = CameraMod;
  const [permission, requestPermission] = useCameraPermissions();
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) void requestPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permission?.granted]);

  // Pause everything hardware-adjacent when the app backgrounds while the lens
  // is open: expo-camera releases the camera itself, useHeading stops the
  // magnetometer, and this flag stops the haptic-radar interval below.
  const [foreground, setForeground] = useState(() => AppState.currentState !== 'background');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setForeground(s !== 'background'));
    return () => sub.remove();
  }, []);

  const heading = useHeading();
  // Signed offset to the target: 0 = dead ahead, negative = turn left.
  const diff = heading == null ? null : ((bearing - heading + 540) % 360) - 180;
  const absDiff = diff == null ? null : Math.abs(diff);

  // Lock with hysteresis: in at ±5°, out at ±9°.
  const [locked, setLocked] = useState(false);
  useEffect(() => {
    if (absDiff == null) return;
    setLocked((was) => (was ? absDiff <= UNLOCK_DEG : absDiff <= LOCK_DEG));
  }, [absDiff]);

  // ── Haptic radar: silence far out, slow pulse when warm, quick pulse when
  //    hot, one clean Success the instant of lock. Bands, not raw degrees, so
  //    the interval isn't rebuilt on every sensor tick. ────────────────────
  const band = !foreground
    ? 'none'
    : locked
      ? 'locked'
      : absDiff == null
        ? 'none'
        : absDiff <= 20
          ? 'hot'
          : absDiff <= 60
            ? 'warm'
            : 'none';
  useEffect(() => {
    if (band === 'locked') {
      hSuccess();
      return;
    }
    if (band === 'none') return;
    const gap = band === 'hot' ? 350 : 900;
    const id = setInterval(() => hLight(), gap);
    return () => clearInterval(id);
  }, [band]);

  // ── Cinema: search tint (animated opacity, native driver) + radial guide
  //    line that springs toward where you need to turn + the reveal. ───────
  const tint = useRef(new Animated.Value(0.45)).current;
  const reveal = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const target = locked ? 0 : absDiff == null ? 0.45 : absDiff <= 20 ? 0.16 : absDiff <= 60 ? 0.3 : 0.45;
    Animated.spring(tint, { toValue: target, useNativeDriver: true, ...spring.gentle }).start();
    Animated.spring(reveal, { toValue: locked ? 1 : 0, useNativeDriver: true, ...spring.gentle }).start();
  }, [locked, absDiff, tint, reveal]);

  const guideAngle = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (diff == null) return;
    Animated.spring(guideAngle, { toValue: Math.max(-90, Math.min(90, diff)), useNativeDriver: true, ...spring.snappy }).start();
  }, [diff, guideAngle]);
  const guideRotate = guideAngle.interpolate({ inputRange: [-90, 90], outputRange: ['-90deg', '90deg'] });

  // Degrees still owed, rounded to 5 so the caption reads steady instead of
  // flickering with every sensor tick.
  const owed = diff == null ? 0 : Math.max(5, Math.round(Math.abs(diff) / 5) * 5);
  const hint =
    diff == null
      ? `face the ${cardinal16(bearing)}, the needle wakes with the next build`
      : locked
        ? ''
        : Math.abs(diff) <= 20
          ? 'almost…'
          : diff < 0
            ? `‹ turn left · ${owed}°`
            : `turn right · ${owed}° ›`;

  if (!permission?.granted) {
    return (
      <FallbackBody
        title="True North needs your camera"
        sub={`Allow camera access and the world itself will show you which way ${partnerName} is.`}
        onClose={onClose}
      />
    );
  }

  return (
    <View style={styles.fill}>
      <CameraView style={StyleSheet.absoluteFill} facing="back" />

      {/* Search tint — lifts as you close in, gone at lock */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#0B0709', opacity: tint }]} />

      {/* The radial guide: a thin glowing line from centre, springing toward
          the turn you still owe. Fades away once locked. */}
      <Animated.View pointerEvents="none" style={[styles.guideWrap, { opacity: reveal.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}>
        <Animated.View style={{ transform: [{ rotate: guideRotate }] }}>
          <View style={styles.guideLine} />
          <View style={styles.guideTip} />
        </Animated.View>
      </Animated.View>

      {/* The reveal: her photo blooms into the air on glass */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.revealWrap,
          {
            opacity: reveal,
            transform: [
              { scale: reveal.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }) },
              { translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
            ],
          },
        ]}
      >
        <Glass style={styles.revealCard} intensity={26} tint="dark" overlay="rgba(20,12,16,0.35)" pointerEvents="none">
          <View style={styles.revealInner}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.revealPhoto} contentFit="cover" transition={250} />
            ) : (
              <View style={[styles.revealPhoto, styles.revealPhotoEmpty]}>
                <Text style={{ fontSize: 34 }}>🤍</Text>
              </View>
            )}
            <Text style={styles.revealName}>{partnerName}</Text>
            <Text style={styles.revealKm}>{km.toLocaleString()} km away</Text>
            <Text style={styles.revealSub}>straight ahead, through everything</Text>
          </View>
        </Glass>
      </Animated.View>

      {/* Hint caption while searching */}
      {!locked && hint ? (
        <View pointerEvents="none" style={styles.captionWrap}>
          <Text style={styles.caption}>{hint}</Text>
        </View>
      ) : null}

      <CloseButton onClose={onClose} dark />
    </View>
  );
}

// ─── Web: the warm analog fallback ─────────────────────────────────────────

function WebDial({
  onClose,
  bearing,
  partnerName,
  km,
  photo,
}: {
  onClose: () => void;
  bearing: number;
  partnerName: string;
  km: number;
  photo?: string | null;
}) {
  // A slow settle-in for the needle, purely presentational.
  const settle = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(settle, { toValue: 1, useNativeDriver: true, ...spring.gentle }).start();
  }, [settle]);
  const rotate = settle.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${bearing}deg`] });

  return (
    <View style={[styles.fill, styles.center, { backgroundColor: colors.bg }]}>
      {photo ? <Image source={{ uri: photo }} style={styles.webPhoto} contentFit="cover" transition={250} /> : null}
      <View style={styles.webDial}>
        <Text style={[styles.webCardinal, { top: 8, alignSelf: 'center' }]}>N</Text>
        <Animated.View style={[styles.webNeedleWrap, { transform: [{ rotate }] }]}>
          <View style={styles.webNeedle} />
        </Animated.View>
        <View style={styles.webHub} />
      </View>
      <Text style={styles.webKm}>{km.toLocaleString()} km away</Text>
      <Text style={styles.webSub}>
        {partnerName} is to the {cardinal16(bearing)}. The full lens — camera, live needle, the
        reveal — lives on your phone. Here, just know: that way, and closer every day. 🤍
      </Text>
      <CloseButton onClose={onClose} dark={false} />
    </View>
  );
}

// ─── Shared chrome ─────────────────────────────────────────────────────────

function FallbackBody({ title, sub, onClose }: { title: string; sub: string; onClose: () => void }) {
  return (
    <View style={[styles.fill, styles.center, { backgroundColor: colors.bg }]}>
      <Text style={styles.fallbackTitle}>{title}</Text>
      <Text style={styles.fallbackSub}>{sub}</Text>
      <CloseButton onClose={onClose} dark={false} />
    </View>
  );
}

function CloseButton({ onClose, dark }: { onClose: () => void; dark: boolean }) {
  return (
    <Pressable
      onPress={onClose}
      accessibilityRole="button"
      accessibilityLabel="Close the lens"
      style={[styles.close, dark ? styles.closeDark : styles.closeLight]}
    >
      <Text style={[styles.closeText, { color: dark ? colors.white : colors.text }]}>Close</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center' },

  // Radial guide
  guideWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  guideLine: {
    width: 2.5,
    height: 150,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.9)',
    marginBottom: 150, // line extends upward from centre; rotation pivots at centre
    shadowColor: '#fff',
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  guideTip: {
    position: 'absolute',
    top: -6,
    alignSelf: 'center',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },

  // Reveal card
  revealWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  revealCard: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)', // the light-catching rim
  },
  revealInner: { alignItems: 'center', paddingVertical: spacing.xl, paddingHorizontal: spacing.xxl },
  revealPhoto: { width: 108, height: 108, borderRadius: 54, borderWidth: 2, borderColor: 'rgba(255,255,255,0.8)' },
  revealPhotoEmpty: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.15)' },
  revealName: {
    marginTop: spacing.md,
    color: colors.white,
    fontFamily: font.family.displaySemi,
    fontSize: font.size.xl,
    letterSpacing: font.tracking.heading,
  },
  revealKm: {
    marginTop: 2,
    color: colors.white,
    fontFamily: font.family.display,
    fontSize: font.size.xxl,
    letterSpacing: font.tracking.heading,
  },
  revealSub: { marginTop: spacing.xs, color: 'rgba(255,255,255,0.8)', fontFamily: font.family.body, fontSize: font.size.sm },

  captionWrap: { position: 'absolute', left: 0, right: 0, bottom: 120, alignItems: 'center', paddingHorizontal: spacing.xl },
  caption: {
    color: colors.white,
    fontFamily: font.family.displaySemi,
    fontSize: font.size.xxl,
    textAlign: 'center',
    letterSpacing: font.tracking.heading,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowRadius: 12,
  },

  // Web dial
  webPhoto: { width: 72, height: 72, borderRadius: 36, marginBottom: spacing.lg, borderWidth: 2, borderColor: colors.surface },
  webDial: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: '#FBF6F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webCardinal: { position: 'absolute', fontFamily: font.family.displaySemi, color: colors.textSoft, fontSize: font.size.md },
  webNeedleWrap: { position: 'absolute', width: 4, height: 150, alignItems: 'center' },
  webNeedle: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 75,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: colors.primary,
  },
  webHub: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.text },
  webKm: {
    marginTop: spacing.xl,
    fontFamily: font.family.display,
    fontSize: font.size.xxl,
    color: colors.text,
    letterSpacing: font.tracking.heading,
  },
  webSub: {
    marginTop: spacing.sm,
    fontFamily: font.family.body,
    fontSize: font.size.md,
    color: colors.textSoft,
    textAlign: 'center',
    paddingHorizontal: spacing.xxl,
    lineHeight: 22,
  },

  close: { position: 'absolute', top: 56, right: 20, borderRadius: radius.pill, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  closeDark: { backgroundColor: 'rgba(0,0,0,0.45)' },
  closeLight: { position: 'relative', top: undefined, right: undefined, marginTop: spacing.xl, backgroundColor: colors.surfaceAlt },
  closeText: { fontFamily: font.family.bold, fontSize: font.size.md },

  fallbackTitle: {
    fontFamily: font.family.displaySemi,
    fontSize: font.size.xl,
    color: colors.text,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  fallbackSub: {
    fontFamily: font.family.body,
    fontSize: font.size.md,
    color: colors.textSoft,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl,
    lineHeight: 22,
  },
});
