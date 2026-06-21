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
import { occasionsOnThisDay, ordinal, untilLabel, upcomingOccasion } from '../lib/occasions';
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

  const occToday = useMemo(() => occasionsOnThisDay(app.occasions), [app.occasions]);
  const anniToday = occToday[0] ?? null;
  const upcoming = useMemo(() => {
    const ids = new Set(occToday.map((x) => x.occasion.id));
    return upcomingOccasion(app.occasions.filter((o) => !ids.has(o.id)), 31, 0);
  }, [app.occasions, occToday]);
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const nextPlan = useMemo(() => {
    const todays = app.schedule.filter((s) => s.date === today).sort((a, b) => a.startMin - b.startMin);
    return todays.find((s) => s.startMin >= nowMin - 30) ?? null;
  }, [app.schedule, today, nowMin]);

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

      {/* A year ago today (from your saved dates) */}
      {anniToday ? (
        <Card tone="gold" onPress={() => navigation.navigate('Occasions')} style={styles.alert}>
          <Text style={styles.alertEmoji}>{anniToday.occasion.icon || '🎉'}</Text>
          <View style={{ flex: 1 }}>
            <Title>
              {anniToday.yearsAgo >= 1
                ? `${ordinal(anniToday.yearsAgo)} ${anniToday.occasion.title} today 🎉`
                : `${anniToday.occasion.title} is today 🎉`}
            </Title>
            <Muted>
              {anniToday.yearsAgo >= 1
                ? `${anniToday.yearsAgo} year${anniToday.yearsAgo === 1 ? '' : 's'} ago today. Make it count 💞`
                : 'Make it count 💞'}
            </Muted>
          </View>
        </Card>
      ) : null}

      {/* Upcoming anniversary / special date */}
      {upcoming ? (
        <Card tone="rose" onPress={() => navigation.navigate('Occasions')} style={styles.alert}>
          <Text style={styles.alertEmoji}>{upcoming.occasion.icon || '🎉'}</Text>
          <View style={{ flex: 1 }}>
            <Title>
              {upcoming.occasion.title} · {untilLabel(upcoming.days).toLowerCase()}
            </Title>
            <Muted>{upcoming.days === 0 ? 'It’s today, make it count 💞' : 'Tap to see all your special dates.'}</Muted>
          </View>
        </Card>
      ) : null}

      {/* Next on today's plan */}
      {nextPlan ? (
        <Card onPress={() => navigation.navigate('Schedule')} style={styles.alert}>
          <Text style={styles.alertEmoji}>{nextPlan.icon || '🗓️'}</Text>
          <View style={{ flex: 1 }}>
            <Title>Next up: {nextPlan.title}</Title>
            <Muted>
              {minLabel(nextPlan.startMin)} · {app.isMine(nextPlan.authorId) ? 'your plan' : `${identity?.partnerName ?? 'their'} plan`}
            </Muted>
          </View>
        </Card>
      ) : null}

      {/* Relationship health hero */}
      <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, shadow.hero]}>
        <View style={styles.healthTop}>
          <View>
            <Text style={styles.heroLabel}>Closeness today</Text>
            <Text style={styles.heroScore}>
              {health.closeness}
              <Text style={styles.heroScoreMax}>/100</Text>
            </Text>
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

      {/* Play together */}
      <Card tone="violet" onPress={() => navigation.navigate('Games')} style={styles.alert}>
        <Text style={styles.alertEmoji}>🎮</Text>
        <View style={{ flex: 1 }}>
          <Title>Play together</Title>
          <Muted>Daily Wordle, Ludo, Snakes & Ladders, Tic-Tac-Toe, and more.</Muted>
        </View>
      </Card>

      {/* Quick actions */}
      <SectionTitle>Reach for each other</SectionTitle>
      <View style={styles.grid}>
        <QuickTile emoji="🆘" label="Emergency" tint={colors.dangerSoft} onPress={() => navigation.navigate('MissYou')} />
        <QuickTile emoji="📸" label="Moments" tint={colors.goldSoft} onPress={() => navigation.navigate('Moments')} />
        <QuickTile emoji="💞" label="Countdown" tint={colors.primarySoft} onPress={() => navigation.navigate('Countdown')} />
        <QuickTile emoji="🤍" label="When I miss you" tint={colors.accentSoft} onPress={() => navigation.navigate('MissYou')} />
        <QuickTile emoji="💌" label="Love letters" tint={colors.primarySoft} onPress={() => navigation.navigate('Letters')} />
        <QuickTile emoji="🃏" label="Intimacy deck" tint={colors.accentSoft} onPress={() => navigation.navigate('Deck')} />
        <QuickTile emoji="📖" label="Our journal" tint={colors.goldSoft} onPress={() => navigation.navigate('Journal')} />
        <QuickTile emoji="✨" label="Future board" tint={colors.goodSoft} onPress={() => navigation.navigate('Future')} />
        <QuickTile emoji="🗓️" label="Our day" tint={colors.goodSoft} onPress={() => navigation.navigate('Schedule')} />
        <QuickTile emoji="🎀" label="Dates" tint={colors.primarySoft} onPress={() => navigation.navigate('Occasions')} />
        <QuickTile emoji="💜" label="Insights" tint={colors.accentSoft} onPress={() => navigation.navigate('Insights')} />
        <QuickTile emoji="🎮" label="Games" tint={colors.primarySoft} onPress={() => navigation.navigate('Games')} />
      </View>

      {/* Daily prompt teaser */}
      <SectionTitle>Today’s closeness question</SectionTitle>
      <Card tone="violet" onPress={() => navigation.navigate('Deck')}>
        <Body style={{ fontFamily: font.family.semibold }}>{prompt.text}</Body>
        <Muted style={{ marginTop: spacing.sm }}>Tap to answer together →</Muted>
      </Card>
    </Screen>
  );
}

