import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  AppHeader,
  Avatar,
  Body,
  Card,
  Muted,
  ProgressBar,
  Screen,
  SectionTitle,
  Tag,
  Title,
} from '../components/ui';
import { formatDayMonth, greeting, isoToDate, todayISO } from '../lib/date';
import { computeHealth } from '../lib/health';
import { promptForDay } from '../lib/intimacy';
import { moodMeta } from '../lib/mood';
import { captureStreak, hasMomentToday } from '../lib/moments';
import { countdownTo, shortCountdown } from '../lib/countdown';
import { latestCheckin, strugglingStreak } from '../lib/pulse';
import { useApp } from '../state/AppContext';
import { colors, font, gradients, radius, shadow, spacing } from '../theme';

export default function HomeScreen({ navigation }: any) {
  const app = useApp();
  const { identity, meId, partnerId, checkins, pings, memories } = app;
  const today = todayISO();

  const health = useMemo(
    () => computeHealth({ checkins, memories, letters: app.letters, pings, deck: app.deck, meId, partnerId }),
    [checkins, memories, app.letters, pings, app.deck, meId, partnerId],
  );
  const myToday = latestCheckin(checkins, meId);
  const myCheckedToday = myToday?.date === today;
  const partnerLatest = latestCheckin(checkins, partnerId);
  const partnerStreak = strugglingStreak(checkins, partnerId);
  const unseenPings = pings.filter((p) => p.fromId !== meId && !p.seenAt);
  const momentDoneToday = hasMomentToday(app.moments, meId);
  const momentStreak = captureStreak(app.moments, meId);
  const meeting = app.meeting;

  const onThisDay = useMemo(() => {
    const md = today.slice(5);
    return memories.find((m) => m.date.slice(5) === md && m.date.slice(0, 4) !== today.slice(0, 4));
  }, [memories, today]);

  const prompt = promptForDay();

  return (
    <Screen scroll>
      <AppHeader
        title={`${greeting()}, ${identity?.name ?? ''}`}
        subtitle={`You & ${identity?.partnerName ?? 'your love'}`}
        right={<Avatar name={identity?.name ?? '?'} />}
      />

      {/* Struggling alert */}
      {partnerStreak ? (
        <Card tone="violet" onPress={() => navigation.navigate('Insights')} style={styles.alert}>
          <Text style={styles.alertEmoji}>💜</Text>
          <View style={{ flex: 1 }}>
            <Title>{identity?.partnerName} has had {partnerStreak.days} hard days</Title>
            <Muted>They could use some extra gentleness. Tap for ways to reach out.</Muted>
          </View>
        </Card>
      ) : null}

      {/* Unseen hugs */}
      {unseenPings.length > 0 ? (
        <Card tone="rose" onPress={() => navigation.navigate('MissYou')} style={styles.alert}>
          <Text style={styles.alertEmoji}>🤗</Text>
          <View style={{ flex: 1 }}>
            <Title>
              {unseenPings.length} new {unseenPings.length === 1 ? 'hug' : 'hugs'} from {identity?.partnerName}
            </Title>
            <Muted>They’re thinking about you right now. Tap to feel it.</Muted>
          </View>
        </Card>
      ) : null}

      {/* Today's moment nudge */}
      {!momentDoneToday ? (
        <Card tone="gold" onPress={() => navigation.navigate('Moments')} style={styles.alert}>
          <Text style={styles.alertEmoji}>📸</Text>
          <View style={{ flex: 1 }}>
            <Title>Capture today’s moment</Title>
            <Muted>
              {momentStreak > 0 ? `Keep your ${momentStreak}-day streak going.` : 'One photo a day builds your shared gallery.'}
            </Muted>
          </View>
        </Card>
      ) : null}

      {/* Reunion countdown */}
      {meeting ? (
        <Card tone="violet" onPress={() => navigation.navigate('Countdown')} style={styles.alert}>
          <Text style={styles.alertEmoji}>💞</Text>
          <View style={{ flex: 1 }}>
            <Title>
              {countdownTo(meeting.at).past ? 'You’re together 💞' : `Together in ${shortCountdown(meeting.at)}`}
            </Title>
            <Muted>{meeting.label || 'Tap for the live countdown.'}</Muted>
          </View>
        </Card>
      ) : (
        <Card onPress={() => navigation.navigate('Countdown')} style={styles.alert}>
          <Text style={styles.alertEmoji}>💞</Text>
          <View style={{ flex: 1 }}>
            <Title>Set your reunion date</Title>
            <Muted>Add when you meet next and watch the countdown.</Muted>
          </View>
        </Card>
      )}

      {/* Relationship health hero */}
      <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, shadow.hero]}>
        <View style={styles.healthTop}>
          <View>
            <Text style={styles.heroLabel}>Closeness today</Text>
            <Text style={styles.heroScore}>{health.closeness}</Text>
          </View>
          <View style={styles.heroTag}>
            <Text style={styles.heroTagText}>{health.label}</Text>
          </View>
        </View>
        <View style={styles.heroTrack}>
          <View style={[styles.heroFill, { width: `${Math.max(4, Math.min(100, health.closeness))}%` }]} />
        </View>
        <View style={styles.metricsRow}>
          <HeroMetric label="Mood sync" value={`${health.moodAlignment}%`} />
          <HeroMetric label="This week" value={`${health.sharedThisWeek}`} />
          <HeroMetric
            label="Together"
            value={health.daysSinceTogether == null ? 'not yet' : health.daysSinceTogether === 0 ? 'today' : `${health.daysSinceTogether}d ago`}
          />
        </View>
      </LinearGradient>

      {/* Today's pulse */}
      <SectionTitle right={<Pressable onPress={() => navigation.navigate('Pulse')}><Text style={styles.link}>Open</Text></Pressable>}>
        Today’s pulse
      </SectionTitle>

      <Card onPress={() => navigation.navigate('Pulse')}>
        <View style={styles.pulseRow}>
          <PulseFace
            name="You"
            color={colors.primary}
            checkedToday={myCheckedToday}
            mood={myCheckedToday && myToday ? moodMeta(myToday.mood) : null}
          />
          <View style={styles.pulseDivider} />
          <PulseFace
            name={identity?.partnerName ?? 'Partner'}
            color={colors.accent}
            checkedToday={partnerLatest?.date === today}
            mood={partnerLatest?.date === today ? moodMeta(partnerLatest.mood) : null}
          />
        </View>
        {partnerLatest?.date === today && partnerLatest.need ? (
          <View style={styles.needBox}>
            <Muted>{identity?.partnerName} needs today</Muted>
            <Body style={{ marginTop: 2 }}>“{partnerLatest.need}”</Body>
          </View>
        ) : !myCheckedToday ? (
          <View style={styles.needBox}>
            <Body>How are you feeling today? Tap to check in. 🤍</Body>
          </View>
        ) : null}
      </Card>

      {/* On this day */}
      {onThisDay ? (
        <>
          <SectionTitle>On this day</SectionTitle>
          <Card tone="gold" onPress={() => navigation.navigate('Vault')}>
            <Muted>
              {today.slice(0, 4) === onThisDay.date.slice(0, 4)
                ? formatDayMonth(onThisDay.date)
                : `${isoToDate(today).getFullYear() - isoToDate(onThisDay.date).getFullYear()} year(s) ago today`}
            </Muted>
            <Title style={{ marginTop: 2 }}>
              {onThisDay.emoji ? `${onThisDay.emoji} ` : ''}
              {onThisDay.title}
            </Title>
            {onThisDay.description ? <Body style={{ marginTop: 4 }}>{onThisDay.description}</Body> : null}
          </Card>
        </>
      ) : null}

      {/* Quick actions */}
      <SectionTitle>Reach for each other</SectionTitle>
      <View style={styles.grid}>
        <QuickTile emoji="🆘" label="Emergency" onPress={() => navigation.navigate('MissYou')} />
        <QuickTile emoji="📸" label="Moments" onPress={() => navigation.navigate('Moments')} />
        <QuickTile emoji="💞" label="Countdown" onPress={() => navigation.navigate('Countdown')} />
        <QuickTile emoji="🤍" label="When I miss you" onPress={() => navigation.navigate('MissYou')} />
        <QuickTile emoji="💌" label="Love letters" onPress={() => navigation.navigate('Letters')} />
        <QuickTile emoji="🃏" label="Intimacy deck" onPress={() => navigation.navigate('Deck')} />
        <QuickTile emoji="📖" label="Our journal" onPress={() => navigation.navigate('Journal')} />
        <QuickTile emoji="✨" label="Future board" onPress={() => navigation.navigate('Future')} />
        <QuickTile emoji="💜" label="Insights" onPress={() => navigation.navigate('Insights')} />
      </View>

      {/* Daily prompt teaser */}
      <SectionTitle>Today’s closeness question</SectionTitle>
      <Card tone="violet" onPress={() => navigation.navigate('Deck')}>
        <Body style={{ fontWeight: font.weight.semibold }}>{prompt.text}</Body>
        <Muted style={{ marginTop: spacing.sm }}>Tap to answer together →</Muted>
      </Card>
    </Screen>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={styles.heroMetricValue}>{value}</Text>
      <Text style={styles.heroMetricLabel}>{label}</Text>
    </View>
  );
}

