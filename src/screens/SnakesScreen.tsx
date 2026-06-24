import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Dice from '../components/Dice';
import { AppHeader, Body, Button, Card, Muted, Screen } from '../components/ui';
import { hMedium, hSuccess } from '../lib/haptics';
import { boardRows, SNL_JUMPS } from '../lib/snakes';
import { Celebrate } from '../components/Celebrate';
import { useApp } from '../state/AppContext';
import { colors, font, gradients, radius, shadow, spacing } from '../theme';

const LAYOUT = boardRows();
const NUM_POS = new Map<number, [number, number]>();
LAYOUT.forEach((row, ri) => row.forEach((num, ci) => NUM_POS.set(num, [ri, ci])));

const JUMPS = Object.entries(SNL_JUMPS).map(([f, t]) => ({ from: Number(f), to: t }));
const LADDERS = JUMPS.filter((j) => j.to > j.from);
const SNAKES = JUMPS.filter((j) => j.to < j.from);

function center(num: number, cell: number, size: number) {
  if (num <= 0) return { x: cell * 0.5, y: size - cell * 0.18 };
  const [ri, ci] = NUM_POS.get(num) ?? [9, 0];
  return { x: (ci + 0.5) * cell, y: (ri + 0.5) * cell };
}

// A straight line segment between two points (used for ladder rails & rungs).
function Line({ x1, y1, x2, y2, w, color, round }: { x1: number; y1: number; x2: number; y2: number; w: number; color: string; round?: boolean }) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const ang = Math.atan2(dy, dx);
  return (
    <View
      style={{
        position: 'absolute',
        left: (x1 + x2) / 2 - len / 2,
        top: (y1 + y2) / 2 - w / 2,
        width: len,
        height: w,
        borderRadius: round ? w / 2 : 0,
        backgroundColor: color,
        transform: [{ rotate: `${ang}rad` }],
      }}
    />
  );
}

function Ladder({ from, to, cell, size }: { from: number; to: number; cell: number; size: number }) {
  const a = center(from, cell, size);
  const b = center(to, cell, size);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  const gap = cell * 0.17;
  const rungs = Math.max(2, Math.round(len / (cell * 0.55)));
  return (
    <>
      <Line x1={a.x + px * gap} y1={a.y + py * gap} x2={b.x + px * gap} y2={b.y + py * gap} w={cell * 0.07} color="#C98A2E" round />
      <Line x1={a.x - px * gap} y1={a.y - py * gap} x2={b.x - px * gap} y2={b.y - py * gap} w={cell * 0.07} color="#C98A2E" round />
      {Array.from({ length: rungs - 1 }).map((_, i) => {
        const t = (i + 1) / rungs;
        const cx = a.x + dx * t;
        const cy = a.y + dy * t;
        return <Line key={i} x1={cx + px * gap} y1={cy + py * gap} x2={cx - px * gap} y2={cy - py * gap} w={cell * 0.06} color="#E0A94B" round />;
      })}
    </>
  );
}

function Snake({ from, to, cell, size, bend }: { from: number; to: number; cell: number; size: number; bend: number }) {
  const a = center(from, cell, size);
  const b = center(to, cell, size);
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const px = (-dy / len) * len * 0.22 * bend;
  const py = (dx / len) * len * 0.22 * bend;
  const cx = mx + px;
  const cy = my + py;
  const beads = Math.max(10, Math.round(len / (cell * 0.3)));
  const head = a;
  return (
    <>
      {Array.from({ length: beads + 1 }).map((_, i) => {
        const t = i / beads;
        const x = (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * cx + t * t * b.x;
        const y = (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * cy + t * t * b.y;
        const r = (cell * 0.2) * (1 - t) + cell * 0.08 * t; // taper head -> tail
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: x - r,
              top: y - r,
              width: r * 2,
              height: r * 2,
              borderRadius: r,
              backgroundColor: i % 2 === 0 ? '#5BB87E' : '#4CA06A',
            }}
          />
        );
      })}
      {/* head */}
      <View style={{ position: 'absolute', left: head.x - cell * 0.24, top: head.y - cell * 0.24, width: cell * 0.48, height: cell * 0.48, borderRadius: cell * 0.24, backgroundColor: '#3F8F5E', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: cell * 0.08 }}>
        <View style={{ width: cell * 0.1, height: cell * 0.1, borderRadius: cell * 0.05, backgroundColor: colors.white }} />
        <View style={{ width: cell * 0.1, height: cell * 0.1, borderRadius: cell * 0.05, backgroundColor: colors.white }} />
      </View>
    </>
  );
}

