import React, { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { AppHeader, Body, Button, Card, Field, Muted, Screen, Title } from '../components/ui';
import { formatDate } from '../lib/date';
import { countdownTo } from '../lib/countdown';
import { useApp } from '../state/AppContext';
import { colors, font, radius, spacing } from '../theme';

function parseWhen(dateStr: string, timeStr: string): number | null {
  const parts = dateStr.trim().split('-').map((x) => parseInt(x, 10));
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  const [year, month, day] = parts;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  let hour = 12;
  let minute = 0;
  if (timeStr.trim()) {
    const t = timeStr.trim().split(':').map((x) => parseInt(x, 10));
    if (t.length < 2 || t.some(Number.isNaN)) return null;
    [hour, minute] = t;
  }
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  const d = new Date(year, month - 1, day, hour, minute, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

export default function CountdownScreen({ navigation }: any) {
  const app = useApp();
  const meeting = app.meeting;

  const [now, setNow] = useState(Date.now());
  const [editing, setEditing] = useState(!meeting);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [label, setLabel] = useState('');

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const cd = useMemo(() => (meeting ? countdownTo(meeting.at, now) : null), [meeting, now]);
  const reunionGlow = !!cd && cd.past && now - (meeting?.at ?? 0) < 3 * 86_400_000;

  async function save() {
    const at = parseWhen(date, time);
    if (!at) {
      Alert.alert('Check the date', 'Use the format YYYY-MM-DD (and optional time HH:MM).');
      return;
    }
    await app.setMeeting(at, label);
    setEditing(false);
    setDate('');
    setTime('');
    setLabel('');
  }

  function confirmClear() {
    Alert.alert('Clear the countdown?', 'You can set a new date any time.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => app.clearMeeting() },
    ]);
  }

  return (
    <Screen scroll>
      <AppHeader title="Next time together" subtitle="Counting down to your reunion" onBack={() => navigation.goBack()} />

      {meeting && !editing ? (
        <>
          <Card tone={reunionGlow ? 'rose' : 'violet'}>
            {reunionGlow ? (
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 48 }}>💞</Text>
                <Title style={{ marginTop: spacing.sm, fontSize: font.size.xxl }}>You’re together!</Title>
                <Muted style={{ marginTop: 4 }}>{meeting.label || 'Soak up every minute.'}</Muted>
              </View>
            ) : (
              <>
                <Muted style={{ textAlign: 'center' }}>
                  {meeting.label ? meeting.label : 'Until we’re together'}
                </Muted>
                <View style={styles.cdRow}>
                  <Unit value={cd!.days} label="days" />
                  <Unit value={cd!.hours} label="hrs" />
                  <Unit value={cd!.minutes} label="min" />
                  <Unit value={cd!.seconds} label="sec" />
                </View>
                <Muted style={{ textAlign: 'center', marginTop: spacing.md }}>
                  {formatDate(meeting.at)} · set by {app.isMine(meeting.authorId) ? 'you' : app.authorName(meeting.authorId)}
                </Muted>
              </>
            )}
          </Card>

          <View style={{ height: spacing.lg }} />
          <Button
            label="Change the date or name"
            variant="soft"
            onPress={() => {
              if (meeting) {
                const d = new Date(meeting.at);
                const p = (n: number) => String(n).padStart(2, '0');
                setDate(`${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`);
                setTime(`${p(d.getHours())}:${p(d.getMinutes())}`);
                setLabel(meeting.label ?? '');
              }
              setEditing(true);
            }}
          />
          <View style={{ height: spacing.sm }} />
          <Button label="Clear countdown" variant="outline" color={colors.danger} onPress={confirmClear} />
        </>
      ) : (
        <Card>
          <Title>{meeting ? 'Update your reunion' : 'When do you meet next?'}</Title>
          <Muted style={{ marginTop: 4, marginBottom: spacing.md }}>
            You’ll both see the same live countdown.
          </Muted>
          <Field label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" autoCapitalize="none" />
          <Field label="Time (optional)" value={time} onChangeText={setTime} placeholder="HH:MM (24h), e.g. 18:30" autoCapitalize="none" />
          <Field label="What are you counting down to? (optional)" value={label} onChangeText={setLabel} placeholder="e.g. Together again, your visit, going home…" />
          <Button label="Start the countdown" onPress={save} />
          {meeting ? (
            <>
              <View style={{ height: spacing.sm }} />
              <Button label="Cancel" variant="ghost" onPress={() => setEditing(false)} />
            </>
          ) : null}
        </Card>
      )}

      <Card tone="surface" style={{ marginTop: spacing.lg }}>
        <Body>
          Distance feels shorter with a date to look forward to. Update it whenever your plans
          firm up, and watch the days melt away together. 💞
        </Body>
      </Card>
    </Screen>
  );
}

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.unit}>
      <Text style={styles.unitValue}>{value}</Text>
      <Text style={styles.unitLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cdRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.lg },
  unit: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  unitValue: { fontSize: 32, fontFamily: font.family.display, color: colors.accent },
  unitLabel: { fontSize: 11, color: colors.textSoft, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: font.family.semibold },
});