function PulseFace({
  name,
  color,
  checkedToday,
  mood,
}: {
  name: string;
  color: string;
  checkedToday: boolean;
  mood: { emoji: string; label: string } | null;
}) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={{ fontSize: 34 }}>{mood ? mood.emoji : checkedToday ? '🙂' : '⚪️'}</Text>
      <Text style={[styles.pulseName, { color }]}>{name}</Text>
      <Muted>{mood ? mood.label : checkedToday ? 'Checked in' : 'No check-in yet'}</Muted>
    </View>
  );
}

function QuickTile({ emoji, label, onPress }: { emoji: string; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.tile, pressed ? { opacity: 0.8 } : null]}>
      <Text style={{ fontSize: 26 }}>{emoji}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  alert: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  alertEmoji: { fontSize: 30 },

  hero: { borderRadius: radius.lg, padding: 22, marginTop: spacing.md, overflow: 'hidden' },
  heroLabel: { color: 'rgba(255,255,255,0.85)', fontSize: font.size.md, fontFamily: font.family.medium },
  heroScore: { color: colors.white, fontSize: 52, fontFamily: font.family.display, lineHeight: 56, marginTop: 2 },
  heroTag: { backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start' },
  heroTagText: { color: colors.white, fontFamily: font.family.bold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 },
  heroTrack: { height: 10, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden', marginTop: spacing.md },
  heroFill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.white },
  heroMetricValue: { color: colors.white, fontSize: font.size.lg, fontFamily: font.family.bold },
  heroMetricLabel: { color: 'rgba(255,255,255,0.8)', fontSize: font.size.xs, marginTop: 2, fontFamily: font.family.body },

  healthTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  metricsRow: { flexDirection: 'row', marginTop: spacing.lg },
  link: { color: colors.primary, fontFamily: font.family.semibold, fontSize: font.size.md },
  pulseRow: { flexDirection: 'row', alignItems: 'center' },
  pulseDivider: { width: 1, height: 56, backgroundColor: colors.border },
  pulseName: { fontFamily: font.family.bold, marginTop: 4, fontSize: font.size.md },
  needBox: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(90,46,64,0.05)',
    ...shadow.card,
  },
  tileLabel: { fontSize: font.size.md, fontFamily: font.family.semibold, color: colors.text },
});
