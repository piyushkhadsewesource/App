// ─────────────────────────────────────────────────────────────────────────
// Our Shared Canvas — freehand ink for two.
//
// The drawing surface is real vector ink: Gesture Handler feeds the active
// stroke into a Reanimated shared value and the live SVG path is built on the
// UI thread, so drawing runs at the display's native refresh rate (120fps on
// ProMotion-class screens) without ever touching the React render loop.
//
// Sync is strictly batched: while the finger is down NOTHING is written — the
// stroke is committed to Firestore as ONE tidy write on finger lift (onEnd).
// Drawings made on the old pixel canvas still render underneath the new ink.
// ─────────────────────────────────────────────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, { runOnJS, useAnimatedProps, useAnimatedReaction, useSharedValue } from 'react-native-reanimated';
import Svg, { Path, Rect } from 'react-native-svg';
import { Alert } from '../lib/alert';
import { AppHeader, Muted, Screen } from '../components/ui';
import FogReveal from '../components/FogReveal';
import { Skeleton, useInitialHydrate } from '../components/Skeleton';
import { hLight, hMedium, hSuccess } from '../lib/haptics';
import {
  CANVAS_BRUSHES,
  CANVAS_PAPER,
  CANVAS_SIZE,
  CANVAS_STROKES_BUDGET,
  CANVAS_SWATCHES,
  CanvasStroke,
  EMPTY_CELL,
  ERASER_WIDTH_FACTOR,
  canvasSignature,
  colorForPixel,
  compactStrokePoints,
  isBlank,
  normalizeCanvas,
  parseStrokes,
  serializeStrokes,
  strokePath,
} from '../lib/canvas';
import { useNow } from '../lib/useNow';
import { useToast } from '../components/ToastHost';
import { useApp } from '../state/AppContext';
import { colors, font, radius, shadow, spacing } from '../theme';
import { spring as springs } from '../theme/motion';

const AnimatedPath = Reanimated.createAnimatedComponent(Path);
const IS_WEB = Platform.OS === 'web';
const OFFSCREEN = 'M -99 -99';

/**
 * The in-flight stroke as a plain polyline (worklet, runs on the UI thread).
 * Input points arrive at the display rate, so segments are sub-pixel and read
 * as a smooth line; the committed stroke re-renders Catmull-Rom smoothed.
 */
function livePathD(pts: number[]): string {
  'worklet';
  if (pts.length < 2) return OFFSCREEN;
  let d = `M ${pts[0]} ${pts[1]}`;
  if (pts.length === 2) return `${d} L ${pts[0] + 0.1} ${pts[1]}`;
  for (let i = 2; i < pts.length; i += 2) d += ` L ${pts[i]} ${pts[i + 1]}`;
  return d;
}

