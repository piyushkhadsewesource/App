import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Celebrate } from '../components/Celebrate';
import Dice from '../components/Dice';
import { AppHeader, Body, Button, Card, Muted, Screen } from '../components/ui';
import { hMedium, hSuccess } from '../lib/haptics';
import { HOME_COL, legalTokens, PATH, SAFE, Side, tokenRC } from '../lib/ludo';
import { useApp } from '../state/AppContext';
import { colors, font, gradients, radius, shadow, spacing } from '../theme';

const N = 15;
const A_BG = '#F7C0CF';
const B_BG = '#CFC4F3';

const PATH_INDEX = new Map<string, number>();
PATH.forEach(([r, c], i) => PATH_INDEX.set(`${r},${c}`, i));
const HOME_A = new Set(HOME_COL.a.map(([r, c]) => `${r},${c}`));
const HOME_B = new Set(HOME_COL.b.map(([r, c]) => `${r},${c}`));

function cellBg(r: number, c: number): string {
  const key = `${r},${c}`;
  if (PATH_INDEX.has(key)) {
    const idx = PATH_INDEX.get(key)!;
    if (idx === 0) return A_BG;
    if (idx === 26) return B_BG;
    return SAFE.has(idx) ? colors.goldSoft : colors.surface;
  }
  if (HOME_A.has(key)) return A_BG;
  if (HOME_B.has(key)) return B_BG;
  if (r >= 6 && r <= 8 && c >= 6 && c <= 8) return 'transparent';
  if (r < 6 && c < 6) return colors.primarySoft;
  if (r > 8 && c > 8) return colors.accentSoft;
  return colors.surfaceAlt;
}

