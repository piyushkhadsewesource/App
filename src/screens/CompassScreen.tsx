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
import { useIsFocused } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import LensView from '../components/LensView';
import { AppHeader, Body, Button, Card, Field, Muted, Screen } from '../components/ui';
import { useToast } from '../components/ToastHost';
import { hSuccess } from '../lib/haptics';
import { geocodeCity, haversineKm, initialBearingDeg, reverseGeocode } from '../lib/geo';
import { useHeading } from '../lib/useHeading';
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

  // ── Location setup ───────────────────────────────────────────────────────
  // Primary: one tap on "use my current location" (browser geolocation on web;
  // expo-location on native, guarded for binaries that predate it). Fallback:
  // type a city. Either way only a point + a city-level label is shared.
  const [city, setCity] = useState('');
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);

  async function useMyLocation() {
    if (locating) return;
    setLocating(true);
    // Watchdog: geolocation's own timeout only starts AFTER the permission
    // prompt is answered — a user who ignores the prompt would otherwise leave
    // the button stuck on "Finding you…" forever. 15s and we give up cleanly.
    const acquire = async (): Promise<{ lat: number; lon: number } | null> => {
      if (Platform.OS === 'web') {
        return new Promise((resolve) => {
          if (typeof navigator === 'undefined' || !navigator.geolocation) return resolve(null);
          navigator.geolocation.getCurrentPosition(
            (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
            () => resolve(null),
            { timeout: 12000, maximumAge: 60000 },
          );
        });
      }
      try {
        // Guarded: binaries built before expo-location was added fall through
        // to the typed-city path instead of crashing.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Loc = require('expo-location');
        const perm = await Loc.requestForegroundPermissionsAsync();
        if (perm?.granted) {
          const p = await Loc.getCurrentPositionAsync({ accuracy: Loc.Accuracy.Balanced });
          return { lat: p.coords.latitude, lon: p.coords.longitude };
        }
      } catch {
        /* module unavailable in this binary */
      }
      return null;
    };
    const coords = await Promise.race([
      acquire(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 15_000)),
    ]);
    if (!coords) {
      setLocating(false);
      toast.show("Couldn't get your location. Type your city below instead", 2800);
      return;
    }
    const name = (await reverseGeocode(coords.lat, coords.lon)) ?? 'Where I am';
    const ok = await app.savePlace({ name, lat: coords.lat, lon: coords.lon });
    setLocating(false);
    if (ok) {
      hSuccess();
      toast.show(`You're on the map: ${name} 🤍`, 2600);
    } else {
      toast.show("Couldn't save. Check your connection and try again", 2400);
    }
  }

  async function shareCity() {
    const q = city.trim();
    if (!q || searching) return;
    setSearching(true);
    const hit = await geocodeCity(q);
    if (!hit) {
      setSearching(false);
      toast.show("Couldn't find that city. Try 'City, Country'", 2600);
      return;
    }
    const ok = await app.savePlace(hit);
    setSearching(false);
    if (ok) {
      hSuccess();
      setCity('');
      toast.show(`You're on the map: ${hit.name} 🤍`, 2600);
    } else {
      toast.show("Couldn't save. Check your connection and try again", 2400);
    }
  }

  // ── Bearing + distance (needs both cities) ───────────────────────────────
  const my = app.myPlace;
  const theirs = app.partnerPlace;
  const ready = !!my && !!theirs;
  const km = ready ? Math.round(haversineKm(my!.lat, my!.lon, theirs!.lat, theirs!.lon)) : 0;
  const bearing = ready ? initialBearingDeg(my!.lat, my!.lon, theirs!.lat, theirs!.lon) : 0;
  const together = ready && km < 25; // same city (roughly) — the day the needle rests

  // ── Device heading (tiered, best-effort; shared with the Lens) ──────────
  // Gate the magnetometer on focus: when the lens (or any screen) is pushed on
  // top, or you navigate away, the sensor stops rather than draining in the
  // background. The lens runs its own heading while open.
  const [lensOpen, setLensOpen] = useState(false);
  const focused = useIsFocused();
  const heading = useHeading(focused && !lensOpen);

  // Active-presence location model: refresh my pin ONCE per visit to this
  // screen — never a background watcher, never on other screens — and only
  // when permission is already granted and the pin is stale (>10 min). One
  // GPS read + at most one Firestore write per visit: negligible battery and
  // quota, but the needle stays honest if either of you has moved.
  useEffect(() => {
    if (Platform.OS === 'web') return; // web keeps the explicit-tap model
    let cancelled = false;
    (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Loc = require('expo-location');
        const perm = await Loc.getForegroundPermissionsAsync(); // never prompts
        if (!perm?.granted || cancelled) return;
        const mine = app.myPlace;
        if (mine && Date.now() - mine.updatedAt < 10 * 60 * 1000) return; // fresh enough
        const p = await Loc.getCurrentPositionAsync({ accuracy: Loc.Accuracy.Balanced });
        if (cancelled) return;
        const label = (await reverseGeocode(p.coords.latitude, p.coords.longitude)) ?? mine?.name ?? 'Where I am';
        if (cancelled) return;
        void app.savePlace({ name: label, lat: p.coords.latitude, lon: p.coords.longitude });
      } catch {
        /* module unavailable or GPS failed — the last pin stands */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            One tap and the needle knows where home is. Your spot stays between the two of you.
          </Muted>
          <Button label={locating ? 'Finding you…' : '📍 Use my current location'} disabled={locating} onPress={useMyLocation} />
          <View style={{ height: spacing.md }} />
          <Muted style={{ marginBottom: spacing.sm }}>Or type a city instead:</Muted>
          <Field value={city} onChangeText={setCity} placeholder="e.g. Mumbai" autoCapitalize="words" />
          <Button label={searching ? 'Finding it…' : 'Share this city'} variant="soft" disabled={!city.trim() || searching} onPress={shareCity} />
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
            {/* Halo rings: the instrument sits in still, concentric air. */}
            <View style={styles.haloArea}>
              <View style={styles.haloOuter} />
              <View style={styles.haloInner} />
              <View style={styles.dial}>
                <View style={styles.dialInnerRing} />
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
                {together ? (
                  <Text style={styles.togetherMark}>🤍</Text>
                ) : (
                  <Animated.View style={[styles.needleWrap, { transform: [{ rotate }] }]}>
                    <View style={styles.needleNorth} />
                    <View style={styles.needleSouth} />
                  </Animated.View>
                )}
                {/* The hub holds the heart — every direction starts from it. */}
                <View style={[styles.hub, shadow.soft]}>
                  <Text style={styles.hubHeart}>🤍</Text>
                </View>
              </View>
            </View>

            <Text style={styles.reading}>
              {together ? '0 km. Look up.' : `${partner} · ${km.toLocaleString()} km · that way`}
            </Text>
            {together || live ? (
              <View style={styles.liveRow}>
                <View style={[styles.liveDot, { backgroundColor: together ? colors.primary : colors.good }]} />
                <Muted>{together ? `Same city: ${theirs.name}` : 'live needle. Turn, and it holds true'}</Muted>
              </View>
            ) : (
              <Muted style={{ textAlign: 'center', marginTop: spacing.xs, paddingHorizontal: spacing.lg }}>
                relative to north (hold your phone flat, top facing north)
              </Muted>
            )}
          </View>

          {!together ? (
            <>
              <View style={{ height: spacing.md }} />
              <Button label="True North · open the lens" icon="📷" onPress={() => setLensOpen(true)} />
            </>
          ) : null}

          <Card tone="surface" style={{ marginTop: spacing.lg }}>
            <Body style={{ fontStyle: 'italic', textAlign: 'center' }}>{line}</Body>
          </Card>

          <Muted style={{ marginTop: spacing.lg, textAlign: 'center' }}>
            {my.name} → {theirs.name}
          </Muted>

          <LensView
            visible={lensOpen}
            onClose={() => setLensOpen(false)}
            bearing={bearing}
            partnerName={partner}
            km={km}
            photo={app.partnerProfile?.image}
          />
        </>
      )}

      {my ? (
        <>
          <View style={{ height: spacing.lg }} />
          <Card>
            <Muted>Moved? Update where you are any time.</Muted>
            <View style={{ height: spacing.sm }} />
            <Button label={locating ? 'Finding you…' : '📍 Use my current location'} variant="soft" disabled={locating} onPress={useMyLocation} />
            <View style={{ height: spacing.sm }} />
            <Field value={city} onChangeText={setCity} placeholder={my.name} autoCapitalize="words" />
            <Button label={searching ? 'Finding it…' : 'Update my city'} variant="ghost" disabled={!city.trim() || searching} onPress={shareCity} />
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const DIAL = 240;
const HALO = DIAL + 48; // outermost decorative ring

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
  haloArea: {
    width: HALO,
    height: HALO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  haloOuter: {
    position: 'absolute',
    width: HALO,
    height: HALO,
    borderRadius: HALO / 2,
    borderWidth: 1,
    borderColor: 'rgba(232,99,140,0.07)',
  },
  haloInner: {
    position: 'absolute',
    width: DIAL + 24,
    height: DIAL + 24,
    borderRadius: (DIAL + 24) / 2,
    borderWidth: 1,
    borderColor: 'rgba(232,99,140,0.12)',
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
  dialInnerRing: {
    position: 'absolute',
    width: DIAL - 32,
    height: DIAL - 32,
    borderRadius: (DIAL - 32) / 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(168,159,155,0.45)',
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    borderWidth: 1.5,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  hubHeart: { fontSize: 17 },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
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
