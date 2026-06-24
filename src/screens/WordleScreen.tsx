import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader, Card, Muted, Screen, Title } from '../components/ui';
import { todayISO } from '../lib/date';
import { hLight, hSuccess, hWarn } from '../lib/haptics';
import { dailyWord, keyboardStates, LetterState, MAX_GUESSES, scoreGuess, WORD_LEN } from '../lib/wordle';
import { Celebrate } from '../components/Celebrate';
import { useApp } from '../state/AppContext';
import { colors, font, radius, shadow, spacing } from '../theme';

const STATE_BG: Record<LetterState, string> = {
  correct: colors.good,
  present: colors.gold,
  absent: '#9B9197',
};
const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

function emojiFor(s: LetterState) {
  return s === 'correct' ? '🟩' : s === 'present' ? '🟨' : '⬛';
}

export default function WordleScreen({ navigation }: any) {
  const app = useApp();
  const date = todayISO();
  const answer = useMemo(() => dailyWord(date), [date]);
  const partner = app.identity?.partnerName ?? 'them';

  const myDoc = app.wordle.find((w) => w.id === `${date}:${app.meId}`);
  const partnerDoc = app.wordle.find((w) => w.id === `${date}:${app.partnerId}`);
  const guesses = myDoc?.guesses ?? [];
  const solved = guesses.includes(answer);
  const done = solved || guesses.length >= MAX_GUESSES;

  const [cur, setCur] = useState('');
  const [msg, setMsg] = useState('');
  const shake = useRef(new Animated.Value(0)).current;
  const rowAnims = useRef([...Array(MAX_GUESSES)].map(() => new Animated.Value(1))).current;
  const prevCount = useRef(guesses.length);

  // Pop the row that was just revealed, with a matching haptic.
  useEffect(() => {
    if (guesses.length > prevCount.current) {
      const r = guesses.length - 1;
      if (rowAnims[r]) {
        rowAnims[r].setValue(0);
        Animated.spring(rowAnims[r], { toValue: 1, friction: 5, tension: 140, useNativeDriver: true }).start();
      }
      if (guesses[r] === answer) hSuccess();
      else hLight();
    }
    prevCount.current = guesses.length;
  }, [guesses.length, guesses, answer, rowAnims]);

  function toast(text: string) {
    hWarn();
    setMsg(text);
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 1, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: true }),
    ]).start();
    setTimeout(() => setMsg((m) => (m === text ? '' : m)), 1400);
  }

  const onKey = (k: string) => {
    if (!done && cur.length < WORD_LEN) {
      hLight();
      setCur(cur + k);
    }
  };
  const onDelete = () => setCur((c) => c.slice(0, -1));
  const onEnter = async () => {
    if (done) return;
    if (cur.length < WORD_LEN) {
      toast('Not enough letters');
      return;
    }
    const guess = cur.toUpperCase();
    const next = [...guesses, guess];
    setCur('');
    await app.recordWordle({ date, guesses: next, solved: next.includes(answer) });
  };

  const keyStates = useMemo(() => keyboardStates(guesses, answer), [guesses, answer]);

  const rows = [];
  for (let r = 0; r < MAX_GUESSES; r++) {
    if (r < guesses.length) rows.push({ letters: guesses[r], states: scoreGuess(guesses[r], answer) });
    else if (r === guesses.length && !done) rows.push({ letters: cur.padEnd(WORD_LEN), states: null });
    else rows.push({ letters: '     ', states: null });
  }

  return (
    <>
      <Screen scroll>
      <AppHeader title="Daily Wordle" subtitle="One shared word, every day" onBack={() => navigation.goBack()} />

      {/* Toast */}
      <View style={styles.toastWrap}>
        {msg ? (
          <View style={styles.toast}>
            <Text style={styles.toastText}>{msg}</Text>
          </View>
        ) : null}
      </View>

      {/* Grid */}
      <Animated.View style={[styles.grid, { transform: [{ translateX: shake.interpolate({ inputRange: [-1, 1], outputRange: [-9, 9] }) }] }]}>
        {rows.map((row, ri) => (
          <Animated.View
            key={ri}
            style={[
              styles.gridRow,
              {
                opacity: rowAnims[ri],
                transform: [{ scale: rowAnims[ri].interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
              },
            ]}
          >
            {Array.from({ length: WORD_LEN }).map((_, ci) => {
              const ch = (row.letters[ci] ?? ' ').trim();
              const st = row.states ? row.states[ci] : null;
              const filled = ch.length > 0;
              return (
                <View
                  key={ci}
                  style={[
                    styles.tile,
                    st
                      ? { backgroundColor: STATE_BG[st], borderColor: STATE_BG[st] }
                      : { backgroundColor: colors.surface, borderColor: filled ? colors.textSoft : colors.border },
                  ]}
                >
                  <Text style={[styles.tileText, { color: st ? colors.white : colors.text }]}>{ch}</Text>
                </View>
              );
            })}
          </Animated.View>
        ))}
      </Animated.View>

      {/* Result */}
      {done ? (
        <Card tone={solved ? 'green' : 'rose'} style={{ marginTop: spacing.lg }}>
          <Title>{solved ? `Solved in ${guesses.length}/${MAX_GUESSES} 🎉` : `So close! It was ${answer}`}</Title>
          <Text style={styles.share}>
            {guesses.map((g) => scoreGuess(g, answer).map(emojiFor).join('')).join('\n')}
          </Text>
          <Muted style={{ marginTop: spacing.sm }}>A fresh word lands tomorrow.</Muted>
        </Card>
      ) : null}

      {/* Partner */}
      <Card style={{ marginTop: spacing.md }}>
        <Muted>{partner}'s game today</Muted>
        <Text style={styles.partnerLine}>
          {partnerDoc
            ? partnerDoc.solved
              ? `Solved in ${partnerDoc.guesses.length}/${MAX_GUESSES} ${'🟩'}`
              : partnerDoc.guesses.length >= MAX_GUESSES
              ? 'Gave it a good go today'
              : `Playing now… ${partnerDoc.guesses.length} guess${partnerDoc.guesses.length === 1 ? '' : 'es'} in`
            : `${partner} hasn't played today's word yet`}
        </Text>
      </Card>

      {/* Keyboard */}
      <View style={styles.kb}>
        {ROWS.map((row, ri) => (
          <View key={ri} style={styles.kbRow}>
            {ri === 2 ? <KeyCap label="↵" wide onPress={onEnter} /> : null}
            {row.split('').map((k) => (
              <KeyCap key={k} label={k} state={keyStates[k]} onPress={() => onKey(k)} />
            ))}
            {ri === 2 ? <KeyCap label="⌫" wide onPress={onDelete} /> : null}
          </View>
        ))}
      </View>
      </Screen>
      <Celebrate play={solved} />
    </>
  );
}

function KeyCap({ label, state, wide, onPress }: { label: string; state?: LetterState; wide?: boolean; onPress: () => void }) {
  const bg = state ? STATE_BG[state] : '#E7DED8';
  const fg = state ? colors.white : colors.text;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.key, { backgroundColor: bg, flex: wide ? 1.6 : 1 }, pressed && { opacity: 0.7 }]}
    >
      <Text style={[styles.keyText, { color: fg, fontSize: wide ? 16 : font.size.md }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  toastWrap: { alignItems: 'center', height: 30, justifyContent: 'center' },
  toast: { backgroundColor: colors.text, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 5 },
  toastText: { color: colors.white, fontFamily: font.family.semibold, fontSize: font.size.sm },

  grid: { alignSelf: 'center', width: '86%', maxWidth: 330, gap: 7 },
  gridRow: { flexDirection: 'row', gap: 7 },
  tile: { flex: 1, aspectRatio: 1, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  tileText: { fontSize: 28, fontFamily: font.family.bold, textTransform: 'uppercase' },

  share: { marginTop: spacing.sm, fontSize: 16, lineHeight: 20, letterSpacing: 2 },
  partnerLine: { marginTop: 4, fontSize: font.size.md, fontFamily: font.family.semibold, color: colors.text },

  kb: { marginTop: spacing.xl, gap: spacing.sm },
  kbRow: { flexDirection: 'row', justifyContent: 'center', gap: 5 },
  key: { height: 52, borderRadius: 8, alignItems: 'center', justifyContent: 'center', ...shadow.soft },
  keyText: { fontFamily: font.family.bold },
});
