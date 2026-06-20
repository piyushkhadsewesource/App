import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader, Body, Button, Card, Muted, Screen, Title } from '../components/ui';
import { tttWinner } from '../lib/games';
import { useApp } from '../state/AppContext';
import { colors, font, radius, spacing } from '../theme';

export default function TicTacToeScreen({ navigation }: any) {
  const app = useApp();
  const game = app.tictactoe;
  const partner = app.identity?.partnerName ?? 'them';

  const myMark = game ? (app.meId === game.xId ? 'X' : 'O') : '';
  const myTurn = !!game && game.turn === app.meId;
  const result = game ? tttWinner(game.board) : null;
  const over = result !== null;

  let status: string;
  if (!game) status = 'Start a game to play together.';
  else if (result === 'draw') status = 'It’s a draw 🤝';
  else if (over) status = result === myMark ? 'You won! 🎉' : `${partner} won 💫`;
  else status = myTurn ? 'Your turn' : `${partner}'s turn…`;

  return (
    <Screen scroll>
      <AppHeader title="Tic-Tac-Toe" subtitle="Take turns across the distance" onBack={() => navigation.goBack()} />

      <Card style={{ alignItems: 'center' }}>
        {game ? <Muted>You are {myMark}</Muted> : null}
        <Title style={{ marginTop: 6, marginBottom: spacing.lg }}>{status}</Title>

        <View style={styles.board}>
          {Array.from({ length: 9 }).map((_, i) => {
            const cell = game ? game.board[i] : '-';
            const playable = !!game && myTurn && !over && cell === '-';
            return (
              <Pressable
                key={i}
                disabled={!playable}
                onPress={() => app.playTicTacToe(i)}
                style={[styles.cell, playable && styles.cellPlayable]}
              >
                <Text style={[styles.mark, { color: cell === 'X' ? colors.primary : colors.accent }]}>
                  {cell === '-' ? '' : cell}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ height: spacing.lg }} />
        <Button label={game ? 'New game' : 'Start a game'} onPress={() => app.newTicTacToe()} style={{ alignSelf: 'stretch' }} />
      </Card>

      <Card tone="surface" style={{ marginTop: spacing.lg }}>
        <Body>
          Whoever starts a game plays X and goes first. Tap a square on your turn and {partner} sees
          it instantly, then plays O. First to three in a row wins.
        </Body>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  board: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  cell: {
    width: '31.5%',
    aspectRatio: 1,
    marginBottom: '3%',
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellPlayable: { borderWidth: 2, borderColor: colors.primary },
  mark: { fontSize: 44, fontFamily: font.family.display },
});
