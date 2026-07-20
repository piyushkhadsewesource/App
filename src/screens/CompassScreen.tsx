// ─────────────────────────────────────────────────────────────────────────
// The Compass Rose — a needle that only knows one direction: them.
//
// Each partner shares a *city* (typed by hand, geocoded via Open-Meteo's free
// API — never live GPS, so it's a direction, not a tracker). From the two
// cities we compute the great-circle distance and initial bearing.
//
// The instrument is real: a graduated tick ring, an eight-point rose (rose
// points for the cardinals, violet for the intercardinals — the two of them,
// woven in), N/E/S/W with intercardinal letters, and a fixed lubber mark at
// the top of the bezel. When live heading is available the whole card rotates
// under the needle the way a real compass card does; without a sensor the
// card rests north-up and the needle still shows the true bearing.
//
// Heading (which way the phone itself is facing) is best-effort, tiered:
//   • Native + expo-sensors in the binary → live magnetometer heading.
//   • Web with deviceorientation events    → live browser heading.
//   • Neither                              → north-up card, honest bearing.
// The sensors module is loaded inside try/catch so binaries built before it
// was added degrade to north-up instead of crashing.
// ─────────────────────────────────────────────────────────────────────────
import { useIsFocused } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import LensView from '../components/LensView';
import { AppHeader, Body, Button, Card, Field, Muted, Screen } from '../components/ui';
import { useToast } from '../components/ToastHost';
import { hSuccess } from '../lib/haptics';
import { cardinal16, geocodeCity, haversineKm, initialBearingDeg, reverseGeocode } from '../lib/geo';
import { useHeading } from '../lib/useHeading';
import { useApp } from '../state/AppContext';
import { colors, font, radius, shadow, spacing } from '../theme';
import { spring } from '../theme/motion';

// One quiet line engraved under the instrument; rotates daily, never randomly
// mid-visit. Where a line uses a number, it's the real one — honest data only.
const LINES: ReadonlyArray<(km: number) => string> = [
  (km) => `Every one of those ${km.toLocaleString()} kilometres is temporary.`,
  () => 'Same sky. Same story. Different chairs.',
  (km) => `On foot: about ${Math.max(1, Math.round(km / 40)).toLocaleString()} days. They'd meet you halfway.`,
  () => 'The needle never wavers. Neither do you two.',
  (km) => `Light crosses it in ${(km / 299_792).toFixed(km > 3000 ? 2 : 3)} seconds. So does a goodnight.`,
  (km) => `${Math.round(km * 1312).toLocaleString()} steps. You're already walking each other home.`,
];

/** Shortest signed turn from one angle to another, safe for unwrapped values
 *  (plain `% 360` goes negative in JS and would whip the needle a full turn). */
