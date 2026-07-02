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
import { hSuccess } from '../lib/haptics';
import { useToast } from '../components/ToastHost';
import { CATEGORY_LABEL, DECK, nextPromptFor, promptById, Prompt } from '../lib/intimacy';
import { useApp } from '../state/AppContext';
import { colors, font, spacing } from '../theme';

export default function DeckScreen({ navigation }: any) {
  const app = useApp();
  const { deck, meId, partnerId, identity } = app;
  const partnerName = identity?.partnerName ?? 'them';
  const toast = useToast();

  const [prompt, setPrompt] = useState<Prompt>(() => nextPromptFor(deck, meId));
  const [answer, setAnswer] = useState('');
  const [sending, setSending] = useState(false);

  const myAnswer = deck.find((r) => r.authorId === meId && r.promptId === prompt.id);
  const partnerAnswer = deck.find((r) => r.authorId === partnerId && r.promptId === prompt.id);

  // "Draw another card" (and simply opening the deck on different days once
  // each of you has answered a different number of prompts) means the two of
  // you are very often NOT looking at the same card. Any answer to a card
  // that isn't your partner's *current* one, and that you haven't personally
  // answered yourself, used to be invisible forever: it only ever showed on
  // the current card (wrong card) or in "Answered together" below (which only
  // ever looked at prompts *you'd* answered). `waiting` surfaces those
  // partner-only answers as a prompt to answer — without leaking the answer
  // text itself, preserving the "reveal only once both have answered" design.
  const waiting = useMemo(() => {
    const myIds = new Set(deck.filter((r) => r.authorId === meId).map((r) => r.promptId));
    const theirIds = new Set(deck.filter((r) => r.authorId === partnerId).map((r) => r.promptId));
    const onlyTheirs: { pid: string; createdAt: number }[] = [];
    for (const r of deck) {
      if (r.authorId === partnerId && !myIds.has(r.promptId) && r.promptId !== prompt.id) {
        onlyTheirs.push({ pid: r.promptId, createdAt: r.createdAt });
      }
    }
    return onlyTheirs
      .filter((w) => theirIds.has(w.pid)) // defensive; always true given the loop above
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [deck, meId, partnerId, prompt.id]);

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

  function openWaiting(pid: string) {
    const p = promptById(pid);
    if (!p) return;
    setPrompt(p);
    setAnswer('');
  }

  async function submit() {
    const a = answer.trim();
    if (!a || sending) return;
    // Clear the field optimistically so the tap feels instant, but keep the
    // text around to restore if the write actually fails (e.g. partner's
    // network — or yours — drops mid-send): losing a typed answer silently
    // is worse than a brief "still sending" state.
    setAnswer('');
    setSending(true);
    if (__DEV__) console.log('[tether:sync] deck submit →', { promptId: prompt.id, chars: a.length });
    const ok = await app.addDeckResponse(prompt.id, prompt.text, a);
    setSending(false);
    if (ok) {
      hSuccess(); // a warm "it reached them" pulse (no-op on web)
      toast.show('Answer shared 🤍');
    } else {
      setAnswer(a); // give the words back — nothing was lost
      toast.show("Couldn't send — check your connection and try again");
    }
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
          <Field value={answer} onChangeText={setAnswer} placeholder="Answer honestly, just for the two of you…" multiline editable={!sending} />
          <Button label={sending ? 'Sending…' : 'Share my answer'} disabled={!answer.trim() || sending} onPress={submit} />
        </Card>
      )}

      {/* Partner answer */}
      {myAnswer ? (
        partnerAnswer ? (
          <Card style={{ marginTop: spacing.md }} tone="green">
            <Muted>{partnerName}'s answer</Muted>
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

      {waiting.length > 0 ? (
        <>
          <SectionTitle>{partnerName} answered these</SectionTitle>
          <View style={{ gap: spacing.md }}>
            {waiting.map(({ pid }) => {
              const p = promptById(pid);
              if (!p) return null;
              return (
                <Card key={pid} tone="gold" onPress={() => openWaiting(pid)}>
                  <Tag label={CATEGORY_LABEL[p.category]} color={colors.accent} />
                  <Body style={{ marginTop: spacing.sm, fontFamily: font.family.semibold }}>{p.text}</Body>
                  <Muted style={{ marginTop: spacing.sm }}>
                    {partnerName} already answered — tap to add yours and see it 🤍
                  </Muted>
                </Card>
              );
            })}
          </View>
        </>
      ) : null}

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
                  <Muted style={{ marginTop: spacing.sm }}>{partnerName} hasn't answered yet.</Muted>
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
