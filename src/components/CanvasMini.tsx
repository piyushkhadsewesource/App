import React from 'react';
import { StyleSheet, View } from 'react-native';
import { CANVAS_SIZE, colorForPixel, normalizeCanvas } from '../lib/canvas';
import { colors, radius } from '../theme';

/**
 * A tiny, read-only preview of the shared canvas — a live thumbnail of the
 * couple's drawing. Memoized on `pixels` so it only re-renders when the board
 * actually changes. Null/short/garbage input is coerced to a valid blank board.
 */
function CanvasMiniBase({ pixels, size = 60 }: { pixels?: string | null; size?: number }) {
  const p = normalizeCanvas(pixels);
  const cell = size / CANVAS_SIZE;
  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      {Array.from({ length: CANVAS_SIZE }).map((_, r) => (
        <View key={r} style={styles.row}>
          {Array.from({ length: CANVAS_SIZE }).map((__, c) => (
            <View
              key={c}
              style={{ width: cell, height: cell, backgroundColor: colorForPixel(p[r * CANVAS_SIZE + c]) }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

export const CanvasMini = React.memo(CanvasMiniBase);

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.sm,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  row: { flexDirection: 'row' },
});