export default function CanvasScreen({ navigation }: any) {
  const app = useApp();
  const toast = useToast();
  const canvas = app.canvas;
  const partner = app.identity?.partnerName ?? 'them';
  const seenKey = app.identity?.spaceId ? `@tether/canvasSeen/${app.identity.spaceId}` : null;

  const hydrating = useInitialHydrate();

  const [strokes, setStrokes] = useState<CanvasStroke[]>([]);
  const [legacyPixels, setLegacyPixels] = useState<string>('');
  const [ink, setInk] = useState<string>(CANVAS_SWATCHES[1].color); // default: Velvet
  const [brush, setBrush] = useState<number>(1); // default: soft marker
  const [eraser, setEraser] = useState(false);
  const [box, setBox] = useState(0); // measured square side (px)
  const [fogged, setFogged] = useState(false); // partner drew → the Fogged Window is up
  const [seenLoaded, setSeenLoaded] = useState(false);

  // The board + the "seen" record must both be ready before we paint anything,
  // so the fog decision compares against what the user actually last saw.
  const loading = (!seenLoaded || (app.cloud && hydrating && !canvas)) && !fogged;

  // Refs keep the stable commit callback reading the latest values.
  const strokesRef = useRef(strokes);
  const inkRef = useRef(ink);
  const brushRef = useRef(brush);
  const eraserRef = useRef(eraser);
  const boxRef = useRef(0);
  const foggedRef = useRef(false);
  const lastSyncedRef = useRef<string>(canvasSignature(null)); // what we believe is on the server
  const lastSeenRef = useRef<string | null>(null); // what the user has actually watched
  const fogTargetRef = useRef<string>(canvasSignature(null)); // signature to mark seen once revealed
  const didInitialRef = useRef(false);
  const legacyPixelsRef = useRef(legacyPixels);
  legacyPixelsRef.current = legacyPixels;
  strokesRef.current = strokes;
  inkRef.current = ink;
  brushRef.current = brush;
  eraserRef.current = eraser;
  boxRef.current = box;
  foggedRef.current = fogged;

  // Load the last-seen signature for this space (UI memory, like other prefs).
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

  const markSeen = (sig: string) => {
    lastSeenRef.current = sig;
    if (seenKey) AsyncStorage.setItem(seenKey, sig).catch(() => {});
  };

  const adopt = (doc: { strokes?: string; pixels?: string } | null) => {
    setStrokes(parseStrokes(doc?.strokes));
    setLegacyPixels(normalizeCanvas(doc?.pixels));
  };

  // When the fog has been fully wiped away: the drawing is truly "seen".
  function onFogRevealed() {
    setFogged(false);
    markSeen(fogTargetRef.current);
  }

  // Decide what to do when the synced canvas changes. The first time we see the
  // board on this open, if the partner drew something you haven't seen, raise
  // the Fogged Window (the board renders fully UNDERNEATH it); after that, live
  // updates adopt instantly so co-drawing stays snappy. The active stroke lives
  // in a shared value, so a partner's ink landing mid-stroke never disturbs the
  // line under your finger.
  useEffect(() => {
    if (!seenLoaded || !canvas) return;
    const sig = canvasSignature(canvas);
    if (sig === lastSyncedRef.current) return;
    const partnerDrew = !app.isMine(canvas.updatedBy);
    const base = lastSeenRef.current ?? lastSyncedRef.current;

    if (!didInitialRef.current) {
      didInitialRef.current = true;
      const hasInk = parseStrokes(canvas.strokes).length > 0 || !isBlank(normalizeCanvas(canvas.pixels));
      if (partnerDrew && sig !== base && hasInk) {
        lastSyncedRef.current = sig;
        adopt(canvas);
        fogTargetRef.current = sig;
        setFogged(true); // markSeen waits until the fog is wiped
        return;
      }
    }
    // Default: adopt instantly (our own echo, or live partner stroke).
    lastSyncedRef.current = sig;
    adopt(canvas);
    if (!foggedRef.current) markSeen(sig);
    else fogTargetRef.current = sig; // fog is up: fold live updates into the reveal
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvas?.updatedAt, canvas?.updatedBy, seenLoaded]);

  // ── The live stroke (UI thread) ──────────────────────────────────────────
  const livePoints = useSharedValue<number[]>([]);
  const liveProps = useAnimatedProps(() => ({ d: livePathD(livePoints.value) }));

  // Web renders the live stroke from state (reanimated runs on the JS thread
  // there anyway); on native this reaction prepares a constant and never fires.
  const [webLiveD, setWebLiveD] = useState(OFFSCREEN);
  useAnimatedReaction(
    () => (IS_WEB ? livePathD(livePoints.value) : OFFSCREEN),
    (d, prev) => {
      if (IS_WEB && d !== prev) runOnJS(setWebLiveD)(d);
    },
  );

  // ── Stroke commit: the ONLY moment the drawing syncs ────────────────────
  const commitInner = (ptsPx: number[]) => {
    const side = boxRef.current;
    if (!side || ptsPx.length < 2) return;
    const p = compactStrokePoints(ptsPx, side);
    if (p.length < 2) return;
    const wBase = CANVAS_BRUSHES[brushRef.current]?.w ?? CANVAS_BRUSHES[1].w;
    const stroke: CanvasStroke = {
      c: eraserRef.current ? CANVAS_PAPER : inkRef.current,
      w: eraserRef.current ? wBase * ERASER_WIDTH_FACTOR : wBase,
      p,
      by: app.meId,
    };
    const next = [...strokesRef.current, stroke];
    const serialized = serializeStrokes(next);
    if (serialized.length > CANVAS_STROKES_BUDGET) {
      toast.show('The canvas is full of you two 🤍 Clear it to start a new one.', 3000);
      return;
    }
    setStrokes(next);
    strokesRef.current = next;
    const sig = `${serialized}|${legacyPixelsRef.current}`;
    lastSyncedRef.current = sig;
    if (!foggedRef.current) markSeen(sig);
    hLight();
    void app.saveCanvasStrokes(serialized); // one write per stroke, on finger lift
  };
  const commitRef = useRef(commitInner);
  commitRef.current = commitInner;
  const commitStroke = useCallback((ptsPx: number[]) => commitRef.current(ptsPx), []);

  // Persist the whole drawing after a change that removes ink (undo).
  const persist = (next: CanvasStroke[]) => {
    setStrokes(next);
    strokesRef.current = next;
    const sig = `${serializeStrokes(next)}|${legacyPixelsRef.current}`;
    lastSyncedRef.current = sig;
    markSeen(sig);
    void app.saveCanvasStrokes(serializeStrokes(next));
  };

  // ── The pan gesture: point capture runs entirely on the UI thread ───────
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!fogged)
        .minDistance(0)
        .maxPointers(1)
        .shouldCancelWhenOutside(false)
        .onBegin((e) => {
          'worklet';
          livePoints.modify((arr) => {
            'worklet';
            arr.length = 0;
            arr.push(e.x, e.y);
            return arr;
          });
        })
        .onUpdate((e) => {
          'worklet';
          livePoints.modify((arr) => {
            'worklet';
            const n = arr.length;
            if (n >= 2) {
              const dx = e.x - arr[n - 2];
              const dy = e.y - arr[n - 1];
              if (dx * dx + dy * dy < 1) return arr; // sub-pixel jitter
            }
            arr.push(e.x, e.y);
            return arr;
          });
        })
        .onFinalize(() => {
          'worklet';
          const pts = livePoints.value.slice();
          livePoints.modify((arr) => {
            'worklet';
            arr.length = 0;
            return arr;
          });
          runOnJS(commitStroke)(pts);
        }),
    [fogged, commitStroke, livePoints],
  );

  function pickInk(hex: string) {
    setInk(hex);
    setEraser(false);
    hMedium();
  }
  function pickBrush(i: number) {
    setBrush(i);
    setEraser(false);
    hLight();
  }
  function pickEraser() {
    setEraser(true);
    hLight();
  }

  const myLastStroke = useMemo(() => {
    for (let i = strokes.length - 1; i >= 0; i -= 1) if (strokes[i].by === app.meId) return i;
    return -1;
  }, [strokes, app.meId]);

  function undoMine() {
    if (myLastStroke < 0) return;
    const next = strokes.filter((_, i) => i !== myLastStroke);
    hLight();
    persist(next);
  }

  const blank = strokes.length === 0 && isBlank(legacyPixels);

  function confirmClear() {
    if (blank) return;
    Alert.alert(
      'Clear the canvas?',
      `This erases everything you and ${partner} drew here. It can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear it',
          style: 'destructive',
          onPress: () => {
            const sig = canvasSignature({ strokes: '[]', pixels: '0'.repeat(256) });
            strokesRef.current = [];
            setStrokes([]);
            setLegacyPixels(normalizeCanvas(null));
            lastSyncedRef.current = sig;
            markSeen(sig);
            hSuccess();
            void app.clearCanvas();
          },
        },
      ],
    );
  }

  const lastBy = canvas?.updatedBy ? (app.isMine(canvas.updatedBy) ? 'you' : partner) : null;

  // Live co-drawing presence: every finished stroke lands as one write, so a
  // partner-authored update inside the last few seconds means they're drawing
  // RIGHT NOW. Derived entirely from the canvas doc we already sync — no extra
  // writes. The fast tick only runs while this screen is mounted.
  const nowTick = useNow(2_500);
  const partnerDrawingNow =
    !!canvas &&
    !app.isMine(canvas.updatedBy) &&
    nowTick - canvas.updatedAt < 7_000 &&
    !fogged;

  const liveWidth = Math.max(1, (eraser ? CANVAS_BRUSHES[brush].w * ERASER_WIDTH_FACTOR : CANVAS_BRUSHES[brush].w) * (box || 1));

  return (
    <Screen scroll>
      <AppHeader title="Our Shared Canvas" subtitle="Draw together, in real time" onBack={() => navigation.goBack()} />

      {partnerDrawingNow ? (
        <View style={styles.liveRow}>
          <LiveDot />
          <Text style={styles.liveText}>{partner} is drawing right now…</Text>
        </View>
      ) : (
        <Muted style={{ marginBottom: spacing.md }}>
          {fogged
            ? `Something new is waiting under the glass…`
            : lastBy
              ? `Last touched by ${lastBy}. Draw, and it lands on ${partner}'s phone the moment you lift your finger.`
              : `A blank page for the two of you. Draw, and it lands on ${partner}'s phone the moment you lift your finger.`}
        </Muted>
      )}

      {/* The paper */}
      {loading ? (
        <Skeleton style={{ width: '100%', aspectRatio: 1, borderRadius: radius.lg }} />
      ) : (
        <View style={styles.paperWrap}>
          <GestureDetector gesture={pan}>
            <View style={styles.paper} collapsable={false} onLayout={(e) => setBox(e.nativeEvent.layout.width)}>
              {box > 0 ? (
                <Svg pointerEvents="none" width={box} height={box}>
                  <LegacyInk pixels={legacyPixels} box={box} />
                  {strokes.map((s, i) => (
                    <CommittedStroke key={i} s={s} box={box} />
                  ))}
                  {IS_WEB ? (
                    <Path
                      d={webLiveD}
                      stroke={eraser ? CANVAS_PAPER : ink}
                      strokeWidth={liveWidth}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  ) : (
                    <AnimatedPath
                      animatedProps={liveProps}
                      stroke={eraser ? CANVAS_PAPER : ink}
                      strokeWidth={liveWidth}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  )}
                </Svg>
              ) : null}
              {/* The Fogged Window: their drawing waits under the mist */}
              {fogged && box > 0 ? <FogReveal box={box} partnerName={partner} onRevealed={onFogRevealed} /> : null}
            </View>
          </GestureDetector>
        </View>
      )}

      {/* Inks */}
      <View style={styles.inkRow}>
        {CANVAS_SWATCHES.map((s) => (
          <InkDot key={s.ch} color={s.color} name={s.name} selected={!eraser && ink === s.color} onPress={() => pickInk(s.color)} />
        ))}
      </View>

      {/* Tools: brush weights · eraser · undo · clear */}
      <View style={styles.toolRow}>
        <View style={styles.brushGroup}>
          {CANVAS_BRUSHES.map((b, i) => (
            <BrushDot
              key={b.key}
              name={b.name}
              dot={6 + i * 7}
              tint={ink}
              selected={!eraser && brush === i}
              onPress={() => pickBrush(i)}
            />
          ))}
          <BrushDot name="Eraser" eraser selected={eraser} tint={colors.textSoft} dot={14} onPress={pickEraser} />
        </View>
        <View style={{ flex: 1 }} />
        <ToolText label="Undo" disabled={myLastStroke < 0 || fogged} onPress={undoMine} />
        <ToolText label="Clear" tone="danger" disabled={blank || fogged} onPress={confirmClear} />
      </View>
    </Screen>
  );
}

