import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader, Card, Muted, Screen, Title } from '../components/ui';
import { Reveal } from '../components/Motion';
import { todayISO } from '../lib/date';
import { hLight, hSuccess, hWarn } from '../lib/haptics';
import { dailyWord, keyboardStates, LetterState, MAX_GUESSES, scoreGuess, WORD_LEN } from '../lib/wordle';
import { Celebrate } from '../components/Celebrate';
import { useApp } from '../state/AppContext';
import { colors, font, radius, shadow, spacing } from '../theme';
import { easeOut, prefersReducedMotion } from '../theme/motion';

// Deepened fills: these carry white 28px letters, so they need more ink than
// the accent shades (3:1 large-text floor).
const STATE_BG: Record<LetterState, string> = {
  correct: colors.goodDeep,
  present: colors.goldDeep,
  absent: colors.mutedDeep,
};
const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
const TILE_STAGGER = 70; // ms between tiles in a revealed row
const FLIP_IN = 90; // to the edge
const FLIP_OUT = 110; // landing, slightly softer

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

  // The row that was JUST submitted flips tile by tile; rows that arrive in a
  // bulk hydrate (cold open, sync catch-up) render settled — the drama belongs
  // to the moment of play, not to loading. Computed at render time so tiles
  // mount with the right instruction.
  const prevCountRef = useRef(guesses.length);
  const revealRow = guesses.length === prevCountRef.current + 1 ? guesses.length - 1 : -1;
  useEffect(() => {
    prevCountRef.current = guesses.length;
  }, [guesses.length]);

  // Celebration waits for the last tile to land.
  const [celebrate, setCelebrate] = useState(() => solved);
  useEffect(() => {
    if (revealRow < 0) return;
    const justSolved = guesses[revealRow] === answer;
    const settle = prefersReducedMotion() ? 0 : (WORD_LEN - 1) * TILE_STAGGER + FLIP_IN + FLIP_OUT + 30;
    const id = setTimeout(() => {
      if (justSolved) {
        hSuccess();
        if (!prefersReducedMotion()) setCelebrate(true);
      }
    }, settle);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guesses.length]);

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
          <View key={ri} style={styles.gridRow}>
            {Array.from({ length: WORD_LEN }).map((_, ci) => {
              const ch = (row.letters[ci] ?? ' ').trim();
              const st = row.states ? row.states[ci] : null;
              return (
                <FlipTile
                  // Remount when the row gets scored, so the flip runs exactly once.
                  key={`${ci}-${row.states ? 's' : 'p'}`}
                  ch={ch}
                  state={st}
                  animate={ri === revealRow}
                  delay={ci * TILE_STAGGER}
                />
              );
            })}
          </View>
        ))}
      </Animated.View>

      {/* Result */}
      {done ? (
        <Card tone={solved ? 'green' : 'rose'} style={{ marginTop: spacing.lg }}>
          <Title>{solved ? `Solved in ${guesses.length}/${MAX_GUESSES} 🎉` : `So close! It was ${answer}`}</Title>
          {/* The share grid assembles itself row by row: it's the artifact */}
          <View style={{ marginTop: spacing.sm }}>
            {guesses.map((g, i) => (
              <Reveal key={i} delay={i * 55} distance={6}>
                <Text style={styles.share}>{scoreGuess(g, answer).map(emojiFor).join('')}</Text>
              </Reveal>
            ))}
          </View>
          <Muted style={{ marginTop: spacing.sm }}>A fresh word lands tomorrow.</Muted>
        </Card>
      ) : null}

      {/* Partner: their real board, colors only — never the letters */}
      <Card style={{ marginTop: spacing.md }}>
        <Muted>{partner}'s game today</Muted>
        {partnerDoc && partnerDoc.guesses.length > 0 ? (
          <View style={styles.ghost}>
            {partnerDoc.guesses.map((g, ri) => (
              <View key={ri} style={styles.ghostRow}>
                {scoreGuess(g, answer).map((st, ci) => (
                  <View key={ci} style={[styles.ghostTile, { backgroundColor: STATE_BG[st] }]} />
                ))}
              </View>
            ))}
          </View>
        ) : null}
        <Text style={styles.partnerLine}>
          {partnerDoc
            ? partnerDoc.solved
              ? `Solved in ${partnerDoc.guesses.length}/${MAX_GUESSES} 🟩`
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
            {ri === 2 ? <KeyCap label="↵" wide onPress={onEnter} accessibilityLabel="Enter" /> : null}
            {row.split('').map((k) => (
              <KeyCap key={k} label={k} state={keyStates[k]} onPress={() => onKey(k)} />
            ))}
            {ri === 2 ? <KeyCap label="⌫" wide onPress={onDelete} accessibilityLabel="Delete" /> : null}
          </View>
        ))}
      </View>
      </Screen>
      <Celebrate play={celebrate} />
    </>
  );
}

