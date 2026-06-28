import React, { useRef } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader, Body, Button, Card, Muted, Screen } from '../components/ui';
import { EMPTY_BOARD, tttWinner, tttWinningLine } from '../lib/games';
import { Celebrate } from '../components/Celebrate';
import { useApp } from '../state/AppContext';
import { colors, font, radius, shadow, spacing } from '../theme';

export default function TicTacToeScreen({ navigation }: any) {
  const app = useApp();
  const game = app.tictactoe;
  const partner = app.identity?.partnerName ?? 'them';

  const myMark = game ? (app.meId === game.xId ? 'X' : 'O') : 'X';
  const otherMark = myMark === 'X' ? 'O' : 'X';
  const myTurn = !!game && game.turn === app.meId;
  const result = game ? tttWinner(game.board) : null;
  const line = game ? tttWinningLine(game.board) : null;
  const over = result !== null;

  let status: string;
  if (!game) status = 'Start a game to play together';
  else if (result === 'draw') status = "It's a draw 🤝";
  else if (over) status = result === myMark ? 'You won! 🎉' : `${partner} won 💫`;
  else status = myTurn ? 'Your turn' : `${partner}'s turn…`;

  // Guard against a second tap landing on the same synced board state before the
  // write round-trips (which would overwrite the first move). Each board state
  // (by updatedAt) accepts one move; the next arrives with a new stamp.
  const moveLock = useRef<number | null>(null);
  const play = (i: number) => {
    if (!game || moveLock.current === game.updatedAt) return;
    moveLock.current = game.updatedAt;
    app.playTicTacToe(i);
  };

  const startOrReset = () => {
    const inProgress = !!game && !over && game.board !== EMPTY_BOARD;
    if (!inProgress) {
      app.newTicTacToe();
      return;
    }
    Alert.alert('Start a new game?', `This clears the current game for you and ${partner}.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'New game', style: 'destructive', onPress: () => app.newTicTacToe() },
    ]);
  };

  return (
    <>
      <Screen scroll>
      <AppHeader title="Tic-Tac-Toe" subtitle="Take turns across the distance" onBack={() => navigation.goBack()} />

      {/* Players / whose turn */}
      <View style={styles.scoreRow}>
        <PlayerChip name="You" mark={myMark} color={colors.primary} active={!!game && myTurn && !over} />
        <Text style={styles.vs}>vs</Text>
        <PlayerChip name={partner} mark={otherMark} color={colors.accent} active={!!game && !myTurn && !over} />
      </View>

      <Text style={styles.status}>{status}</Text>

      {/* Board */}
      <View style={styles.board}>
        {Array.from({ length: 9 }).map((_, i) => {
          const cell = game ? game.board[i] : '-';
          const winning = !!line && line.includes(i);
          const playable = !!game && myTurn && !over && cell === '-';
          return (
            <Pressable
              key={i}
              disabled={!playable}
              onPress={() => play(i)}
              style={({ pressed }) => [
                styles.cell,
                winning && styles.cellWin,
                playable && styles.cellPlayable,
                pressed && playable && { transform: [{ scale: 0.96 }] },
              ]}
            >
              <Text
                style={[
                  styles.mark,
                  { color: cell === 'X' ? colors.primary : colors.accent },
                  winning && { color: colors.white },
                ]}
              >
                {cell === '-' ? '' : cell}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ height: spacing.lg }} />
      <Button label={game ? 'New game' : 'Start a game'} onPress={startOrReset} />

      <Card tone="surface" style={{ marginTop: spacing.lg }}>
        <Body>
          Whoever starts plays X and goes first. Tap a square on your turn and {partner} sees it
          instantly, then plays O. First to three in a row wins. 💞
        </Body>
        {game ? (
          <Muted style={{ marginTop: spacing.sm }}>
            You're {myMark} · {partner} is {otherMark}
          </Muted>
        ) : null}
      </Card>
      </Screen>
      <Celebrate play={over && result === myMark} />
    </>
  );
}

function PlayerChip({ name, mark, color, active }: { name: string; mark: string; color: string; active: boolean }) {
  return (
    <View style={[styles.chip, active && { borderColor: color, backgroundColor: color + '12' }]}>
      <View style={[styles.chipMark, { backgroundColor: color }]}>
        <Text style={styles.chipMarkText}>{mark}</Text>
      </View>
      <View>
        <Text style={styles.chipName}>{name}</Text>
        <Text style={[styles.chipState, { color: active ? color : colors.textFaint }]}>{active ? 'Your move' : 'Waiting'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  vs: { fontSize: font.size.sm, color: colors.textFaint, fontFamily: font.family.bold, textTransform: 'uppercase' },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    paddingRight: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.surface,
    ...shadow.soft,
  },
  chipMark: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  chipMarkText: { color: colors.white, fontSize: 20, fontFamily: font.family.display },
  chipName: { fontSize: font.size.md, fontFamily: font.family.bold, color: colors.text },
  chipState: { fontSize: 11, fontFamily: font.family.semibold },

  status: { fontSize: font.size.xl, fontFamily: font.family.displaySemi, color: colors.text, textAlign: 'center', marginVertical: spacing.lg },

  board: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  cell: {
    width: '31.5%',
    aspectRatio: 1,
    marginBottom: '3%',
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.soft,
  },
  cellPlayable: { borderColor: colors.primary, borderStyle: 'dashed' },
  cellWin: { backgroundColor: colors.good, borderColor: colors.good },
  mark: { fontSize: 46, fontFamily: font.family.display },
});