/** One committed stroke; memoized so past ink never re-renders mid-drawing. */
const CommittedStroke = React.memo(
  function CommittedStroke({ s, box }: { s: CanvasStroke; box: number }) {
    return (
      <Path
        d={strokePath(s.p, box)}
        stroke={s.c}
        strokeWidth={Math.max(1, s.w * box)}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    );
  },
  (a, b) => a.s === b.s && a.box === b.box,
);

/** The legacy pixel-canvas drawing, rendered as soft rects under the ink. */
const LegacyInk = React.memo(function LegacyInk({ pixels, box }: { pixels: string; box: number }) {
  if (isBlank(pixels)) return null;
  const cell = box / CANVAS_SIZE;
  const rects: React.ReactNode[] = [];
  for (let i = 0; i < pixels.length; i += 1) {
    if (pixels[i] === EMPTY_CELL) continue;
    rects.push(
      <Rect
        key={i}
        x={(i % CANVAS_SIZE) * cell}
        y={Math.floor(i / CANVAS_SIZE) * cell}
        width={cell + 0.5}
        height={cell + 0.5}
        fill={colorForPixel(pixels[i])}
      />,
    );
  }
  return <>{rects}</>;
});

/** A soft, breathing green dot — "they're here with you right now". */
function LiveDot() {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
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

/** An ink well. Selection blooms a ring in the ink's own colour. */
function InkDot({ color, name, selected, onPress }: { color: string; name: string; selected: boolean; onPress: () => void }) {
  const scale = useRef(new Animated.Value(selected ? 1 : 0.9)).current;
  useEffect(() => {
    Animated.spring(scale, { toValue: selected ? 1 : 0.9, useNativeDriver: true, ...springs.snappy }).start();
  }, [selected, scale]);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={name} accessibilityState={{ selected }} hitSlop={6}>
      <View style={[styles.inkRing, selected && { borderColor: color }]}>
        <Animated.View style={[styles.inkWell, { backgroundColor: color, transform: [{ scale }] }]} />
      </View>
    </Pressable>
  );
}

