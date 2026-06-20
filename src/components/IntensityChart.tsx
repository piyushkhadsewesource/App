// A tiny dependency-free line chart of feeling intensity (1..10) across the day.
import React, { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { moodMeta } from '../lib/mood';
import { colors, font } from '../theme';
import { FeelingEntry } from '../types/models';

const H = 170;
const PAD_L = 26;
const PAD_R = 14;
const PAD_T = 14;
const PAD_B = 26;

function clock(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours();
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(d.getMinutes()).padStart(2, '0')}${h < 12 ? 'a' : 'p'}`;
}

export default function IntensityChart({ items }: { items: FeelingEntry[] }) {
  const [w, setW] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);
  const innerW = Math.max(1, w - PAD_L - PAD_R);
  const innerH = H - PAD_T - PAD_B;

  const xs = items.map((f) => {
    const d = new Date(f.createdAt);
    return d.getHours() * 60 + d.getMinutes();
  });
  const minX = xs.length ? Math.min(...xs) : 0;
  const maxX = xs.length ? Math.max(...xs) : 1440;
  const spanX = Math.max(60, maxX - minX);
  const px = (i: number) =>
    PAD_L + (xs.length > 1 ? ((xs[i] - minX) / spanX) * innerW : innerW / 2);
  const py = (intensity: number) =>
    PAD_T + (1 - (Math.max(1, Math.min(10, intensity)) - 1) / 9) * innerH;

  const pts = items.map((f, i) => ({ x: px(i), y: py(f.intensity), f }));

  return (
    <View onLayout={onLayout} style={{ height: H }}>
      {w > 0 ? (
        <>
          {[10, 5, 1].map((lvl) => (
            <React.Fragment key={lvl}>
              <View style={[styles.grid, { top: py(lvl), left: PAD_L, width: innerW }]} />
              <Text style={[styles.yLabel, { top: py(lvl) - 7 }]}>{lvl}</Text>
            </React.Fragment>
          ))}
          {pts.slice(1).map((b, i) => {
            const a = pts[i];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);
            return (
              <View
                key={`l${i}`}
                style={{
                  position: 'absolute',
                  left: (a.x + b.x) / 2 - len / 2,
                  top: (a.y + b.y) / 2 - 1.5,
                  width: len,
                  height: 3,
                  borderRadius: 2,
                  backgroundColor: colors.accent,
                  transform: [{ rotateZ: `${angle}rad` }],
                }}
              />
            );
          })}
          {pts.map((p, i) => (
            <View
              key={`d${i}`}
              style={[styles.dot, { left: p.x - 6, top: p.y - 6, backgroundColor: moodMeta(p.f.mood).color }]}
            />
          ))}
          {pts.length > 0 ? (
            <Text style={[styles.xLabel, { left: Math.max(PAD_L - 4, pts[0].x - 14) }]}>
              {clock(pts[0].f.createdAt)}
            </Text>
          ) : null}
          {pts.length > 1 ? (
            <Text style={[styles.xLabel, { right: PAD_R - 4 }]}>{clock(pts[pts.length - 1].f.createdAt)}</Text>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { position: 'absolute', height: 1, backgroundColor: colors.border },
  yLabel: {
    position: 'absolute',
    left: 2,
    width: 18,
    textAlign: 'right',
    fontSize: 10,
    color: colors.textFaint,
    fontFamily: font.family.body,
  },
  xLabel: { position: 'absolute', bottom: 2, fontSize: 10, color: colors.textFaint, fontFamily: font.family.body },
  dot: { position: 'absolute', width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: colors.surface },
});
