// Full-screen takeover shown on EITHER phone the moment an unseen SOS alert
// from the partner arrives through live sync. Loud looping alarm + strong
// vibration until dismissed.
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef } from 'react';
import { Modal, Pressable, StyleSheet, Text, Vibration, View } from 'react-native';
import { formatRelative } from '../lib/date';
import { useApp } from '../state/AppContext';
import { colors, font, radius, spacing } from '../theme';

export default function SosOverlay() {
  const app = useApp();
  const incoming = app.alerts
    .filter((a) => a.fromId !== app.meId && !a.seenAt)
    .sort((a, b) => b.createdAt - a.createdAt)[0];
  const active = !!incoming;
  const playerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    try {
      Vibration.vibrate([0, 600, 300, 600, 300, 600], true);
    } catch {
      /* vibration unavailable */
    }
    (async () => {
      try {
        await setAudioModeAsync({ playsInSilentMode: true });
      } catch {
        /* ignore */
      }
      try {
        const player = createAudioPlayer(require('../../assets/alarm.wav'));
        if (cancelled) {
          player.remove();
          return;
        }
        player.loop = true;
        player.volume = 1;
        // play() rejects on web until the user interacts; swallow that.
        const res: any = player.play();
        if (res && typeof res.catch === 'function') res.catch(() => {});
        playerRef.current = player;
      } catch {
        /* audio unavailable (e.g. web autoplay blocked) */
      }
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
      try {
        Vibration.cancel();
      } catch {
        /* ignore */
      }
      const p = playerRef.current;
      if (p) {
        try {
          p.pause();
          p.remove();
        } catch {
          /* ignore */
        }
        playerRef.current = null;
      }
    };
  }, [active, incoming?.id]);

  const partnerName = app.identity?.partnerName ?? 'Your partner';

  return (
    <Modal visible={active} transparent animationType="fade" onRequestClose={() => app.markAlertsSeen()}>
      <View style={styles.bg}>
        <Text style={styles.siren}>🆘</Text>
        <Text style={styles.title}>{partnerName} needs you</Text>
        <Text style={styles.sub}>
          Urgent alert{incoming ? ` · ${formatRelative(incoming.createdAt)}` : ''}
        </Text>
        {incoming?.message ? <Text style={styles.msg}>"{incoming.message}"</Text> : null}
        <Pressable style={styles.btn} onPress={() => app.markAlertsSeen()}>
          <Text style={styles.btnText}>I'm here ✓</Text>
        </Pressable>
        <Text style={styles.hint}>Reach {partnerName} as soon as you can.</Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  siren: { fontSize: 96, marginBottom: spacing.md },
  title: { fontSize: 34, fontFamily: font.family.bold, color: colors.white, textAlign: 'center' },
  sub: { fontSize: font.size.md, color: 'rgba(255,255,255,0.9)', marginTop: spacing.sm },
  msg: {
    fontSize: font.size.lg,
    color: colors.white,
    textAlign: 'center',
    marginTop: spacing.lg,
    fontStyle: 'italic',
    lineHeight: 26,
  },
  btn: {
    marginTop: spacing.xxl,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg,
    borderRadius: radius.pill,
  },
  btnText: { fontSize: font.size.lg, fontFamily: font.family.bold, color: colors.danger },
  hint: { fontSize: font.size.md, color: 'rgba(255,255,255,0.9)', marginTop: spacing.xl },
});
