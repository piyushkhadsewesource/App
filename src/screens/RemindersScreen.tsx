import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { AppHeader, Body, Button, Card, Muted, Screen, Title } from '../components/ui';
import {
  DEFAULT_PLAN,
  DEFAULT_TIMES,
  formatTime,
  getPlanConfig,
  getReminderConfig,
  PlanConfig,
  ReminderTime,
  remindersSupported,
  setPlanConfig,
  setReminderTimes,
  setRemindersEnabled,
} from '../services/notifications';
import { useApp } from '../state/AppContext';
import { colors, font, spacing } from '../theme';

const MAX_TIMES = 6;

export default function RemindersScreen({ navigation }: any) {
  const app = useApp();
  const myDates = useMemo(
    () => app.moments.filter((m) => m.authorId === app.meId).map((m) => m.date),
    [app.moments, app.meId],
  );
  const partnerName = app.identity?.partnerName;
  const myPlanDates = useMemo(
    () => app.schedule.filter((s) => s.authorId === app.meId).map((s) => s.date),
    [app.schedule, app.meId],
  );

  const [enabled, setEnabled] = useState(false);
  const [times, setTimes] = useState<ReminderTime[]>(DEFAULT_TIMES);
  const [plan, setPlan] = useState<PlanConfig>(DEFAULT_PLAN);

  useEffect(() => {
    getReminderConfig().then((c) => {
      setEnabled(c.enabled);
      setTimes(c.times);
    });
    getPlanConfig().then(setPlan);
  }, []);

  async function persist(next: ReminderTime[]) {
    setTimes(next);
    await setReminderTimes(next, myDates, partnerName);
  }

  async function savePlan(next: PlanConfig, isEnabling = false) {
    setPlan(next);
    const active = await setPlanConfig(next, myPlanDates, partnerName);
    if (isEnabling && next.enabled && !active) {
      setPlan({ ...next, enabled: false });
      Alert.alert(
        remindersSupported ? 'Allow notifications' : 'Phone app only',
        remindersSupported
          ? 'Please allow notifications for Tether in your phone’s settings, then turn this on again.'
          : 'Reminders run on the installed phone app, not the web preview.',
      );
    }
  }

  function adjustPlan(which: 'morning' | 'evening', field: 'hour' | 'minute', delta: number) {
    const key = which === 'morning' ? 'morningTime' : 'eveningTime';
    const t = plan[key];
    const nt =
      field === 'hour'
        ? { ...t, hour: (t.hour + delta + 24) % 24 }
        : { ...t, minute: (t.minute + delta + 60) % 60 };
    savePlan({ ...plan, [key]: nt });
  }

  async function toggle(next: boolean) {
    const active = await setRemindersEnabled(next, myDates, partnerName);
    if (next && !active) {
      setEnabled(false);
      Alert.alert(
        remindersSupported ? 'Allow notifications' : 'Phone app only',
        remindersSupported
          ? 'Please allow notifications for Tether in your phone’s settings, then turn this on again.'
          : 'Reminders run on the installed phone app, not the web preview.',
      );
      return;
    }
    setEnabled(next);
  }

  function adjust(index: number, field: 'hour' | 'minute', delta: number) {
    const next = times.map((t, i) => {
      if (i !== index) return t;
      if (field === 'hour') return { ...t, hour: (t.hour + delta + 24) % 24 };
      return { ...t, minute: (t.minute + delta + 60) % 60 };
    });
    persist(next);
  }

  function removeAt(index: number) {
    if (times.length <= 1) return;
    persist(times.filter((_, i) => i !== index));
  }

  function addTime() {
    if (times.length >= MAX_TIMES) return;
    persist([...times, { hour: 12, minute: 0 }]);
  }

  return (
    <Screen scroll>
      <AppHeader title="Daily reminders" subtitle="Gentle nudges for the two of you" onBack={() => navigation.goBack()} />

      {/* Plan your day (timetable) */}
      <Card style={{ marginBottom: spacing.lg }}>
        <View style={styles.row}>
          <View style={{ flex: 1, paddingRight: spacing.md }}>
            <Title>Plan your day</Title>
            <Muted style={{ marginTop: 4 }}>
              A nudge to add your schedule so {partnerName ?? 'your partner'} knows when you’re free. Skipped once
              you’ve planned.
            </Muted>
          </View>
          <Switch value={plan.enabled} onValueChange={(v) => savePlan({ ...plan, enabled: v }, true)} trackColor={{ true: colors.primary, false: colors.border }} thumbColor={colors.white} />
        </View>

        {plan.enabled ? (
          <>
            <View style={styles.planDivider} />
            <Text style={styles.planLabel}>Plan today · morning nudge</Text>
            <View style={styles.planControls}>
              <Text style={styles.planTime}>{formatTime(plan.morningTime)}</Text>
              <View style={{ flex: 1 }} />
              <Stepper label="hr" onMinus={() => adjustPlan('morning', 'hour', -1)} onPlus={() => adjustPlan('morning', 'hour', 1)} />
              <Stepper label="min" onMinus={() => adjustPlan('morning', 'minute', -5)} onPlus={() => adjustPlan('morning', 'minute', 5)} />
            </View>

            <View style={styles.planDivider} />
            <View style={styles.row}>
              <View style={{ flex: 1, paddingRight: spacing.md }}>
                <Text style={styles.planLabel}>Also plan tomorrow</Text>
                <Text style={styles.planSub}>An evening nudge to map out tomorrow</Text>
              </View>
              <Switch value={plan.eveningEnabled} onValueChange={(v) => savePlan({ ...plan, eveningEnabled: v })} trackColor={{ true: colors.primary, false: colors.border }} thumbColor={colors.white} />
            </View>
            {plan.eveningEnabled ? (
              <View style={styles.planControls}>
                <Text style={styles.planTime}>{formatTime(plan.eveningTime)}</Text>
                <View style={{ flex: 1 }} />
                <Stepper label="hr" onMinus={() => adjustPlan('evening', 'hour', -1)} onPlus={() => adjustPlan('evening', 'hour', 1)} />
                <Stepper label="min" onMinus={() => adjustPlan('evening', 'minute', -5)} onPlus={() => adjustPlan('evening', 'minute', 5)} />
              </View>
            ) : null}
          </>
        ) : null}
      </Card>

      {/* Share a photo (moments) */}
      <Card style={{ marginBottom: spacing.lg }}>
        <View style={styles.row}>
          <View style={{ flex: 1, paddingRight: spacing.md }}>
            <Title>Share a photo</Title>
            <Muted style={{ marginTop: 4 }}>
              Get nudged to share a daily moment. We skip a day once you’ve already posted, so you’re never nagged twice.
            </Muted>
          </View>
          <Switch value={enabled} onValueChange={toggle} trackColor={{ true: colors.primary, false: colors.border }} thumbColor={colors.white} />
        </View>
        {!remindersSupported ? (
          <Muted style={{ marginTop: spacing.sm }}>These run on the installed phone app.</Muted>
        ) : null}
      </Card>

      <Title style={{ marginBottom: spacing.sm }}>Photo reminder times ({times.length})</Title>
      <View style={{ gap: spacing.sm }}>
        {times.map((t, i) => (
          <Card key={i} style={styles.timeRow}>
            <Text style={styles.timeText}>{formatTime(t)}</Text>
            <View style={{ flex: 1 }} />
            <Stepper label="hr" onMinus={() => adjust(i, 'hour', -1)} onPlus={() => adjust(i, 'hour', 1)} />
            <Stepper label="min" onMinus={() => adjust(i, 'minute', -5)} onPlus={() => adjust(i, 'minute', 5)} />
            {times.length > 1 ? (
              <Pressable hitSlop={8} onPress={() => removeAt(i)} style={{ paddingHorizontal: spacing.sm }}>
                <Text style={styles.remove}>×</Text>
              </Pressable>
            ) : null}
          </Card>
        ))}
      </View>

      {times.length < MAX_TIMES ? (
        <>
          <View style={{ height: spacing.md }} />
          <Button label="＋ Add a time" variant="soft" onPress={addTime} />
        </>
      ) : null}

      <Card tone="surface" style={{ marginTop: spacing.lg }}>
        <Body>
          Tip: 3 times a day (morning, afternoon, evening) works well. The reminders stop for the
          day the moment you share a photo.
        </Body>
      </Card>
    </Screen>
  );
}

function Stepper({ label, onMinus, onPlus }: { label: string; onMinus: () => void; onPlus: () => void }) {
  return (
    <View style={styles.stepper}>
      <Pressable hitSlop={6} onPress={onMinus} style={styles.stepBtn}>
        <Text style={styles.stepSign}>−</Text>
      </Pressable>
      <Text style={styles.stepLabel}>{label}</Text>
      <Pressable hitSlop={6} onPress={onPlus} style={styles.stepBtn}>
        <Text style={styles.stepSign}>＋</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  planDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: spacing.md },
  planControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  planLabel: { fontSize: font.size.md, fontFamily: font.family.semibold, color: colors.text },
  planSub: { fontSize: 11, color: colors.textFaint, fontFamily: font.family.body, marginTop: 1 },
  planTime: { fontSize: font.size.lg, fontFamily: font.family.bold, color: colors.text },
  timeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, gap: spacing.sm },
  timeText: { fontSize: font.size.lg, fontFamily: font.family.bold, color: colors.text, width: 92 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepSign: { fontSize: 18, fontFamily: font.family.bold, color: colors.text },
  stepLabel: { fontSize: 10, color: colors.textFaint, width: 22, textAlign: 'center' },
  remove: { fontSize: 26, color: colors.textFaint },
});
