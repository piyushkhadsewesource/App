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
import { Heartbeat } from '../components/Heartbeat';
import IntensityChart from '../components/IntensityChart';
import { Reveal } from '../components/Motion';
import { buildActivity, withinHours } from '../lib/activity';
import { formatDayMonth, formatRelative, greeting, isoToDate, todayISO } from '../lib/date';
import { averageIntensity, todaysFeelings } from '../lib/feelings';
import { computeHealth } from '../lib/health';
import { promptForDay } from '../lib/intimacy';
import { moodMeta } from '../lib/mood';
import { captureStreak, hasMomentToday } from '../lib/moments';
import { countdownTo, shortCountdown } from '../lib/countdown';
import { issueNeedingYou } from '../lib/issues';
import { occasionsOnThisDay, ordinal, untilLabel, upcomingOccasion } from '../lib/occasions';
import { latestCheckin, strugglingStreak } from '../lib/pulse';
import { useNow } from '../lib/useNow';
import { useApp } from '../state/AppContext';
import { colors, font, gradients, radius, shadow, spacing } from '../theme';

export default function HomeScreen({ navigation }: any) {
  const app = useApp();
  const { identity, meId, partnerId, checkins, pings, memories } = app;
  const today = todayISO();
  // A slow tick so presence ("Active now") and the next-plan window stay honest
  // without waiting for the next data change.
  const now = useNow(60_000);

  const health = useMemo(
    () => computeHealth({ checkins, memories, letters: app.letters, pings, deck: app.deck, moments: app.moments, meId, partnerId }),
    [checkins, memories, app.letters, pings, app.deck, app.moments, meId, partnerId],
  );
  const myToday = latestCheckin(checkins, meId);
  const myCheckedToday = myToday?.date === today;
  const partnerLatest = latestCheckin(checkins, partnerId);
  const partnerStreak = strugglingStreak(checkins, partnerId);
  const unseenPings = pings.filter((p) => p.fromId !== meId && !p.seenAt);
  const tendIssue = useMemo(() => issueNeedingYou(app.issues, meId), [app.issues, meId]);
  const myFeelings = useMemo(() => todaysFeelings(app.feelings, meId), [app.feelings, meId]);
  const partnerFeelings = useMemo(() => todaysFeelings(app.feelings, partnerId), [app.feelings, partnerId]);
  const momentDoneToday = hasMomentToday(app.moments, meId);

  // Everything that happened recently, across every feature, newest first, so the
  // day shows on Home and your partner's actions are easy to spot and reply to.
  const activity = useMemo(
    () =>
      buildActivity({
        meId,
        authorName: app.authorName,
        checkins,
        feelings: app.feelings,
        moments: app.moments,
        memories,
        reasons: app.reasons,
        future: app.future,
        deck: app.deck,
        schedule: app.schedule,
        occasions: app.occasions,
        issues: app.issues,
        letters: app.letters,
        pings,
        wordle: app.wordle,
        tictactoe: app.tictactoe,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [meId, checkins, app.feelings, app.moments, memories, app.reasons, app.future, app.deck, app.schedule, app.occasions, app.issues, app.letters, pings, app.wordle, app.tictactoe],
  );
  const recent = useMemo(() => withinHours(activity, 36), [activity]);
  const partnerNew = useMemo(() => recent.filter((e) => !e.mine).length, [recent]);
  // Presence: if your partner did anything in the last hour, their pulse face beats.
  const partnerActive = useMemo(() => recent.some((e) => !e.mine && e.at > now - 60 * 60 * 1000), [recent, now]);
  const momentStreak = captureStreak(app.moments, meId);
  const meeting = app.meeting;

  const occToday = useMemo(() => occasionsOnThisDay(app.occasions), [app.occasions]);
  const anniToday = occToday[0] ?? null;
  const upcoming = useMemo(() => {
    const ids = new Set(occToday.map((x) => x.occasion.id));
    return upcomingOccasion(app.occasions.filter((o) => !ids.has(o.id)), 31, 0);
  }, [app.occasions, occToday]);
  const nowMin = new Date(now).getHours() * 60 + new Date(now).getMinutes();
  const nextPlan = useMemo(() => {
    const todays = app.schedule.filter((s) => s.date === today).sort((a, b) => a.startMin - b.startMin);
    return todays.find((s) => s.startMin >= nowMin - 30) ?? null;
  }, [app.schedule, today, nowMin]);

  const onThisDay = useMemo(() => {
    const md = today.slice(5);
    return memories.find((m) => m.date.slice(5) === md && m.date.slice(0, 4) !== today.slice(0, 4));
  }, [memories, today]);

  const prompt = promptForDay();

  // Day-one: until there's anything to score, an inviting "begin" hero reads far
  // warmer than "10/100 · Getting started" as the first message about the
  // relationship. Any of these signals means the score is meaningful.
  const hasSignal =
    checkins.length > 0 ||
    app.feelings.length > 0 ||
    app.moments.length > 0 ||
    memories.length > 0 ||
    pings.length > 0 ||
    app.deck.length > 0;

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

      {/* Partner raised something to clear the air */}
      {tendIssue ? (
        <Card tone="rose" onPress={() => navigation.navigate('IssueDetail', { id: tendIssue.id })} style={styles.alert}>
          <Text style={styles.alertEmoji}>🕊️</Text>
          <View style={{ flex: 1 }}>
            <Title>{identity?.partnerName} wants to clear the air</Title>
            <Muted>"{tendIssue.title}". Tap to hear them out and make it right.</Muted>
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

      {/* Reunion countdown — only shown once a date is set */}
      {meeting ? (
        <Card tone="violet" onPress={() => navigation.navigate('Countdown')} style={styles.alert}>
          <Text style={styles.alertEmoji}>💞</Text>
          <View style={{ flex: 1 }}>
            <Title>
              {countdownTo(meeting.at).past ? "You're together 💞" : `Together in ${shortCountdown(meeting.at)}`}
            </Title>
            <Muted>{meeting.label || 'Tap for the live countdown.'}</Muted>
          </View>
        </Card>
      ) : (
        // Zero-state: nudge the most emotional feature so a live countdown is one
        // tap away on the very first Home view. Disappears once a date is set.
        <Card tone="violet" onPress={() => navigation.navigate('Countdown')} style={styles.alert}>
          <Text style={styles.alertEmoji}>💞</Text>
          <View style={{ flex: 1 }}>
            <Title>Set your reunion date</Title>
            <Muted>Start a live countdown to the next time you’re together.</Muted>
          </View>
          <Text style={styles.actChevron}>›</Text>
        </Card>
      )}

      {/* Today's occasion */}
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

      {/* What's new together (cross-feature activity feed) */}
      {recent.length > 0 ? (
        <>
          <SectionTitle
            right={
              partnerNew > 0 ? (
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>{partnerNew} from {identity?.partnerName ?? 'them'}</Text>
                </View>
              ) : undefined
            }
          >
            What’s new together
          </SectionTitle>
          <Card style={styles.feedCard}>
            {recent.slice(0, 7).map((e, i) => (
              // Each row cascades in with a staggered reveal for a buttery feed.
              <Reveal key={e.id} delay={i * 55}>
                <Pressable
                  onPress={() => navigation.navigate(e.route, e.params)}
                  style={({ pressed }) => [styles.actRow, i > 0 ? styles.actDivider : null, !e.mine ? styles.actPartner : null, pressed ? { opacity: 0.7 } : null]}
                >
                  <Text style={{ fontSize: 22 }}>{e.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.actText} numberOfLines={2}>{e.text}</Text>
                    <Muted>
                      {formatRelative(e.at)}
                      {!e.mine ? ' · tap to respond' : ''}
                    </Muted>
                  </View>
                  {!e.mine ? <Text style={styles.actChevron}>›</Text> : null}
                </Pressable>
              </Reveal>
            ))}
          </Card>
        </>
      ) : null}

      {/* Relationship health hero */}
      {hasSignal ? (
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
      ) : (
        <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, shadow.hero]}>
          <Text style={styles.heroLabel}>Closeness today</Text>
          <Text style={styles.heroBegin}>Your story starts now 🤍</Text>
          <Text style={styles.heroBeginSub}>
            Check in, share a moment, send {identity?.partnerName ?? 'them'} a hug, and watch your
            closeness grow right here.
          </Text>
        </LinearGradient>
      )}

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
            beating={partnerActive}
          />
        </View>
        {partnerLatest?.date === today && partnerLatest.need ? (
          <View style={styles.needBox}>
            <Muted>{identity?.partnerName} needs today</Muted>
            <Body style={{ marginTop: 2 }}>"{partnerLatest.need}"</Body>
          </View>
        ) : !myCheckedToday ? (
          <View style={styles.needBox}>
            <Body>How are you feeling today? Tap to check in. 🤍</Body>
          </View>
        ) : null}
      </Card>

      {/* Feelings through the day (intensity timeline) */}
      <SectionTitle right={<Pressable onPress={() => navigation.navigate('Pulse')}><Text style={styles.link}>Log</Text></Pressable>}>
        Feelings through the day
      </SectionTitle>
      {myFeelings.length > 0 ? (
        <Card onPress={() => navigation.navigate('Pulse')}>
          <View style={styles.feelHead}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Text style={{ fontSize: 22 }}>{moodMeta(myFeelings[myFeelings.length - 1].mood).emoji}</Text>
              <View>
                <Body style={{ fontFamily: font.family.semibold }}>
                  Now: {moodMeta(myFeelings[myFeelings.length - 1].mood).label} · {myFeelings[myFeelings.length - 1].intensity}/10
                </Body>
                <Muted>
                  {myFeelings.length} logged today · avg {Math.round((averageIntensity(myFeelings) ?? 0) * 10) / 10}/10
                </Muted>
              </View>
            </View>
          </View>
          <View style={{ height: spacing.sm }} />
          <IntensityChart items={myFeelings} />
        </Card>
      ) : (
        <Card tone="violet" onPress={() => navigation.navigate('Pulse')}>
          <Body style={{ fontFamily: font.family.semibold }}>How are you feeling right now?</Body>
          <Muted style={{ marginTop: 4 }}>
            Log your feelings through the day and your emotional timeline builds here. Tap to add one →
          </Muted>
        </Card>
      )}
      {partnerFeelings.length > 0 ? (
        <Card tone="violet" onPress={() => navigation.navigate('Pulse')} style={{ marginTop: spacing.md }}>
          <Muted style={{ marginBottom: spacing.xs }}>
            {identity?.partnerName ?? 'Partner'}’s day · {partnerFeelings.length} logged
          </Muted>
          <IntensityChart items={partnerFeelings} />
        </Card>
      ) : null}

      {/* On this day */}
      {onThisDay ? (
        <>
          <SectionTitle>On this day</SectionTitle>
          <Card tone="gold" onPress={() => navigation.navigate('Vault')}>
            {(() => {
              const yearsAgo = isoToDate(today).getFullYear() - isoToDate(onThisDay.date).getFullYear();
              return <Muted>{yearsAgo} year{yearsAgo === 1 ? '' : 's'} ago today</Muted>;
            })()}
            <Title style={{ marginTop: 2 }}>
              {onThisDay.emoji ? `${onThisDay.emoji} ` : ''}
              {onThisDay.title}
            </Title>
            {onThisDay.description ? <Body style={{ marginTop: 4 }}>{onThisDay.description}</Body> : null}
          </Card>
        </>
      ) : null}

      {/* Together today: games + daily prompt in one compact card */}
      <SectionTitle>Together today</SectionTitle>
      <Card>
        <View style={styles.togetherRow}>
          <Pressable
            style={styles.togetherHalf}
            onPress={() => navigation.navigate('Games')}
            accessibilityRole="button"
            accessibilityLabel="Play together"
          >
            <Text style={{ fontSize: 28 }}>🎮</Text>
            <Text style={styles.togetherTitle}>Play together</Text>
            <Muted>Wordle, Ludo & more</Muted>
          </Pressable>
          <View style={styles.togetherDivider} />
          <Pressable
            style={styles.togetherHalf}
            onPress={() => navigation.navigate('Deck')}
            accessibilityRole="button"
            accessibilityLabel="Answer today’s closeness question"
          >
            <Text style={{ fontSize: 28 }}>🃏</Text>
            <Text style={styles.togetherTitle}>Ask each other</Text>
            <Muted>{prompt.text.length > 50 ? `${prompt.text.slice(0, 48)}…` : prompt.text}</Muted>
          </Pressable>
        </View>
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
  beating,
}: {
  name: string;
  color: string;
  checkedToday: boolean;
  mood: { emoji: string; label: string } | null;
  beating?: boolean;
}) {
  const face = mood ? (
    <Text style={{ fontSize: 34 }}>{mood.emoji}</Text>
  ) : checkedToday ? (
    <Text style={{ fontSize: 34 }}>🙂</Text>
  ) : (
    <View style={[styles.facePlaceholder, { borderColor: color + '40' }]} />
  );
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Heartbeat active={!!beating}>{face}</Heartbeat>
      <Text style={[styles.pulseName, { color }]}>{name}</Text>
      <Muted>{beating ? 'Active now 💚' : mood ? mood.label : checkedToday ? 'Checked in' : 'No check-in yet'}</Muted>
    </View>
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
  heroBegin: { color: colors.white, fontSize: 26, fontFamily: font.family.display, lineHeight: 32, marginTop: spacing.sm },
  heroBeginSub: { color: 'rgba(255,255,255,0.9)', fontSize: font.size.md, fontFamily: font.family.body, lineHeight: 22, marginTop: spacing.sm },

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
  feelHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  newBadge: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  newBadgeText: { color: colors.white, fontFamily: font.family.bold, fontSize: 11 },
  feedCard: { padding: 0, overflow: 'hidden' },
  togetherRow: { flexDirection: 'row', alignItems: 'flex-start' },
  togetherHalf: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, gap: spacing.xs },
  togetherDivider: { width: 1, alignSelf: 'stretch', backgroundColor: colors.border, marginVertical: spacing.xs },
  togetherTitle: { fontSize: font.size.md, fontFamily: font.family.semibold, color: colors.text, textAlign: 'center' },
  actText: { fontSize: font.size.md, color: colors.text, fontFamily: font.family.body, lineHeight: 21 },
  actRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: 18 },
  actDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  actPartner: { backgroundColor: colors.primarySoft },
  actChevron: { fontSize: 24, color: colors.primary },
});
