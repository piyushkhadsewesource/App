import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader, Body, Button, Card, Muted, Screen } from '../components/ui';
import { HOME_COL, legalTokens, PATH, SAFE, Side, tokenRC } from '../lib/ludo';
import { useApp } from '../state/AppContext';
import { colors, font, radius, shadow, spacing } from '../theme';

const N = 15;
const A_BG = '#F4B6C7';
const B_BG = '#C9BEF0';

// Lookups for cell colouring.
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
  if (r >= 6 && r <= 8 && c >= 6 && c <= 8) return '#F2ECF6';
  if (r < 6 && c < 6) return colors.primarySoft;
  if (r > 8 && c > 8) return colors.accentSoft;
  return colors.surfaceAlt;
}

export default function LudoScreen({ navigation }: any) {
  const app = useApp();
  const g = app.ludo;
  const partner = app.identity?.partnerName ?? 'them';

  const isA = !g || app.meId === g.aId;
  const mySide: Side = isA ? 'a' : 'b';
  const myTokens = g ? (isA ? g.aTokens : g.bTokens) : [];
  const myTurn = !!g && g.turn === app.meId && !g.winner;
  const over = !!g && !!g.winner;
  const iWon = over && g!.winner === app.meId;
  const legal = useMemo(
    () => (g && myTurn && g.mustMove ? legalTokens(myTokens, g.die) : []),
    [g, myTurn, myTokens],
  );

  let status: string;
  if (!g) status = 'Start a game to play together';
  else if (over) status = iWon ? 'You got all four home, you win! 🎉' : `${partner} won this one 💫`;
  else if (myTurn && g.mustMove) status = `You rolled ${g.die}, tap a glowing token`;
  else if (myTurn) status = 'Your roll';
  else if (g.mustMove) status = `${partner} is moving…`;
  else status = `${partner}'s roll…`;

  const homeCount = (tokens: number[]) => tokens.filter((p) => p === 56).length;

  return (
    <Screen scroll>
      <AppHeader title="Ludo" subtitle="Race all four tokens home" onBack={() => navigation.goBack()} />

      <View style={styles.players}>
        <PlayerChip name="You" color={colors.primary} home={g ? homeCount(myTokens) : 0} active={myTurn} />
        <PlayerChip
          name={partner}
          color={colors.accent}
          home={g ? homeCount(isA ? g.bTokens : g.aTokens) : 0}
          active={!!g && !myTurn && !over}
        />
      </View>

      {/* Board */}
      <View style={styles.board}>
        {Array.from({ length: N }).map((_, r) => (
          <View key={r} style={styles.row}>
            {Array.from({ length: N }).map((__, c) => {
              const key = `${r},${c}`;
              const safe = PATH_INDEX.has(key) && SAFE.has(PATH_INDEX.get(key)!);
              return (
                <View key={c} style={[styles.cell, { backgroundColor: cellBg(r, c) }]}>
                  {safe ? <Text style={styles.star}>★</Text> : null}
                  {r === 7 && c === 7 ? <Text style={styles.home}>🏠</Text> : null}
                </View>
              );
            })}
          </View>
        ))}

        {/* Tokens overlay */}
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {g
            ? (['a', 'b'] as Side[]).flatMap((side) => {
                const tokens = side === 'a' ? g.aTokens : g.bTokens;
                const color = side === 'a' ? colors.primary : colors.accent;
                return tokens.map((p, i) => {
                  const [row, col] = tokenRC(side, i, p);
                  const movable = side === mySide && legal.includes(i);
                  return (
                    <Pressable
                      key={`${side}${i}`}
                      disabled={!movable}
                      onPress={() => app.moveLudo(i)}
                      style={{
                        position: 'absolute',
                        left: `${(col / N) * 100}%`,
                        top: `${(row / N) * 100}%`,
                        width: `${100 / N}%`,
                        height: `${100 / N}%`,
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: movable ? 2 : 1,
                      }}
                    >
                      <View style={[styles.token, { backgroundColor: color }, movable && styles.tokenMovable]} />
                    </Pressable>
                  );
                });
              })
            : null}
        </View>
      </View>

      {/* Dice + controls */}
      <Card style={{ marginTop: spacing.lg, alignItems: 'center' }}>
        <View style={styles.die}>
          <Text style={styles.dieText}>{g && g.die > 0 ? g.die : '🎲'}</Text>
        </View>
        <Body style={{ marginTop: spacing.sm, fontFamily: font.family.semibold, textAlign: 'center' }}>{status}</Body>
        <View style={{ height: spacing.md }} />
        {g && !over && myTurn && !g.mustMove ? (
          <Button label="🎲  Roll the dice" onPress={() => app.rollLudo()} style={{ alignSelf: 'stretch' }} />
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
  );
}

function PlayerChip({ name, color, home, active }: { name: string; color: string; home: number; active: boolean }) {
  return (
    <View style={[styles.chip, active && { borderColor: color, backgroundColor: color + '12' }]}>
      <View style={[styles.chipDot, { backgroundColor: color }]} />
      <View>
        <Text style={styles.chipName}>{name}</Text>
        <Text style={[styles.chipState, { color: active ? color : colors.textFaint }]}>{home}/4 home</Text>
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
  chipDot: { width: 18, height: 18, borderRadius: 9 },
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
  },
  row: { flex: 1, flexDirection: 'row' },
  cell: { flex: 1, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(90,46,64,0.08)', alignItems: 'center', justifyContent: 'center' },
  star: { fontSize: 9, color: colors.gold },
  home: { fontSize: 18 },

  token: { width: '66%', height: '66%', borderRadius: 999, borderWidth: 2, borderColor: colors.white, ...shadow.soft },
  tokenMovable: { borderColor: colors.gold, borderWidth: 3, transform: [{ scale: 1.12 }] },

  die: { width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', ...shadow.soft },
  dieText: { fontSize: 30, fontFamily: font.family.display, color: colors.primary },
});
