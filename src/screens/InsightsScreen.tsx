import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppHeader, Body, Card, EmptyState, Muted, Screen, Tag, Title } from '../components/ui';
import { analyze, severityLabel, Severity } from '../lib/attachment';
import { useApp } from '../state/AppContext';
import { colors, font, spacing } from '../theme';

const SEVERITY_COLOR: Record<Severity, string> = {
  tend: colors.primary,
  watch: colors.warn,
  info: colors.accent,
};

export default function InsightsScreen({ navigation }: any) {
  const app = useApp();
  const insights = useMemo(
    () =>
      analyze({
        checkins: app.checkins,
        meId: app.meId,
        partnerId: app.partnerId,
        meName: app.identity?.name ?? 'You',
        partnerName: app.identity?.partnerName ?? 'Partner',
      }),
    [app.checkins, app.meId, app.partnerId, app.identity],
  );

  return (
    <Screen scroll>
      <AppHeader title="Companion" subtitle="Gentle, private, on your side" onBack={() => navigation.goBack()} />

      <Card tone="violet" style={{ marginBottom: spacing.lg }}>
        <Body>
          This reads the rhythm of your check-ins and quietly points out patterns, withdrawal,
          stress, reassurance-seeking, before they become fights. It’s a companion, never a
          judge, and it never leaves your space.
        </Body>
      </Card>

      {insights.length === 0 ? (
        <Card>
          <EmptyState
            emoji="🌿"
            title="All steady"
            text="Nothing to flag right now. Keep checking in, the more you both share, the more helpful this becomes."
          />
        </Card>
      ) : (
        <View style={{ gap: spacing.md }}>
          {insights.map((ins) => (
            <Card key={ins.id}>
              <View style={styles.head}>
                <Tag label={severityLabel(ins.severity)} color={SEVERITY_COLOR[ins.severity]} />
              </View>
              <Title style={{ marginTop: spacing.sm }}>{ins.title}</Title>
              <Muted style={{ marginTop: 2 }}>{ins.summary}</Muted>

              <View style={[styles.coachBox, { backgroundColor: colors.surfaceAlt }]}>
                <Body style={styles.coachLabel}>For you</Body>
                <Body style={{ marginTop: 2 }}>{ins.forYou}</Body>
              </View>
              <View style={[styles.coachBox, { backgroundColor: colors.primarySoft }]}>
                <Body style={styles.coachLabel}>Try together</Body>
                <Body style={{ marginTop: 2 }}>{ins.together}</Body>
              </View>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row' },
  coachBox: { borderRadius: 14, padding: spacing.md, marginTop: spacing.md },
  coachLabel: { fontWeight: font.weight.bold, fontSize: font.size.sm, color: colors.textSoft, textTransform: 'uppercase', letterSpacing: 0.4 },
});
