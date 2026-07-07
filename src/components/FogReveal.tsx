// ─────────────────────────────────────────────────────────────────────────
// FogReveal — the Fogged Window over the Shared Canvas.
//
// When your partner has drawn since you last looked, the finished board sits
// UNDER this layer: a lattice of cream mist tiles, each with its own Animated
// opacity. You wipe the fog away with your finger — tiles near the touch fade
// out instantly (180ms ease-out; wiping is high-frequency input, a spring
// would lag the finger) — and at 85% wiped the rest dissolves on its own, so
// nobody scrubs corners. Only then is the drawing marked "seen".
//
// Because this layer sits on top and owns its own PanResponder, it also
// blocks drawing until the reveal is done: you meet their drawing before you
// answer it. 144 Views + native-driver opacity — no measurable frame cost,
// and PanResponder is already proven on web + native in this very screen.
// ─────────────────────────────────────────────────────────────────────────
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { hLight, hSuccess } from '../lib/haptics';
import { colors, font, radius, spacing } from '../theme';

const FOG_SIZE = 12; // 12×12 mist tiles over the board
const TILES = FOG_SIZE * FOG_SIZE;
const CLEAR_AT = 0.85; // auto-dissolve threshold
const WIPE_RADIUS = 1.3; // in tile units, around the finger

export default function FogReveal({
  box,
  partnerName,
  onRevealed,
}: {
  /** Measured side length (px) of the square board this fog covers. */
  box: number;
  partnerName: string;
  onRevealed: () => void;
}) {
  // One opacity per tile; tiny alternating tint variance gives the mist a
  // woven, frosted-paper texture instead of a flat sheet.
  const tiles = useMemo(
    () => Array.from({ length: TILES }, () => new Animated.Value(1)),
    [],
  );
  const wiped = useRef<Set<number>>(new Set());
  const done = useRef(false);
  const hint = useRef(new Animated.Value(1)).current;
  const hintGone = useRef(false);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    // Dissolve whatever mist is left, then hand the board back.
    tiles.forEach((t, i) => {
      if (!wiped.current.has(i)) {
        Animated.timing(t, { toValue: 0, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
      }
    });
    hSuccess(); // their drawing has fully arrived
    setTimeout(onRevealed, 300);
  };

  const wipeAt = (x: number, y: number) => {
    if (done.current || box <= 0) return;
    if (!hintGone.current) {
      hintGone.current = true;
      Animated.timing(hint, { toValue: 0, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    }
    const tile = box / FOG_SIZE;
    const tc = x / tile;
    const tr = y / tile;
    const r = Math.ceil(WIPE_RADIUS);
    let fresh = 0;
    for (let dr = -r; dr <= r; dr += 1) {
      for (let dc = -r; dc <= r; dc += 1) {
        const rr = Math.floor(tr) + dr;
        const cc = Math.floor(tc) + dc;
        if (rr < 0 || rr >= FOG_SIZE || cc < 0 || cc >= FOG_SIZE) continue;
        // distance from finger to tile centre, in tile units
        const dist = Math.hypot(rr + 0.5 - tr, cc + 0.5 - tc);
        if (dist > WIPE_RADIUS) continue;
        const idx = rr * FOG_SIZE + cc;
        if (wiped.current.has(idx)) continue;
        wiped.current.add(idx);
        fresh += 1;
        Animated.timing(tiles[idx], { toValue: 0, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
      }
    }
    if (fresh > 0) {
      hLight(); // a soft tick as new fog clears (no-op on web)
      if (wiped.current.size / TILES >= CLEAR_AT) finish();
    }
  };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => wipeAt(e.nativeEvent.locationX, e.nativeEvent.locationY),
      onPanResponderMove: (e) => wipeAt(e.nativeEvent.locationX, e.nativeEvent.locationY),
      // Never surrender the wipe mid-gesture (scroll views and sibling
      // responders ask; the answer is no — wiping is the whole interaction).
      onPanResponderTerminationRequest: () => false,
    }),
  ).current;

  // Guard: if the component unmounts mid-wipe (user backs out), nothing leaks —
  // Animated values die with it, and "seen" was never marked, so the fog
  // returns for the still-unseen part next visit.
  useEffect(() => () => { done.current = true; }, []);

  const tileSide = box / FOG_SIZE;

  return (
    <View style={StyleSheet.absoluteFill} {...responder.panHandlers}>
      {box > 0
        ? tiles.map((t, i) => {
            const rr = Math.floor(i / FOG_SIZE);
            const cc = i % FOG_SIZE;
            return (
              <Animated.View
                key={i}
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: cc * tileSide,
                  top: rr * tileSide,
                  width: tileSide + StyleSheet.hairlineWidth,
                  height: tileSide + StyleSheet.hairlineWidth,
                  backgroundColor: (rr + cc) % 2 === 0 ? 'rgba(251,248,246,0.99)' : 'rgba(246,240,236,0.99)',
                  opacity: t,
                }}
              />
            );
          })
        : null}

      {/* The invitation, fading at first touch */}
      <Animated.View pointerEvents="none" style={[styles.hintWrap, { opacity: hint }]}>
        <Text style={styles.hintHeart}>🤍</Text>
        <Text style={styles.hintText}>{partnerName} drew something for you</Text>
        <Text style={styles.hintSub}>wipe the glass to see it</Text>
      </Animated.View>

      {/* Escape hatch: accessibility + impatience both deserve a door */}
      <Pressable onPress={finish} style={styles.skip} accessibilityRole="button" accessibilityLabel="Reveal all">
        <Text style={styles.skipText}>Reveal ›</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  hintWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  hintHeart: { fontSize: 34 },
  hintText: {
    fontFamily: font.family.displaySemi,
    fontSize: font.size.lg,
    color: colors.text,
    letterSpacing: font.tracking.heading,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  hintSub: { fontFamily: font.family.body, fontSize: font.size.sm, color: colors.textSoft },
  skip: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(46,42,42,0.55)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  skipText: { color: colors.white, fontFamily: font.family.bold, fontSize: font.size.sm, letterSpacing: 0.3 },
});
