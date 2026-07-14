// ─────────────────────────────────────────────────────────────────────────
// "Us" — the home of everything you share, organised the way the relationship
// actually works: reach for each other now, play, keep what matters, plan
// what's ahead, tend what's tender. Replaces the old undifferentiated 16-tile
// grid; every route stays reachable, nothing is orphaned.
// ─────────────────────────────────────────────────────────────────────────
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader, Muted, Screen, SectionTitle } from '../components/ui';
import { todayISO } from '../lib/date';
import { issueNeedingYou } from '../lib/issues';
import { untilLabel, upcomingOccasion } from '../lib/occasions';
import { goldenWindow, minLabel } from '../lib/ourDay';
import { useNow } from '../lib/useNow';
import { useApp } from '../state/AppContext';
import { colors, font, radius, shadow, spacing } from '../theme';

type Row = { route: string; emoji: string; label: string; sub?: string };

const CLUSTERS: { title: string; tint: string; rows: Row[] }[] = [
  {
    title: 'Feel close now',
    tint: colors.primarySoft,
    rows: [
      { route: 'MissYou', emoji: '🤍', label: 'When I miss you', sub: 'Hugs, thoughts & the emergency alert' },
      { route: 'Glass', emoji: '🫶', label: 'Through the glass', sub: 'Touch together, feel their heartbeat' },
      { route: 'Compass', emoji: '🧭', label: 'The Compass Rose', sub: 'The needle that points at them' },
      { route: 'Walk', emoji: '👣', label: 'Walking each other home', sub: 'Your steps close the distance' },
    ],
  },
  {
    title: 'Play together',
    tint: colors.accentSoft,
    rows: [
      { route: 'Games', emoji: '🎮', label: 'Play together', sub: 'Canvas, Wordle, Ludo & more' },
      { route: 'Deck', emoji: '🃏', label: 'Intimacy deck', sub: 'Questions worth an evening' },
    ],
  },
  {
    title: 'Keep & remember',
    tint: colors.goldSoft,
    rows: [
      { route: 'Moments', emoji: '📸', label: 'Moments', sub: 'A photo a day, just for you two' },
      { route: 'Letters', emoji: '💌', label: 'Love letters', sub: 'Written now, delivered when you choose' },
      { route: 'Vault', emoji: '🗂️', label: 'Memory vault', sub: 'Keepsakes, and your journal' },
      { route: 'Future', emoji: '✨', label: 'Future board', sub: 'Everything you’re walking toward' },
    ],
  },
  {
    title: 'Plan together',
    tint: colors.goodSoft,
    rows: [
      { route: 'Schedule', emoji: '🗓️', label: 'Our day', sub: 'Share your day, find the shared hour' },
      { route: 'Occasions', emoji: '🎀', label: 'Our dates', sub: 'The reunion, anniversaries & special days' },
    ],
  },
  {
    title: 'Tend to us',
    tint: colors.accentSoft,
    rows: [
      { route: 'Issues', emoji: '🕊️', label: 'Clear the air', sub: 'Gentle repair, step by step' },
    ],
  },
];

const UTILITIES: Row[] = [
  { route: 'Settings', emoji: '⚙️', label: 'Settings', sub: 'Sync, names, reminders & pairing' },
];

/** A row that knows something is alive behind it right now. */
type Live = { sub: string; dot?: boolean };

