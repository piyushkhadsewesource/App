import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader, Body, Card, Muted, Screen, Title } from '../components/ui';
import { KNOW_ME } from '../lib/games';
import { useApp } from '../state/AppContext';
import { colors, font, radius, shadow, spacing } from '../theme';

type Tab = 'me' | 'them' | 'scores';

export default function KnowMeScreen({ navigation }: any) {
  const app = useApp();
  const partner = app.identity?.partnerName ?? 'them';
  const [tab, setTab] = useState<Tab>('me');

  const ans = (prefix: 't' | 'g', qid: string, who: string) =>
    app.gameAnswers.find(
      (a) => a.game === 'knowme' && a.promptId === `${prefix}:${qid}` && a.authorId === who,
    );
  const myTruth = (qid: string) => ans('t', qid, app.meId);
  const myGuess = (qid: string) => ans('g', qid, app.meId);
  const partnerTruth = (qid: string) => ans('t', qid, app.partnerId);
  const partnerGuess = (qid: string) => ans('g', qid, app.partnerId);

  const youKnow = KNOW_ME.filter((q) => myGuess(q.id) && partnerTruth(q.id));
  const youCorrect = youKnow.filter((q) => myGuess(q.id)!.choice === partnerTruth(q.id)!.choice).length;
  const theyKnow = KNOW_ME.filter((q) => partnerGuess(q.id) && myTruth(q.id));
  const theyCorrect = theyKnow.filter((q) => partnerGuess(q.id)!.choice === myTruth(q.id)!.choice).length;

  return (
    <Screen scroll>
      <AppHeader
        title="How well do you know me?"
        subtitle="Answer about you, guess about them"
        onBack={() => navigation.goBack()}
      />

      <View style={styles.segment}>
        <Seg label="About you" active={tab === 'me'} onPress={() => setTab('me')} />
        <Seg label={`Guess ${partner}`} active={tab === 'them'} onPress={() => setTab('them')} />
        <Seg label="Scores" active={tab === 'scores'} onPress={() => setTab('scores')} />
      </View>

      {tab === 'scores' ? (
        <View style={{ gap: spacing.md }}>
          <Card tone="rose">
            <Muted>How well you know {partner}</Muted>
            <Title style={{ marginTop: 4, fontSize: font.size.xxl }}>
              {youKnow.length ? `${youCorrect} / ${youKnow.length}` : 'Not yet'}
            </Title>
            <Muted style={{ marginTop: 2 }}>Guess their answers, then they reveal their truth.</Muted>
          </Card>
          <Card tone="violet">
            <Muted>How well {partner} knows you</Muted>
            <Title style={{ marginTop: 4, fontSize: font.size.xxl }}>
              {theyKnow.length ? `${theyCorrect} / ${theyKnow.length}` : 'Not yet'}
            </Title>
            <Muted style={{ marginTop: 2 }}>Set your own answers in “About you” so they can be scored.</Muted>
          </Card>
        </View>
      ) : (
        <View style={{ gap: spacing.md }}>
          {KNOW_ME.map((q) => {
            const prefix = tab === 'me' ? 't' : 'g';
            const selected = tab === 'me' ? myTruth(q.id) : myGuess(q.id);
            const pTruth = partnerTruth(q.id);
            const reveal = tab === 'them' && selected && pTruth;
            return (
              <Card key={q.id}>
                <Body style={{ fontFamily: font.family.semibold, marginBottom: spacing.sm }}>{q.q}…</Body>
                <View style={styles.opts}>
                  {q.options.map((opt, idx) => {
                    const picked = selected?.choice === idx;
                    return (
                      <Pressable
                        key={idx}
                        onPress={() => app.answerGame('knowme', `${prefix}:${q.id}`, idx)}
                        style={[styles.chip, picked && styles.chipOn]}
                      >
                        <Text style={[styles.chipText, picked && { color: colors.white }]}>{opt}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                {reveal ? (
                  <Muted style={{ marginTop: spacing.sm }}>
                    {selected!.choice === pTruth!.choice
                      ? '✓ Correct! You nailed it 💞'
                      : `Actually ${partner} said “${q.options[pTruth!.choice] ?? '?'}”`}
                  </Muted>
                ) : tab === 'them' && selected ? (
                  <Muted style={{ marginTop: spacing.sm }}>Waiting for {partner} to set their answer…</Muted>
                ) : null}
              </Card>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

function Seg({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.seg, active && styles.segOn]}>
      <Text style={[styles.segText, active && styles.segTextOn]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    padding: 4,
    marginBottom: spacing.lg,
  },
  seg: { flex: 1, paddingVertical: spacing.sm, paddingHorizontal: 4, borderRadius: radius.pill, alignItems: 'center' },
  segOn: { backgroundColor: colors.surface, ...shadow.soft },
  segText: { fontSize: font.size.sm, fontFamily: font.family.semibold, color: colors.textSoft },
  segTextOn: { color: colors.text },
  opts: { gap: spacing.sm },
  chip: {
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontSize: font.size.md, fontFamily: font.family.semibold, color: colors.text },
});
