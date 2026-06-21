import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppHeader, Body, Button, Card, Muted, Screen } from '../components/ui';
import { boardRows, isLadder, isSnake } from '../lib/snakes';
import { useApp } from '../state/AppContext';
import { colors, font, radius, shadow, spacing } from '../theme';

const ROWS = boardRows();

export default function SnakesScreen({ navigation }: any) {
  const app = useApp();
  const g = app.snakes;
  const partner = app.identity?.partnerName ?? 'them';

  const isA = !g || app.meId === g.aId;
  const myPos = g ? (isA ? g.aPos : g.bPos) : 0;
  const theirPos = g ? (isA ? g.bPos : g.aPos) : 0;
  const myTurn = !!g && g.turn === app.meId && !g.winner;
  const over = !!g && !!g.winner;
  const iWon = over && g!.winner === app.meId;

  const myColor = colors.primary;
  const theirColor = colors.accent;

  let status: string;
  if (!g) status = 'Start a game to play together';
  else if (over) status = iWon ? 'You reached 100, you win! 🎉' : `${partner} reached 100 first 💫`;
  else if (g.roll > 0) status = `${g.rolledBy === app.meId ? 'You' : partner} rolled a ${g.roll}`;
  else status = myTurn ? 'Your roll' : `${partner}'s roll…`;

  return (
    <Screen scroll>
      <AppHeader title="Snakes & Ladders" subtitle="First to 100 wins" onBack={() => navigation.goBack()} />

      <View style={styles.players}>
        <PlayerChip name="You" pos={myPos} color={myColor} active={myTurn} />
        <PlayerChip name={partner} pos={theirPos} color={theirColor} active={!!g && !myTurn && !over} />
      </View>

      <View style={styles.board}>
        {ROWS.map((row, ri) => (
          <View key={ri} style={styles.boardRow}>
            {row.map((num) => {
              const ladder = isLadder(num);
              const snake = isSnake(num);
              const meHere = !!g && (isA ? g.aPos : g.bPos) === num;
              const themHere = !!g && (isA ? g.bPos : g.aPos) === num;
              return (
                <View key={num} style={[styles.cell, ladder && styles.ladderCell, snake && styles.snakeCell]}>
                  <Text style={styles.cellNum}>{num}</Text>
                  {ladder ? <Text style={styles.cellIcon}>🪜</Text> : snake ? <Text style={styles.cellIcon}>🐍</Text> : null}
                  <View style={styles.tokenRow}>
                    {meHere ? <View style={[styles.token, { backgroundColor: myColor }]} /> : null}
                    {themHere ? <View style={[styles.token, { backgroundColor: theirColor }]} /> : null}
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </View>

      <Card style={{ marginTop: spacing.lg, alignItems: 'center' }}>
        <View style={styles.die}>
          <Text style={styles.dieText}>{g && g.roll > 0 ? g.roll : '🎲'}</Text>
        </View>
        <Body style={{ marginTop: spacing.sm, fontFamily: font.family.semibold, textAlign: 'center' }}>{status}</Body>
        <View style={{ height: spacing.md }} />
        {g && !over ? (
          <Button
            label={myTurn ? '🎲  Roll the dice' : `Waiting for ${partner}…`}
            onPress={() => app.rollSnakes()}
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
  );
}

function PlayerChip({ name, pos, color, active }: { name: string; pos: number; color: string; active: boolean }) {
  return (
    <View style={[styles.chip, active && { borderColor: color, backgroundColor: color + '12' }]}>
      <View style={[styles.chipDot, { backgroundColor: color }]} />
      <View>
        <Text style={styles.chipName}>{name}</Text>
        <Text style={[styles.chipPos, { color: active ? color : colors.textFaint }]}>{pos === 0 ? 'At start' : `On ${pos}`}</Text>
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
  chipPos: { fontSize: 11, fontFamily: font.family.semibold },

  board: { width: '100%', borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  boardRow: { flexDirection: 'row' },
  cell: {
    width: '10%',
    aspectRatio: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ladderCell: { backgroundColor: colors.goodSoft },
  snakeCell: { backgroundColor: colors.dangerSoft },
  cellNum: { position: 'absolute', top: 1, left: 2, fontSize: 8, color: colors.textFaint, fontFamily: font.family.semibold },
  cellIcon: { fontSize: 11, opacity: 0.75 },
  tokenRow: { position: 'absolute', bottom: 2, flexDirection: 'row', gap: 2 },
  token: { width: 9, height: 9, borderRadius: 5, borderWidth: 1, borderColor: colors.white },

  die: { width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', ...shadow.soft },
  dieText: { fontSize: 30, fontFamily: font.family.display, color: colors.primary },
});
