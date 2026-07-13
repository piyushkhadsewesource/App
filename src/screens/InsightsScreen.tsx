import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppHeader, Body, Card, EmptyState, Muted, Screen, Tag, Title } from '../components/ui';
import { analyze, severityLabel, Severity } from '../lib/attachment';
import { computeHealth } from '../lib/health';
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

  // The closeness reflection lives here now — weekly weather, spoken softly,
  // instead of a daily 0-100 grade on the home screen.
  const health = useMemo(
    () =>
      computeHealth({
        checkins: app.checkins,
        memories: app.memories,
        letters: app.letters,
        pings: app.pings,
        deck: app.deck,
        moments: app.moments,
        meId: app.meId,
        partnerId: app.partnerId,
      }),
    [app.checkins, app.memories, app.letters, app.pings, app.deck, app.moments, app.meId, app.partnerId],
  );
  const hasHealthData = app.checkins.length > 0;

  return (
    <Screen scroll>
      <AppHeader title="Companion" subtitle="Gentle, private, on your side" onBack={() => navigation.goBack()} />

      {hasHealthData ? (
        <Card tone="rose" style={{ marginBottom: spacing.md }}>
          <Muted>This week, together</Muted>
          <Text style={styles.weekLine}>{health.label}</Text>
          <Body style={{ marginTop: spacing.xs }}>
            You shared {health.sharedThisWeek} {health.sharedThisWeek === 1 ? 'thing' : 'things'} this week
            {health.moodAlignment >= 70
              ? ', and your moods have moved in step.'
              : health.moodAlignment >= 40
                ? ', with your moods drifting in and out of step.'
                : ', while your moods have been in different weather.'}
          </Body>
        </Card>
      ) : null}

      <Card tone="violet" style={{ marginBottom: spacing.lg }}>
        <Body>
          This reads the rhythm of your check-ins and quietly points out patterns, withdrawal,
          stress, reassurance-seeking, before they become fights. It's a companion, never a
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
  // A voice moment: the week's weather speaks Fraunces.
  weekLine: {
    fontSize: font.size.xxl,
    lineHeight: 34,
    fontFamily: font.family.display,
    color: colors.text,
    letterSpacing: font.tracking.heading,
    marginTop: 2,
  },
  coachBox: { borderRadius: 14, padding: spacing.md, marginTop: spacing.md },
  coachLabel: { fontFamily: font.family.bold, fontSize: font.size.sm, color: colors.textSoft, textTransform: 'uppercase', letterSpacing: 0.4 },
});