const shortestDelta = (from: number, to: number) => ((((to - from) % 360) + 540) % 360) - 180;

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
  // "Moved?" editing is tucked behind a quiet link once you're on the map.
  const [editing, setEditing] = useState(false);

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
      setEditing(false);
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
      setEditing(false);
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
  const live = heading != null;

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

  // ── The instrument's two rotations, both spring-tracked and unwrapped so
  //    neither ever whips the long way round when crossing north. ──────────
  // The needle springs toward (bearing − heading)…
  const needleAngle = useRef(new Animated.Value(0)).current;
  const needleLast = useRef(0);
  useEffect(() => {
    if (!ready) return;
    const target = (bearing - (heading ?? 0) + 360) % 360;
    const next = needleLast.current + shortestDelta(needleLast.current, target);
    needleLast.current = next;
    Animated.spring(needleAngle, { toValue: next, useNativeDriver: true, ...spring.gentle }).start();
  }, [bearing, heading, ready, needleAngle]);
  const needleRotate = needleAngle.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] });

  // …and the card rotates by −heading, like a real compass card under glass.
  const cardAngle = useRef(new Animated.Value(0)).current;
  const cardLast = useRef(0);
  useEffect(() => {
    if (!ready) return;
    const target = live ? -(heading as number) : 0;
    const next = cardLast.current + shortestDelta(cardLast.current, target);
    cardLast.current = next;
    Animated.spring(cardAngle, { toValue: next, useNativeDriver: true, ...spring.gentle }).start();
  }, [heading, live, ready, cardAngle]);
  const cardRotate = cardAngle.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] });

  const line = LINES[Math.floor(Date.now() / 86_400_000) % LINES.length](km);

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
                {/* The rotating card: ticks, rose, letters — one instrument. */}
                <Animated.View style={[styles.compassCard, { transform: [{ rotate: cardRotate }] }]}>
                  <RoseStar />
                  <TickRing />
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
                  {INTERCARDINALS.map(([c, sx, sy]) => (
                    <Text
                      key={c}
                      style={[styles.intercardinal, { transform: [{ translateX: sx * IC_OFF }, { translateY: sy * IC_OFF }] }]}
                    >
                      {c}
                    </Text>
                  ))}
                </Animated.View>

                {together ? (
                  <Text style={styles.togetherMark}>🤍</Text>
                ) : (
                  <Animated.View style={[styles.needleWrap, { transform: [{ rotate: needleRotate }] }]}>
                    <View style={styles.needleNorth} />
                    <View style={styles.needleSpine} />
                    <View style={styles.needleSouth} />
                    <View style={styles.needleWeight} />
                  </Animated.View>
                )}
                {/* The hub holds the heart — every direction starts from it. */}
                <View style={[styles.hub, shadow.soft]}>
                  <Text style={styles.hubHeart}>🤍</Text>
                </View>
              </View>
              {/* Lubber mark: fixed to the bezel, it's the top of YOUR phone. */}
              <View style={styles.lubber} />
            </View>

            <Text style={styles.km}>{together ? '0 km' : `${km.toLocaleString()} km`}</Text>
            <Text style={styles.kmSub}>
              {together ? 'Look up.' : `to ${partner} · ${cardinal16(bearing)} · ${Math.round(bearing)}°`}
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

            {!together ? <Text style={styles.engraving}>{line}</Text> : null}
          </View>

          {!together ? (
            <>
              <View style={{ height: spacing.md }} />
              <Button label="True North · open the lens" icon="📷" onPress={() => setLensOpen(true)} />
            </>
          ) : null}

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
          <Pressable
            onPress={() => setEditing((e) => !e)}
            accessibilityRole="button"
            accessibilityLabel={editing ? 'Close location update' : 'Update where you are'}
            hitSlop={8}
            style={styles.routeRow}
          >
            <Text style={styles.routeText} numberOfLines={1}>
              {theirs ? `${my.name} → ${theirs.name}` : my.name}
            </Text>
            <Text style={styles.routeLink}>{editing ? 'Done' : 'Moved? Update'}</Text>
          </Pressable>
          {editing ? (
            <Card>
              <Button label={locating ? 'Finding you…' : '📍 Use my current location'} variant="soft" disabled={locating} onPress={useMyLocation} />
              <View style={{ height: spacing.sm }} />
              <Field value={city} onChangeText={setCity} placeholder={my.name} autoCapitalize="words" />
              <Button label={searching ? 'Finding it…' : 'Update my city'} variant="ghost" disabled={!city.trim() || searching} onPress={shareCity} />
            </Card>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

const DIAL = 248;
const HALO = DIAL + 48; // outermost decorative ring
const IC_OFF = Math.round((DIAL / 2 - 30) * Math.SQRT1_2); // intercardinal radius

const INTERCARDINALS: ReadonlyArray<readonly [string, number, number]> = [
  ['NE', 1, -1],
  ['SE', 1, 1],
  ['SW', -1, 1],
  ['NW', -1, -1],
];

/** The graduated ring: a tick every 6°, a heavier one every 30°. Static. */
function TickRing() {
  return (
    <>
      {Array.from({ length: 60 }, (_, i) => {
        const major = i % 5 === 0;
        return (
          <View
            key={i}
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { alignItems: 'center', transform: [{ rotate: `${i * 6}deg` }] }]}
          >
            <View
              style={{
                marginTop: 6,
                width: major ? 2 : 1,
                height: major ? 10 : 5,
                borderRadius: 1,
                backgroundColor: major ? colors.textSoft : 'rgba(168,159,155,0.55)',
              }}
            />
          </View>
        );
      })}
    </>
  );
}