function minLabel(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
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
      {mood ? (
        <Text style={{ fontSize: 34 }}>{mood.emoji}</Text>
      ) : checkedToday ? (
        <Text style={{ fontSize: 34 }}>🙂</Text>
      ) : (
        <View style={[styles.facePlaceholder, { borderColor: color + '40' }]} />
      )}
      <Text style={[styles.pulseName, { color }]}>{name}</Text>
      <Muted>{mood ? mood.label : checkedToday ? 'Checked in' : 'No check-in yet'}</Muted>
    </View>
  );
}

function QuickTile({
  emoji,
  label,
  tint,
  onPress,
}: {
  emoji: string;
  label: string;
  tint: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.tile, pressed ? styles.tilePressed : null]}>
      <View style={[styles.tileBadge, { backgroundColor: tint }]}>
        <Text style={styles.tileEmoji}>{emoji}</Text>
      </View>
      <Text style={styles.tileLabel} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  alert: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  alertEmoji: { fontSize: 30 },

  hero: { borderRadius: radius.lg, padding: 22, marginTop: spacing.md, overflow: 'hidden' },
  heroLabel: { color: 'rgba(255,255,255,0.85)', fontSize: font.size.md, fontFamily: font.family.medium },
  heroScore: { color: colors.white, fontSize: 52, fontFamily: font.family.display, lineHeight: 56, marginTop: 2 },
  heroScoreMax: { color: 'rgba(255,255,255,0.7)', fontSize: 20, fontFamily: font.family.medium },
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
  facePlaceholder: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderStyle: 'dashed',
    backgroundColor: colors.surfaceAlt,
  },
  needBox: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(90,46,64,0.05)',
    ...shadow.card,
  },
  tilePressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  tileBadge: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  tileEmoji: { fontSize: 25 },
  tileLabel: { fontSize: font.size.md, fontFamily: font.family.semibold, color: colors.text, textAlign: 'center' },
});
