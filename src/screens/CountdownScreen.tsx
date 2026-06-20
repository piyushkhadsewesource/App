import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader, Body, Button, Card, Field, Muted, Screen, Title } from '../components/ui';
import DateTimeModal from '../components/DateTimeModal';
import { formatDate } from '../lib/date';
import { countdownTo } from '../lib/countdown';
import { useApp } from '../state/AppContext';
import { colors, font, radius, spacing } from '../theme';

const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatWhen(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours();
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const ap = h < 12 ? 'AM' : 'PM';
  return `${WD[d.getDay()]}, ${d.getDate()} ${MO[d.getMonth()]} ${d.getFullYear()} · ${h12}:${String(
    d.getMinutes(),
  ).padStart(2, '0')} ${ap}`;
}

export default function CountdownScreen({ navigation }: any) {
  const app = useApp();
  const meeting = app.meeting;

  const [now, setNow] = useState(Date.now());
  const [editing, setEditing] = useState(!meeting);
  const [selectedAt, setSelectedAt] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [label, setLabel] = useState('');

  const defaultInitial = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    d.setHours(18, 0, 0, 0);
    return d.getTime();
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const cd = useMemo(() => (meeting ? countdownTo(meeting.at, now) : null), [meeting, now]);
  const reunionGlow = !!cd && cd.past && now - (meeting?.at ?? 0) < 3 * 86_400_000;

  async function save() {
    if (!selectedAt) {
      Alert.alert('Pick a date', 'Tap the date field to choose when you meet next.');
      return;
    }
    await app.setMeeting(selectedAt, label);
    setEditing(false);
    setSelectedAt(null);
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
                setSelectedAt(meeting.at);
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
          <Text style={styles.pickerLabel}>Date & time</Text>
          <Pressable onPress={() => setPickerOpen(true)} style={styles.whenRow}>
            <Text style={styles.whenIcon}>📅</Text>
            <Text style={[styles.whenText, !selectedAt && { color: colors.textFaint }]} numberOfLines={1}>
              {selectedAt ? formatWhen(selectedAt) : 'Tap to pick a date & time'}
            </Text>
            <Text style={styles.whenChevron}>›</Text>
          </Pressable>

          <Field label="What are you counting down to? (optional)" value={label} onChangeText={setLabel} placeholder="e.g. Together again, your visit, going home…" />
          <Button label="Start the countdown" onPress={save} />
          {meeting ? (
            <>
              <View style={{ height: spacing.sm }} />
              <Button label="Cancel" variant="ghost" onPress={() => { setEditing(false); setSelectedAt(null); }} />
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

      <DateTimeModal
        visible={pickerOpen}
        initial={selectedAt && selectedAt > Date.now() ? selectedAt : defaultInitial}
        onCancel={() => setPickerOpen(false)}
        onConfirm={(ts) => {
          setSelectedAt(ts);
          setPickerOpen(false);
        }}
      />
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
  pickerLabel: { fontSize: font.size.sm, fontFamily: font.family.semibold, color: colors.textSoft, marginBottom: spacing.xs },
  whenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 52,
    marginBottom: spacing.md,
  },
  whenIcon: { fontSize: 18 },
  whenText: { flex: 1, fontSize: font.size.md, color: colors.text, fontFamily: font.family.semibold },
  whenChevron: { fontSize: 22, color: colors.textFaint },
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