/** A brush weight (or the eraser) — the dot previews the current ink. */
function BrushDot({
  name,
  dot,
  tint,
  selected,
  eraser,
  onPress,
}: {
  name: string;
  dot: number;
  tint: string;
  selected: boolean;
  eraser?: boolean;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!selected) return;
    scale.setValue(0.85);
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, ...springs.snappy }).start();
  }, [selected, scale]);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={name} accessibilityState={{ selected }} hitSlop={6}>
      <Animated.View style={[styles.brushChip, selected && styles.brushChipOn, { transform: [{ scale }] }]}>
        {eraser ? (
          <View style={styles.eraserDot} />
        ) : (
          <View style={{ width: dot, height: dot, borderRadius: dot / 2, backgroundColor: tint }} />
        )}
      </Animated.View>
    </Pressable>
  );
}

/** A quiet text tool (undo / clear) with an instant pressed state. */
function ToolText({
  label,
  onPress,
  disabled,
  tone,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'danger';
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      hitSlop={10}
      style={({ pressed }) => [styles.toolText, pressed && { opacity: 0.55, transform: [{ scale: 0.96 }] }, disabled && { opacity: 0.3 }]}
    >
      <Text style={[styles.toolTextLabel, tone === 'danger' && { color: colors.danger }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  paperWrap: {
    borderRadius: radius.lg,
    padding: spacing.xs + 2,
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  paper: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: CANVAS_PAPER,
  },

  liveRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.good },
  liveText: { color: colors.good, fontFamily: font.family.semibold, fontSize: font.size.sm, letterSpacing: 0.2 },

  inkRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  inkRing: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inkWell: { width: 28, height: 28, borderRadius: 14, ...shadow.soft },

  toolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xs,
  },
  brushGroup: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  brushChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brushChipOn: { backgroundColor: colors.surfaceAlt },
  eraserDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.textFaint,
  },

  toolText: { paddingVertical: spacing.sm },
  toolTextLabel: { fontSize: font.size.sm, fontFamily: font.family.semibold, color: colors.textSoft, letterSpacing: font.tracking.label },
});
