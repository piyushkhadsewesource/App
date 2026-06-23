import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  AppHeader,
  Body,
  Button,
  Card,
  EmptyState,
  Field,
  Muted,
  Screen,
  SectionTitle,
  Title,
} from '../components/ui';
import { shortCountdown } from '../lib/countdown';
import { formatRelative } from '../lib/date';
import { useApp } from '../state/AppContext';
import { colors, font, gradients, radius, spacing } from '../theme';
import { PingType } from '../types/models';

const PINGS: { type: PingType; emoji: string; label: string; sent: string; grad: readonly [string, string] }[] = [
  { type: 'hug', emoji: '🤗', label: 'Hug', sent: 'Hug on its way', grad: gradients.gameRose },
  { type: 'kiss', emoji: '💋', label: 'Kiss', sent: 'Kiss sent', grad: gradients.gameSunset },
  { type: 'thinking', emoji: '💭', label: 'Thinking of you', sent: 'They’ll feel it', grad: gradients.gameViolet },
  { type: 'miss', emoji: '🥺', label: 'Miss you', sent: 'Distance is hard, isn’t it', grad: gradients.gameBerry },
];

const DAY = 86_400_000;

// Floating-emoji burst, so reaching out feels alive instead of silent.
function useBurst() {
  const [parts, setParts] = useState<{ id: number; emoji: string; left: number; v: Animated.Value }[]>([]);
  const idRef = useRef(0);
  const fire = (emoji: string) => {
    const items = Array.from({ length: 7 }).map(() => {
      const v = new Animated.Value(0);
      const id = idRef.current++;
      Animated.timing(v, { toValue: 1, duration: 1000 + Math.random() * 700, useNativeDriver: true }).start(() => {
        setParts((p) => p.filter((x) => x.id !== id));
      });
      return { id, emoji, left: 8 + Math.random() * 84, v };
    });
    setParts((p) => [...p, ...items]);
  };
  const node = (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {parts.map((p) => (
        <Animated.Text
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            bottom: 90,
            fontSize: 30,
            opacity: p.v.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, 1, 1, 0] }),
            transform: [
              { translateY: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, -320] }) },
              { scale: p.v.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.5, 1.25, 0.9] }) },
              { rotate: p.v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${Math.random() > 0.5 ? '' : '-'}18deg`] }) },
            ],
          }}
        >
          {p.emoji}
        </Animated.Text>
      ))}
    </View>
  );
  return { fire, node };
}

export default function MissYouScreen() {
  const app = useApp();
  const navigation = useNavigation<any>();
  const { meId, partnerId, pings, reasons, memories, future, moments, meeting, identity } = app;
  const partnerName = identity?.partnerName ?? 'them';
  const [toast, setToast] = useState<string | null>(null);
  const [kitOpen, setKitOpen] = useState(false);
  const [shuffle, setShuffle] = useState(0);
  const [newReason, setNewReason] = useState('');
  const [note, setNote] = useState('');
  const burst = useBurst();

  useEffect(() => {
    app.markPingsSeen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const received = useMemo(
    () => pings.filter((p) => p.fromId !== meId).sort((a, b) => b.createdAt - a.createdAt),
    [pings, meId],
  );
  const hugsThisWeek = useMemo(() => pings.filter((p) => p.createdAt > Date.now() - 7 * DAY).length, [pings]);
  const leftForThem = useMemo(() => reasons.filter((r) => r.authorId === meId).length, [reasons, meId]);

  // Things partner has stored, for my comfort kit.
  const myReasons = useMemo(() => reasons.filter((r) => r.authorId === partnerId), [reasons, partnerId]);
  const partnerMoments = useMemo(() => {
    const theirs = moments.filter((m) => m.authorId === partnerId);
    return theirs.length ? theirs : moments;
  }, [moments, partnerId]);
  const pick = <T,>(arr: T[]): T | null => (arr.length ? arr[shuffle % arr.length] : null);
  const kitMemory = pick(memories);
  const kitFuture = pick(future);
  const kitPhoto = pick(partnerMoments);

  function flash(msg: string, ms = 2600) {
    setToast(msg);
    setTimeout(() => setToast(null), ms);
  }

  function send(type: PingType, sentMsg: string, emoji: string, message?: string) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    burst.fire(emoji);
    flash(`${sentMsg} 🤍`);
    // Fire the write without blocking: offline the cloud ack can hang, but the
    // ping lands locally at once and the cheerful toast should not wait on it.
    void app.sendPing(type, message);
  }

  function sendNote() {
    const t = note.trim();
    if (!t) return;
    setNote('');
    send('thinking', 'Thought sent', '💭', t);
  }

  function sendMiss(level: number) {
    send('miss', `Sent, you miss them ${level}/5`, '💗', `Missing you${' ❤️'.repeat(level)}`);
  }

  function confirmSos() {
    Alert.alert(
      'Send an emergency alert?',
      `${partnerName}’s phone will sound a loud alarm and vibrate right away.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send alert',
          style: 'destructive',
          onPress: async () => {
            try {
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            } catch {
              /* ignore */
            }
            await app.sendSos();
            flash(`Emergency alert sent to ${partnerName} 🆘`, 2800);
          },
        },
      ],
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen scroll>
        <AppHeader title="When I miss you" subtitle={`You & ${partnerName}, closer`} />

        {/* Emergency */}
        <Pressable onPress={confirmSos} style={({ pressed }) => [styles.sos, pressed ? { opacity: 0.92 } : null]}>
          <Text style={{ fontSize: 30 }}>🆘</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.sosTitle}>Emergency alert</Text>
            <Text style={styles.sosSub}>Instantly sound {partnerName}’s phone when you need them now</Text>
          </View>
        </Pressable>

        {toast ? (
          <Card tone="rose" style={styles.toast}>
            <Body style={{ fontFamily: font.family.semibold }}>{toast}</Body>
          </Card>
        ) : null}

        {/* Reunion countdown */}
        <Pressable onPress={() => navigation.navigate('Countdown')}>
          <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.reunion}>
            <Text style={{ fontSize: 28 }}>💞</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.reunionTitle}>
                {meeting ? `Together again in ${shortCountdown(meeting.at)}` : 'Set your reunion date'}
              </Text>
              <Text style={styles.reunionSub}>
                {meeting ? meeting.label || 'Hold on, it gets closer every day.' : 'A date to count down to makes the distance smaller.'}
              </Text>
            </View>
            <Text style={styles.reunionChev}>›</Text>
          </LinearGradient>
        </Pressable>

        {/* Reach out */}
        <SectionTitle>Reach out right now</SectionTitle>
        <View style={styles.pingRow}>
          {PINGS.map((p) => (
            <Pressable
              key={p.type}
              onPress={() => send(p.type, p.sent, p.emoji)}
              style={({ pressed }) => [styles.pingWrap, pressed ? { transform: [{ scale: 0.96 }] } : null]}
            >
              <LinearGradient colors={p.grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ping}>
                <Text style={{ fontSize: 34 }}>{p.emoji}</Text>
                <Text style={styles.pingLabel}>{p.label}</Text>
              </LinearGradient>
            </Pressable>
          ))}
        </View>

        {/* Miss-o-meter */}
        <Card tone="rose" style={{ marginTop: spacing.md }}>
          <Body style={{ fontFamily: font.family.semibold }}>How much do you miss them right now?</Body>
          <View style={styles.meterRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} onPress={() => sendMiss(n)} hitSlop={6} style={styles.meterHeart}>
                <Text style={{ fontSize: 30 }}>💗</Text>
              </Pressable>
            ))}
          </View>
          <Muted>Tap a heart to send the feeling, more hearts, more longing.</Muted>
        </Card>

        {/* Send a thought */}
        <SectionTitle>Send a little thought</SectionTitle>
        <Card>
          <Field
            value={note}
            onChangeText={setNote}
            placeholder={`Tell ${partnerName} what just made you think of them…`}
            multiline
          />
          <Button label="💭  Send this thought" disabled={!note.trim()} onPress={sendNote} />
        </Card>

        {/* Reasons carousel */}
        {myReasons.length > 0 ? (
          <>
            <SectionTitle>Reasons you’re loved</SectionTitle>
            <ReasonsCarousel reasons={myReasons} partnerName={partnerName} />
          </>
        ) : null}

        {/* Connection stats */}
        <View style={styles.statsRow}>
          <Stat value={`${hugsThisWeek}`} label="reach-outs this week" />
          <Stat value={`${myReasons.length}`} label={`reasons from ${partnerName}`} />
          <Stat value={`${leftForThem}`} label="reasons you left" />
        </View>

        {/* Comfort kit */}
        <SectionTitle>Feeling the distance?</SectionTitle>
        {!kitOpen ? (
          <Card tone="violet" onPress={() => setKitOpen(true)}>
            <Title>Open my comfort kit 🧸</Title>
            <Muted style={{ marginTop: 4 }}>
              First-aid for lonely moments: a photo, reasons you’re loved, a memory, and what’s ahead.
            </Muted>
          </Card>
        ) : (
          <View style={{ gap: spacing.md }}>
            {kitPhoto ? (
              <Card style={{ padding: 0, overflow: 'hidden' }}>
                <Image source={{ uri: kitPhoto.image }} style={styles.kitPhoto} resizeMode="cover" />
                <View style={{ padding: spacing.md }}>
                  <Muted>A moment to hold onto</Muted>
                  {kitPhoto.caption ? <Body style={{ marginTop: 2 }}>{kitPhoto.caption}</Body> : null}
                </View>
              </Card>
            ) : null}

            {kitMemory ? (
              <Card tone="gold">
                <Muted>Remember this?</Muted>
                <Title style={{ marginTop: 6 }}>
                  {kitMemory.emoji ? `${kitMemory.emoji} ` : ''}
                  {kitMemory.title}
                </Title>
                {kitMemory.description ? <Body style={{ marginTop: 4 }}>{kitMemory.description}</Body> : null}
              </Card>
            ) : null}

            {kitFuture ? (
              <Card tone="green">
                <Muted>Something to look forward to</Muted>
                <Title style={{ marginTop: 6 }}>✨ {kitFuture.text}</Title>
              </Card>
            ) : null}

            <View style={styles.kitButtons}>
              <Button label="Shuffle" variant="soft" onPress={() => setShuffle((s) => s + 1)} style={{ flex: 1 }} />
              <Button label="Close" variant="ghost" onPress={() => setKitOpen(false)} style={{ flex: 1 }} />
            </View>
          </View>
        )}

        {/* Received */}
        <SectionTitle>From {partnerName}</SectionTitle>
        {received.length === 0 ? (
          <Card>
            <EmptyState emoji="🌙" title="No hugs yet" text={`When ${partnerName} reaches out, it’ll land here.`} />
          </Card>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {received.slice(0, 8).map((p) => {
              const meta = PINGS.find((x) => x.type === p.type) ?? PINGS[0];
              const what =
                p.type === 'hug' ? 'a hug' : p.type === 'kiss' ? 'a kiss' : p.type === 'miss' ? 'an “I miss you”' : 'a thought';
              return (
                <Card key={p.id} style={styles.hugRow}>
                  <Text style={{ fontSize: 26 }}>{meta.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Body style={{ fontFamily: font.family.semibold }}>
                      {partnerName} sent {what}
                    </Body>
                    {p.message ? <Body style={{ marginTop: 2 }}>“{p.message}”</Body> : null}
                    <Muted>{formatRelative(p.createdAt)}</Muted>
                  </View>
                </Card>
              );
            })}
          </View>
        )}

        {/* Leave a reason */}
        <SectionTitle>Leave {partnerName} a reason you love them</SectionTitle>
        <Card>
          <Field value={newReason} onChangeText={setNewReason} placeholder="Something true and specific…" multiline />
          <Button
            label="Add to their kit"
            disabled={!newReason.trim()}
            onPress={() => {
              const text = newReason.trim();
              if (!text) return;
              setNewReason('');
              flash('Saved to their comfort kit 🤍', 2200);
              void app.addReason(text);
            }}
          />
          {leftForThem > 0 ? (
            <Muted style={{ marginTop: spacing.md }}>
              You’ve left {leftForThem} reason{leftForThem === 1 ? '' : 's'} for {partnerName}.
            </Muted>
          ) : null}
        </Card>
      </Screen>
      {burst.node}
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

const REASON_GRADS: readonly (readonly [string, string])[] = [
  gradients.gameRose,
  gradients.gameViolet,
  gradients.gameBerry,
  gradients.gameSunset,
  gradients.gameTeal,
];

function ReasonsCarousel({ reasons, partnerName }: { reasons: { id: string; text: string }[]; partnerName: string }) {
  const [w, setW] = useState(0);
  const [idx, setIdx] = useState(0);
  const onScroll = (e: { nativeEvent: { contentOffset: { x: number } } }) => {
    if (w > 0) setIdx(Math.max(0, Math.min(reasons.length - 1, Math.round(e.nativeEvent.contentOffset.x / w))));
  };
  return (
    <View>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ borderRadius: radius.lg, overflow: 'hidden' }}>
        {w > 0 ? (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
          >
            {reasons.map((r, i) => (
              <View key={r.id} style={{ width: w }}>
                <LinearGradient colors={REASON_GRADS[i % REASON_GRADS.length]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.reasonCard}>
                  <Text style={styles.reasonMark}>“</Text>
                  <Text style={styles.reasonText}>{r.text}</Text>
                  <Text style={styles.reasonWho}>loves you, {partnerName} 💗</Text>
                </LinearGradient>
              </View>
            ))}
          </ScrollView>
        ) : null}
      </View>
      <View style={styles.dotsRow}>
        {reasons.length <= 12 ? (
          reasons.map((_, i) => <View key={i} style={[styles.dot, i === idx ? styles.dotOn : null]} />)
        ) : (
          <Text style={styles.counter}>{idx + 1} / {reasons.length}</Text>
        )}
      </View>
      <Muted style={{ textAlign: 'center' }}>Swipe to read them all</Muted>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: { marginBottom: spacing.md },

  reunion: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.sm },
  reunionTitle: { color: colors.white, fontSize: font.size.lg, fontFamily: font.family.bold },
  reunionSub: { color: 'rgba(255,255,255,0.85)', fontSize: font.size.sm, marginTop: 2, fontFamily: font.family.body },
  reunionChev: { color: 'rgba(255,255,255,0.8)', fontSize: 26 },

  pingRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  pingWrap: { width: '47%' },
  ping: { borderRadius: radius.lg, paddingVertical: spacing.lg, alignItems: 'center', gap: spacing.sm },
  pingLabel: { fontSize: font.size.sm, fontFamily: font.family.bold, color: colors.white, textAlign: 'center' },

  meterRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: spacing.sm },
  meterHeart: { padding: 4 },

  statsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  stat: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: spacing.md, paddingHorizontal: spacing.sm, alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  statValue: { fontSize: font.size.xxl, fontFamily: font.family.display, color: colors.primary },
  statLabel: { fontSize: 11, color: colors.textSoft, fontFamily: font.family.body, textAlign: 'center', marginTop: 2 },

  reasonCard: { minHeight: 160, padding: spacing.xl, justifyContent: 'center', borderRadius: radius.lg },
  reasonMark: { position: 'absolute', top: 6, left: 14, fontSize: 64, color: 'rgba(255,255,255,0.35)', fontFamily: font.family.display },
  reasonText: { color: colors.white, fontSize: font.size.xl, lineHeight: 30, fontFamily: font.family.displaySemi },
  reasonWho: { color: 'rgba(255,255,255,0.9)', fontSize: font.size.sm, fontFamily: font.family.semibold, marginTop: spacing.md },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: spacing.md, marginBottom: 2 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.border },
  dotOn: { backgroundColor: colors.primary, width: 20 },
  counter: { fontSize: font.size.sm, color: colors.textSoft, fontFamily: font.family.semibold },

  kitButtons: { flexDirection: 'row', gap: spacing.md },
  kitPhoto: { width: '100%', height: 200, backgroundColor: colors.surfaceAlt },
  hugRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },

  sos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1.5,
    borderColor: colors.danger,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  sosTitle: { fontSize: font.size.lg, fontFamily: font.family.bold, color: colors.danger },
  sosSub: { fontSize: font.size.sm, color: colors.textSoft, marginTop: 2 },
});
