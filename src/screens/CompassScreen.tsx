// ─────────────────────────────────────────────────────────────────────────
// The Compass Rose — a needle that only knows one direction: them.
//
// Each partner shares a *city* (typed by hand, geocoded via Open-Meteo's free
// API — never live GPS, so it's a direction, not a tracker). From the two
// cities we compute the great-circle distance and initial bearing; the needle
// swings there with spring inertia.
//
// Heading (which way the phone itself is facing) is best-effort, tiered:
//   • Native + expo-sensors in the binary → live magnetometer heading.
//   • Web with deviceorientation events    → live browser heading.
//   • Neither                              → the dial is fixed north-up and the
//     needle still shows the true bearing ("relative to north").
// The sensors module is loaded inside try/catch so binaries built before it
// was added degrade to north-up instead of crashing.
// ─────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { AppHeader, Body, Button, Card, Field, Muted, Screen } from '../components/ui';
import { useToast } from '../components/ToastHost';
import { hSuccess } from '../lib/haptics';
import { geocodeCity, haversineKm, initialBearingDeg } from '../lib/geo';
import { useApp } from '../state/AppContext';
import { colors, font, radius, shadow, spacing } from '../theme';
import { spring } from '../theme/motion';

// One quiet line under the instrument; rotates daily, never randomly mid-visit.
const LINES = [
  'Every kilometre of it is temporary.',
  'Same sky. Same story. Different chairs.',
  'If you started walking now, they’d meet you halfway.',
  'The needle never wavers. Neither do you two.',
  'Distance is just geography being dramatic.',
];

