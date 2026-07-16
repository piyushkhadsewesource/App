import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  AppHeader,
  Body,
  Card,
  Muted,
  Screen,
  SectionTitle,
  Title,
} from '../components/ui';
import DayRibbon from '../components/DayRibbon';
import JointAvatar from '../components/JointAvatar';
import { Celebrate } from '../components/Celebrate';
import { Heartbeat } from '../components/Heartbeat';
import MorningPaper from '../components/MorningPaper';
import { Press, Reveal, SwipeAway } from '../components/Motion';
import { CanvasMini } from '../components/CanvasMini';
import { useToast } from '../components/ToastHost';
import { questionForDate, revealAnswers, revealPromptId } from '../lib/reveal';
import { dismissWhisper, pickWhisper, Whisper } from '../lib/whisper';
import { isBlank, normalizeCanvas } from '../lib/canvas';
import { buildActivity, withinHours } from '../lib/activity';
import { formatRelative, greeting, isoToDate, todayISO } from '../lib/date';
import { hearthIgnited, lanternFor } from '../lib/goldenHour';
import { hSuccess } from '../lib/haptics';
import { validKnock } from '../lib/knock';
import KnockSeal from '../components/KnockSeal';
import { composePaper, markPaperOpened, paperOpened } from '../lib/morningPaper';
import { moodMeta } from '../lib/mood';
import { hasMomentToday } from '../lib/moments';
import { countdownTo, shortCountdown } from '../lib/countdown';
import { issueNeedingYou } from '../lib/issues';
import { occasionsOnThisDay, ordinal } from '../lib/occasions';
import { latestCheckin, strugglingStreak } from '../lib/pulse';
import { useNow } from '../lib/useNow';
import { useApp } from '../state/AppContext';
import { colors, font, gradients, radius, shadow, spacing } from '../theme';
import { prefersReducedMotion, spring } from '../theme/motion';

/** The one alert Home is allowed to show (whisper principle, enforced). */
type HomeAlert = {
  key: string;
  tone: 'rose' | 'violet' | 'gold';
  emoji: string;
  title: string;
  sub: string;
  route: string;
  params?: object;
};