export default function SnakesScreen({ navigation }: any) {
  const app = useApp();
  const g = app.snakes;
  const partner = app.identity?.partnerName ?? 'them';

  const [size, setSize] = useState(0);
  const cell = size / 10;
  const onLayout = (e: LayoutChangeEvent) => setSize(e.nativeEvent.layout.width);

  const isA = !g || app.meId === g.aId;
  const myPos = g ? (isA ? g.aPos : g.bPos) : 0;
  const theirPos = g ? (isA ? g.bPos : g.aPos) : 0;
  const myTurn = !!g && g.turn === app.meId && !g.winner;
  const over = !!g && !!g.winner;
  const iWon = over && g!.winner === app.meId;

  // Animated token positions (absolute board coords).
  const tokenR = cell * 0.31;
  const posA = useRef(new Animated.ValueXY()).current;
  const posB = useRef(new Animated.ValueXY()).current;
  const aPos = g?.aPos ?? 0;
  const bPos = g?.bPos ?? 0;
  const sameCell = !!g && g.aPos === g.bPos;
  useEffect(() => {
    if (!size) return;
    const ca = center(aPos, cell, size);
    const cb = center(bPos, cell, size);
    const offA = sameCell ? -cell * 0.16 : 0;
    const offB = sameCell ? cell * 0.16 : 0;
    Animated.timing(posA, { toValue: { x: ca.x - tokenR + offA, y: ca.y - tokenR }, duration: 420, useNativeDriver: true }).start();
    Animated.timing(posB, { toValue: { x: cb.x - tokenR + offB, y: cb.y - tokenR }, duration: 420, useNativeDriver: true }).start();
  }, [aPos, bPos, size, cell, sameCell, tokenR, posA, posB]);

  useEffect(() => {
    if (iWon) hSuccess(); // only the winner gets the celebratory buzz
  }, [iWon]);

  let status: string;
  if (!g) status = 'Start a game to play together';
  else if (over) status = iWon ? 'You reached 100, you win! 🎉' : `${partner} reached 100 first 💫`;
  else if (g.roll > 0) status = `${g.rolledBy === app.meId ? 'You' : partner} rolled a ${g.roll}`;
  else status = myTurn ? 'Your roll' : `${partner}'s roll…`;

  const tokenSize = cell * 0.62;

  return (
    <>
      <Screen scroll>
      <AppHeader title="Snakes & Ladders" subtitle="First to 100 wins" onBack={() => navigation.goBack()} />

      <View style={styles.players}>
        <PlayerChip name="You" pos={myPos} grad={gradients.gameRose} active={myTurn} />
        <PlayerChip name={partner} pos={theirPos} grad={gradients.gameViolet} active={!!g && !myTurn && !over} />
      </View>

      <View style={styles.board} onLayout={onLayout}>
        {/* cells */}
        {LAYOUT.map((row, ri) => (
          <View key={ri} style={styles.boardRow}>
            {row.map((num) => {
              const checker = (ri + row.indexOf(num)) % 2 === 0;
              return (
                <View key={num} style={[styles.cell, { backgroundColor: checker ? '#FFFFFF' : '#FBF3EE' }]}>
                  <Text style={styles.cellNum}>{num}</Text>
                </View>
              );
            })}
          </View>
        ))}

        {/* ladders + snakes */}
        {size > 0 ? (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {LADDERS.map((l) => (
              <Ladder key={`l${l.from}`} from={l.from} to={l.to} cell={cell} size={size} />
            ))}
            {SNAKES.map((s, i) => (
              <Snake key={`s${s.from}`} from={s.from} to={s.to} cell={cell} size={size} bend={i % 2 === 0 ? 1 : -1} />
            ))}
          </View>
        ) : null}

        {/* tokens */}
        {size > 0 && g ? (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Token anim={posA} grad={gradients.gameRose} sizePx={tokenSize} />
            <Token anim={posB} grad={gradients.gameViolet} sizePx={tokenSize} />
          </View>
        ) : null}
      </View>

      <Card style={{ marginTop: spacing.lg, alignItems: 'center' }}>
        <Dice value={g ? g.roll : 0} spinKey={g?.updatedAt} />
        <Body style={{ marginTop: spacing.md, fontFamily: font.family.semibold, textAlign: 'center' }}>{status}</Body>
        <View style={{ height: spacing.md }} />
        {g && !over ? (
          <Button
            label={myTurn ? '🎲  Roll the dice' : `Waiting for ${partner}…`}
            onPress={() => {
              hMedium();
              app.rollSnakes();
            }}
            disabled={!myTurn}
            style={{ alignSelf: 'stretch' }}
          />
        ) : (
          <Button label={g ? 'Play again' : 'Start a game'} onPress={() => app.newSnakes()} style={{ alignSelf: 'stretch' }} />
        )}
      </Card>

      <Card tone="surface" style={{ marginTop: spacing.md }}>
        <Muted>
          🪜 ladders lift you up, 🐍 snakes slide you down. Land exactly on 100 to win. Roll on your
          turn and {partner} sees every move live.
        </Muted>
      </Card>
      </Screen>
      <Celebrate play={iWon} />
    </>
  );
}

function Token({ anim, grad, sizePx }: { anim: Animated.ValueXY; grad: readonly [string, string]; sizePx: number }) {
  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: sizePx,
        height: sizePx,
        borderRadius: sizePx / 2,
        borderWidth: 2.5,
        borderColor: colors.white,
        overflow: 'hidden',
        ...shadow.card,
        transform: anim.getTranslateTransform(),
      }}
    >
      <LinearGradient colors={grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }} />
    </Animated.View>
  );
}

function PlayerChip({ name, pos, grad, active }: { name: string; pos: number; grad: readonly [string, string]; active: boolean }) {
  return (
    <View style={[styles.chip, active && { borderColor: grad[1], backgroundColor: grad[1] + '12' }]}>
      <LinearGradient colors={grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.chipDot} />
      <View>
        <Text style={styles.chipName}>{name}</Text>
        <Text style={[styles.chipPos, { color: active ? grad[1] : colors.textFaint }]}>{pos === 0 ? 'At start' : `On ${pos}`}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  players: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.surface,
    ...shadow.soft,
  },
  chipDot: { width: 20, height: 20, borderRadius: 10 },
  chipName: { fontFamily: font.family.bold, color: colors.text, fontSize: font.size.md },
  chipPos: { fontSize: 11, fontFamily: font.family.semibold },

  board: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
    ...shadow.card,
  },
  boardRow: { flex: 1, flexDirection: 'row' },
  cell: { flex: 1, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(90,46,64,0.06)' },
  cellNum: { position: 'absolute', top: 2, left: 3, fontSize: 8, color: colors.textFaint, fontFamily: font.family.semibold },
});
