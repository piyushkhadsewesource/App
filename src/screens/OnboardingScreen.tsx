import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Body, Button, Card, Field, Muted, Screen } from '../components/ui';
import { Reveal } from '../components/Motion';
import { APP_NAME, APP_TAGLINE } from '../config';
import { genPairingCode } from '../services/identity';
import { useApp } from '../state/AppContext';
import { colors, font, gradients, radius, shadow, spacing } from '../theme';
import { easeOut } from '../theme/motion';

export default function OnboardingScreen() {
  const { createIdentity, cloud } = useApp();
  const [name, setName] = useState('Piyush');
  const [partnerName, setPartnerName] = useState('Riya');
  const [anniversary, setAnniversary] = useState('');
  const [code, setCode] = useState(genPairingCode());

  const valid = name.trim().length > 0 && partnerName.trim().length > 0 && code.trim().length > 0;

  // A slow, living breath on the hero heart so the first screen feels alive.
  const breathe = useRef(new Animated.Value(0)).current;
  useEffect(() => {
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
      </Reveal>
      <Reveal delay={270}>
        <Field
          label="Anniversary (optional)"
          value={anniversary}
          onChangeText={setAnniversary}
          placeholder="YYYY-MM-DD"
          autoCapitalize="none"
        />
      </Reveal>

      <Reveal delay={320}>
        <Field
          label="Your shared pairing code"
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase())}
          autoCapitalize="characters"
        />
        <Muted style={{ marginTop: -spacing.sm, marginBottom: spacing.lg }}>
          {cloud
            ? 'Both phones must use the SAME code, that’s what privately links the two of you. Share it with your partner and enter it on both phones.'
            : 'Running on-device for now. When you turn on cloud sync (see Settings), this same code links both phones.'}
        </Muted>
      </Reveal>

      <Reveal delay={390}>
        <Button
          label="Begin our space"
          disabled={!valid}
          onPress={() =>
            createIdentity({
              name,
              partnerName,
              spaceId: code,
              anniversary: anniversary.trim() || undefined,
            })
          }
        />
        <View style={{ height: spacing.sm }} />
        <Muted style={{ textAlign: 'center' }}>
          Everything stays between you two. No feeds, no followers, no one else.
        </Muted>
        <Text style={styles.build}>Made just for us 🤍</Text>
      </Reveal>
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
});