/**
 * One tile. On reveal it flips to its edge (fast, ease-in: leaving), swaps to
 * its scored color at 90°, and lands (slightly softer). Each tile stays well
 * under 300ms; the row spends its suspense one letter at a time. Reduced
 * motion: the color simply appears.
 */
function FlipTile({
  ch,
  state,
  animate,
  delay,
}: {
  ch: string;
  state: LetterState | null;
  animate: boolean;
  delay: number;
}) {
  const reduce = prefersReducedMotion();
  const run = animate && !reduce;
  const v = useRef(new Animated.Value(run ? 0 : 1)).current;
  const [shown, setShown] = useState(!run);
  useEffect(() => {
    if (!run) return;
    const id = setTimeout(() => {
      Animated.timing(v, { toValue: 0.5, duration: FLIP_IN, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(() => {
        setShown(true);
        hLight(); // a tick as each letter lands
        Animated.timing(v, { toValue: 1, duration: FLIP_OUT, easing: easeOut, useNativeDriver: true }).start();
      });
    }, delay);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const rotateX = v.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['0deg', '90deg', '0deg'] });
  const filled = ch.length > 0;
  const colored = shown && state ? STATE_BG[state] : null;
  return (
    <Animated.View
      style={[
        styles.tile,
        { transform: [{ perspective: 800 }, { rotateX }] },
        colored
          ? { backgroundColor: colored, borderColor: colored }
          : { backgroundColor: colors.surface, borderColor: filled ? colors.textSoft : colors.border },
      ]}
    >
      <Text style={[styles.tileText, { color: colored ? colors.white : colors.text }]}>{ch}</Text>
    </Animated.View>
  );
}

/**
 * A key. Pressed ~30 times a game, so feedback is physical and instant — a
 * 1px sink and a small scale, never an opacity fade (fades read as disabled).
 */
function KeyCap({
  label,
  state,
  wide,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  state?: LetterState;
  wide?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  const press = useRef(new Animated.Value(0)).current;
  const to = (v: number, ms: number) =>
    Animated.timing(press, { toValue: v, duration: ms, easing: easeOut, useNativeDriver: true }).start();
  const bg = state ? STATE_BG[state] : colors.keycap;
  const fg = state ? colors.white : colors.text;
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => to(1, 60)}
      onPressOut={() => to(0, 100)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={{ flex: wide ? 1.6 : 1 }}
    >
      <Animated.View
        style={[
          styles.key,
          { backgroundColor: bg },
          {
            transform: [
              { scale: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.94] }) },
              { translateY: press.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) },
            ],
          },
        ]}
      >
        <Text style={[styles.keyText, { color: fg, fontSize: wide ? 16 : font.size.md }]}>{label}</Text>
      </Animated.View>
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

  share: { fontSize: 16, lineHeight: 20, letterSpacing: 2 },
  partnerLine: { marginTop: spacing.sm, fontSize: font.size.md, fontFamily: font.family.semibold, color: colors.text },

  // The ghost grid: their rows, no letters. Honest tease, zero spoilers.
  ghost: { marginTop: spacing.sm, gap: 3 },
  ghostRow: { flexDirection: 'row', gap: 3 },
  ghostTile: { width: 18, height: 18, borderRadius: 4 },

  kb: { marginTop: spacing.xl, gap: spacing.sm },
  kbRow: { flexDirection: 'row', justifyContent: 'center', gap: 5 },
  key: { height: 52, borderRadius: 8, alignItems: 'center', justifyContent: 'center', ...shadow.soft },
  keyText: { fontFamily: font.family.bold },
});
