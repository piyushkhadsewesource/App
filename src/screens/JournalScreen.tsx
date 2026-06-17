import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader, Body, Card, Muted, Screen, Title } from '../components/ui';
import { todayISO } from '../lib/date';
import { generateReport } from '../lib/journal';
import { useApp } from '../state/AppContext';
import { colors, font, radius, spacing } from '../theme';

function shiftMonth(iso: string, delta: number): string {
  const [y, m] = iso.split('-').map((x) => parseInt(x, 10));
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export default function JournalScreen({ navigation }: any) {
  const app = useApp();
  const [monthISO, setMonthISO] = useState(todayISO());
  const isCurrentMonth = monthISO.slice(0, 7) === todayISO().slice(0, 7);

  const report = useMemo(
    () =>
      generateReport({
        checkins: app.checkins,
        memories: app.memories,
        letters: app.letters,
        pings: app.pings,
        deck: app.deck,
        meId: app.meId,
        partnerId: app.partnerId,
        meName: app.identity?.name ?? 'You',
        partnerName: app.identity?.partnerName ?? 'Partner',
        monthISO,
      }),
    [app.checkins, app.memories, app.letters, app.pings, app.deck, app.meId, app.partnerId, app.identity, monthISO],
  );

  return (
    <Screen scroll>
      <AppHeader title="Our journal" subtitle="Written from your month together" onBack={() => navigation.goBack()} />

      {/* Month stepper */}
      <View style={styles.stepper}>
        <Pressable onPress={() => setMonthISO((m) => shiftMonth(m, -1))} hitSlop={12}>
          <Text style={styles.stepArrow}>‹</Text>
        </Pressable>
        <Text style={styles.month}>{report.periodLabel}</Text>
        <Pressable onPress={() => !isCurrentMonth && setMonthISO((m) => shiftMonth(m, 1))} hitSlop={12} disabled={isCurrentMonth}>
          <Text style={[styles.stepArrow, isCurrentMonth && { color: colors.border }]}>›</Text>
        </Pressable>
      </View>

      <Card tone="violet">
        <Text style={{ fontSize: 30 }}>📖</Text>
        <Title style={{ marginTop: spacing.sm, fontSize: font.size.xl, lineHeight: 28 }}>{report.sentence}</Title>
      </Card>

      {!report.empty ? (
        <>
          {/* Stats */}
          <View style={styles.statsRow}>
            {report.stats.map((s) => (
              <View key={s.label} style={styles.stat}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Sections */}
          <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
            {report.sections.map((sec) => (
              <Card key={sec.heading}>
                <Title>{sec.heading}</Title>
                <Body style={{ marginTop: spacing.sm, lineHeight: 23 }}>{sec.body}</Body>
              </Card>
            ))}
          </View>

          <Muted style={{ marginTop: spacing.lg, textAlign: 'center' }}>
            Written automatically from your check-ins, memories and letters. Nothing leaves your space.
          </Muted>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg, paddingHorizontal: spacing.sm },
  stepArrow: { fontSize: 30, color: colors.primary, fontFamily: font.family.bold, width: 40, textAlign: 'center' },
  month: { fontSize: font.size.lg + 1, fontFamily: font.family.displaySemi, color: colors.text },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: { fontSize: font.size.xl, fontFamily: font.family.displaySemi, color: colors.text },
  statLabel: { fontSize: 11, color: colors.textSoft, marginTop: 2, textAlign: 'center' },
});
