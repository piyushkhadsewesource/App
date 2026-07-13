import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { Alert } from '../lib/alert';
import { AppHeader, Body, Button, Card, Muted, Screen } from '../components/ui';
import FogReveal from '../components/FogReveal';
import { Reveal } from '../components/Motion';
import { Skeleton, useInitialHydrate } from '../components/Skeleton';
import { hLight, hMedium, hSuccess } from '../lib/haptics';
import {
  CANVAS_SIZE,
  CANVAS_SWATCHES,
  EMPTY_CANVAS,
  EMPTY_CELL,
  colorForPixel,
  isBlank,
  normalizeCanvas,
  paintAt,
} from '../lib/canvas';
import { useNow } from '../lib/useNow';
import { useApp } from '../state/AppContext';
import { colors, font, radius, shadow, spacing } from '../theme';
import { easeOut, prefersReducedMotion, spring as springs } from '../theme/motion';

export default function CanvasScreen({ navigation }: any) {
  const app = useApp();
  const canvas = app.canvas;
  const partner = app.identity?.partnerName ?? 'them';
  const seenKey = app.identity?.spaceId ? `@tether/canvasSeen/${app.identity.spaceId}` : null;

  const hydrating = useInitialHydrate();

  const [pixels, setPixels] = useState<string>(EMPTY_CANVAS);
  const [color, setColor] = useState<string>(CANVAS_SWATCHES[1].ch); // default: Rose
  const [box, setBox] = useState(0); // measured grid side length (px)
  const [fogged, setFogged] = useState(false); // partner drew → the Fogged Window is up
  const [seenLoaded, setSeenLoaded] = useState(false);
  // First-run teaching card: explain the lift-to-send once, then trust the hand.
  const [hintSeen, setHintSeen] = useState(true);
  useEffect(() => {
    AsyncStorage.getItem('@tether/seen/canvasHint')
      .then((v) => setHintSeen(v === '1'))
      .catch(() => {});
  }, []);
  function dismissHint() {
    setHintSeen(true);
    AsyncStorage.setItem('@tether/seen/canvasHint', '1').catch(() => {});
  }

  // Undo, per stroke: each stroke records the cells it painted over (index →
  // previous char). Undo reverts exactly those cells, so the partner's strokes
  // elsewhere on the board are never touched. Local-session only, capped.
  const strokeEditsRef = useRef<Map<number, string> | null>(null);
  const undoStackRef = useRef<Map<number, string>[]>([]);
  const [undoCount, setUndoCount] = useState(0);

  // The frame breathes once when a stroke lands on the other phone.
  const framePulse = useRef(new Animated.Value(0)).current;

  // The board + the "seen" record must both be ready before we paint anything,
  // so the fog decision compares against what the user actually last saw.
  const loading = (!seenLoaded || (app.cloud && hydrating && !canvas)) && !fogged;

  // Refs keep the once-created PanResponder reading the latest values.
  const pixelsRef = useRef(pixels);
  const colorRef = useRef(color);
  const cellRef = useRef(0);
  const drawingRef = useRef(false);
  const foggedRef = useRef(false);
  const lastSyncedRef = useRef<string>(EMPTY_CANVAS); // what we believe is on the server
  const lastSeenRef = useRef<string | null>(null); // what the user has actually watched
  const fogTargetRef = useRef<string>(EMPTY_CANVAS); // board to mark seen once revealed
  const didInitialRef = useRef(false);
  const lastHapticRef = useRef(0);
  pixelsRef.current = pixels;
  colorRef.current = color;
  cellRef.current = box > 0 ? box / CANVAS_SIZE : 0;
  foggedRef.current = fogged;

  // Load the last-seen board for this space (UI memory, like other prefs).
  useEffect(() => {
    let alive = true;
    if (!seenKey) {
      setSeenLoaded(true);
      return;
    }
    AsyncStorage.getItem(seenKey)
      .then((v) => {
        if (!alive) return;
        lastSeenRef.current = v;
        setSeenLoaded(true);
      })
      .catch(() => alive && setSeenLoaded(true));
    return () => {
      alive = false;
    };
  }, [seenKey]);

  const markSeen = (p: string) => {
    lastSeenRef.current = p;
    if (seenKey) AsyncStorage.setItem(seenKey, p).catch(() => {});
  };

  // A gentle, throttled "drawing" tick (no-ops on web via hLight's guard).
  const tickHaptic = (gapMs: number) => {
    const t = Date.now();
    if (t - lastHapticRef.current >= gapMs) {
      lastHapticRef.current = t;
      hLight();
    }
  };

  // When the fog has been fully wiped away: the drawing is truly "seen".
  function onFogRevealed() {
    setFogged(false);
    markSeen(fogTargetRef.current);
  }

  // Decide what to do when the synced canvas changes. The first time we see the
  // board on this open, if the partner drew something you haven't seen, raise
  // the Fogged Window (the board renders fully UNDERNEATH it); after that, live
  // updates adopt instantly so co-drawing stays snappy.
  useEffect(() => {
    if (!seenLoaded || !canvas) return;
    if (drawingRef.current) return;
    const incoming = normalizeCanvas(canvas.pixels);
    if (incoming === lastSyncedRef.current) return;
    const partnerDrew = !app.isMine(canvas.updatedBy);
    const base = normalizeCanvas(lastSeenRef.current ?? lastSyncedRef.current);

    if (!didInitialRef.current) {
      didInitialRef.current = true;
      if (partnerDrew && incoming !== base && !isBlank(incoming)) {
        lastSyncedRef.current = incoming;
        pixelsRef.current = incoming;
        setPixels(incoming);
        fogTargetRef.current = incoming;
        setFogged(true); // markSeen waits until the fog is wiped
        return;
      }
    }
    // Default: adopt instantly (our own echo, or live partner stroke).
    lastSyncedRef.current = incoming;
    pixelsRef.current = incoming;
    setPixels(incoming);
    if (!foggedRef.current) markSeen(incoming);
    else fogTargetRef.current = incoming; // fog is up: fold live updates into the reveal
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvas?.updatedAt, canvas?.updatedBy, seenLoaded]);

  // Strict stroke batching: local paints render instantly, but the ONLY sync
  // is on finger-lift (release/terminate) — never mid-stroke. One write per
  // stroke, one tiny doc. The unmount flush means backing out mid-stroke can't
  // lose the drawing.
  const flushSave = () => {
    const p = pixelsRef.current;
    if (p === lastSyncedRef.current) return;
    lastSyncedRef.current = p;
    if (!foggedRef.current) markSeen(p);
    void app.saveCanvas(p); // wrapped write, never rejects
    // Mark the moment it lands on the other phone: one barely-there breath of
    // the frame. Meaningful state (sent), so it stays quiet, not celebratory.
    if (!prefersReducedMotion()) {
      framePulse.setValue(0);
      Animated.sequence([
        Animated.timing(framePulse, { toValue: 1, duration: 120, easing: easeOut, useNativeDriver: true }),
        Animated.spring(framePulse, { toValue: 0, useNativeDriver: true, ...springs.gentle }),
      ]).start();
    }
  };
  const flushRef = useRef(flushSave);
  flushRef.current = flushSave;
  useEffect(() => () => flushRef.current(), []);

  const paintIndex = (index: number) => {
    const prev = pixelsRef.current[index];
    const next = paintAt(pixelsRef.current, index, colorRef.current);
    if (next === pixelsRef.current) return; // already that colour
    // First touch of this cell in this stroke: remember what it painted over.
    const edits = strokeEditsRef.current;
    if (edits && !edits.has(index)) edits.set(index, prev);
    pixelsRef.current = next;
    setPixels(next);
    tickHaptic(45); // light tick per freshly-filled pixel
  };
  const paintFromEvent = (evt: { nativeEvent: { locationX: number; locationY: number } }) => {
    if (foggedRef.current) return; // wipe first, then draw (fog owns the touches anyway)
    const cs = cellRef.current;
    if (!cs) return;
    const { locationX, locationY } = evt.nativeEvent;
    const col = Math.floor(locationX / cs);
    const row = Math.floor(locationY / cs);
    if (col < 0 || col >= CANVAS_SIZE || row < 0 || row >= CANVAS_SIZE) return;
    paintIndex(row * CANVAS_SIZE + col);
  };

  const handlers = useRef({ grant: (_e: any) => {}, move: (_e: any) => {}, release: () => {} });
  handlers.current.grant = (e) => {
    if (foggedRef.current) return;
    drawingRef.current = true;
    strokeEditsRef.current = new Map();
    paintFromEvent(e);
  };
  handlers.current.move = (e) => paintFromEvent(e);
  handlers.current.release = () => {
    drawingRef.current = false;
    const edits = strokeEditsRef.current;
    strokeEditsRef.current = null;
    if (edits && edits.size > 0) {
      undoStackRef.current.push(edits);
      if (undoStackRef.current.length > 20) undoStackRef.current.shift();
      setUndoCount(undoStackRef.current.length);
    }
    flushSave();
  };

  // Revert my last stroke, cell by cell; everything the partner drew stays.
  const undoStroke = () => {
    const edits = undoStackRef.current.pop();
    if (!edits) return;
    setUndoCount(undoStackRef.current.length);
    const chars = pixelsRef.current.split('');
    edits.forEach((ch, i) => {
      chars[i] = ch;
    });
    const next = chars.join('');
    pixelsRef.current = next;
    setPixels(next);
    hLight();
    flushSave();
  };
  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => handlers.current.grant(e),
      onPanResponderMove: (e) => handlers.current.move(e),
      onPanResponderRelease: () => handlers.current.release(),
      onPanResponderTerminate: () => handlers.current.release(),
    }),
  ).current;

  function selectColor(ch: string) {
    setColor(ch);
    hMedium();
  }

  function confirmClear() {
    if (isBlank(pixelsRef.current)) return;
    Alert.alert(
      'Clear the canvas?',
      `This erases everything you and ${partner} drew here. It can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear it',
          style: 'destructive',
          onPress: () => {
            pixelsRef.current = EMPTY_CANVAS;
            lastSyncedRef.current = EMPTY_CANVAS;
            markSeen(EMPTY_CANVAS);
            setPixels(EMPTY_CANVAS);
            undoStackRef.current = [];
            setUndoCount(0);
            hSuccess();
            void app.clearCanvas();
          },
        },
      ],
    );
  }

  const lastBy = canvas?.updatedBy ? (app.isMine(canvas.updatedBy) ? 'you' : partner) : null;
  const blank = isBlank(pixels);

  // Live co-drawing presence: while the partner is actively drawing, their
  // debounced saves land every ~700ms, so a partner-authored update inside the
  // last few seconds means they're drawing RIGHT NOW. Derived entirely from the
  // canvas doc we already sync — no extra writes, no new data structures. The
  // fast tick only runs while this screen is mounted.
  const nowTick = useNow(2_500);
  const partnerDrawingNow =
    !!canvas &&
    !app.isMine(canvas.updatedBy) &&
    nowTick - canvas.updatedAt < 7_000 &&
    !fogged;

  return (
    <Screen scroll>
      <AppHeader
        title="Our Shared Canvas"
        subtitle="Draw together, in real time"
        onBack={() => navigation.goBack()}
        right={
          // Destructive, so deliberate to find: tucked in the header, never
          // prime space. Confirmation still guards it.
          <Pressable
            onPress={confirmClear}
            disabled={blank || fogged}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Clear the whole canvas"
            style={[styles.clearBtn, (blank || fogged) && { opacity: 0.35 }]}
          >
            <Text style={{ fontSize: 15 }}>🗑️</Text>
          </Pressable>
        }
      />

      {partnerDrawingNow ? (
        <Reveal distance={4} style={styles.liveRow}>
          <LiveDot />
          <Text style={styles.liveText}>{partner} is drawing right now…</Text>
        </Reveal>
      ) : (
        <Muted style={{ marginBottom: spacing.md }}>
          {fogged
            ? `Something new is waiting under the glass…`
            : lastBy
              ? `Last touched by ${lastBy}.`
              : `A blank page for the two of you.`}
        </Muted>
      )}

      {/* The grid */}
      {loading ? (
        <Skeleton style={{ width: '100%', aspectRatio: 1, borderRadius: radius.lg }} />
      ) : (
        <Animated.View
          style={[
            styles.gridWrap,
            { transform: [{ scale: framePulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.006] }) }] },
          ]}
        >
          <View
            style={styles.grid}
            onLayout={(e) => setBox(e.nativeEvent.layout.width)}
            // While the fog is up, the grid must not compete for touches at all —
            // a PanResponder parent would steal the wipe gesture on first move
            // (termination requests default to "yes"). The fog owns the glass.
            {...(fogged ? {} : responder.panHandlers)}
          >
            {box > 0
              ? Array.from({ length: CANVAS_SIZE }).map((_, r) => (
                  <GridRow key={r} row={pixels.slice(r * CANVAS_SIZE, (r + 1) * CANVAS_SIZE)} />
                ))
              : null}
            {/* The Fogged Window: their drawing waits under the mist */}
            {fogged && box > 0 ? (
              <FogReveal box={box} partnerName={partner} onRevealed={onFogRevealed} />
            ) : null}
          </View>
        </Animated.View>
      )}

      {/* Palette */}
      <Text style={styles.paletteLabel}>Colours</Text>
      <View style={styles.palette}>
        {CANVAS_SWATCHES.map((s) => (
          <Swatch key={s.ch} color={s.color} name={s.name} selected={color === s.ch} onPress={() => selectColor(s.ch)} />
        ))}
        <Swatch eraser name="Eraser" selected={color === EMPTY_CELL} onPress={() => selectColor(EMPTY_CELL)} />
      </View>

      <View style={{ height: spacing.lg }} />
      {/* Undo owns the reachable slot: it removes the fear of drawing */}
      <Button label="↶  Undo my stroke" variant="soft" disabled={undoCount === 0 || fogged} onPress={undoStroke} />

      {/* Teach the lift-to-send once, then get out of the way */}
      {!hintSeen ? (
        <Card tone="surface" style={{ marginTop: spacing.lg }}>
          <Body>
            Tap or drag to paint. Your stroke lands on {partner}'s phone the moment you lift
            your finger. 🎨
          </Body>
          <Pressable onPress={dismissHint} accessibilityRole="button" accessibilityLabel="Got it" hitSlop={8} style={{ marginTop: spacing.sm }}>
            <Text style={styles.gotIt}>Got it</Text>
          </Pressable>
        </Card>
      ) : null}
    </Screen>
  );
}

/** A soft, breathing green dot — "they're here with you right now". */
function LiveDot() {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (prefersReducedMotion()) return; // the green dot alone carries the meaning
    const loop = Animated.loop(
      Animated.sequence([
        Animated.spring(pulse, { toValue: 1, useNativeDriver: true, ...springs.gentle }),
        Animated.spring(pulse, { toValue: 0, useNativeDriver: true, ...springs.gentle }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.55] });
  return <Animated.View style={[styles.liveDot, { transform: [{ scale }], opacity }]} />;
}

/**
 * One 16-cell grid row, memoized on its slice of the board string. During a
 * drag only the row containing the painted pixel re-renders (1/16th of the
 * board) instead of all 256 cells — this is what keeps fast strokes and the
 * discovery replay at full frame rate on modest phones and on web.
 */
const GridRow = React.memo(function GridRow({ row }: { row: string }) {
  return (
    <View style={styles.row}>
      {Array.from({ length: CANVAS_SIZE }).map((_, c) => (
        <View key={c} style={[styles.cell, { backgroundColor: colorForPixel(row[c]) }]} />
      ))}
    </View>
  );
});

/** A palette swatch that springs in when selected. */
function Swatch({
  color,
  name,
  selected,
  onPress,
  eraser,
}: {
  color?: string;
  name: string;
  selected: boolean;
  onPress: () => void;
  eraser?: boolean;
}) {
  const scale = useRef(new Animated.Value(selected ? 1.1 : 1)).current;
  useEffect(() => {
    Animated.spring(scale, { toValue: selected ? 1.1 : 1, useNativeDriver: true, ...springs.bouncy }).start();
  }, [selected, scale]);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={name}
      accessibilityState={{ selected }}
      hitSlop={6}
    >
      <Animated.View
        style={[
          styles.swatch,
          eraser ? styles.eraser : { backgroundColor: color },
          { transform: [{ scale }] },
        ]}
      >
        {eraser ? <Text style={{ fontSize: 15 }}>⌫</Text> : null}
        {/* The selection ring arrives WITH the spring (opacity rides the same
            value), so nothing pops into existence around the swatch. */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ring,
            { opacity: scale.interpolate({ inputRange: [1, 1.1], outputRange: [0, 1], extrapolate: 'clamp' }) },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

const GRID_BORDER = 'rgba(90,46,64,0.06)';

const styles = StyleSheet.create({
  gridWrap: {
    borderRadius: radius.lg,
    padding: spacing.xs + 2,
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  grid: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: { flex: 1, flexDirection: 'row' },
  cell: { flex: 1, borderWidth: StyleSheet.hairlineWidth, borderColor: GRID_BORDER },

  liveRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.good },
  liveText: { color: colors.good, fontFamily: font.family.semibold, fontSize: font.size.sm, letterSpacing: 0.2 },

  paletteLabel: {
    fontSize: font.size.sm,
    fontFamily: font.family.semibold,
    color: colors.textSoft,
    letterSpacing: font.tracking.label,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  palette: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, alignItems: 'center' },
  swatch: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'rgba(90,46,64,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.soft,
  },
  ring: {
    position: 'absolute',
    top: -5,
    left: -5,
    right: -5,
    bottom: -5,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.text,
  },
  eraser: { backgroundColor: colors.surfaceAlt },
  clearBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  gotIt: { color: colors.primary, fontFamily: font.family.semibold, fontSize: font.size.md },
});
