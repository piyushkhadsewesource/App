// ─────────────────────────────────────────────────────────────────────────
// The Day Ribbon — Our Day's front door, living at the top of Home.
// Two lanes at a glance (your next thing, theirs) and the payoff line the
// whole feature exists for: when your partner comes free, and the first
// window tonight you're BOTH free. Tap anywhere → the full ritual.
// ─────────────────────────────────────────────────────────────────────────
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from './ui';
import GoldenBand from './GoldenBand';
import { todayISO } from '../lib/date';
import { freeAfterMin, goldenWindow, minLabel, nextBlock } from '../lib/ourDay';
import { useApp } from '../state/AppContext';
import { colors, font, radius, shadow, spacing } from '../theme';

export default function DayRibbon({ onOpen }: { onOpen: () => void }) {
  const app = useApp();
  const partner = app.identity?.partnerName ?? 'them';
  const me = app.identity?.name ?? 'You';

  const state = useMemo(() => {
    const today = todayISO();
    const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
    const items = app.schedule.filter((s) => s.date === today && s.kind !== 'moment');
    const mine = items.filter((s) => app.isMine(s.authorId));
    const theirs = items.filter((s) => !app.isMine(s.authorId));
    const moment = app.schedule.find((s) => s.date === today && s.kind === 'moment');
    return {
      mine,
      theirs,
      nowMin,
      myNext: nextBlock(mine, nowMin),
      theirNext: theirs.length ? nextBlock(theirs, nowMin) : null,
      theirsShared: theirs.length > 0,
      mineShared: mine.length > 0,
      theirFree: freeAfterMin(theirs, nowMin),
      window: theirs.length > 0 || mine.length > 0 ? goldenWindow(mine, theirs, nowMin) : null,
      moment,
    };
  }, [app]);

  // The one line that matters most, chosen by what's actually known.
  const payoff = state.moment
    ? state.moment.acceptedBy
      ? `💗 ${minLabel(state.moment.startMin)} is yours together`
      : `💗 A moment at ${minLabel(state.moment.startMin)} is waiting for a yes`
    : !state.theirsShared
      ? `${partner} hasn't shared today yet`
      : state.window
        ? state.theirFree != null
          ? `${partner}'s free after ${minLabel(state.theirFree)} · both free ${minLabel(state.window.start)}–${minLabel(state.window.end)}`
          : `${partner}'s day is clear · both free from ${minLabel(state.window.start)}`
        : state.theirFree != null
          ? `${partner} comes free around ${minLabel(state.theirFree)}`
          : `${partner}'s day is clear 🤍`;

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel="Open Our Day"
      style={({ pressed }) => [styles.card, pressed && { transform: [{ scale: 0.99 }], opacity: 0.97 }]}
    >
      <View style={styles.head}>
        <Text style={styles.title}>Our day</Text>
        <Text style={styles.open}>Open ›</Text>
      </View>

      <View style={styles.lanes}>
        <Lane
          name={me}
          photo={app.myProfile?.image}
          color={colors.primary}
          line={state.myNext ? `${minLabel(state.myNext.startMin)} · ${state.myNext.title}` : state.mineShared ? 'done for the day' : 'nothing shared yet'}
        />
        <View style={styles.laneRule} />
        <Lane
          name={partner}
          photo={app.partnerProfile?.image}
          color={colors.accent}
          line={state.theirNext ? `${minLabel(state.theirNext.startMin)} · ${state.theirNext.title}` : state.theirsShared ? 'done for the day' : 'nothing shared yet'}
        />
      </View>

      {/* The day's shape at a glance: both lanes, the golden window glowing */}
      {state.mineShared || state.theirsShared ? (
        <GoldenBand
          mine={state.mine}
          theirs={state.theirs}
          window={state.window}
          nowMin={state.nowMin}
          style={{ marginTop: spacing.md }}
        />
      ) : null}

      <Text style={styles.payoff}>{payoff}</Text>
    </Pressable>
  );
}

function Lane({ name, photo, color, line }: { name: string; photo?: string | null; color: string; line: string }) {
  return (
    <View style={styles.lane}>
      <Avatar name={name} size={26} uri={photo} color={color} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.laneWho, { color }]} numberOfLines={1}>{name}</Text>
        <Text style={styles.laneLine} numberOfLines={1}>{line}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg + spacing.xs,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    ...shadow.card,
  },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: spacing.md },
  title: { fontSize: font.size.lg + 1, fontFamily: font.family.displaySemi, color: colors.text, letterSpacing: font.tracking.heading },
  open: { fontSize: font.size.sm, fontFamily: font.family.semibold, color: colors.primary },

  lanes: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  lane: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  laneWho: { fontSize: font.size.xs, fontFamily: font.family.bold, textTransform: 'uppercase', letterSpacing: font.tracking.caps },
  laneLine: { fontSize: font.size.sm, color: colors.textSoft, fontFamily: font.family.body, lineHeight: 20, letterSpacing: font.tracking.label },
  laneRule: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: colors.border },

  payoff: {
    marginTop: spacing.md,
    fontSize: font.size.md,
    lineHeight: 22,
    fontFamily: font.family.displaySemi,
    fontStyle: 'italic',
    color: colors.primaryDark,
    letterSpacing: font.tracking.heading,
  },
});
