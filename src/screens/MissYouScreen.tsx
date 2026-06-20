import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
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
import { formatRelative } from '../lib/date';
import { useApp } from '../state/AppContext';
import { colors, font, radius, spacing } from '../theme';
import { PingType } from '../types/models';

const PINGS: { type: PingType; emoji: string; label: string; sent: string }[] = [
  { type: 'hug', emoji: '🤗', label: 'Send a hug', sent: 'Hug on its way' },
  { type: 'kiss', emoji: '💋', label: 'Send a kiss', sent: 'Kiss sent 💋' },
  { type: 'thinking', emoji: '💭', label: 'Thinking of you', sent: 'They’ll know you’re thinking of them' },
  { type: 'miss', emoji: '🥺', label: 'I miss you', sent: 'Sent, distance is hard, isn’t it' },
];

export default function MissYouScreen() {
  const app = useApp();
  const { meId, partnerId, pings, reasons, memories, future, identity } = app;
  const partnerName = identity?.partnerName ?? 'them';
  const [toast, setToast] = useState<string | null>(null);
  const [kitOpen, setKitOpen] = useState(false);
  const [shuffle, setShuffle] = useState(0);
  const [newReason, setNewReason] = useState('');

  // Mark hugs from partner as seen when this screen opens.
  useEffect(() => {
    app.markPingsSeen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const received = useMemo(
    () => pings.filter((p) => p.fromId !== meId).sort((a, b) => b.createdAt - a.createdAt),
    [pings, meId],
  );

  // Things partner has stored about me / us, for my comfort kit.
  const myReasons = useMemo(() => reasons.filter((r) => r.authorId === partnerId), [reasons, partnerId]);
  const pick = <T,>(arr: T[]): T | null => (arr.length ? arr[shuffle % arr.length] : null);
  const kitReason = pick(myReasons);
  const kitMemory = pick(memories);
  const kitFuture = pick(future);

  async function send(type: PingType, sentMsg: string) {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      /* haptics unavailable (e.g. web) */
    }
    await app.sendPing(type);
    setToast(`${sentMsg} 🤍`);
    setTimeout(() => setToast(null), 2600);
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
            setToast(`Emergency alert sent to ${partnerName} 🆘`);
            setTimeout(() => setToast(null), 2800);
          },
        },
      ],
    );
  }

  return (
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

      {/* Send a hug */}
      <SectionTitle>Reach out right now</SectionTitle>
      <View style={styles.pingRow}>
        {PINGS.map((p) => (
          <Pressable
            key={p.type}
            onPress={() => send(p.type, p.sent)}
            style={({ pressed }) => [styles.ping, pressed ? { transform: [{ scale: 0.96 }], opacity: 0.9 } : null]}
          >
            <Text style={{ fontSize: 34 }}>{p.emoji}</Text>
            <Text style={styles.pingLabel}>{p.label}</Text>
          </Pressable>
        ))}
      </View>
      <Muted style={{ marginTop: spacing.sm }}>
        A tap sends a gentle notification, “{partnerName} is thinking about you right now.”
      </Muted>

      {/* Comfort kit */}
      <SectionTitle>Feeling the distance?</SectionTitle>
      {!kitOpen ? (
        <Card tone="violet" onPress={() => setKitOpen(true)}>
          <Title>Open my comfort kit 🧸</Title>
          <Muted style={{ marginTop: 4 }}>
            A little first-aid for lonely moments, reasons you’re loved, a memory, and what’s ahead.
          </Muted>
        </Card>
      ) : (
        <View style={{ gap: spacing.md }}>
          <Card tone="rose">
            <Muted>A reason {partnerName} loves you</Muted>
            {kitReason ? (
              <Title style={{ marginTop: 6 }}>“{kitReason.text}”</Title>
            ) : (
              <Body style={{ marginTop: 6 }}>
                {partnerName} hasn’t left reasons yet, but you can leave some for them below. 🤍
              </Body>
            )}
          </Card>

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

      {/* Received hugs */}
      <SectionTitle>From {partnerName}</SectionTitle>
      {received.length === 0 ? (
        <Card>
          <EmptyState emoji="🌙" title="No hugs yet" text={`When ${partnerName} reaches out, it’ll land here.`} />
        </Card>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {received.slice(0, 8).map((p) => {
            const meta = PINGS.find((x) => x.type === p.type) ?? PINGS[0];
            return (
              <Card key={p.id} style={styles.hugRow}>
                <Text style={{ fontSize: 26 }}>{meta.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Body style={{ fontFamily: font.family.semibold }}>
                    {partnerName} sent{' '}
                    {p.type === 'hug'
                      ? 'a hug'
                      : p.type === 'kiss'
                        ? 'a kiss'
                        : p.type === 'miss'
                          ? 'an “I miss you”'
                          : 'a thought'}
                  </Body>
                  <Muted>{formatRelative(p.createdAt)}</Muted>
                </View>
              </Card>
            );
          })}
        </View>
      )}

      {/* Leave reasons for partner */}
      <SectionTitle>Leave {partnerName} a reason you love them</SectionTitle>
      <Card>
        <Field
          value={newReason}
          onChangeText={setNewReason}
          placeholder="Something true and specific…"
          multiline
        />
        <Button
          label="Add to their kit"
          disabled={!newReason.trim()}
          onPress={async () => {
            await app.addReason(newReason.trim());
            setNewReason('');
            setToast('Saved to their comfort kit 🤍');
            setTimeout(() => setToast(null), 2200);
          }}
        />
        {reasons.filter((r) => r.authorId === meId).length > 0 ? (
          <Muted style={{ marginTop: spacing.md }}>
            You’ve left {reasons.filter((r) => r.authorId === meId).length} reason
            {reasons.filter((r) => r.authorId === meId).length === 1 ? '' : 's'} for {partnerName}.
          </Muted>
        ) : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  toast: { marginBottom: spacing.md },
  pingRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  ping: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  pingLabel: { fontSize: font.size.sm, fontFamily: font.family.semibold, color: colors.text, textAlign: 'center' },
  kitButtons: { flexDirection: 'row', gap: spacing.md },
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
