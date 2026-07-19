import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { Body, Button, Card, Field, Muted, Screen } from '../components/ui';
import DateTimeModal from '../components/DateTimeModal';
import { Reveal } from '../components/Motion';
import { APP_NAME, APP_TAGLINE } from '../config';
import { formatDate, isoToDate, toISODate } from '../lib/date';
import { genPairingCode, personId } from '../services/identity';
import { useApp } from '../state/AppContext';
import { colors, font, gradients, radius, shadow, spacing } from '../theme';
import { easeOut, prefersReducedMotion } from '../theme/motion';

type PairMode = 'create' | 'join';

export default function OnboardingScreen() {
  const { createIdentity, cloud } = useApp();
  // Blank on purpose (the placeholders still show the two of us): prefilled
  // literals meant the joining phone could keep the creator's name, silently
  // merging both people into one author id.
  const [name, setName] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [anniversary, setAnniversary] = useState('');
  const [annivOpen, setAnnivOpen] = useState(false);

  // One partner creates the space (and shares the generated code); the other
  // joins by typing that exact code. Previously both phones auto-generated their
  // own code, so the joiner had to know to overwrite it — the quiet first-run trap.
  const [mode, setMode] = useState<PairMode>('create');
  const [createdCode] = useState(genPairingCode); // generated once, stable across renders
  const [joinCode, setJoinCode] = useState('');

  const code = mode === 'create' ? createdCode : joinCode;
  const codeValid = mode === 'create' ? createdCode.trim().length > 0 : joinCode.trim().length >= 4;
  // Each person's stable id derives from their name; identical slugs would
  // silently merge you both into one author, so it must be blocked here.
  const nameClash =
    name.trim().length > 0 &&
    partnerName.trim().length > 0 &&
    personId(name) === personId(partnerName);
  const valid = name.trim().length > 0 && partnerName.trim().length > 0 && codeValid && !nameClash;
  const partner = partnerName.trim() || 'your partner';
  const myName = name.trim() || 'me';

  // A slow, living breath on the hero heart so the first screen feels alive.
  // Under reduced motion the heart simply rests, no perpetual loop.
  const breathe = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 1900, easing: easeOut, useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 1900, easing: easeOut, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breathe]);
  const heartScale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] });

  async function shareCode() {
    try {
      await Share.share({
        message: `Join our private Tether space 🤍  Open the app, tap "Join ${myName}", and enter this code: ${createdCode}`,
      });
    } catch {
      /* user dismissed the share sheet; nothing to do */
    }
  }

  function begin() {
    if (!valid) return;
    // Arm the pairing handshake (cloud only): Home shows "Looking for
    // {partner}'s space…" until the first partner signal actually syncs in,
    // then celebrates the link. Catches a typo'd code honestly.
    if (cloud) AsyncStorage.setItem('@tether/awaitLink', '1').catch(() => {});
    createIdentity({
      name,
      partnerName,
      spaceId: code,
      anniversary: anniversary.trim() || undefined,
    });
  }

  return (
    <Screen scroll>
      {/* The whole screen cascades in: hero, then intro, then each field, then the call to action. */}
      <Reveal delay={0} distance={22}>
        <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <Animated.Text style={{ fontSize: 46, transform: [{ scale: heartScale }] }}>🤍</Animated.Text>
          <Text style={styles.heroTitle}>{APP_NAME}</Text>
          <Text style={styles.heroTagline}>{APP_TAGLINE}</Text>
          <Text style={styles.heroMade}>for Piyush &amp; Riya</Text>
        </LinearGradient>
      </Reveal>

      <Reveal delay={110}>
        <Card tone="rose" style={{ marginBottom: spacing.lg }}>
          <Body>
            A private space for just the two of you, to feel each other’s days, keep your memories,
            and stay close across the distance.
          </Body>
        </Card>
      </Reveal>

      <Reveal delay={170}>
        <Field label="Your name" value={name} onChangeText={setName} placeholder="Piyush" />
      </Reveal>
      <Reveal delay={220}>
        <Field label="Your partner’s name" value={partnerName} onChangeText={setPartnerName} placeholder="Riya" />
        {nameClash ? (
          <Muted style={styles.clashWarn}>
            Your names need to be different, that's how Tether tells your entries apart. Use a
            nickname for one of you 🤍
          </Muted>
        ) : null}
      </Reveal>

      {/* Anniversary via the themed date picker instead of a raw text field. */}
      <Reveal delay={270}>
        <Text style={styles.fieldLabel}>Anniversary (optional)</Text>
        <Pressable
          onPress={() => setAnnivOpen(true)}
          style={styles.dateRow}
          accessibilityRole="button"
          accessibilityLabel={anniversary ? `Anniversary ${formatDate(anniversary)}. Tap to change.` : 'Set your anniversary date'}
        >
          <Text style={[styles.dateText, !anniversary && styles.datePlaceholder]}>
            {anniversary ? formatDate(anniversary) : 'Tap to choose a date'}
          </Text>
          <Text style={styles.dateCaret}>›</Text>
        </Pressable>
        <View style={{ height: spacing.md }} />
      </Reveal>

      {/* Pairing: create a space or join the partner's. */}
      <Reveal delay={320}>
        <Text style={styles.fieldLabel}>Your shared space</Text>
        <View style={styles.segment}>
          <Pressable
            onPress={() => setMode('create')}
            style={[styles.seg, mode === 'create' && styles.segOn]}
            accessibilityRole="button"
            accessibilityState={{ selected: mode === 'create' }}
          >
            <Text style={[styles.segText, mode === 'create' && styles.segTextOn]} numberOfLines={1}>Start our space</Text>
          </Pressable>
          <Pressable
            onPress={() => setMode('join')}
            style={[styles.seg, mode === 'join' && styles.segOn]}
            accessibilityRole="button"
            accessibilityState={{ selected: mode === 'join' }}
          >
            <Text style={[styles.segText, mode === 'join' && styles.segTextOn]} numberOfLines={1}>Join {partner}</Text>
          </Pressable>
        </View>

        {mode === 'create' ? (
          <Card tone="violet" style={{ marginBottom: spacing.lg }}>
            <Muted>Your private code</Muted>
            <Text selectable style={styles.codeBig}>{createdCode}</Text>
            <Button label={`Share code with ${partner}`} variant="soft" onPress={shareCode} />
            <Muted style={{ marginTop: spacing.sm }}>
              {cloud
                ? `Send this to ${partner}. On their phone they tap "Join ${myName}" and enter the same code, that is what privately links the two of you.`
                : 'Running on-device for now. When you turn on cloud sync (see Settings), this same code links both phones.'}
            </Muted>
          </Card>
        ) : (
          <View style={{ marginBottom: spacing.lg }}>
            <Field
              label={`The code ${partner} sent you`}
              value={joinCode}
              onChangeText={(t) => setJoinCode(t.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="ABCD-EFGH-JKLM"
            />
            <Muted style={{ marginTop: -spacing.sm }}>
              Enter the exact code from {partner}’s phone, the matching code is what links you.
            </Muted>
          </View>
        )}
      </Reveal>

      <Reveal delay={390}>
        <Button label="Begin our space" disabled={!valid} onPress={begin} />
        <View style={{ height: spacing.sm }} />
        <Muted style={{ textAlign: 'center' }}>
          Everything stays between you two. No feeds, no followers, no one else.
        </Muted>
        <Text style={styles.build}>Made just for us 🤍</Text>
      </Reveal>

      <DateTimeModal
        visible={annivOpen}
        mode="date"
        allowPast
        title="Your anniversary"
        initial={anniversary ? isoToDate(anniversary).getTime() : Date.now()}
        onCancel={() => setAnnivOpen(false)}
        onConfirm={(ts) => {
          setAnniversary(toISODate(new Date(ts)));
          setAnnivOpen(false);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: radius.xl,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    ...shadow.hero,
  },
  heroTitle: { fontSize: 46, fontFamily: font.family.display, color: colors.white, marginTop: spacing.sm, letterSpacing: -1 },
  heroTagline: { fontSize: font.size.md, color: 'rgba(255,255,255,0.92)', fontFamily: font.family.body, marginTop: 6 },
  heroMade: { fontSize: font.size.sm, color: 'rgba(255,255,255,0.9)', fontFamily: font.family.semibold, marginTop: spacing.md, letterSpacing: 0.3 },
  build: { textAlign: 'center', marginTop: spacing.lg, fontSize: 11, color: colors.textFaint, fontFamily: font.family.body },

  fieldLabel: { fontSize: font.size.sm, fontFamily: font.family.semibold, color: colors.textSoft, marginBottom: spacing.xs },
  clashWarn: { color: colors.primaryDark, marginTop: -spacing.sm, marginBottom: spacing.md },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  dateText: { fontSize: font.size.md, color: colors.text, fontFamily: font.family.body },
  // textSoft, not textFaint: placeholder copy must clear 4.5:1 on paper (the
  // same rule Field already follows).
  datePlaceholder: { color: colors.textSoft },
  dateCaret: { fontSize: 20, color: colors.textFaint },

  segment: { flexDirection: 'row', backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, padding: 4, marginBottom: spacing.md },
  seg: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.pill, alignItems: 'center' },
  segOn: { backgroundColor: colors.surface, ...shadow.soft },
  segText: { fontSize: font.size.sm, fontFamily: font.family.semibold, color: colors.textSoft, paddingHorizontal: spacing.xs },
  segTextOn: { color: colors.text },
  codeBig: {
    fontSize: font.size.xl,
    fontFamily: font.family.bold,
    color: colors.text,
    letterSpacing: 2,
    marginTop: 2,
    marginBottom: spacing.md,
  },
});
