import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Alert } from '../lib/alert';
import { AppHeader, Body, Button, Card, Muted, Screen } from '../components/ui';
import { Skeleton, useInitialHydrate } from '../components/Skeleton';
import { hLight, hMedium, hSuccess } from '../lib/haptics';
import {
  CANVAS_CELLS,
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
import { spring as springs } from '../theme/motion';

export default function CanvasScreen({ navigation }: any) {
  const app = useApp();
  const canvas = app.canvas;
  const partner = app.identity?.partnerName ?? 'them';
  const seenKey = app.identity?.spaceId ? `@tether/canvasSeen/${app.identity.spaceId}` : null;

  const hydrating = useInitialHydrate();

  const [pixels, setPixels] = useState<string>(EMPTY_CANVAS);
  const [color, setColor] = useState<string>(CANVAS_SWATCHES[1].ch); // default: Rose
  const [box, setBox] = useState(0); // measured grid side length (px)
  const [replaying, setReplaying] = useState(false);
  const [seenLoaded, setSeenLoaded] = useState(false);

  // The whole grid + first "seen" record must be ready before we paint anything,
  // so the discovery replay starts from what the user last saw (not a flash of
  // the final image).
  const loading = (!seenLoaded || (app.cloud && hydrating && !canvas)) && !replaying;

  // Refs keep the once-created PanResponder reading the latest values.
  const pixelsRef = useRef(pixels);
  const colorRef = useRef(color);
  const cellRef = useRef(0);
  const drawingRef = useRef(false);
  const replayingRef = useRef(false);
  const lastSyncedRef = useRef<string>(EMPTY_CANVAS); // what we believe is on the server
  const lastSeenRef = useRef<string | null>(null); // what the user has actually watched
  const replayTargetRef = useRef<string>(EMPTY_CANVAS);
  const didInitialRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const replayTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastHapticRef = useRef(0);
  pixelsRef.current = pixels;
  colorRef.current = color;
  cellRef.current = box > 0 ? box / CANVAS_SIZE : 0;
  replayingRef.current = replaying;

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

  function finishReplay(target: string) {
    if (replayTimer.current) {
      clearInterval(replayTimer.current);
      replayTimer.current = null;
    }
    pixelsRef.current = target;
    setPixels(target);
    lastSyncedRef.current = target;
    markSeen(target);
    setReplaying(false);
    hSuccess(); // the partner's piece has fully "arrived"
  }

  // Reveal the changed cells from `base` to `target`, staggered over ~1–1.5s,
  // so the partner's drawing appears to be drawn in front of you.
  function startReplay(base: string, target: string) {
    const changed: number[] = [];
    for (let i = 0; i < CANVAS_CELLS; i += 1) if (base[i] !== target[i]) changed.push(i);
    if (changed.length === 0) {
      pixelsRef.current = target;
      setPixels(target);
      lastSyncedRef.current = target;
      markSeen(target);
      return;
    }
    replayTargetRef.current = target;
    setReplaying(true);
    let work = base;
    pixelsRef.current = base;
    setPixels(base);
    const duration = Math.min(1500, Math.max(700, changed.length * 14));
    const tickMs = 40;
    const perTick = Math.max(1, Math.ceil(changed.length / Math.ceil(duration / tickMs)));
    let idx = 0;
    if (replayTimer.current) clearInterval(replayTimer.current);
    replayTimer.current = setInterval(() => {
      for (let k = 0; k < perTick && idx < changed.length; k += 1, idx += 1) {
        const ci = changed[idx];
        work = work.slice(0, ci) + target[ci] + work.slice(ci + 1);
      }
      pixelsRef.current = work;
      setPixels(work);
      tickHaptic(90);
      if (idx >= changed.length) finishReplay(target);
    }, tickMs);
  }

  function skipReplay() {
    finishReplay(replayTargetRef.current);
  }

  // Decide what to do when the synced canvas changes. The first time we see the
  // board on this open, if the partner drew it, play the discovery replay; after
  // that, live updates adopt instantly so co-drawing stays snappy.
  useEffect(() => {
    if (!seenLoaded || !canvas) return;
    if (drawingRef.current || replayingRef.current) return;
    const incoming = normalizeCanvas(canvas.pixels);
    if (incoming === lastSyncedRef.current) return;
    const partnerDrew = !app.isMine(canvas.updatedBy);
    const base = normalizeCanvas(lastSeenRef.current ?? lastSyncedRef.current);

    if (!didInitialRef.current) {
      didInitialRef.current = true;
      if (partnerDrew && incoming !== base && !isBlank(incoming)) {
        lastSyncedRef.current = incoming;
        startReplay(base, incoming);
        return;
      }
    }
    // Default: adopt instantly (our own echo, or live partner stroke).
    lastSyncedRef.current = incoming;
    pixelsRef.current = incoming;
    setPixels(incoming);
    markSeen(incoming);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvas?.updatedAt, canvas?.updatedBy, seenLoaded]);

  // Cleanup timers on unmount.
  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (replayTimer.current) clearInterval(replayTimer.current);
    },
    [],
  );

  // Cinematic entrance for the discovery replay: the board starts slightly
  // zoomed-in and soft, then springs into crisp focus as the strokes land —
  // like a camera settling on the page. Native-driver scale/opacity only, so
  // it costs nothing against the 60fps budget (a blur here would).
  const cinema = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (replaying) {
      cinema.setValue(0);
      Animated.spring(cinema, { toValue: 1, useNativeDriver: true, ...springs.gentle }).start();
    }
  }, [replaying, cinema]);
  const cinemaStyle = {
    opacity: cinema.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }),
    transform: [{ scale: cinema.interpolate({ inputRange: [0, 1], outputRange: [1.06, 1] }) }],
  };

  const flushSave = () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const p = pixelsRef.current;
    if (p === lastSyncedRef.current) return;
    lastSyncedRef.current = p;
    markSeen(p);
    void app.saveCanvas(p); // wrapped write, never rejects
  };
  const scheduleSave = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flushSave, 700);
  };

  const paintIndex = (index: number) => {
    const next = paintAt(pixelsRef.current, index, colorRef.current);
    if (next === pixelsRef.current) return; // already that colour
    pixelsRef.current = next;
    setPixels(next);
    tickHaptic(45); // light tick per freshly-filled pixel
    scheduleSave();
  };
  const paintFromEvent = (evt: { nativeEvent: { locationX: number; locationY: number } }) => {
    if (replayingRef.current) return; // drawing is locked during the replay
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
    if (replayingRef.current) return;
    drawingRef.current = true;
    paintFromEvent(e);
  };
  handlers.current.move = (e) => paintFromEvent(e);
  handlers.current.release = () => {
    drawingRef.current = false;
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
    !replaying;

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
          {replaying
            ? `${partner} drew this, watch it appear…`
            : lastBy
              ? `Last touched by ${lastBy}. Pick a colour and draw, ${partner} sees every pixel as you go.`
              : `A blank page for the two of you. Pick a colour and draw, ${partner} sees every pixel as you go.`}
        </Muted>
      )}

      {/* The grid */}
      {loading ? (
        <Skeleton style={{ width: '100%', aspectRatio: 1, borderRadius: radius.lg }} />
      ) : (
        <Animated.View style={[styles.gridWrap, cinemaStyle]}>
          <View
            style={styles.grid}
            onLayout={(e) => setBox(e.nativeEvent.layout.width)}
            {...responder.panHandlers}
          >
            {box > 0
              ? Array.from({ length: CANVAS_SIZE }).map((_, r) => (
                  <GridRow key={r} row={pixels.slice(r * CANVAS_SIZE, (r + 1) * CANVAS_SIZE)} />
                ))
              : null}
          </View>

          {/* Skip the discovery replay */}
          {replaying ? (
            <Pressable onPress={skipReplay} style={styles.skip} accessibilityRole="button" accessibilityLabel="Skip replay">
              <Text style={styles.skipText}>Skip ›</Text>
            </Pressable>
          ) : null}
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
      <Button label="Clear canvas" variant="outline" color={colors.danger} disabled={blank || replaying} onPress={confirmClear} />

      <Card tone="surface" style={{ marginTop: spacing.lg }}>
        <Body>
          Tap or drag to paint. Strokes sync to {partner} automatically, and the board is saved the
          moment you lift your finger. 🎨
        </Body>
      </Card>
    </Screen>
  );
}

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
          selected && styles.swatchOn,
          { transform: [{ scale }] },
        ]}
      >
        {eraser ? <Text style={{ fontSize: 15 }}>⌫</Text> : null}
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

  skip: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(46,42,42,0.62)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  skipText: { color: colors.white, fontFamily: font.family.bold, fontSize: font.size.sm, letterSpacing: 0.3 },

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
  swatchOn: { borderWidth: 3, borderColor: colors.text },
  eraser: { backgroundColor: colors.surfaceAlt },
});
