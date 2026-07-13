// ─────────────────────────────────────────────────────────────────────────
// Walking Each Other Home — the distance between your two cities, made
// defeatable. Every step either of you records moves your two figures along
// one shared track until they meet.
//
// iOS: steps sync automatically once motion permission is granted (asked here,
// in context). Android/web: the pedometer can't answer "how many steps today?"
// (see lib/walk.ts), so logging a walk is a small daily ritual instead —
// minutes or steps. Both kinds of days land in the same synced collection.
// ─────────────────────────────────────────────────────────────────────────
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { AppHeader, Avatar, Body, Button, Card, Field, Muted, Screen, SectionTitle } from '../components/ui';
import { useToast } from '../components/ToastHost';
import { addDaysISO, todayISO } from '../lib/date';
import { haversineKm } from '../lib/geo';
import { hLight, hSuccess } from '../lib/haptics';
import {
  autoStepsSupported,
  kmFromSteps,
  milestoneFor,
  readRecentDeviceSteps,
  requestStepPermission,
  STEPS_PER_MIN,
  walkPositions,
} from '../lib/walk';
import { useApp } from '../state/AppContext';
import { colors, font, radius, shadow, spacing } from '../theme';
import { spring } from '../theme/motion';

export default function WalkScreen({ navigation }: any) {
  const app = useApp();
  const partner = app.identity?.partnerName ?? 'them';
  const toast = useToast();
  const today = todayISO();

  // ── The journey needs both ends of the line ──────────────────────────────
  const my = app.myPlace;
  const theirs = app.partnerPlace;
  const ready = !!my && !!theirs;
  const distanceKm = ready ? Math.max(1, Math.round(haversineKm(my!.lat, my!.lon, theirs!.lat, theirs!.lon))) : 0;

  // ── Step totals from the shared log ──────────────────────────────────────
  const meId = app.meId;
  const totals = useMemo(() => {
    let mine = 0;
    let their = 0;
    let mineToday = 0;
    let theirToday = 0;
    for (const d of app.stepDays) {
      const steps = typeof d.steps === 'number' && d.steps > 0 ? d.steps : 0;
      if (d.owner === meId) {
        mine += steps;
        if (d.date === today) mineToday += steps;
      } else {
        their += steps;
        if (d.date === today) theirToday += steps;
      }
    }
    return { mine, their, mineToday, theirToday };
  }, [app.stepDays, meId, today]);

  const myKm = kmFromSteps(totals.mine);
  const theirKm = kmFromSteps(totals.their);
  const pos = walkPositions(myKm, theirKm, distanceKm);
  const progress = distanceKm > 0 ? Math.min(1, (myKm + theirKm) / distanceKm) : 0;
  const remainingKm = Math.max(0, distanceKm - (myKm + theirKm));
  const { passed, nextPct } = milestoneFor(progress);

  // Pace → an "arrival" date, from the last 7 days of combined walking.
  const etaLabel = useMemo(() => {
    if (!ready || pos.done) return null;
    const cutoff = addDaysISO(today, -7);
    let recent = 0;
    for (const d of app.stepDays) if (d.date > cutoff && d.steps > 0) recent += d.steps;
    const kmPerDay = kmFromSteps(recent / 7);
    if (kmPerDay <= 0.1) return null;
    const days = Math.ceil(remainingKm / kmPerDay);
    if (days > 36500) return null;
    return days <= 1 ? 'tomorrow, at this pace' : `${days.toLocaleString()} days away, at this pace`;
  }, [app.stepDays, ready, pos.done, remainingKm, today]);

  // ── iOS auto-count enrolment (in-context permission) ─────────────────────
  const [enabling, setEnabling] = useState(false);
  const [autoOn, setAutoOn] = useState(false); // becomes true after a successful sync
  const syncNow = async () => {
    const days = await readRecentDeviceSteps(today, addDaysISO(today, -1));
    for (const d of days) await app.logSteps(d.date, d.steps, 'set');
    if (days.length > 0) setAutoOn(true);
    return days.length > 0;
  };
  useEffect(() => {
    // Silent re-sync on visit (no prompt; no-op unless permission granted).
    if (autoStepsSupported()) void syncNow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  async function enableAutoSteps() {
    if (enabling) return;
    setEnabling(true);
    const granted = await requestStepPermission();
    const synced = granted ? await syncNow() : false;
    setEnabling(false);
    if (synced) {
      hSuccess();
      toast.show('Your steps now walk toward each other on their own 🤍', 2800);
    } else {
      toast.show("Couldn't read your steps. You can still log walks below", 2600);
    }
  }

  // ── Manual logging (Android / web / preference) ──────────────────────────
  const [minutes, setMinutes] = useState('');
  const [saving, setSaving] = useState(false);
  async function logWalk() {
    const mins = parseInt(minutes, 10);
    if (!Number.isFinite(mins) || mins <= 0 || saving) return;
    const steps = Math.min(6 * 60, mins) * STEPS_PER_MIN;
    setSaving(true);
    setMinutes('');
    hLight();
    const ok = await app.logSteps(today, steps, 'add');
    setSaving(false);
    if (ok) {
      hSuccess();
      toast.show(`${kmFromSteps(steps).toFixed(1)} km closer to ${partner} 🤍`, 2600);
    } else {
      setMinutes(String(mins));
      toast.show("Couldn't save. Check your connection and try again", 2400);
    }
  }

  return (
    <Screen scroll>
      <AppHeader
        title="Walking Each Other Home"
        subtitle="Every step makes the map smaller"
        onBack={() => navigation.goBack()}
      />

      {!ready ? (
        <Card tone="violet" onPress={() => navigation.navigate('Compass')}>
          <Body style={{ fontFamily: font.family.semibold }}>First, the walk needs its two ends</Body>
          <Muted style={{ marginTop: 4 }}>
            Set your locations on The Compass Rose and the distance between you becomes the road
            you'll walk together. Tap to set it up →
          </Muted>
        </Card>
      ) : (
        <>
          {/* The road */}
          <View style={styles.roadCard}>
            <WalkTrack
              minePct={pos.mine}
              theirsPct={pos.theirs}
              done={pos.done}
              myName={app.identity?.name ?? 'You'}
              theirName={partner}
              myPhoto={app.myProfile?.image}
              theirPhoto={app.partnerProfile?.image}
            />
            {pos.done ? (
              <>
                <Text style={styles.bigLine}>You walked the whole way. 🤍</Text>
                <Muted style={{ textAlign: 'center', marginTop: spacing.xs }}>
                  {distanceKm.toLocaleString()} km, on your own four feet
                </Muted>
              </>
            ) : (
              <>
                <View style={styles.kmPill}>
                  <Text style={styles.kmPillText}>
                    📍 {Math.round(pos.coveredKm).toLocaleString()} of {distanceKm.toLocaleString()} km walked
                  </Text>
                </View>
                {etaLabel ? (
                  <Text style={styles.etaLine}>{etaLabel}</Text>
                ) : (
                  <Muted style={{ textAlign: 'center', marginTop: spacing.sm }}>
                    {nextPct ? `next milestone at ${nextPct}%` : 'one step at a time'}
                  </Muted>
                )}
              </>
            )}
          </View>

          {passed ? (
            <Card tone="gold" style={{ marginTop: spacing.md }}>
              <Body style={{ fontStyle: 'italic', textAlign: 'center' }}>{passed}</Body>
            </Card>
          ) : null}

          {/* Today */}
          <SectionTitle>Today together</SectionTitle>
          <View style={styles.todayCards}>
            <TodayCard who="You" steps={totals.mineToday} color={colors.primary} />
            <TodayCard who={partner} steps={totals.theirToday} color={colors.accent} resting />
          </View>

          {/* Getting steps in */}
          <SectionTitle>Your steps</SectionTitle>
          {autoStepsSupported() && !autoOn ? (
            <Card tone="rose" style={{ marginBottom: spacing.md }}>
              <Body style={{ fontFamily: font.family.semibold }}>Count my steps automatically</Body>
              <Muted style={{ marginTop: 4, marginBottom: spacing.md }}>
                Allow motion access once, and every step you take quietly walks toward {partner} —
                no logging, no thinking about it.
              </Muted>
              <Button label={enabling ? 'Connecting…' : 'Connect my steps'} disabled={enabling} onPress={enableAutoSteps} />
            </Card>
          ) : null}
          {autoOn ? (
            <Card tone="green" style={{ marginBottom: spacing.md }}>
              <Body>Your steps are counting automatically. Just live your day. 🤍</Body>
            </Card>
          ) : null}
          <Card tone="rose">
            <View style={styles.logHeader}>
              <View style={styles.logBadge}>
                <Text style={{ fontSize: 18 }}>🚶</Text>
              </View>
              <Body style={{ fontFamily: font.family.semibold }}>Add to the journey</Body>
            </View>
            <Muted style={{ marginTop: spacing.sm, marginBottom: spacing.sm }}>
              Went out walking? Minutes are enough — we'll count the steps.
            </Muted>
            <Field
              value={minutes}
              onChangeText={(t) => setMinutes(t.replace(/[^0-9]/g, ''))}
              placeholder="e.g. 30 (minutes)"
              keyboardType="number-pad"
            />
            <Button
              label={saving ? 'Saving…' : `Walk ${minutes ? kmFromSteps(Math.min(360, parseInt(minutes, 10) || 0) * STEPS_PER_MIN).toFixed(1) : '0.0'} km toward ${partner}`}
              disabled={!minutes || saving}
              onPress={logWalk}
            />
          </Card>

          <Card tone="surface" style={{ marginTop: spacing.lg }}>
            <Muted style={{ textAlign: 'center' }}>
              An average stride is about 75 cm. The maths is honest; the metaphor is the point. 🤍
            </Muted>
          </Card>
        </>
      )}
    </Screen>
  );
}

/** The shared road: two walkers advancing from opposite ends until they meet. */
function WalkTrack({
  minePct,
  theirsPct,
  done,
  myName,
  theirName,
  myPhoto,
  theirPhoto,
}: {
  minePct: number;
  theirsPct: number;
  done: boolean;
  myName: string;
  theirName: string;
  myPhoto?: string | null;
  theirPhoto?: string | null;
}) {
  const [w, setW] = useState(0);
  const AV = 44; // avatar size
  const RING = AV + 10; // avatar + white ring
  const usable = Math.max(0, w - RING);

  // Positions spring to their new spots whenever a walk lands.
  const mineX = useRef(new Animated.Value(0)).current;
  const theirsX = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (usable <= 0) return;
    const meetCapMine = Math.min(minePct, 1 - theirsPct) * usable;
    const meetCapTheirs = Math.min(theirsPct, 1 - minePct) * usable;
    Animated.spring(mineX, { toValue: meetCapMine, useNativeDriver: true, ...spring.gentle }).start();
    Animated.spring(theirsX, { toValue: -meetCapTheirs, useNativeDriver: true, ...spring.gentle }).start();
  }, [minePct, theirsPct, usable, mineX, theirsX]);

  // The road ahead is drawn as dashes — a path, not a progress bar.
  const dashes = w > 0 ? Math.max(0, Math.floor((w + 6) / 12)) : 0;

  return (
    <View style={{ paddingVertical: spacing.md }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      <View style={styles.track}>
        <View style={styles.dashRow}>
          {Array.from({ length: dashes }).map((_, i) => (
            <View key={i} style={styles.dash} />
          ))}
        </View>
        <View style={[styles.fillMine, { width: `${Math.min(100, minePct * 100)}%` }]} />
        <View style={[styles.fillTheirs, { width: `${Math.min(100, theirsPct * 100)}%` }]} />
      </View>
      {w > 0 ? (
        <View style={styles.walkersRow}>
          <Animated.View style={[styles.walker, { transform: [{ translateX: mineX }] }]}>
            <View style={[styles.avatarRing, shadow.soft]}>
              <Avatar name={myName} size={AV} uri={myPhoto} color={colors.primary} />
            </View>
            <View style={[styles.nameChip, { backgroundColor: colors.primarySoft }]}>
              <Text style={[styles.nameChipText, { color: colors.primaryDark }]} numberOfLines={1}>
                {myName}
              </Text>
            </View>
          </Animated.View>
          {done ? <Text style={styles.meetHeart}>🤍</Text> : null}
          <Animated.View style={[styles.walker, { transform: [{ translateX: theirsX }] }]}>
            <View style={[styles.avatarRing, shadow.soft]}>
              <Avatar name={theirName} size={AV} uri={theirPhoto} color={colors.accent} />
            </View>
            <View style={[styles.nameChip, { backgroundColor: colors.accentSoft }]}>
              <Text style={[styles.nameChipText, { color: colors.accent }]} numberOfLines={1}>
                {theirName}
              </Text>
            </View>
          </Animated.View>
        </View>
      ) : null}
    </View>
  );
}

/** One walker's day: a quiet bento card. Resting partners dim, never judged. */
function TodayCard({ who, steps, color, resting }: { who: string; steps: number; color: string; resting?: boolean }) {
  const asleep = !!resting && steps === 0;
  return (
    <View style={[styles.todayCard, shadow.soft, asleep && { opacity: 0.6 }]}>
      <Text style={styles.todayWho}>{who}</Text>
      <Text style={[styles.todaySteps, { color }]}>{steps.toLocaleString()}</Text>
      <Muted>{steps === 1 ? 'step' : 'steps'}</Muted>
      <View style={styles.todayRule} />
      <Muted>{steps > 0 ? `${kmFromSteps(steps).toFixed(1)} km` : asleep ? '💤 resting' : 'no steps yet'}</Muted>
    </View>
  );
}

const styles = StyleSheet.create({
  roadCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg + spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    ...shadow.card,
  },
  track: {
    height: 8,
    justifyContent: 'center',
  },
  dashRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    overflow: 'hidden',
  },
  dash: { width: 6, height: 2, borderRadius: 1, backgroundColor: colors.border },
  fillMine: {
    position: 'absolute',
    left: 0,
    height: 6,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
  },
  fillTheirs: {
    position: 'absolute',
    right: 0,
    height: 6,
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
  },
  walkersRow: {
    marginTop: -31, // avatar rings ride ON the road; name chips hang below it
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  walker: { alignItems: 'center', gap: 6, maxWidth: 96 },
  avatarRing: {
    padding: 5,
    borderRadius: 32,
    backgroundColor: colors.surface,
  },
  nameChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  nameChipText: { fontFamily: font.family.semibold, fontSize: font.size.xs },
  meetHeart: { fontSize: 22, marginTop: 12 },
  bigLine: {
    marginTop: spacing.lg,
    textAlign: 'center',
    fontFamily: font.family.displaySemi,
    fontSize: font.size.xl,
    color: colors.text,
    letterSpacing: font.tracking.heading,
  },
  kmPill: {
    alignSelf: 'center',
    marginTop: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  kmPillText: { fontFamily: font.family.semibold, fontSize: font.size.sm, color: colors.text },
  etaLine: {
    marginTop: spacing.md,
    textAlign: 'center',
    fontFamily: font.family.displaySemi,
    fontStyle: 'italic',
    fontSize: font.size.xl,
    color: colors.primaryDark,
    letterSpacing: font.tracking.heading,
    paddingHorizontal: spacing.lg,
  },

  todayCards: { flexDirection: 'row', gap: spacing.md },
  todayCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg + spacing.xs,
    paddingHorizontal: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(90,46,64,0.06)',
  },
  todayWho: {
    fontFamily: font.family.bold,
    fontSize: 11,
    letterSpacing: font.tracking.caps,
    textTransform: 'uppercase',
    color: colors.textSoft,
    marginBottom: spacing.xs,
  },
  todaySteps: { fontFamily: font.family.display, fontSize: font.size.xxl },
  todayRule: { alignSelf: 'stretch', height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: spacing.sm, marginHorizontal: spacing.sm },

  logHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  logBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.soft,
  },
});
