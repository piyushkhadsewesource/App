import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import {
  CANVAS_PAPER,
  CANVAS_SIZE,
  EMPTY_CELL,
  colorForPixel,
  isBlank,
  normalizeCanvas,
  parseStrokes,
  strokePath,
} from '../lib/canvas';
import { radius } from '../theme';

/**
 * A tiny, read-only preview of the shared canvas — a live thumbnail of the
 * couple's drawing. Strokes are stored in normalized coordinates, so the same
 * paths that fill the big canvas redraw here pixel-perfect at any size. The
 * legacy pixel board renders underneath. Memoized on its inputs so it only
 * re-renders when the drawing actually changes.
 */
function CanvasMiniBase({
  pixels,
  strokes,
  size = 60,
}: {
  pixels?: string | null;
  strokes?: string | null;
  size?: number;
}) {
  const p = normalizeCanvas(pixels);
  const ink = parseStrokes(strokes);
  const cell = size / CANVAS_SIZE;
  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {!isBlank(p)
          ? Array.from(p).map((ch, i) =>
              ch === EMPTY_CELL ? null : (
                <Rect
                  key={i}
                  x={(i % CANVAS_SIZE) * cell}
                  y={Math.floor(i / CANVAS_SIZE) * cell}
                  width={cell + 0.3}
                  height={cell + 0.3}
                  fill={colorForPixel(ch)}
                />
              ),
            )
          : null}
        {ink.map((s, i) => (
          <Path
            key={`s${i}`}
            d={strokePath(s.p, size)}
            stroke={s.c}
            strokeWidth={Math.max(0.8, s.w * size)}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ))}
      </Svg>
    </View>
  );
}

export const CanvasMini = React.memo(CanvasMiniBase);

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: CANVAS_PAPER,
  },
});