export default function MoreScreen({ navigation }: any) {
  const app = useApp();
  const { identity } = app;
  const partner = identity?.partnerName ?? 'them';
  const now = useNow(60_000);

  // The menu is a status board almost for free: every feature already syncs.
  // Partner-driven states speak in violet (the app-wide color law); the sub
  // line becomes live where there is something true to say.
  const live: Record<string, Live> = useMemo(() => {
    const out: Record<string, Live> = {};
    const today = todayISO();
    const unseen = app.pings.filter((p) => p.fromId !== app.meId && !p.seenAt).length;
    if (unseen > 0) {
      out.MissYou = {
        sub: unseen === 1 ? `A hug from ${partner} is waiting` : `${unseen} hugs from ${partner} are waiting`,
        dot: true,
      };
    }
    const readyLetter = app.letters.find((l) => l.authorId !== app.meId && l.deliverAt <= now && !l.openedAt);
    if (readyLetter) out.Letters = { sub: 'A sealed letter is ready to open', dot: true };
    const pd = app.wordle.find((w) => w.id === `${today}:${app.partnerId}`);
    if (pd) out.Games = { sub: pd.solved ? `${partner} solved today's word` : `${partner} is playing today's word`, dot: true };
    const deckGift = app.deck.some(
      (r) => r.authorId === app.partnerId && !app.deck.some((m) => m.authorId === app.meId && m.promptId === r.promptId),
    );
    if (deckGift) out.Deck = { sub: `${partner} answered a question for you`, dot: true };
    const issue = issueNeedingYou(app.issues, app.meId);
    if (issue) out.Issues = { sub: `${partner} wants to clear the air`, dot: true };
    const up = upcomingOccasion(app.occasions, 31, 0);
    if (up) out.Occasions = { sub: `${up.occasion.title} · ${untilLabel(up.days).toLowerCase()}` };
    const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
    const items = app.schedule.filter((s) => s.date === today && s.kind !== 'moment');
    const mine = items.filter((s) => app.isMine(s.authorId));
    const theirs = items.filter((s) => !app.isMine(s.authorId));
    if (theirs.length > 0) {
      const win = goldenWindow(mine, theirs, nowMin);
      if (win) out.Schedule = { sub: `Both free ${minLabel(win.start)} tonight` };
    }
    return out;
  }, [app, partner, now]);

  return (
    <Screen scroll>
      <AppHeader title="Us" subtitle={`Everything you & ${identity?.partnerName ?? 'your love'} share`} />

      {CLUSTERS.map((c) => (
        <View key={c.title}>
          <SectionTitle>{c.title}</SectionTitle>
          <View style={[styles.cluster, shadow.card]}>
            {c.rows.map((r, i) => {
              const lv = live[r.route];
              return (
                <Pressable
                  key={r.route}
                  onPress={() => navigation.navigate(r.route)}
                  accessibilityRole="button"
                  accessibilityLabel={r.label}
                  style={({ pressed }) => [
                    styles.row,
                    i > 0 && styles.rowDivider,
                    pressed && styles.rowPressed,
                  ]}
                >
                  <View style={[styles.badge, { backgroundColor: c.tint }]}>
                    <Text style={styles.badgeEmoji}>{r.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>{r.label}</Text>
                    {lv ? <Muted style={{ color: colors.accent }}>{lv.sub}</Muted> : r.sub ? <Muted>{r.sub}</Muted> : null}
                  </View>
                  {lv?.dot ? <View style={styles.liveDot} /> : null}
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}

      <SectionTitle>Settings</SectionTitle>
      <View style={[styles.cluster, shadow.card]}>
        {UTILITIES.map((r, i) => (
          <Pressable
            key={r.route}
            onPress={() => navigation.navigate(r.route)}
            accessibilityRole="button"
            accessibilityLabel={r.label}
            style={({ pressed }) => [styles.row, i > 0 && styles.rowDivider, pressed && styles.rowPressed]}
          >
            <View style={[styles.badge, { backgroundColor: colors.surfaceAlt }]}>
              <Text style={styles.badgeEmoji}>{r.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{r.label}</Text>
              {r.sub ? <Muted>{r.sub}</Muted> : null}
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cluster: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(90,46,64,0.06)',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  rowPressed: { backgroundColor: colors.surfaceAlt },
  badge: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  badgeEmoji: { fontSize: 21 },
  label: { fontSize: font.size.md, fontFamily: font.family.semibold, color: colors.text },
  chevron: { fontSize: 24, color: colors.textFaint },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
});
