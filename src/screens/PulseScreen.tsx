import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Alert } from '../lib/alert';
import {
  AppHeader,
  Avatar,
  Body,
  Button,
  Card,
  EmptyState,
  Field,
  LevelSelector,
  Muted,
  Screen,
  SectionTitle,
  Title,
} from '../components/ui';
import IntensityChart from '../components/IntensityChart';
import { useToast } from '../components/ToastHost';
import { formatDayMonth, todayISO } from '../lib/date';
import { hLight, hSuccess } from '../lib/haptics';
import { todaysFeelings } from '../lib/feelings';
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
  const navigation = useNavigation();
  const toast = useToast();
  const partnerName = identity?.partnerName ?? 'Partner';
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

  // `checkins` hydrate after first render (AsyncStorage / Firestore both emit
  // asynchronously), so the form fields above can seed with defaults before
  // today's real check-in arrives. When it does, refill the form from it and
  // drop out of edit mode — otherwise tapping "Update" would overwrite a real
  // pulse with blank defaults (silent data loss). Keyed on the record id so it
  // fires once on hydration and never yanks the user mid-edit of a new entry.
  useEffect(() => {
    if (!myToday) return;
    setMood(myToday.mood);
    setNeed(myToday.need ?? '');
    setEnergy(myToday.energy);
    setStress(myToday.stress);
    setAffection(myToday.affection);
    setNote(myToday.note ?? '');
    setEditing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myToday?.id]);

  const starters = useMemo(
    () => conversationStarters(partnerToday, myToday, identity?.partnerName ?? 'them'),
    [partnerToday, myToday, identity?.partnerName],
  );
  const supports = useMemo(
    () => supportSuggestions(partnerToday, identity?.partnerName ?? 'them'),
    [partnerToday, identity?.partnerName],
  );

  const history = recentByAuthor(checkins, meId, 7).reverse();

  // Timestamped "feelings" timeline (logged through the day).
  const [logMood, setLogMood] = useState<Mood>('content');
  const [logIntensity, setLogIntensity] = useState(6);
  const [logNote, setLogNote] = useState('');
  const myFeelings = useMemo(() => todaysFeelings(app.feelings, meId), [app.feelings, meId]);
  const partnerFeelings = useMemo(() => todaysFeelings(app.feelings, partnerId), [app.feelings, partnerId]);
  // One shared ribbon of today's feelings from both of you, newest first.
  const timeline = useMemo(
    () =>
      [
        ...myFeelings.map((f) => ({ f, mine: true })),
        ...partnerFeelings.map((f) => ({ f, mine: false })),
      ].sort((a, b) => b.f.createdAt - a.f.createdAt),
    [myFeelings, partnerFeelings],
  );

  async function save() {
    // Close the form immediately; fire the write without blocking (offline the
    // cloud ack can hang, but the check-in lands locally at once). Nothing in
    // the form is cleared, so if the write actually fails we can safely reopen
    // it with the same values already filled in — no re-entry needed.
    const data = { mood, need: need.trim(), energy, stress, affection, note: note.trim() || undefined };
    setEditing(false);
    hSuccess();
    if (__DEV__) console.log('[tether:sync] pulse submit →', data);
    const ok = await app.saveCheckin(data);
    if (ok) {
      toast.show(myToday ? 'Pulse updated ✓' : 'Pulse shared 💛');
    } else {
      setEditing(true);
      toast.show("Couldn't send. Check your connection and try again");
    }
  }

  function logNow() {
    const data = { mood: logMood, intensity: logIntensity, note: logNote.trim() || undefined };
    hSuccess();
    setLogNote('');
    toast.show(`${moodMeta(logMood).emoji}  Added to today`);
    void app.logFeeling(data);
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
                    onPress={() => { hLight(); setMood(m.key); }}
                    accessibilityRole="button"
                    accessibilityLabel={m.label}
                    accessibilityState={{ selected: active }}
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
              photo={app.myProfile?.image}
            />
            <PulseCard who={identity?.partnerName ?? 'Partner'} color={colors.accent} checkin={partnerToday} photo={app.partnerProfile?.image} />
          </View>

          {/* My recent moods */}
          {history.length > 0 ? (
            <>
              <SectionTitle>Your week</SectionTitle>
              <Card>
                <View style={styles.weekRow}>
                  {history.map((c) => {
                    const d = new Date(c.date + 'T12:00:00');
                    const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
                    return (
                      <View key={c.id} style={{ alignItems: 'center' }}>
                        <Text style={{ fontSize: 24 }}>{moodMeta(c.mood).emoji}</Text>
                        <Muted style={{ marginTop: 4 }}>{wd}</Muted>
                      </View>
                    );
                  })}
                </View>
              </Card>
            </>
          ) : null}
        </>
      )}

      {/* Feelings through the day, a shared emotional ribbon for the two of you */}
      <SectionTitle>Feelings through the day</SectionTitle>
      <Muted style={{ marginTop: -spacing.sm, marginBottom: spacing.md }}>
        Your daily pulse is one big check-in. This is lighter: log a feeling whenever your mood
        shifts, and you’ll both watch today unfold together.
      </Muted>

      <Card>
        <SectionLabel>How do you feel right now?</SectionLabel>
        <View style={styles.wheel}>
          {MOODS.map((m) => {
            const active = m.key === logMood;
            return (
              <Pressable
                key={m.key}
                onPress={() => { hLight(); setLogMood(m.key); }}
                accessibilityRole="button"
                accessibilityLabel={m.label}
                accessibilityState={{ selected: active }}
                style={[styles.moodChip, { backgroundColor: active ? m.color : m.soft, borderColor: active ? m.color : 'transparent' }]}
              >
                <Text style={{ fontSize: 18 }}>{m.emoji}</Text>
                <Text style={[styles.moodLabel, { color: active ? colors.white : colors.text }]}>{m.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ height: spacing.md }} />
        <SectionLabel>How strong is it?</SectionLabel>
        <IntensityPicker value={logIntensity} color={moodMeta(logMood).color} onChange={setLogIntensity} />

        <View style={{ height: spacing.md }} />
        <Field value={logNote} onChangeText={setLogNote} placeholder={`What’s behind this ${moodMeta(logMood).label.toLowerCase()} feeling? (optional)`} />
        <Button label="Log this feeling" icon={moodMeta(logMood).emoji} color={moodMeta(logMood).color} onPress={logNow} />
      </Card>

      {/* The shared ribbon, both of you, newest first */}
      <Card style={{ marginTop: spacing.md }}>
        <View style={styles.tlHead}>
          <SectionLabel>Today together</SectionLabel>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
              <Text style={styles.legendText}>You</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
              <Text style={styles.legendText}>{partnerName}</Text>
            </View>
          </View>
        </View>

        {timeline.length === 0 ? (
          <EmptyState
            emoji="🌙"
            title="Nothing logged yet today"
            text="Tap a mood above the moment something shifts, a flicker of joy, a wave of missing them, and it lands right here for you both."
          />
        ) : (
          <>
            <Muted style={{ marginTop: 2, marginBottom: spacing.sm }}>
              {feelingSummary(myFeelings.length, partnerFeelings.length, partnerName)}
            </Muted>
            {myFeelings.length + partnerFeelings.length >= 2 ? (
              <IntensityChart
                series={[
                  { items: myFeelings, color: colors.primary },
                  { items: partnerFeelings, color: colors.accent },
                ]}
              />
            ) : null}
            {timeline.map(({ f, mine }) => {
              const meta = moodMeta(f.mood);
              const who = mine ? { name: 'You', color: colors.primary } : { name: partnerName, color: colors.accent };
              return (
                <View key={f.id} style={styles.tlRow}>
                  <View style={[styles.tlDot, { backgroundColor: meta.color }]} />
                  <Text style={{ fontSize: 24 }}>{meta.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={styles.tlTitleRow}>
                      <Body style={{ fontFamily: font.family.semibold }}>{meta.label}</Body>
                      <View style={[styles.whoTag, { backgroundColor: who.color + '22' }]}>
                        <Text style={[styles.whoTagText, { color: who.color }]}>{who.name}</Text>
                      </View>
                      <Muted style={{ marginLeft: 'auto' }}>{clockTime(f.createdAt)}</Muted>
                    </View>
                    <MiniMeter value={f.intensity} color={meta.color} />
                    {f.note ? <Muted style={{ marginTop: 3 }}>"{f.note}"</Muted> : null}
                  </View>
                  {mine ? (
                    <Pressable
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel="Delete this feeling"
                      onPress={() =>
                        Alert.alert('Remove this feeling?', 'This entry will be deleted.', [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Remove', style: 'destructive', onPress: () => app.removeFeeling(f.id) },
                        ])
                      }
                    >
                      <Text style={styles.feelX}>×</Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
          </>
        )}
      </Card>

      {/* Conversation starters + how to support them, below today's shared log */}
      {!editing ? (
        <>
          <SectionTitle>Conversation starters</SectionTitle>
          <Card tone="rose">
            {starters.map((s, i) => (
              <View key={i} style={[styles.bullet, i > 0 && { marginTop: spacing.md }]}>
                <Text style={styles.bulletDot}>•</Text>
                <Body style={{ flex: 1 }}>{s}</Body>
              </View>
            ))}
          </Card>

          <SectionTitle>How to support {identity?.partnerName ?? 'them'}</SectionTitle>
          <Card tone="green">
            {supports.map((s, i) => (
              <View key={i} style={[styles.bullet, i > 0 && { marginTop: spacing.md }]}>
                <Text style={[styles.bulletDot, { color: colors.good }]}>✓</Text>
                <Body style={{ flex: 1 }}>{s}</Body>
              </View>
            ))}
          </Card>
        </>
      ) : null}

      {/* The Companion reads these same check-ins, so it lives with them */}
      <Card
        tone="violet"
        onPress={() => (navigation as any).navigate('Insights')}
        style={{ marginTop: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
      >
        <Text style={{ fontSize: 26 }}>💜</Text>
        <View style={{ flex: 1 }}>
          <Title>Companion</Title>
          <Muted style={{ marginTop: 2 }}>What your patterns say, kindly, and this week's weather</Muted>
        </View>
        <Text style={{ fontSize: 24, color: colors.accent }}>›</Text>
      </Card>
    </Screen>
  );
}

function clockTime(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours();
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(d.getMinutes()).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

// Intensity 1..10 stored, but chosen as five clear, growing steps so it reads at
// a glance instead of fiddling a 10-dot scale. Step n maps to intensity n*2.
const INTENSITY_WORDS = ['A little', 'Some', 'Quite a bit', 'A lot', 'So much'];

function IntensityPicker({ value, color, onChange }: { value: number; color: string; onChange: (v: number) => void }) {
  const level = Math.max(1, Math.min(5, Math.round(value / 2)));
  return (
    <View style={styles.barsRow}>
      {[1, 2, 3, 4, 5].map((b) => {
        const on = b <= level;
        return (
          <Pressable key={b} onPress={() => { hLight(); onChange(b * 2); }} hitSlop={6} style={styles.barTap}>
            <View style={[styles.bar, { height: 16 + b * 6, backgroundColor: on ? color : colors.surfaceAlt, borderColor: on ? color : colors.border }]} />
          </Pressable>
        );
      })}
      <Text style={[styles.barWord, { color }]}>{INTENSITY_WORDS[level - 1]}</Text>
    </View>
  );
}

// A compact read-only echo of the same five-step meter, for each timeline row.
function MiniMeter({ value, color }: { value: number; color: string }) {
  const level = Math.max(1, Math.min(5, Math.round(value / 2)));
  return (
    <View style={styles.miniRow}>
      {[1, 2, 3, 4, 5].map((b) => (
        <View key={b} style={[styles.miniBar, { height: 6 + b * 2, backgroundColor: b <= level ? color : colors.surfaceAlt }]} />
      ))}
    </View>
  );
}

function feelingSummary(mine: number, theirs: number, partner: string): string {
  if (mine && theirs) return `You logged ${mine}, ${partner} logged ${theirs}`;
  if (mine) return `You’ve logged ${mine} today · nothing from ${partner} yet`;
  return `${partner} logged ${theirs} today · none from you yet`;
}

function PulseCard({
  who,
  color,
  checkin,
  onEdit,
  photo,
}: {
  who: string;
  color: string;
  checkin: ReturnType<typeof latestCheckin>;
  onEdit?: () => void;
  photo?: string | null;
}) {
  const m = checkin ? moodMeta(checkin.mood) : null;
  return (
    <View style={[styles.pulseCard, { borderColor: color + '44' }]}>
      <View style={styles.pulseWhoRow}>
        {photo ? <Avatar name={who} size={22} uri={photo} /> : null}
        <Text style={[styles.pulseWho, { color }]}>{who}</Text>
      </View>
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
      {checkin?.need ? <Muted style={{ marginTop: spacing.sm }}>Needs: "{checkin.need}"</Muted> : null}
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
  sectionLabel: { fontSize: font.size.md, fontFamily: font.family.bold, color: colors.text, marginBottom: spacing.sm, marginTop: spacing.xs },
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
  moodLabel: { fontSize: font.size.sm, fontFamily: font.family.semibold },
  todayRow: { flexDirection: 'row', gap: spacing.md },
  pulseCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    padding: spacing.md,
    alignItems: 'center',
  },
  pulseWhoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  pulseWho: { fontFamily: font.family.bold, fontSize: font.size.md },
  levels: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  dots: { flexDirection: 'row', gap: 3 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  miniLabel: { fontSize: 10, color: colors.textSoft, marginTop: 4 },
  editLink: { fontFamily: font.family.semibold, fontSize: font.size.sm },
  bullet: { flexDirection: 'row', gap: spacing.sm },
  bulletDot: { fontSize: font.size.lg, color: colors.primary, fontFamily: font.family.bold, lineHeight: 22 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },

  // Five-step intensity equalizer (input)
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, marginTop: spacing.xs },
  barTap: { justifyContent: 'flex-end' },
  bar: { width: 22, borderRadius: 7, borderWidth: 1.5 },
  barWord: { marginLeft: 'auto', fontSize: font.size.md, fontFamily: font.family.bold, alignSelf: 'center' },

  // Shared "Today together" timeline
  tlHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  legend: { flexDirection: 'row', gap: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendText: { fontSize: 12, color: colors.textSoft, fontFamily: font.family.semibold },
  tlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  tlDot: { width: 8, height: 8, borderRadius: 4 },
  tlTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  whoTag: { paddingHorizontal: 8, paddingVertical: 1, borderRadius: radius.pill },
  whoTagText: { fontSize: 11, fontFamily: font.family.bold },
  miniRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, marginTop: 4, height: 16 },
  miniBar: { width: 5, borderRadius: 2 },
  feelX: { fontSize: 22, color: colors.textFaint, paddingHorizontal: 4 },
});
