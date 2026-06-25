// A tiny dependency-free line chart of feeling intensity (1..10) across the day.
// Pass a single `items` list (one wave) or `series` (several overlaid waves, so
// both partners' days can rise and fall on the same axis).
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

export type ChartSeries = { items: FeelingEntry[]; color?: string };

function clock(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours();
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(d.getMinutes()).padStart(2, '0')}${h < 12 ? 'a' : 'p'}`;
}

const minuteOfDay = (ts: number) => {
  const d = new Date(ts);
  return d.getHours() * 60 + d.getMinutes();
};

export default function IntensityChart({ items, series }: { items?: FeelingEntry[]; series?: ChartSeries[] }) {
  const groups: ChartSeries[] = (series ?? (items ? [{ items }] : [])).filter((g) => g.items.length > 0);
  const [w, setW] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);
  const innerW = Math.max(1, w - PAD_L - PAD_R);
  const innerH = H - PAD_T - PAD_B;

  const allMins = groups.flatMap((g) => g.items.map((f) => minuteOfDay(f.createdAt)));
  const minX = allMins.length ? Math.min(...allMins) : 0;
  const maxX = allMins.length ? Math.max(...allMins) : 1440;
  const spanX = Math.max(60, maxX - minX);
  const totalPts = allMins.length;

  const px = (mins: number) => PAD_L + (totalPts > 1 ? ((mins - minX) / spanX) * innerW : innerW / 2);
  const py = (intensity: number) => PAD_T + (1 - (Math.max(1, Math.min(10, intensity)) - 1) / 9) * innerH;

  // Earliest / latest moment across every wave, for the x-axis end labels.
  const allTs = groups.flatMap((g) => g.items.map((f) => f.createdAt));
  const firstTs = allTs.length ? Math.min(...allTs) : 0;
  const lastTs = allTs.length ? Math.max(...allTs) : 0;

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

          {groups.map((g, gi) => {
            const lineColor = g.color ?? colors.accent;
            const pts = g.items.map((f) => ({ x: px(minuteOfDay(f.createdAt)), y: py(f.intensity), f }));
            return (
              <React.Fragment key={`g${gi}`}>
                {pts.slice(1).map((b, i) => {
                  const a = pts[i];
                  const dx = b.x - a.x;
                  const dy = b.y - a.y;
                  const len = Math.sqrt(dx * dx + dy * dy);
                  const angle = Math.atan2(dy, dx);
                  return (
                    <View
                      key={`l${gi}-${i}`}
                      style={{
                        position: 'absolute',
                        left: (a.x + b.x) / 2 - len / 2,
                        top: (a.y + b.y) / 2 - 1.5,
                        width: len,
                        height: 3,
                        borderRadius: 2,
                        backgroundColor: lineColor,
                        transform: [{ rotateZ: `${angle}rad` }],
                      }}
                    />
                  );
                })}
                {pts.map((p, i) => (
                  <View
                    key={`d${gi}-${i}`}
                    style={[styles.dot, { left: p.x - 6, top: p.y - 6, backgroundColor: g.color ?? moodMeta(p.f.mood).color }]}
                  />
                ))}
              </React.Fragment>
            );
          })}

          {totalPts > 0 ? (
            <Text style={[styles.xLabel, { left: PAD_L - 4 }]}>{clock(firstTs)}</Text>
          ) : null}
          {totalPts > 1 ? <Text style={[styles.xLabel, { right: PAD_R - 4 }]}>{clock(lastTs)}</Text> : null}
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
