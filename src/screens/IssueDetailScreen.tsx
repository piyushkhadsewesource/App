import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Celebrate } from '../components/Celebrate';
import { AppHeader, Body, Button, Card, Field, LevelSelector, Muted, Screen, Title } from '../components/ui';
import { formatRelative } from '../lib/date';
import { hLight, hSuccess } from '../lib/haptics';
import { FEELINGS, feelingEmoji, stepsFor, weightLabel } from '../lib/issues';
import { useApp } from '../state/AppContext';
import { colors, font, radius, shadow, spacing } from '../theme';
import { IssueStep } from '../types/models';

export default function IssueDetailScreen({ navigation, route }: any) {
  const app = useApp();
  const id: string = route?.params?.id;
  const issue = useMemo(() => app.issues.find((i) => i.id === id) ?? null, [app.issues, id]);
  const steps = useMemo(() => stepsFor(app.issueSteps, id), [app.issueSteps, id]);
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState(false);
  const [eTitle, setETitle] = useState('');
  const [eFeeling, setEFeeling] = useState('');
  const [eWeight, setEWeight] = useState(3);
  const [eDetail, setEDetail] = useState('');

  if (!issue) {
    return (
      <Screen scroll>
        <AppHeader title="Clear the air" onBack={() => navigation.goBack()} />
        <Card tone="surface">
          <Body style={{ fontFamily: font.family.semibold, marginBottom: 4 }}>This has been cleared away</Body>
          <Muted>It may have been removed. Nothing more to do here.</Muted>
        </Card>
        <View style={{ height: spacing.lg }} />
        <Button label="Back" variant="soft" onPress={() => navigation.goBack()} />
      </Screen>
    );
  }

  const mine = app.isMine(issue.authorId);
  const raiser = mine ? 'You' : app.identity?.partnerName ?? 'Your partner';
  const partnerName = app.identity?.partnerName ?? 'your partner';
  const resolved = issue.status === 'resolved';
  const doneCount = steps.filter((s) => s.done).length;

  const openEdit = () => {
    hLight();
    setETitle(issue.title);
    setEFeeling(issue.feeling ?? '');
    setEWeight(issue.weight);
    setEDetail(issue.detail ?? '');
    setEditing(true);
  };
  const saveEdit = async () => {
    if (!eTitle.trim()) return;
    const patch = { title: eTitle.trim(), feeling: eFeeling, weight: eWeight, detail: eDetail };
    setEditing(false);
    await app.updateIssue(issue.id, patch);
  };

  const addStep = async () => {
    const t = draft.trim();
    if (!t) return;
    setDraft('');
    hLight();
    await app.addIssueStep(issue.id, t, false);
  };

  const toggleStep = (s: IssueStep) => {
    hLight();
    app.toggleIssueStep(s.id, !s.done);
  };

  const confirmRemoveStep = (s: IssueStep) => {
    Alert.alert('Remove this step?', `“${s.text}” will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => app.removeIssueStep(s.id) },
    ]);
  };

  const acknowledge = () => {
    hSuccess();
    app.acknowledgeIssue(issue.id);
  };

  const resolve = () => {
    Alert.alert(
      'Mark this as cleared?',
      'Only do this when it genuinely feels resolved for you. You can always reopen it.',
      [
        { text: 'Not yet', style: 'cancel' },
        {
          text: 'It feels cleared',
          onPress: () => {
            hSuccess();
            app.resolveIssue(issue.id);
          },
        },
      ],
    );
  };

  const reopen = () => {
    hLight();
    app.reopenIssue(issue.id);
  };

  const confirmRemove = () => {
    Alert.alert('Remove this entirely?', 'This and its steps will be removed for both of you.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await app.removeIssue(issue.id);
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <>
      <Screen scroll>
      <AppHeader title="Clear the air" subtitle={resolved ? 'Cleared together' : 'Working through it'} onBack={() => navigation.goBack()} />

      {/* Hero / inline editor (raiser only) */}
      {editing ? (
        <Card style={{ marginBottom: spacing.lg }}>
          <Text style={styles.editTitle}>Edit what you raised</Text>
          <Field
            label="What's sitting with you?"
            value={eTitle}
            onChangeText={setETitle}
            placeholder="e.g. I felt brushed off last night"
          />
          <Text style={styles.editLabel}>How does it feel?</Text>
          <View style={styles.chipsWrap}>
            {FEELINGS.map((f) => {
              const on = eFeeling === f.word;
              return (
                <Pressable key={f.word} onPress={() => setEFeeling(on ? '' : f.word)} style={[styles.feelChip, on && styles.feelChipOn]}>
                  <Text style={{ fontSize: 15 }}>{f.emoji}</Text>
                  <Text style={[styles.feelText, on && styles.feelTextOn]}>{f.word}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.editLabel}>How much does it weigh?</Text>
          <LevelSelector value={eWeight} onChange={setEWeight} lowLabel="A small thing" highLabel="Really hurting" />
          <Field
            label="Say more (optional)"
            value={eDetail}
            onChangeText={setEDetail}
            placeholder="What happened, and what you wish had happened"
            multiline
          />
          <View style={{ height: spacing.xs }} />
          <Button label="Save changes" onPress={saveEdit} />
          <View style={{ height: spacing.sm }} />
          <Button label="Cancel" variant="ghost" onPress={() => setEditing(false)} />
        </Card>
      ) : (
        <Card tone={resolved ? 'green' : issue.weight >= 4 ? 'rose' : 'surface'} style={{ marginBottom: spacing.lg }}>
          <View style={styles.heroHead}>
            <Text style={{ fontSize: 34 }}>{resolved ? '🤍' : feelingEmoji(issue.feeling)}</Text>
            <View style={{ flex: 1 }}>
              <Title>{issue.title}</Title>
              <Muted style={{ marginTop: 2 }}>
                {raiser} raised this · {formatRelative(issue.createdAt)}
              </Muted>
            </View>
            {mine && !resolved ? (
              <Pressable onPress={openEdit} hitSlop={8} style={styles.editBtn}>
                <Text style={styles.editLink}>Edit</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.tagRow}>
            {issue.feeling ? <Chip text={`${feelingEmoji(issue.feeling)} ${issue.feeling}`} /> : null}
            {!resolved ? <Chip text={weightLabel(issue.weight)} tone="weight" /> : <Chip text="Cleared" tone="good" />}
          </View>

          {issue.detail ? (
            <View style={styles.detailBox}>
              <Body>{issue.detail}</Body>
            </View>
          ) : null}

          {resolved && issue.resolvedAt ? (
            <Muted style={{ marginTop: spacing.md }}>🤍 Cleared {formatRelative(issue.resolvedAt)}. Thank you for working through it.</Muted>
          ) : null}
        </Card>
      )}

      {/* Acknowledge beat */}
      {!resolved ? (
        issue.acknowledgedBy ? (
          <Card tone="violet" style={styles.ackCard}>
            <Text style={{ fontSize: 22 }}>💞</Text>
            <Muted style={{ flex: 1, color: colors.text }}>
              {issue.acknowledgedBy === app.meId ? 'You took this to heart.' : `${partnerName} took this to heart.`} Now make it
              right together below.
            </Muted>
          </Card>
        ) : !mine ? (
          <Card tone="surface" style={{ marginBottom: spacing.lg }}>
            <Title style={{ marginBottom: 4 }}>{raiser} is hurting</Title>
            <Muted style={{ marginBottom: spacing.md }}>
              Before fixing anything, let them know you have heard them and you care.
            </Muted>
            <Button label="💞  I hear you" onPress={acknowledge} />
          </Card>
        ) : (
          <Card tone="surface" style={styles.ackCard}>
            <Text style={{ fontSize: 22 }}>🕊️</Text>
            <Muted style={{ flex: 1 }}>Shared with {partnerName}. You will see here once they have taken it to heart.</Muted>
          </Card>
        )
      ) : null}

      {/* Steps */}
      <Text style={styles.sectionTitle}>{resolved ? 'Steps you took' : 'Steps to make it right'}</Text>
      {!resolved ? (
        <Muted style={{ marginBottom: spacing.md }}>Add what either of you will do. Tap a step once it is done.</Muted>
      ) : (
        <View style={{ height: spacing.md }} />
      )}

      {steps.length === 0 ? (
        !resolved ? (
          <Card tone="surface" style={{ marginBottom: spacing.md }}>
            <Muted>No steps yet. Add the first small thing that would help.</Muted>
          </Card>
        ) : null
      ) : (
        <View style={{ gap: spacing.sm, marginBottom: spacing.md }}>
          {steps.map((s) => (
            <StepRow
              key={s.id}
              step={s}
              who={app.isMine(s.authorId) ? 'You' : app.identity?.partnerName ?? 'Partner'}
              locked={resolved}
              onToggle={() => toggleStep(s)}
              onRemove={() => confirmRemoveStep(s)}
            />
          ))}
        </View>
      )}

      {!resolved ? (
        <Card tone="surface" style={{ marginBottom: spacing.lg }}>
          <Text style={styles.addLabel}>Add a step</Text>
          <Field
            value={draft}
            onChangeText={setDraft}
            placeholder="e.g. I'll put my phone away at dinner"
            onSubmitEditing={addStep}
            returnKeyType="done"
            style={{ marginBottom: 0 }}
          />
          <View style={{ height: spacing.sm }} />
          <Button label="＋  Add step" variant="soft" onPress={addStep} />
        </Card>
      ) : null}

      {/* Resolve / reopen */}
      {!resolved ? (
        mine ? (
          <>
            <Button label="🤍  Mark as cleared" onPress={resolve} />
            <Muted style={{ textAlign: 'center', marginTop: spacing.sm }}>
              Only you can decide this feels resolved.
            </Muted>
          </>
        ) : (
          <Card tone="surface">
            <Muted style={{ textAlign: 'center' }}>
              {steps.length > 0 && doneCount === steps.length
                ? `All steps are done. It is up to ${partnerName} to mark this cleared when they feel it.`
                : `Only ${partnerName} can mark this cleared, whenever they feel ready.`}
            </Muted>
          </Card>
        )
      ) : (
        <Button label="Reopen this" variant="outline" onPress={reopen} />
      )}

      {/* Remove (raiser only) */}
      {mine ? (
        <>
          <View style={{ height: spacing.sm }} />
          <Button label="Remove this" variant="ghost" color={colors.danger} onPress={confirmRemove} />
        </>
      ) : null}
      </Screen>
      {/* Petals rain down the moment an issue is cleared together. */}
      <Celebrate play={resolved} />
    </>
  );
}

function StepRow({
  step,
  who,
  locked,
  onToggle,
  onRemove,
}: {
  step: IssueStep;
  who: string;
  locked?: boolean;
  onToggle: () => void;
  onRemove: () => void;
}) {
  return (
    <View style={[styles.stepRow, shadow.soft]}>
      <Pressable
        onPress={locked ? undefined : onToggle}
        disabled={locked}
        hitSlop={8}
        style={[styles.check, step.done && styles.checkOn]}
      >
        {step.done ? <Text style={styles.checkMark}>✓</Text> : null}
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={[styles.stepText, step.done && styles.stepTextDone]}>{step.text}</Text>
        <Text style={styles.stepWho}>{step.done ? 'Done' : 'Will do'} · {who}</Text>
      </View>
      {locked ? null : (
        <Pressable onPress={onRemove} hitSlop={8} style={{ paddingHorizontal: 4 }}>
          <Text style={styles.stepX}>×</Text>
        </Pressable>
      )}
    </View>
  );
}

function Chip({ text, tone = 'feel' }: { text: string; tone?: 'feel' | 'weight' | 'good' }) {
  const bg = tone === 'good' ? colors.goodSoft : tone === 'weight' ? colors.goldSoft : colors.surfaceAlt;
  const fg = tone === 'good' ? colors.good : tone === 'weight' ? colors.gold : colors.textSoft;
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Text style={[styles.chipText, { color: fg }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heroHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  editBtn: { paddingHorizontal: spacing.sm, paddingVertical: 4 },
  editLink: { fontSize: font.size.sm, fontFamily: font.family.bold, color: colors.primaryDark },
  editTitle: { fontSize: font.size.lg, fontFamily: font.family.displaySemi, color: colors.text, marginBottom: spacing.md },
  editLabel: { fontSize: font.size.sm, fontFamily: font.family.semibold, color: colors.textSoft, marginBottom: spacing.sm, marginTop: spacing.sm },
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
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  chip: { borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 6 },
  chipText: { fontSize: font.size.xs, fontFamily: font.family.bold },
  detailBox: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },

  ackCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },

  sectionTitle: { fontSize: font.size.xl, fontFamily: font.family.displaySemi, color: colors.text, letterSpacing: -0.3, marginBottom: 2 },

  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  checkOn: { backgroundColor: colors.good, borderColor: colors.good },
  checkMark: { color: colors.white, fontSize: 16, fontFamily: font.family.bold },
  stepText: { fontSize: font.size.md, color: colors.text, fontFamily: font.family.medium },
  stepTextDone: { textDecorationLine: 'line-through', color: colors.textFaint },
  stepWho: { fontSize: font.size.xs, color: colors.textFaint, fontFamily: font.family.body, marginTop: 2 },
  stepX: { fontSize: 24, color: colors.textFaint },

  addLabel: { fontSize: font.size.sm, fontFamily: font.family.semibold, color: colors.textSoft, marginBottom: spacing.sm },
});
