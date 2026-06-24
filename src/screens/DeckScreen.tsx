import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  AppHeader,
  Body,
  Button,
  Card,
  Field,
  Muted,
  Screen,
  SectionTitle,
  Tag,
  Title,
} from '../components/ui';
import { formatRelative } from '../lib/date';
import { CATEGORY_LABEL, DECK, nextPromptFor, Prompt } from '../lib/intimacy';
import { useApp } from '../state/AppContext';
import { colors, font, spacing } from '../theme';

export default function DeckScreen({ navigation }: any) {
  const app = useApp();
  const { deck, meId, partnerId, identity } = app;
  const partnerName = identity?.partnerName ?? 'them';

  const [prompt, setPrompt] = useState<Prompt>(() => nextPromptFor(deck, meId));
  const [answer, setAnswer] = useState('');

  const myAnswer = deck.find((r) => r.authorId === meId && r.promptId === prompt.id);
  const partnerAnswer = deck.find((r) => r.authorId === partnerId && r.promptId === prompt.id);

  const history = useMemo(() => {
    const myIds = new Set(deck.filter((r) => r.authorId === meId).map((r) => r.promptId));
    return [...myIds]
      .map((pid) => ({
        pid,
        mine: deck.find((r) => r.authorId === meId && r.promptId === pid),
        theirs: deck.find((r) => r.authorId === partnerId && r.promptId === pid),
      }))
      .filter((x) => x.mine && x.pid !== prompt.id)
      .sort((a, b) => (b.mine?.createdAt ?? 0) - (a.mine?.createdAt ?? 0));
  }, [deck, meId, partnerId, prompt.id]);

  function drawAnother() {
    const pool = DECK.filter((p) => p.id !== prompt.id);
    if (pool.length === 0) return;
    const next = pool[Math.floor(Math.random() * pool.length)];
    if (!next) return;
    setPrompt(next);
    setAnswer('');
  }

  function submit() {
    // Clear the field immediately; fire the write without blocking on the ack.
    const a = answer.trim();
    setAnswer('');
    void app.addDeckResponse(prompt.id, prompt.text, a);
  }

  return (
    <Screen scroll>
      <AppHeader title="Intimacy deck" subtitle="Questions that bring you closer" onBack={() => navigation.goBack()} />

      <Card tone="violet">
        <Tag label={CATEGORY_LABEL[prompt.category]} color={colors.accent} />
        <Title style={{ marginTop: spacing.sm, fontSize: font.size.xl, lineHeight: 28 }}>{prompt.text}</Title>
      </Card>

      {/* My answer */}
      {myAnswer ? (
        <Card style={{ marginTop: spacing.md }} tone="rose">
          <Muted>Your answer</Muted>
          <Body style={{ marginTop: 4 }}>{myAnswer.answer}</Body>
        </Card>
      ) : (
        <Card style={{ marginTop: spacing.md }}>
          <Field value={answer} onChangeText={setAnswer} placeholder="Answer honestly, just for the two of you…" multiline />
          <Button label="Share my answer" disabled={!answer.trim()} onPress={submit} />
        </Card>
      )}

      {/* Partner answer */}
      {myAnswer ? (
        partnerAnswer ? (
          <Card style={{ marginTop: spacing.md }} tone="green">
            <Muted>{partnerName}’s answer</Muted>
            <Body style={{ marginTop: 4 }}>{partnerAnswer.answer}</Body>
          </Card>
        ) : (
          <Card style={{ marginTop: spacing.md }}>
            <Muted>Waiting for {partnerName} to answer this one. Their reply will appear here. 🤍</Muted>
          </Card>
        )
      ) : null}

      <View style={{ height: spacing.lg }} />
      <Button label="Draw another card 🃏" variant="soft" onPress={drawAnother} />

      {history.length > 0 ? (
        <>
          <SectionTitle>Answered together</SectionTitle>
          <View style={{ gap: spacing.md }}>
            {history.map(({ pid, mine, theirs }) => (
              <Card key={pid}>
                <Body style={{ fontFamily: font.family.semibold }}>{mine?.promptText}</Body>
                <View style={styles.answerRow}>
                  <Text style={[styles.who, { color: colors.primary }]}>You</Text>
                  <Body style={{ flex: 1 }}>{mine?.answer}</Body>
                </View>
                {theirs ? (
                  <View style={styles.answerRow}>
                    <Text style={[styles.who, { color: colors.accent }]}>{partnerName}</Text>
                    <Body style={{ flex: 1 }}>{theirs.answer}</Body>
                  </View>
                ) : (
                  <Muted style={{ marginTop: spacing.sm }}>{partnerName} hasn’t answered yet.</Muted>
                )}
                <Muted style={{ marginTop: spacing.sm }}>{mine ? formatRelative(mine.createdAt) : ''}</Muted>
              </Card>
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  answerRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  who: { width: 64, fontFamily: font.family.bold, fontSize: font.size.sm },
});