export default function HomeScreen({ navigation }: any) {
  const app = useApp();
  const { identity, meId, partnerId, checkins, pings, memories } = app;
  const today = todayISO();
  // A slow tick so presence ("Active now") stays honest without waiting for
  // the next data change.
  const now = useNow(60_000);
  const toast = useToast();
  const partnerName = identity?.partnerName ?? 'them';

  const myToday = latestCheckin(checkins, meId);
  const myCheckedToday = myToday?.date === today;
  const partnerLatest = latestCheckin(checkins, partnerId);
  const partnerStreak = strugglingStreak(checkins, partnerId);
  const unseenPings = pings.filter((p) => p.fromId !== meId && !p.seenAt);
  const tendIssue = useMemo(() => issueNeedingYou(app.issues, meId), [app.issues, meId]);
  // A delivered, still-sealed letter from the partner — surface it on Home so a
  // "deliver later" letter isn't only discoverable by opening the Letters screen.
  const readyLetter = useMemo(
    () => app.letters.find((l) => l.authorId !== meId && l.deliverAt <= now && !l.openedAt) ?? null,
    [app.letters, meId, now],
  );
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
  // Presence, two tiers. Live: their app is open right now (heartbeat within
  // ~2 min) — the warmest signal we have, "we're in here together". Recent:
  // they did something in the last hour. Either makes the pulse face beat;
  // live gets its own label.
  const partnerHereNow = app.partnerSeenAt != null && now - app.partnerSeenAt < 2 * 60 * 1000;
  const partnerActive = useMemo(
    () => partnerHereNow || recent.some((e) => !e.mine && e.at > now - 60 * 60 * 1000),
    [recent, now, partnerHereNow],
  );

  // A one-time hint the first time the partner's presence lights up, teaching
  // what the green heartbeat means. Seen-flag persisted like other UI prefs.
  const [activeHintSeen, setActiveHintSeen] = useState(true);
  useEffect(() => {
    AsyncStorage.getItem('@tether/seen/activeNowHint')
      .then((v) => setActiveHintSeen(v === '1'))
      .catch(() => {});
  }, []);
  const showActiveHint = partnerActive && !activeHintSeen;
  function dismissActiveHint() {
    setActiveHintSeen(true);
    AsyncStorage.setItem('@tether/seen/activeNowHint', '1').catch(() => {});
  }
  const meeting = app.meeting;

  const occToday = useMemo(() => occasionsOnThisDay(app.occasions), [app.occasions]);
  const anniToday = occToday[0] ?? null;
  // Tonight's Reveal: the daily blind-answer anchor. The tease is asymmetric
  // on purpose — you learn THAT they answered, never WHAT, until yours is in.
  const reveal = useMemo(() => revealAnswers(app.deck, today, meId), [app.deck, today, meId]);
  const [revealOpened, setRevealOpened] = useState(false);
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(`@tether/revealOpened/${revealPromptId(today)}`)
      .then((v) => alive && setRevealOpened(v === '1'))
      .catch(() => {});
    return () => {
      alive = false;
    };
    // Re-check when answers change (opening happens on the Reveal screen).
  }, [today, reveal.mine, reveal.theirs]);

  // The Rediscover Whisper: at most one quiet nudge toward a corner of the
  // app that's been sitting unused. Recomputed per visit; dismiss = 1 week.
  const [whisper, setWhisper] = useState<Whisper | null>(null);
  const myLastLetterAt = useMemo(
    () => Math.max(0, ...app.letters.filter((l) => l.authorId === meId).map((l) => l.createdAt)),
    [app.letters, meId],
  );
  const myLastDeckAt = useMemo(
    () => Math.max(0, ...app.deck.filter((d) => d.authorId === meId).map((d) => d.createdAt)),
    [app.deck, meId],
  );
  useEffect(() => {
    let alive = true;
    pickWhisper({
      partnerName: identity?.partnerName ?? 'them',
      lastLetterAt: myLastLetterAt || undefined,
      lastDeckAt: myLastDeckAt || undefined,
      futureCount: app.future.length,
      memoryCount: memories.length,
      occasionCount: app.occasions.length,
      meetingSet: !!meeting,
      momentDoneToday,
    })
      .then((w) => alive && setWhisper(w))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [myLastLetterAt, myLastDeckAt, app.future.length, memories.length, app.occasions.length, identity?.partnerName, meeting, momentDoneToday]);

  const onThisDay = useMemo(() => {
    const md = today.slice(5);
    return memories.find((m) => m.date.slice(5) === md && m.date.slice(0, 4) !== today.slice(0, 4));
  }, [memories, today]);

  // ── The Golden Hour: tonight's lantern over the golden window, and the
  //    ignition when you're both truly here while it burns. ────────────────
  const lantern = useMemo(() => {
    const nowMin = new Date(now).getHours() * 60 + new Date(now).getMinutes();
    const items = app.schedule.filter((s) => s.date === today && s.kind !== 'moment');
    return lanternFor(
      items.filter((s) => app.isMine(s.authorId)),
      items.filter((s) => !app.isMine(s.authorId)),
      nowMin,
    );
  }, [app, today, now]);
  const ignited = hearthIgnited(lantern, partnerHereNow);
  // Celebrate the ignition once per day (petals + a success thump), and leave
  // the ember: the synced, idempotent record that tonight you both came.
  const [lanternPlay, setLanternPlay] = useState(false);
  useEffect(() => {
    if (!ignited) return;
    void app.lightEmber(today);
    let alive = true;
    AsyncStorage.getItem(`@tether/lanternLit/${today}`)
      .then((v) => {
        if (!alive || v === '1') return;
        AsyncStorage.setItem(`@tether/lanternLit/${today}`, '1').catch(() => {});
        hSuccess();
        if (!prefersReducedMotion()) setLanternPlay(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ignited, today]);

  // ── The Morning Paper: the night's partner activity, sealed until read. ──
  const [paperSeen, setPaperSeen] = useState(true);
  useEffect(() => {
    let alive = true;
    paperOpened(today).then((v) => alive && setPaperSeen(v));
    return () => {
      alive = false;
    };
  }, [today]);
  const paper = useMemo(() => composePaper(activity, now), [activity, now]);
  const showPaper = !!paper && !paperSeen;

  // Shared-canvas preview for the Home entry (null/short-data safe).
  const canvasPixels = normalizeCanvas(app.canvas?.pixels);
  const canvasEmpty = isBlank(canvasPixels);
  const canvasPartnerNew = !!app.canvas && !app.isMine(app.canvas.updatedBy) && !canvasEmpty;

  // The Time Capsule: is something from the partner waiting to be discovered?
  // Purely derived from data we already sync — an unseen hug, a deck answer you
  // haven't unlocked, or fresh canvas strokes. Priority: most personal first.
  const deckGift = useMemo(
    () =>
      app.deck.some(
        (r) =>
          r.authorId === partnerId &&
          !app.deck.some((m) => m.authorId === meId && m.promptId === r.promptId),
      ),
    [app.deck, partnerId, meId],
  );

  const capsuleGift: { route: string; note: string } | null =
    unseenPings.length > 0
      ? { route: 'MissYou', note: `something warm from ${partnerName}` }
      : deckGift
        ? { route: 'Deck', note: `${partnerName} answered a question for you` }
        : canvasPartnerNew
          ? { route: 'Canvas', note: `${partnerName} added to your drawing` }
          : null;
  const canvasSub = canvasEmpty
    ? 'A blank page, start a drawing together'
    : canvasPartnerNew
      ? `${partnerName} added to it, tap to watch`
      : 'Your shared drawing, tap to add';

  // Day-one: until there's anything to score, Home leads with an inviting
  // "begin" state rather than empty modules.
  const hasSignal =
    checkins.length > 0 ||
    app.feelings.length > 0 ||
    app.moments.length > 0 ||
    memories.length > 0 ||
    pings.length > 0 ||
    app.deck.length > 0;

  // ── The one alert. Alert cards are for things that genuinely need the
  //    person now; everything gentler lives in the capsule or the whisper.
  //    Priority: repair > their hard days > a letter > hugs > today's date.
  const alert: HomeAlert | null = tendIssue
    ? {
        key: 'issue',
        tone: 'rose',
        emoji: '🕊️',
        title: `${identity?.partnerName} wants to clear the air`,
        sub: `"${tendIssue.title}". Tap to hear them out and make it right.`,
        route: 'IssueDetail',
        params: { id: tendIssue.id },
      }
    : partnerStreak
      ? {
          key: 'streak',
          tone: 'violet',
          emoji: '💜',
          title: `${identity?.partnerName} has had ${partnerStreak.days} hard days`,
          sub: 'They could use some extra gentleness. Tap for ways to reach out.',
          route: 'Insights',
        }
      : readyLetter
        ? {
            key: 'letter',
            tone: 'gold',
            emoji: '💌',
            title: `A letter from ${partnerName} is ready`,
            sub: `“${readyLetter.title}”. Tap to open it.`,
            route: 'Letters',
          }
        : unseenPings.length > 0
          ? {
              key: 'pings',
              tone: 'rose',
              emoji: '🤗',
              title: `${unseenPings.length} new ${unseenPings.length === 1 ? 'hug' : 'hugs'} from ${identity?.partnerName}`,
              sub: 'They’re thinking about you right now. Tap to feel it.',
              route: 'MissYou',
            }
          : anniToday
            ? {
                key: 'occasion',
                tone: 'gold',
                emoji: anniToday.occasion.icon || '🎉',
                title:
                  anniToday.yearsAgo >= 1
                    ? `${ordinal(anniToday.yearsAgo)} ${anniToday.occasion.title} today 🎉`
                    : `${anniToday.occasion.title} is today 🎉`,
                sub: 'Make it count 💞',
                route: 'Occasions',
              }
            : null;

  // ── The Hearth's one warm line: the lantern (you're both here while it
  //    burns) outranks everything; then countdown > their weather > quiet.
  const hearthLine = ignited
    ? 'The lantern is burning, and you’re both here 🤍'
    : !hasSignal
    ? 'Your story starts now 🤍'
    : meeting
      ? countdownTo(meeting.at).past
        ? 'You’re together 💞'
        : `Together again in ${shortCountdown(meeting.at)} 💞`
      : partnerLatest?.date === today
        ? `${partnerName} feels ${moodMeta(partnerLatest.mood).label.toLowerCase()} today`
        : 'A quiet day, side by side 🤍';

  function sendFirstHug() {
    app.sendPing('hug');
    toast.show(`Hug on its way to ${partnerName} 🤗`);
  }

  // The secret-knock seal: when a gift waits AND they have a knock, the
  // capsule asks you to answer their rhythm. Skipping always works — a
  // feeling is never locked behind a game.
  const [sealOpen, setSealOpen] = useState(false);
  const sealKnock = app.partnerKnock && validKnock(app.partnerKnock.intervals) ? app.partnerKnock.intervals : null;
  const openCapsule = () => {
    if (!capsuleGift) {
      toast.show(`Empty for now. Leave ${partnerName} something to find 🤍`, 2600);
      return;
    }
    if (sealKnock) setSealOpen(true);
    else navigation.navigate(capsuleGift.route);
  };
  const throughTheSeal = () => {
    setSealOpen(false);
    if (capsuleGift) navigation.navigate(capsuleGift.route);
  };

  return (
    <>
    <Screen scroll>
      <AmbientBloom here={partnerHereNow} />
      <AppHeader
        title={`${greeting()}, ${identity?.name ?? ''}`}
        subtitle={`You & ${identity?.partnerName ?? 'your love'}`}
        right={
          <View style={styles.headerRight}>
            <TimeCapsule filled={!!capsuleGift} onPress={openCapsule} />
            <JointAvatar
              myName={identity?.name ?? '?'}
              partnerName={partnerName}
              myUri={app.myProfile?.image}
              partnerUri={app.partnerProfile?.image}
              onPress={() => navigation.navigate('Settings')}
            />
          </View>
        }
      />

      {/* The one alert (whisper principle: never a stack) */}
      {alert ? (
        <Reveal key={alert.key}>
          <Card tone={alert.tone} onPress={() => navigation.navigate(alert.route, alert.params)} style={styles.alert}>
            <Text style={styles.alertEmoji}>{alert.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Title>{alert.title}</Title>
              <Muted>{alert.sub}</Muted>
            </View>
          </Card>
        </Reveal>
      ) : null}

      {/* The Morning Paper: the night, sealed until you break it */}
      {showPaper && paper ? (
        <MorningPaper
          partnerName={partnerName}
          items={paper.items}
          onOpen={() => void markPaperOpened(paper.date)}
          onNavigate={(route, params) => navigation.navigate(route, params)}
        />
      ) : null}

      {/* The Hearth: both of you, present tense */}
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
            live={partnerHereNow}
          />
        </View>
        <Text style={styles.hearthLine}>{hearthLine}</Text>
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

      {showActiveHint ? (
        <Pressable onPress={dismissActiveHint} style={styles.coach} accessibilityRole="button" accessibilityLabel="Got it">
          <Text style={{ fontSize: 18 }}>💚</Text>
          <Text style={styles.coachText}>
            The green heartbeat means {partnerName} is active right now. Tap to dismiss.
          </Text>
        </Pressable>
      ) : null}

      {/* Our day, front and center: both lanes + when you're both free */}
      <View style={{ marginTop: spacing.md }}>
        <DayRibbon onOpen={() => navigation.navigate('Schedule')} />
      </View>

      {/* Tonight's Reveal: the daily anchor. The card's whole job is pull. */}
      <Card
        tone={!reveal.mine && reveal.theirs ? 'rose' : reveal.mine && reveal.theirs && !revealOpened ? 'gold' : 'surface'}
        onPress={() => navigation.navigate('Reveal')}
        style={styles.alert}
      >
        <Text style={styles.alertEmoji}>✉️</Text>
        <View style={{ flex: 1 }}>
          {!reveal.mine && reveal.theirs ? (
            <>
              <Title>{partnerName} answered tonight's question</Title>
              <Muted>Their answer is sealed until you write yours.</Muted>
            </>
          ) : !reveal.mine ? (
            <>
              <Title>Tonight's Reveal</Title>
              <Muted>"{questionForDate(today)}"</Muted>
            </>
          ) : !reveal.theirs ? (
            <>
              <Title>Yours is sealed 🤍</Title>
              <Muted>It opens for you both when {partnerName} answers.</Muted>
            </>
          ) : !revealOpened ? (
            <>
              <Title>The envelope is ready</Title>
              <Muted>Both answers are in. Hold to break the seal.</Muted>
            </>
          ) : (
            <>
              <Title>Tonight's answers 🤍</Title>
              <Muted>Read them again. A new question arrives at midnight.</Muted>
            </>
          )}
        </View>
      </Card>

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
            {recent.slice(0, 6).map((e, i) => (
              // Each row cascades in with a staggered reveal for a buttery feed.
              <Reveal key={e.id} delay={i * 55}>
                <Press
                  onPress={() => navigation.navigate(e.route, e.params)}
                  scaleTo={0.985}
                  accessibilityRole="button"
                  accessibilityLabel={e.text}
                  style={[styles.actRow, i > 0 ? styles.actDivider : null, !e.mine ? styles.actPartner : null]}
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
                </Press>
              </Reveal>
            ))}
          </Card>
        </>
      ) : null}

      {/* The Rediscover Whisper: one quiet nudge; swipe it away for a week */}
      {whisper ? (
        <SwipeAway
          onDismiss={() => {
            void dismissWhisper(whisper.id);
            setWhisper(null);
          }}
          style={{ marginTop: spacing.md }}
        >
          <Press
            onPress={() => navigation.navigate(whisper.route)}
            scaleTo={0.985}
            accessibilityRole="button"
            accessibilityLabel={whisper.title}
            style={styles.whisper}
          >
            <Text style={{ fontSize: 20 }}>{whisper.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.whisperTitle}>{whisper.title}</Text>
              <Muted>{whisper.text}</Muted>
            </View>
            <Pressable
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Not now"
              onPress={() => {
                void dismissWhisper(whisper.id);
                setWhisper(null);
              }}
            >
              <Text style={styles.whisperX}>×</Text>
            </Pressable>
          </Press>
        </SwipeAway>
      ) : null}

      {/* Our shared canvas — a live thumbnail of the couple's drawing */}
      <Card onPress={() => navigation.navigate('Canvas')} style={{ marginTop: spacing.md }}>
        <View style={styles.canvasRow}>
          <CanvasMini pixels={canvasPixels} size={62} />
          <View style={{ flex: 1 }}>
            <Title>Our shared canvas</Title>
            <Muted style={{ marginTop: 4 }}>{canvasSub}</Muted>
          </View>
          {canvasPartnerNew ? <View style={styles.canvasDot} /> : <Text style={styles.actChevron}>›</Text>}
        </View>
      </Card>

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

      {/* First steps — only on day one; disappears once the space has any life */}
      {!hasSignal ? (
        <Card style={{ marginTop: spacing.lg }}>
          <Title>First steps together</Title>
          <Muted style={{ marginTop: 2, marginBottom: spacing.sm }}>A few taps and your space comes alive.</Muted>
          <FirstStep emoji="🤗" label={`Send ${partnerName} a hug`} hint="They feel it on their phone right away" onPress={sendFirstHug} />
          <FirstStep emoji="💛" label="Share how you feel" hint="Your first daily check-in" onPress={() => navigation.navigate('Pulse')} />
          <FirstStep emoji="📸" label="Capture a moment" hint="One photo, shared just with them" onPress={() => navigation.navigate('Moments')} />
        </Card>
      ) : null}
    </Screen>
    {/* The Golden Hour ignition: petals, once per day, when you both arrive */}
    <Celebrate play={lanternPlay} />
    {/* The secret-knock seal on the Time Capsule */}
    {sealKnock ? (
      <KnockSeal
        visible={sealOpen}
        partnerName={partnerName}
        intervals={sealKnock}
        onSuccess={throughTheSeal}
        onSkip={throughTheSeal}
        onClose={() => setSealOpen(false)}
      />
    ) : null}
    </>
  );
}

/**
 * Ambient Distance Lighting. A soft multi-layer bloom behind the top of Home
 * that lives and breathes: calm lavender dawn while the partner is away, and a
 * fluid crossfade into warm rose-gold sunrise the moment their live heartbeat
 * appears. Two stacked gradients crossfaded by native-driver opacity (plus a
 * very slow breathing loop) — zero layout work per frame, 60fps everywhere.
 * Under reduced motion the breathing stops; the away/here crossfade stays,
 * because it carries meaning.
 */
function AmbientBloom({ here }: { here: boolean }) {
  const warm = useRef(new Animated.Value(here ? 1 : 0)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(warm, { toValue: here ? 1 : 0, useNativeDriver: true, ...spring.gentle }).start();
  }, [here, warm]);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 3600, useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 3600, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breathe]);
  const breatheOpacity = prefersReducedMotion()
    ? 0.85
    : breathe.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });
  const away = warm.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  return (
    <Animated.View pointerEvents="none" style={[styles.bloom, { opacity: breatheOpacity }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: away }]}>
        <LinearGradient colors={gradients.ambientAway} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: warm }]}>
        <LinearGradient colors={gradients.ambientHere} style={StyleSheet.absoluteFill} />
      </Animated.View>
    </Animated.View>
  );
}