export default function LudoScreen({ navigation }: any) {
  const app = useApp();
  const g = app.ludo;
  const partner = app.identity?.partnerName ?? 'them';

  const [size, setSize] = React.useState(0);
  const cell = size / N;
  const tokenSize = cell * 0.78;

  const isA = !g || app.meId === g.aId;
  const mySide: Side = isA ? 'a' : 'b';
  // Each player owns a fixed colour (side a = rose, side b = violet). Colour the
  // chips by *side* so "You" always matches your own pawns and house on the
  // board, on both phones. (Previously "You" was hardcoded rose, so player B saw
  // a rose label over their violet pawns, and the colours looked swapped.)
  const myGrad = isA ? gradients.gameRose : gradients.gameViolet;
  const theirGrad = isA ? gradients.gameViolet : gradients.gameRose;
  const myTokens = g ? (isA ? g.aTokens : g.bTokens) : [];
  const myTurn = !!g && g.turn === app.meId && !g.winner;
  const over = !!g && !!g.winner;
  const iWon = over && g!.winner === app.meId;
  const legal = useMemo(
    () => (g && myTurn && g.mustMove ? legalTokens(myTokens, g.die) : []),
    [g, myTurn, myTokens],
  );

  // Animated pawn positions.
  const anims = useRef({
    a: [0, 1, 2, 3].map(() => new Animated.ValueXY()),
    b: [0, 1, 2, 3].map(() => new Animated.ValueXY()),
  }).current;
  const aKey = g ? g.aTokens.join(',') : '';
  const bKey = g ? g.bTokens.join(',') : '';
  useEffect(() => {
    if (!size || !g) return;
    (['a', 'b'] as Side[]).forEach((side) => {
      const tokens = side === 'a' ? g.aTokens : g.bTokens;
      tokens.forEach((p, i) => {
        const [row, col] = tokenRC(side, i, p);
        const target = { x: (col + 0.5) * cell - tokenSize / 2, y: (row + 0.5) * cell - tokenSize / 2 };
        Animated.timing(anims[side][i], { toValue: target, duration: 380, useNativeDriver: true }).start();
      });
    });
  }, [aKey, bKey, size, cell, tokenSize, anims, g]);

  // Pulse for movable tokens.
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 620, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 620, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] });

  useEffect(() => {
    if (over) hSuccess();
  }, [over]);

  let status: string;
  if (!g) status = 'Start a game to play together';
  else if (over) status = iWon ? 'You got all four home, you win! 🎉' : `${partner} won this one 💫`;
  else if (myTurn && g.mustMove) status = `You rolled ${g.die}, tap a glowing token`;
  else if (myTurn) status = 'Your roll';
  else if (g.mustMove) status = `${partner} is moving…`;
  else status = `${partner}'s roll…`;

  const homeCount = (tokens: number[]) => tokens.filter((p) => p === 56).length;

  return (
    <>
      <Screen scroll>
      <AppHeader title="Ludo" subtitle="Race all four tokens home" onBack={() => navigation.goBack()} />

      <View style={styles.players}>
        <PlayerChip
          name="You"
          grad={myGrad}
          home={g ? homeCount(myTokens) : 0}
          active={myTurn}
          activeLabel={g && g.mustMove ? '🎲 your move' : '🎲 your roll'}
          pulseScale={pulseScale}
        />
        <PlayerChip
          name={partner}
          grad={theirGrad}
          home={g ? homeCount(isA ? g.bTokens : g.aTokens) : 0}
          active={!!g && !myTurn && !over}
          activeLabel={g && g.mustMove ? 'moving…' : 'rolling…'}
          pulseScale={pulseScale}
        />
      </View>

      <View style={styles.board} onLayout={(e) => setSize(e.nativeEvent.layout.width)}>
        {Array.from({ length: N }).map((_, r) => (
          <View key={r} style={styles.row}>
            {Array.from({ length: N }).map((__, c) => {
              const key = `${r},${c}`;
              const safe = PATH_INDEX.has(key) && SAFE.has(PATH_INDEX.get(key)!);
              return (
                <View key={c} style={[styles.cell, { backgroundColor: cellBg(r, c) }]}>
                  {safe ? <Text style={styles.star}>★</Text> : null}
                </View>
              );
            })}
          </View>
        ))}

        {/* Center home triangles */}
        {size > 0 ? <Center cell={cell} /> : null}

        {/* Pawns */}
        {size > 0 && g ? (
          <View style={StyleSheet.absoluteFill}>
            {(['a', 'b'] as Side[]).flatMap((side) => {
              const tokens = side === 'a' ? g.aTokens : g.bTokens;
              const grad = side === 'a' ? gradients.gameRose : gradients.gameViolet;
              return tokens.map((p, i) => {
                const movable = side === mySide && legal.includes(i);
                return (
                  <Animated.View
                    key={`${side}${i}`}
                    style={{
                      position: 'absolute',
                      width: tokenSize,
                      height: tokenSize,
                      zIndex: movable ? 3 : 2,
                      transform: anims[side][i].getTranslateTransform(),
                    }}
                  >
                    <Pressable
                      disabled={!movable}
                      onPress={() => {
                        hMedium();
                        app.moveLudo(i);
                      }}
                      style={{ flex: 1 }}
                    >
                      <Animated.View style={[styles.pawn, movable && styles.pawnMovable, movable && { transform: [{ scale: pulseScale }] }]}>
                        <LinearGradient colors={grad} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={styles.pawnFill}>
                          <View style={styles.pawnShine} />
                        </LinearGradient>
                      </Animated.View>
                    </Pressable>
                  </Animated.View>
                );
              });
            })}
          </View>
        ) : null}
      </View>

      <Card style={{ marginTop: spacing.lg, alignItems: 'center' }}>
        <Dice value={g ? g.die : 0} spinKey={g?.updatedAt} />
        <Body style={{ marginTop: spacing.md, fontFamily: font.family.semibold, textAlign: 'center' }}>{status}</Body>
        <View style={{ height: spacing.md }} />
        {g && !over && myTurn && !g.mustMove ? (
          <Button label="🎲  Roll the dice" color={myGrad[1]} onPress={() => { hMedium(); app.rollLudo(); }} style={{ alignSelf: 'stretch' }} />
        ) : g && !over ? (
          <Button label={g.mustMove && myTurn ? 'Tap a glowing token above' : `Waiting for ${partner}…`} onPress={() => {}} disabled style={{ alignSelf: 'stretch' }} />
        ) : (
          <Button label={g ? 'Play again' : 'Start a game'} onPress={() => app.newLudo()} style={{ alignSelf: 'stretch' }} />
        )}
      </Card>

      <Card tone="surface" style={{ marginTop: spacing.md }}>
        <Muted>
          Roll a 6 to send a token out of base, then race it around to home. Land on {partner} to send
          them back, ★ squares are safe, and a 6 earns another roll. First with all four home wins.
        </Muted>
      </Card>
      </Screen>
      {/* Confetti rains down when you win. */}
      <Celebrate play={iWon} />
    </>
  );
}