/** The rose itself: eight points radiating from the hub — rose-tinted for the
 *  cardinals, violet for the intercardinals. The two of them, woven in. */
function RoseStar() {
  const long = Math.round(DIAL * 0.36);
  const short = Math.round(DIAL * 0.24);
  return (
    <>
      {Array.from({ length: 8 }, (_, i) => {
        const cardinalPt = i % 2 === 0;
        const len = cardinalPt ? long : short;
        return (
          <View
            key={i}
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { alignItems: 'center', transform: [{ rotate: `${i * 45}deg` }] }]}
          >
            <View
              style={{
                position: 'absolute',
                top: DIAL / 2 - len,
                width: 0,
                height: 0,
                borderLeftWidth: cardinalPt ? 7 : 5,
                borderRightWidth: cardinalPt ? 7 : 5,
                borderBottomWidth: len,
                borderLeftColor: 'transparent',
                borderRightColor: 'transparent',
                borderBottomColor: cardinalPt ? 'rgba(232,99,140,0.14)' : 'rgba(124,107,214,0.10)',
              }}
            />
          </View>
        );
      })}
    </>
  );
}

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
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compassCard: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialInnerRing: {
    position: 'absolute',
    width: DIAL - 40,
    height: DIAL - 40,
    borderRadius: (DIAL - 40) / 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(168,159,155,0.45)',
  },
  cardinal: {
    position: 'absolute',
    fontFamily: font.family.displaySemi,
    fontSize: font.size.md,
    color: colors.textSoft,
  },
  cardN: { top: 19, alignSelf: 'center', color: colors.primary },
  cardE: { right: 21, top: DIAL / 2 - 10 },
  cardS: { bottom: 19, alignSelf: 'center' },
  cardW: { left: 21, top: DIAL / 2 - 10 },
  intercardinal: {
    position: 'absolute',
    fontFamily: font.family.semibold,
    fontSize: 10,
    letterSpacing: font.tracking.caps,
    color: colors.textFaint,
  },
  lubber: {
    position: 'absolute',
    top: (HALO - DIAL) / 2 - 1,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'rgba(90,46,64,0.55)',
    zIndex: 3,
  },
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
    height: DIAL - 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  needleNorth: {
    position: 'absolute',
    top: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 4.5,
    borderRightWidth: 4.5,
    borderBottomWidth: (DIAL - 72) / 2,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: colors.primary,
  },
  needleSpine: {
    position: 'absolute',
    top: 10,
    width: 1.5,
    height: (DIAL - 72) / 2 - 14,
    backgroundColor: 'rgba(199,65,107,0.55)',
  },
  needleSouth: {
    position: 'absolute',
    bottom: 4,
    width: 3,
    height: (DIAL - 72) / 2 - 10,
    borderRadius: 2,
    backgroundColor: 'rgba(90,46,64,0.25)',
  },
  needleWeight: {
    position: 'absolute',
    bottom: 0,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: 'rgba(90,46,64,0.4)',
  },
  togetherMark: { fontSize: 44 },
  km: {
    marginTop: spacing.lg,
    fontFamily: font.family.display,
    fontSize: font.size.huge,
    lineHeight: 44,
    color: colors.text,
    letterSpacing: font.tracking.display,
    textAlign: 'center',
  },
  kmSub: {
    marginTop: 2,
    fontFamily: font.family.medium,
    fontSize: font.size.sm,
    color: colors.textSoft,
    letterSpacing: font.tracking.label,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  engraving: {
    marginTop: spacing.lg,
    fontFamily: font.family.body,
    fontStyle: 'italic',
    fontSize: font.size.sm,
    lineHeight: 20,
    color: colors.textSoft,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  routeText: {
    flexShrink: 1,
    fontFamily: font.family.body,
    fontSize: font.size.sm,
    color: colors.textSoft,
    letterSpacing: font.tracking.label,
  },
  routeLink: {
    fontFamily: font.family.semibold,
    fontSize: font.size.sm,
    color: colors.primaryDark,
  },
});