/**
 * The Time Capsule — a small glass orb beside the avatar. Clear when nothing
 * is waiting; when the partner has left something (a hug, a deck answer, fresh
 * canvas strokes) it glows warm and tiny particles drift inside. The press-in
 * is snappy (feedback is instant); the settle back is gentle (the luxury).
 */
function TimeCapsule({ filled, onPress }: { filled: boolean; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v: number, cfg: { tension: number; friction: number }) =>
    Animated.spring(scale, { toValue: v, useNativeDriver: true, ...cfg }).start();
  return (
    <Pressable
      onPressIn={() => to(1.15, spring.snappy)}
      onPressOut={() => to(1, spring.gentle)}
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={filled ? 'Open your time capsule, something is waiting' : 'Time capsule, empty'}
    >
      <Animated.View style={[styles.capsule, { transform: [{ scale }] }]}>
        {filled ? (
          <>
            <LinearGradient colors={gradients.roseSoft} style={StyleSheet.absoluteFill} />
            <CapsuleParticle delay={0} left={9} size={5} color={colors.primary} />
            <CapsuleParticle delay={700} left={19} size={4} color={colors.accent} />
            <CapsuleParticle delay={1400} left={26} size={3} color={colors.gold} />
          </>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

/** One tiny mote of light drifting slowly upward inside the capsule. */
function CapsuleParticle({ delay, left, size, color }: { delay: number; left: number; size: number; color: string }) {
  const drift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (prefersReducedMotion()) {
      // Hold each mote mid-drift: the "something waiting" signal stays,
      // the perpetual motion goes.
      drift.setValue(0.5);
      return;
    }
    let loop: Animated.CompositeAnimation | null = null;
    const id = setTimeout(() => {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(drift, { toValue: 1, duration: 2200, useNativeDriver: true }),
          Animated.timing(drift, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      );
      loop.start();
    }, delay);
    return () => {
      clearTimeout(id);
      loop?.stop();
    };
  }, [drift, delay]);
  const translateY = drift.interpolate({ inputRange: [0, 1], outputRange: [26, 4] });
  const opacity = drift.interpolate({ inputRange: [0, 0.25, 0.8, 1], outputRange: [0, 0.9, 0.7, 0] });
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        transform: [{ translateY }],
        opacity,
      }}
    />
  );
}