function Center({ cell }: { cell: number }) {
  const S = cell * 3;
  const half = S / 2;
  const tri = (color: string, side: 'top' | 'bottom' | 'left' | 'right') => {
    const base: any = { position: 'absolute', width: 0, height: 0, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: 'transparent', borderBottomColor: 'transparent' };
    if (side === 'top') return { ...base, top: 0, left: 0, borderLeftWidth: half, borderRightWidth: half, borderTopWidth: half, borderTopColor: color };
    if (side === 'bottom') return { ...base, bottom: 0, left: 0, borderLeftWidth: half, borderRightWidth: half, borderBottomWidth: half, borderBottomColor: color };
    if (side === 'left') return { ...base, left: 0, top: 0, borderTopWidth: half, borderBottomWidth: half, borderLeftWidth: half, borderLeftColor: color };
    return { ...base, right: 0, top: 0, borderTopWidth: half, borderBottomWidth: half, borderRightWidth: half, borderRightColor: color };
  };
  return (
    <View style={{ position: 'absolute', left: 6 * cell, top: 6 * cell, width: S, height: S, borderRadius: cell * 0.35, overflow: 'hidden', backgroundColor: colors.surface }}>
      <View style={tri('#F7C0CF', 'left')} />
      <View style={tri('#CFC4F3', 'right')} />
      <View style={tri('#F6D79A', 'top')} />
      <View style={tri('#A8E0CD', 'bottom')} />
      <View style={{ position: 'absolute', left: half - cell * 0.42, top: half - cell * 0.42, width: cell * 0.84, height: cell * 0.84, borderRadius: cell * 0.42, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadow.soft }}>
        <Text style={{ fontSize: cell * 0.5 }}>🏠</Text>
      </View>
    </View>
  );
}

function PlayerChip({
  name,
  grad,
  home,
  active,
  activeLabel,
  pulseScale,
}: {
  name: string;
  grad: readonly [string, string];
  home: number;
  active: boolean;
  activeLabel: string;
  pulseScale: Animated.AnimatedInterpolation<number>;
}) {
  return (
    <View style={[styles.chip, active && { borderColor: grad[1], backgroundColor: grad[1] + '16' }]}>
      <View style={styles.chipDotWrap}>
        {active ? (
          <Animated.View style={[styles.chipRing, { borderColor: grad[1], transform: [{ scale: pulseScale }] }]} />
        ) : null}
        <LinearGradient colors={grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.chipDot} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.chipName}>{name}</Text>
        <Text style={[styles.chipState, { color: active ? grad[1] : colors.textFaint }]} numberOfLines={1}>
          {active ? activeLabel : `${home}/4 home`}
        </Text>
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
  chipDotWrap: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  chipDot: { width: 20, height: 20, borderRadius: 10 },
  chipRing: { position: 'absolute', width: 20, height: 20, borderRadius: 10, borderWidth: 2 },
  chipName: { fontFamily: font.family.bold, color: colors.text, fontSize: font.size.md },
  chipState: { fontSize: 11, fontFamily: font.family.semibold },

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
  row: { flex: 1, flexDirection: 'row' },
  cell: { flex: 1, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(90,46,64,0.07)', alignItems: 'center', justifyContent: 'center' },
  star: { fontSize: 9, color: colors.gold },

  pawn: { flex: 1, borderRadius: 999, borderWidth: 2.5, borderColor: colors.white, overflow: 'hidden', ...shadow.card },
  pawnMovable: { borderColor: colors.gold, borderWidth: 3 },
  pawnFill: { flex: 1, alignItems: 'center', justifyContent: 'flex-start' },
  pawnShine: { width: '38%', height: '38%', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.55)', marginTop: '14%' },
});