export default function CompassScreen({ navigation }: any) {
  const app = useApp();
  const partner = app.identity?.partnerName ?? 'them';
  const toast = useToast();

  // ── City setup ───────────────────────────────────────────────────────────
  const [city, setCity] = useState('');
  const [searching, setSearching] = useState(false);
  async function shareCity() {
    const q = city.trim();
    if (!q || searching) return;
    setSearching(true);
    const hit = await geocodeCity(q);
    if (!hit) {
      setSearching(false);
      toast.show("Couldn't find that city — try 'City, Country'", 2600);
      return;
    }
    const ok = await app.savePlace(hit);
    setSearching(false);
    if (ok) {
      hSuccess();
      setCity('');
      toast.show(`You're on the map: ${hit.name} 🤍`, 2600);
    } else {
      toast.show("Couldn't save — check your connection and try again", 2400);
    }
  }

  // ── Bearing + distance (needs both cities) ───────────────────────────────
  const my = app.myPlace;
  const theirs = app.partnerPlace;
  const ready = !!my && !!theirs;
  const km = ready ? Math.round(haversineKm(my!.lat, my!.lon, theirs!.lat, theirs!.lon)) : 0;
  const bearing = ready ? initialBearingDeg(my!.lat, my!.lon, theirs!.lat, theirs!.lon) : 0;
  const together = ready && km < 25; // same city (roughly) — the day the needle rests

  // ── Device heading (tiered, best-effort) ─────────────────────────────────
  const [heading, setHeading] = useState<number | null>(null);
  useEffect(() => {
    let cleanup: (() => void) | null = null;
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && 'ondeviceorientation' in window) {
        const onOrient = (e: any) => {
          // iOS Safari exposes webkitCompassHeading; others give alpha (inverted).
          const h =
            typeof e.webkitCompassHeading === 'number'
              ? e.webkitCompassHeading
              : e.absolute && typeof e.alpha === 'number'
                ? 360 - e.alpha
                : null;
          if (h != null && Number.isFinite(h)) setHeading(h);
        };
        window.addEventListener('deviceorientation', onOrient);
        cleanup = () => window.removeEventListener('deviceorientation', onOrient);
      }
    } else {
      try {
        // Guarded: a binary built before expo-sensors was added simply won't
        // have the native module — fall back to north-up instead of crashing.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { Magnetometer } = require('expo-sensors');
        Magnetometer.setUpdateInterval(250);
        const sub = Magnetometer.addListener((d: { x: number; y: number }) => {
          if (typeof d?.x !== 'number' || typeof d?.y !== 'number') return;
          // Flat-held approximation; plenty for a poetic needle.
          let h = Math.atan2(d.y, d.x) * (180 / Math.PI);
          h = (90 - h + 360) % 360;
          setHeading(h);
        });
        cleanup = () => sub?.remove();
      } catch {
        /* module not in this binary yet — north-up dial */
      }
    }
    return () => cleanup?.();
  }, []);

  // ── The needle: springs toward (bearing − heading), unwrapped so it never
  //    whips the long way round when crossing north. ───────────────────────
  const angle = useRef(new Animated.Value(0)).current;
  const lastRef = useRef(0);
  useEffect(() => {
    if (!ready) return;
    const target = (bearing - (heading ?? 0) + 360) % 360;
    const delta = ((target - lastRef.current + 540) % 360) - 180;
    const next = lastRef.current + delta;
    lastRef.current = next;
    Animated.spring(angle, { toValue: next, useNativeDriver: true, ...spring.gentle }).start();
  }, [bearing, heading, ready, angle]);
  const rotate = angle.interpolate({ inputRange: [-3600, 3600], outputRange: ['-3600deg', '3600deg'] });

  const line = LINES[Math.floor(Date.now() / 86_400_000) % LINES.length];
  const live = heading != null;

  return (
    <Screen scroll>
      <AppHeader title="The Compass Rose" subtitle={`One direction: ${partner}`} onBack={() => navigation.goBack()} />

      {!my ? (
        <Card tone="violet">
          <Body style={{ fontFamily: font.family.semibold }}>Put yourself on the map</Body>
          <Muted style={{ marginTop: 4, marginBottom: spacing.md }}>
            Share your city — just the city, never your location — and the needle knows where home is.
          </Muted>
          <Field value={city} onChangeText={setCity} placeholder="e.g. Mumbai" autoCapitalize="words" />
          <Button label={searching ? 'Finding it…' : 'Share my city'} disabled={!city.trim() || searching} onPress={shareCity} />
        </Card>
      ) : !theirs ? (
        <Card tone="rose">
          <Body style={{ fontFamily: font.family.semibold }}>Waiting for {partner}</Body>
          <Muted style={{ marginTop: 4 }}>
            You're on the map ({my.name}). The needle wakes the moment {partner} shares their city too. 🤍
          </Muted>
        </Card>
      ) : (
        <>
          {/* The instrument */}
          <View style={styles.dialWrap}>
            <View style={styles.dial}>
              {(['N', 'E', 'S', 'W'] as const).map((c, i) => (
                <Text
                  key={c}
                  style={[
                    styles.cardinal,
                    i === 0 && styles.cardN,
                    i === 1 && styles.cardE,
                    i === 2 && styles.cardS,
                    i === 3 && styles.cardW,
                  ]}
                >
                  {c}
                </Text>
              ))}
              <View style={styles.hub} />
              {together ? (
                <Text style={styles.togetherMark}>🤍</Text>
              ) : (
                <Animated.View style={[styles.needleWrap, { transform: [{ rotate }] }]}>
                  <View style={styles.needleNorth} />
                  <View style={styles.needleSouth} />
                </Animated.View>
              )}
            </View>

            <Text style={styles.reading}>
              {together ? '0 km. Look up.' : `${partner} · ${km.toLocaleString()} km · that way`}
            </Text>
            <Muted style={{ textAlign: 'center', marginTop: spacing.xs }}>
              {together ? `Same city: ${theirs.name}` : live ? 'live needle — turn, and it holds true' : 'relative to north (hold your phone flat, top facing north)'}
            </Muted>
          </View>

          <Card tone="surface" style={{ marginTop: spacing.lg }}>
            <Body style={{ fontStyle: 'italic', textAlign: 'center' }}>{line}</Body>
          </Card>

          <Muted style={{ marginTop: spacing.lg, textAlign: 'center' }}>
            {my.name} → {theirs.name}
          </Muted>
        </>
      )}

      {my ? (
        <>
          <View style={{ height: spacing.lg }} />
          <Card>
            <Muted>Moved? Share a new city any time.</Muted>
            <View style={{ height: spacing.sm }} />
            <Field value={city} onChangeText={setCity} placeholder={my.name} autoCapitalize="words" />
            <Button label={searching ? 'Finding it…' : 'Update my city'} variant="soft" disabled={!city.trim() || searching} onPress={shareCity} />
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const DIAL = 240;

const styles = StyleSheet.create({
  dialWrap: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    ...shadow.card,
  },
  dial: {
    width: DIAL,
    height: DIAL,
    borderRadius: DIAL / 2,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: '#FBF6F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardinal: {
    position: 'absolute',
    fontFamily: font.family.displaySemi,
    fontSize: font.size.md,
    color: colors.textFaint,
  },
  cardN: { top: 10, alignSelf: 'center', color: colors.textSoft },
  cardE: { right: 12, top: DIAL / 2 - 10 },
  cardS: { bottom: 10, alignSelf: 'center' },
  cardW: { left: 12, top: DIAL / 2 - 10 },
  hub: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.text,
    zIndex: 2,
  },
  needleWrap: {
    position: 'absolute',
    width: 4,
    height: DIAL - 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  needleNorth: {
    position: 'absolute',
    top: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: (DIAL - 64) / 2,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: colors.primary,
  },
  needleSouth: {
    position: 'absolute',
    bottom: 0,
    width: 3,
    height: (DIAL - 64) / 2 - 6,
    borderRadius: 2,
    backgroundColor: 'rgba(90,46,64,0.25)',
  },
  togetherMark: { fontSize: 44 },
  reading: {
    marginTop: spacing.lg,
    fontFamily: font.family.displaySemi,
    fontSize: font.size.xl,
    color: colors.text,
    letterSpacing: font.tracking.heading,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
});
