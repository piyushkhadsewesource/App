import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  AppHeader,
  Body,
  Button,
  Card,
  Field,
  LevelSelector,
  Muted,
  Screen,
  SectionTitle,
  Title,
} from '../components/ui';
import { formatDayMonth, todayISO } from '../lib/date';
import { MOODS, moodMeta } from '../lib/mood';
import {
  conversationStarters,
  latestCheckin,
  recentByAuthor,
  supportSuggestions,
} from '../lib/pulse';
import { useApp } from '../state/AppContext';
import { colors, font, radius, spacing } from '../theme';
import { Mood } from '../types/models';

export default function PulseScreen() {
  const app = useApp();
  const { meId, partnerId, checkins, identity } = app;
  const today = todayISO();
  const mine = latestCheckin(checkins, meId);
  const myToday = mine?.date === today ? mine : null;
  const partner = latestCheckin(checkins, partnerId);
  const partnerToday = partner?.date === today ? partner : null;

  const [editing, setEditing] = useState(!myToday);
  const [mood, setMood] = useState<Mood>(myToday?.mood ?? 'content');
  const [need, setNeed] = useState(myToday?.need ?? '');
  const [energy, setEnergy] = useState(myToday?.energy ?? 3);
  const [stress, setStress] = useState(myToday?.stress ?? 3);
  const [affection, setAffection] = useState(myToday?.affection ?? 4);
  const [note, setNote] = useState(myToday?.note ?? '');

  const starters = useMemo(
    () => conversationStarters(partnerToday, myToday, identity?.partnerName ?? 'them'),
    [partnerToday, myToday, identity?.partnerName],
  );
  const supports = useMemo(
    () => supportSuggestions(partnerToday, identity?.partnerName ?? 'them'),
    [partnerToday, identity?.partnerName],
  );

  const history = recentByAuthor(checkins, meId, 7).reverse();

  async function save() {
    await app.saveCheckin({ mood, need: need.trim(), energy, stress, affection, note: note.trim() || undefined });
    setEditing(false);
  }

  return (
    <Screen scroll>
      <AppHeader title="Daily pulse" subtitle="How are you, really?" />

      {editing ? (
        <>
          <Card>
            <SectionLabel>How are you feeling?</SectionLabel>
            <View style={styles.wheel}>
              {MOODS.map((m) => {
                const active = m.key === mood;
                return (
                  <Pressable
                    key={m.key}
                    onPress={() => setMood(m.key)}
                    style={[
                      styles.moodChip,
                      { backgroundColor: active ? m.color : m.soft, borderColor: active ? m.color : 'transparent' },
                    ]}
                  >
                    <Text style={{ fontSize: 20 }}>{m.emoji}</Text>
                    <Text style={[styles.moodLabel, { color: active ? colors.white : colors.text }]}>{m.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          <Card style={{ marginTop: spacing.md }}>
            <SectionLabel>One thing you need today</SectionLabel>
            <Field
              value={need}
              onChangeText={setNeed}
              placeholder="e.g. a little patience, or just to hear your voice"
            />
            <SectionLabel>Energy</SectionLabel>
            <LevelSelector value={energy} onChange={setEnergy} lowLabel="Drained" highLabel="Energised" color={colors.good} />
            <SectionLabel>Stress</SectionLabel>
            <LevelSelector value={stress} onChange={setStress} lowLabel="Calm" highLabel="Overwhelmed" color={colors.warn} />
            <SectionLabel>Affection</SectionLabel>
            <LevelSelector value={affection} onChange={setAffection} lowLabel="Distant" highLabel="So close" color={colors.primary} />
            <View style={{ height: spacing.sm }} />
            <SectionLabel>Anything else? (optional)</SectionLabel>
            <Field value={note} onChangeText={setNote} placeholder="A note just for the two of you…" multiline />
          </Card>

          <View style={{ height: spacing.lg }} />
          <Button label={myToday ? 'Update today’s pulse' : 'Share my pulse'} onPress={save} />
          {myToday ? (
            <>
              <View style={{ height: spacing.sm }} />
              <Button label="Cancel" variant="ghost" onPress={() => setEditing(false)} />
            </>
          ) : null}
        </>
      ) : (
        <>
          {/* Both partners today */}
          <View style={styles.todayRow}>
            <PulseCard
              who="You"
              color={colors.primary}
              checkin={myToday}
              onEdit={() => setEditing(true)}
            />
            <PulseCard who={identity?.partnerName ?? 'Partner'} color={colors.accent} checkin={partnerToday} />
          </View>

          {/* Conversation starters */}
          <SectionTitle>Conversation starters</SectionTitle>
          <Card tone="rose">
            {starters.map((s, i) => (
              <View key={i} style={[styles.bullet, i > 0 && { marginTop: spacing.md }]}>
                <Text style={styles.bulletDot}>•</Text>
                <Body style={{ flex: 1 }}>{s}</Body>
              </View>
            ))}
          </Card>

          {/* Support suggestions */}
          <SectionTitle>How to support {identity?.partnerName ?? 'them'}</SectionTitle>
          <Card tone="green">
            {supports.map((s, i) => (
              <View key={i} style={[styles.bullet, i > 0 && { marginTop: spacing.md }]}>
                <Text style={[styles.bulletDot, { color: colors.good }]}>✓</Text>
                <Body style={{ flex: 1 }}>{s}</Body>
              </View>
            ))}
          </Card>

          {/* My recent moods */}
          {history.length > 0 ? (
            <>
              <SectionTitle>Your week</SectionTitle>
              <Card>
                <View style={styles.weekRow}>
                  {history.map((c) => (
                    <View key={c.id} style={{ alignItems: 'center' }}>
                      <Text style={{ fontSize: 24 }}>{moodMeta(c.mood).emoji}</Text>
                      <Muted style={{ marginTop: 4 }}>{formatDayMonth(c.date).split(' ')[1]}</Muted>
                    </View>
                  ))}
                </View>
              </Card>
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

function PulseCard({
  who,
  color,
  checkin,
  onEdit,
}: {
  who: string;
  color: string;
  checkin: ReturnType<typeof latestCheckin>;
  onEdit?: () => void;
}) {
  const m = checkin ? moodMeta(checkin.mood) : null;
  return (
    <View style={[styles.pulseCard, { borderColor: color + '44' }]}>
      <Text style={[styles.pulseWho, { color }]}>{who}</Text>
      <Text style={{ fontSize: 38 }}>{m ? m.emoji : '⚪️'}</Text>
      <Title style={{ marginTop: 2 }}>{m ? m.label : 'No check-in'}</Title>
      {checkin ? (
        <View style={styles.levels}>
          <MiniLevel label="Energy" value={checkin.energy} color={colors.good} />
          <MiniLevel label="Stress" value={checkin.stress} color={colors.warn} />
          <MiniLevel label="Close" value={checkin.affection} color={colors.primary} />
        </View>
      ) : (
        <Muted style={{ marginTop: spacing.sm }}>Nothing shared yet today.</Muted>
      )}
      {checkin?.need ? <Muted style={{ marginTop: spacing.sm }}>Needs: “{checkin.need}”</Muted> : null}
      {checkin?.note ? <Muted style={{ marginTop: 4, fontStyle: 'italic' }}>{checkin.note}</Muted> : null}
      {onEdit ? (
        <Pressable onPress={onEdit} style={{ marginTop: spacing.sm }}>
          <Text style={[styles.editLink, { color }]}>{checkin ? 'Edit' : 'Check in'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function MiniLevel({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={styles.dots}>
        {[1, 2, 3, 4, 5].map((n) => (
          <View key={n} style={[styles.dot, { backgroundColor: n <= value ? color : colors.surfaceAlt }]} />
        ))}
      </View>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: { fontSize: font.size.md, fontWeight: font.weight.bold, color: colors.text, marginBottom: spacing.sm, marginTop: spacing.xs },
  wheel: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  moodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  moodLabel: { fontSize: font.size.sm, fontWeight: font.weight.semibold },
  todayRow: { flexDirection: 'row', gap: spacing.md },
  pulseCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    padding: spacing.md,
    alignItems: 'center',
  },
  pulseWho: { fontWeight: font.weight.bold, marginBottom: spacing.sm, fontSize: font.size.md },
  levels: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  dots: { flexDirection: 'row', gap: 3 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  miniLabel: { fontSize: 10, color: colors.textSoft, marginTop: 4 },
  editLink: { fontWeight: font.weight.semibold, fontSize: font.size.sm },
  bullet: { flexDirection: 'row', gap: spacing.sm },
  bulletDot: { fontSize: font.size.lg, color: colors.primary, fontWeight: font.weight.bold, lineHeight: 22 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
});
