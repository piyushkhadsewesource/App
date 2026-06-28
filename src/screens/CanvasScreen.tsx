import React, { useEffect, useRef, useState } from 'react';
import { Alert, PanResponder, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader, Body, Button, Card, Muted, Screen } from '../components/ui';
import { Skeleton, useInitialHydrate } from '../components/Skeleton';
import { hLight, hMedium } from '../lib/haptics';
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
import { useApp } from '../state/AppContext';
import { colors, font, radius, shadow, spacing } from '../theme';

const haptic = (fn: () => void) => {
  if (Platform.OS !== 'web') fn();
};

export default function CanvasScreen({ navigation }: any) {
  const app = useApp();
  const canvas = app.canvas;
  const partner = app.identity?.partnerName ?? 'them';

  // Skeleton only while a cloud space is still settling on first load.
  const hydrating = useInitialHydrate();
  const loading = app.cloud && hydrating && !canvas;

  const [pixels, setPixels] = useState<string>(() => normalizeCanvas(canvas?.pixels));
  const [color, setColor] = useState<string>(CANVAS_SWATCHES[1].ch); // default: Rose
  const [box, setBox] = useState(0); // measured grid side length (px)

  // The PanResponder is created once; these refs keep its handlers reading the
  // latest values (color, cell size, current pixels) with no stale closures.
  const pixelsRef = useRef(pixels);
  const colorRef = useRef(color);
  const cellRef = useRef(0);
  const drawingRef = useRef(false);
  const lastSyncedRef = useRef(pixels); // what we believe is already on the server
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  pixelsRef.current = pixels;
  colorRef.current = color;
  cellRef.current = box > 0 ? box / CANVAS_SIZE : 0;

  // Adopt incoming updates (the partner's strokes, or the first load) only when
  // we're not mid-stroke, so a live edit is never clobbered underfoot.
  useEffect(() => {
    if (!canvas) return;
    const incoming = normalizeCanvas(canvas.pixels);
    if (!drawingRef.current && incoming !== lastSyncedRef.current) {
      lastSyncedRef.current = incoming;
      setPixels(incoming);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvas?.updatedAt, canvas?.updatedBy]);

  // Flush any pending write on unmount.
  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    },
    [],
  );

  const flushSave = () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const p = pixelsRef.current;
    if (p === lastSyncedRef.current) return; // nothing new since last sync
    lastSyncedRef.current = p;
    void app.saveCanvas(p); // AppContext write is wrapped + never rejects
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
    scheduleSave();
  };
  const paintFromEvent = (evt: { nativeEvent: { locationX: number; locationY: number } }) => {
    const cs = cellRef.current;
    if (!cs) return;
    const { locationX, locationY } = evt.nativeEvent;
    const col = Math.floor(locationX / cs);
    const row = Math.floor(locationY / cs);
    if (col < 0 || col >= CANVAS_SIZE || row < 0 || row >= CANVAS_SIZE) return;
    paintIndex(row * CANVAS_SIZE + col);
  };

  // Keep the responder calling the freshest closures via a handlers ref.
  const handlers = useRef({
    grant: (_e: any) => {},
    move: (_e: any) => {},
    release: () => {},
  });
  handlers.current.grant = (e) => {
    drawingRef.current = true;
    haptic(hLight);
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
    haptic(hMedium);
  }

  function confirmClear() {
    if (isBlank(pixelsRef.current)) return; // nothing to erase
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
            setPixels(EMPTY_CANVAS);
            haptic(hMedium);
            void app.clearCanvas();
          },
        },
      ],
    );
  }

  const lastBy = canvas?.updatedBy ? (app.isMine(canvas.updatedBy) ? 'you' : partner) : null;
  const blank = isBlank(pixels);

  return (
    <Screen scroll>
      <AppHeader title="Our Shared Canvas" subtitle="Draw together, in real time" onBack={() => navigation.goBack()} />

      <Muted style={{ marginBottom: spacing.md }}>
        {lastBy
          ? `Last touched by ${lastBy}. Pick a colour and draw, ${partner} sees every pixel as you go.`
          : `A blank page for the two of you. Pick a colour and draw, ${partner} sees every pixel as you go.`}
      </Muted>

      {/* The grid */}
      {loading ? (
        <Skeleton style={{ width: '100%', aspectRatio: 1, borderRadius: radius.lg }} />
      ) : (
        <View style={styles.gridWrap}>
          <View
            style={styles.grid}
            onLayout={(e) => setBox(e.nativeEvent.layout.width)}
            {...responder.panHandlers}
          >
            {box > 0
              ? Array.from({ length: CANVAS_SIZE }).map((_, r) => (
                  <View key={r} style={styles.row}>
                    {Array.from({ length: CANVAS_SIZE }).map((__, c) => {
                      const i = r * CANVAS_SIZE + c;
                      return <View key={c} style={[styles.cell, { backgroundColor: colorForPixel(pixels[i]) }]} />;
                    })}
                  </View>
                ))
              : null}
          </View>
        </View>
      )}

      {/* Palette */}
      <Text style={styles.paletteLabel}>Colours</Text>
      <View style={styles.palette}>
        {CANVAS_SWATCHES.map((s) => {
          const on = color === s.ch;
          return (
            <Pressable
              key={s.ch}
              onPress={() => selectColor(s.ch)}
              accessibilityRole="button"
              accessibilityLabel={s.name}
              accessibilityState={{ selected: on }}
              hitSlop={6}
              style={({ pressed }) => (pressed ? { transform: [{ scale: 0.92 }] } : null)}
            >
              <View style={[styles.swatch, { backgroundColor: s.color }, on && styles.swatchOn]} />
            </Pressable>
          );
        })}
        {/* Eraser paints the empty cell */}
        <Pressable
          onPress={() => selectColor(EMPTY_CELL)}
          accessibilityRole="button"
          accessibilityLabel="Eraser"
          accessibilityState={{ selected: color === EMPTY_CELL }}
          hitSlop={6}
          style={({ pressed }) => (pressed ? { transform: [{ scale: 0.92 }] } : null)}
        >
          <View style={[styles.swatch, styles.eraser, color === EMPTY_CELL && styles.swatchOn]}>
            <Text style={{ fontSize: 15 }}>⌫</Text>
          </View>
        </Pressable>
      </View>

      <View style={{ height: spacing.lg }} />
      <Button
        label="Clear canvas"
        variant="outline"
        color={colors.danger}
        disabled={blank}
        onPress={confirmClear}
      />

      <Card tone="surface" style={{ marginTop: spacing.lg }}>
        <Body>
          Tap or drag to paint. Strokes sync to {partner} automatically, and the board is saved the
          moment you lift your finger. 🎨
        </Body>
      </Card>
    </Screen>
  );
}

const GRID_BORDER = 'rgba(90,46,64,0.06)';

const styles = StyleSheet.create({
  gridWrap: {
    borderRadius: radius.lg,
    padding: 6,
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
  cell: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GRID_BORDER,
  },

  paletteLabel: {
    fontSize: font.size.sm,
    fontFamily: font.family.semibold,
    color: colors.textSoft,
    letterSpacing: font.tracking.label,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  palette: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    alignItems: 'center',
  },
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
  swatchOn: {
    borderWidth: 3,
    borderColor: colors.text,
    transform: [{ scale: 1.08 }],
  },
  eraser: { backgroundColor: colors.surfaceAlt },
});
