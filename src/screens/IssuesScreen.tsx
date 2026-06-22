import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader, Body, Button, Card, Field, LevelSelector, Muted, Screen } from '../components/ui';
import { hLight } from '../lib/haptics';
import { FEELINGS, feelingEmoji, openCount, sortIssues, stepProgress, weightLabel } from '../lib/issues';
import { useApp } from '../state/AppContext';
import { colors, font, radius, shadow, spacing } from '../theme';
import { Issue } from '../types/models';

export default function IssuesScreen({ navigation }: any) {
  const app = useApp();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [feeling, setFeeling] = useState('');
  const [weight, setWeight] = useState(3);
  const [detail, setDetail] = useState('');

  const list = useMemo(() => sortIssues(app.issues), [app.issues]);
  const open = openCount(app.issues);

  const reset = () => {
    setTitle('');
    setFeeling('');
    setWeight(3);
    setDetail('');
    setAdding(false);
  };
  const openAdd = () => { hLight(); reset(); setAdding(true); };

  const save = async () => {
    if (!title.trim()) return;
    const payload = { title: title.trim(), feeling: feeling || undefined, weight, detail: detail.trim() || undefined };
    reset();
    const id = await app.raiseIssue(payload);
    if (id) navigation.navigate('IssueDetail', { id });
  };

  return (
    <Screen scroll>
      <AppHeader title="Clear the air" subtitle="Raise it gently, sort it together" onBack={() => navigation.goBack()} />

      {adding ? (
        <Card style={{ marginBottom: spacing.lg }}>
          <Text style={styles.formTitle}>Raise something</Text>
          <Muted style={{ marginBottom: spacing.md }}>
            No blame needed. Name what is sitting with you so the two of you can make it right.
          </Muted>

          <Field
            label="What's sitting with you?"
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. I felt brushed off last night"
          />

          <Text style={styles.label}>How does it feel?</Text>
          <View style={styles.chipsWrap}>
            {FEELINGS.map((f) => {
              const on = feeling === f.word;
              return (
                <Pressable
                  key={f.word}
                  onPress={() => setFeeling(on ? '' : f.word)}
                  style={[styles.feelChip, on && styles.feelChipOn]}
                >
                  <Text style={{ fontSize: 15 }}>{f.emoji}</Text>
                  <Text style={[styles.feelText, on && styles.feelTextOn]}>{f.word}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>How much does it weigh?</Text>
          <LevelSelector value={weight} onChange={setWeight} lowLabel="A small thing" highLabel="Really hurting" />

          <Field
            label="Say more (optional)"
            value={detail}
            onChangeText={setDetail}
            placeholder="What happened, and what you wish had happened"
            multiline
          />

          <View style={{ height: spacing.xs }} />
          <Button label="Raise it gently" onPress={save} />
          <View style={{ height: spacing.sm }} />
          <Button label="Cancel" variant="ghost" onPress={reset} />
        </Card>
      ) : (
        <Button label="＋  Raise something" onPress={openAdd} style={{ marginBottom: spacing.lg }} />
      )}

      {list.length === 0 ? (
        <Card tone="surface">
          <Text style={{ fontSize: 34, marginBottom: spacing.sm }}>🕊️</Text>
          <Body style={{ fontFamily: font.family.semibold, marginBottom: 4 }}>Nothing to clear right now</Body>
          <Muted>
            When something hurts, raise it here instead of letting it sit. You will name how it feels, and together
            you will add the steps to make it right.
          </Muted>
        </Card>
      ) : (
        <>
          {open > 0 ? <Text style={styles.sectionHint}>{open} to work through</Text> : null}
          {list.map((it) => (
            <IssueRow
              key={it.id}
              issue={it}
              mine={app.isMine(it.authorId)}
              partnerName={app.identity?.partnerName ?? 'Your partner'}
              progress={stepProgress(app.issueSteps, it.id)}
              onPress={() => navigation.navigate('IssueDetail', { id: it.id })}
            />
          ))}
        </>
      )}
    </Screen>
  );
}

function IssueRow({
  issue,
  mine,
  partnerName,
  progress,
  onPress,
}: {
  issue: Issue;
  mine: boolean;
  partnerName: string;
  progress: { total: number; done: number; allDone: boolean };
  onPress: () => void;
}) {
  const resolved = issue.status === 'resolved';
  const tone: 'green' | 'rose' | 'surface' = resolved ? 'green' : issue.weight >= 4 ? 'rose' : 'surface';
  return (
    <Card tone={tone} onPress={onPress} style={{ marginBottom: spacing.md }}>
      <View style={styles.rowHead}>
        <Text style={{ fontSize: 26 }}>{resolved ? '🤍' : feelingEmoji(issue.feeling)}</Text>
        <View style={{ flex: 1 }}>
          <Body style={{ fontFamily: font.family.semibold }}>{issue.title}</Body>
          <Muted>
            {mine ? 'You raised this' : `${partnerName} raised this`}
            {!resolved ? ` · ${weightLabel(issue.weight)}` : ''}
          </Muted>
        </View>
        <View style={[styles.statusPill, resolved ? styles.statusResolved : styles.statusOpen]}>
          <Text style={[styles.statusText, resolved ? styles.statusTextResolved : styles.statusTextOpen]}>
            {resolved ? 'Cleared' : 'Open'}
          </Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        {issue.acknowledgedBy && !resolved ? (
          <Text style={styles.metaSoft}>💞 Taken to heart</Text>
        ) : !resolved && !mine ? (
          <Text style={styles.metaAccent}>Needs your care</Text>
        ) : (
          <Text style={styles.metaSoft}>{issue.feeling ? `Felt ${issue.feeling}` : 'Shared gently'}</Text>
        )}
        {progress.total > 0 ? (
          <Text style={styles.metaSoft}>
            {progress.allDone ? '✓ All steps done' : `${progress.done} of ${progress.total} steps`}
          </Text>
        ) : !resolved ? (
          <Text style={styles.metaSoft}>No steps yet</Text>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  formTitle: { fontSize: font.size.lg, fontFamily: font.family.displaySemi, color: colors.text, marginBottom: 2 },
  label: { fontSize: font.size.sm, fontFamily: font.family.semibold, color: colors.textSoft, marginBottom: spacing.sm, marginTop: spacing.sm },
  sectionHint: { fontSize: font.size.xs, fontFamily: font.family.semibold, color: colors.textFaint, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: spacing.sm },

  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  feelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  feelChipOn: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  feelText: { fontSize: font.size.sm, fontFamily: font.family.semibold, color: colors.textSoft },
  feelTextOn: { color: colors.primaryDark },

  rowHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  statusPill: { borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 5 },
  statusOpen: { backgroundColor: colors.primary },
  statusResolved: { backgroundColor: colors.good },
  statusText: { fontFamily: font.family.bold, fontSize: font.size.xs },
  statusTextOpen: { color: colors.white },
  statusTextResolved: { color: colors.white },

  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md, gap: spacing.sm },
  metaSoft: { fontSize: font.size.xs, color: colors.textSoft, fontFamily: font.family.semibold },
  metaAccent: { fontSize: font.size.xs, color: colors.primaryDark, fontFamily: font.family.bold },
});