function FirstStep({
  emoji,
  label,
  hint,
  onPress,
}: {
  emoji: string;
  label: string;
  hint: string;
  onPress: () => void;
}) {
  return (
    <Press
      onPress={onPress}
      scaleTo={0.985}
      style={styles.firstStep}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={{ fontSize: 24 }}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.firstStepLabel}>{label}</Text>
        <Text style={styles.firstStepHint}>{hint}</Text>
      </View>
      <Text style={styles.actChevron}>›</Text>
    </Press>
  );
}

function PulseFace({
  name,
  color,
  checkedToday,
  mood,
  beating,
  live,
}: {
  name: string;
  color: string;
  checkedToday: boolean;
  mood: { emoji: string; label: string } | null;
  beating?: boolean;
  live?: boolean;
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
      <Muted>
        {live ? 'Here right now 💚' : beating ? 'Active now 💚' : mood ? mood.label : checkedToday ? 'Checked in' : 'No check-in yet'}
      </Muted>
    </View>
  );
}

const styles = StyleSheet.create({
  alert: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  whisper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  whisperTitle: { fontSize: font.size.md, fontFamily: font.family.semibold, color: colors.text },
  whisperX: { fontSize: 20, color: colors.textFaint, paddingHorizontal: 4 },
  alertEmoji: { fontSize: 30 },

  // Ambient presence bloom: bleeds past the scroll padding so the glow runs
  // edge-to-edge, and scrolls away naturally with the page.
  bloom: { position: 'absolute', top: -160, left: -20, right: -20, height: 420 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  capsule: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)', // the light-catching rim
    ...shadow.soft,
  },

  coach: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.goodSoft, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.sm },
  coachText: { flex: 1, fontSize: font.size.sm, color: colors.text, fontFamily: font.family.medium, lineHeight: 19 },
  firstStep: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  firstStepLabel: { fontSize: font.size.md, fontFamily: font.family.semibold, color: colors.text },
  firstStepHint: { fontSize: font.size.xs, color: colors.textSoft, fontFamily: font.family.body, marginTop: 1 },

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
  // The Hearth's one warm line: this is a voice moment, so it speaks Fraunces.
  hearthLine: {
    marginTop: spacing.md,
    fontSize: font.size.lg,
    lineHeight: 24,
    fontFamily: font.family.displaySemi,
    color: colors.text,
    letterSpacing: font.tracking.heading,
    textAlign: 'center',
  },
  needBox: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md },

  // Partner activity renders violet, mine rose — the app-wide color law.
  newBadge: { backgroundColor: colors.accent, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  newBadgeText: { color: colors.white, fontFamily: font.family.bold, fontSize: 11 },
  feedCard: { padding: 0, overflow: 'hidden' },
  canvasRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  canvasDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  actText: { fontSize: font.size.md, color: colors.text, fontFamily: font.family.body, lineHeight: 21 },
  actRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.lg + spacing.xs },
  actDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  actPartner: { backgroundColor: colors.accentSoft },
  actChevron: { fontSize: 24, color: colors.primary },
});
