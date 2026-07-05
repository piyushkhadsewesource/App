// ─────────────────────────────────────────────────────────────────────────
// JointAvatar — the two of you, interlocking. Sits in the Home header in place
// of a single initials bubble: two overlapping circles (a little Venn), each
// with a white rim so they read cleanly where they cross, lifted off the cream
// with a soft warm shadow.
//
// Fallback (photo not loaded / never set): the initial in Fraunces over the
// person's own warm gradient — never a bare system glyph.
//
// Motion (Emil): the whole thing is one Pressable that springs to 0.95 on
// press-in and bounces back on release. Built on Animated + the native driver
// (the app's motion system) rather than reanimated — same spring feel on the
// UI thread, no new native dependency / rebuild.
// ─────────────────────────────────────────────────────────────────────────
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font, gradients, shadow } from '../theme';
import { spring } from '../theme/motion';

const dataUri = (s?: string | null) => (s && s.startsWith('data:image/') ? s : undefined);
const initial = (name?: string) => (name?.trim()?.[0] ?? '?').toUpperCase();

function Face({
  name,
  uri,
  grad,
  size,
}: {
  name: string;
  uri?: string | null;
  grad: readonly [string, string];
  size: number;
}) {
  const src = dataUri(uri);
  return (
    <View style={[styles.rim, { width: size, height: size, borderRadius: size / 2, borderWidth: size * 0.06 }]}>
      {src ? (
        <Image
          source={{ uri: src }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={200}
          accessibilityLabel={name}
        />
      ) : (
        <LinearGradient colors={grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fallback}>
          <Text style={[styles.initial, { fontSize: size * 0.42 }]}>{initial(name)}</Text>
        </LinearGradient>
      )}
    </View>
  );
}

export default function JointAvatar({
  myName,
  partnerName,
  myUri,
  partnerUri,
  size = 40,
  onPress,
}: {
  myName: string;
  partnerName: string;
  myUri?: string | null;
  partnerUri?: string | null;
  size?: number;
  onPress?: () => void;
}) {
  // Overlap by ~38% of a face, so they cross like a Venn without hiding either.
  const overlap = size * 0.38;
  const width = size * 2 - overlap;
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v: number) =>
    Animated.spring(scale, { toValue: v, useNativeDriver: true, ...spring.snappy }).start();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => to(0.95)}
      onPressOut={() => to(1)}
      accessibilityRole="button"
      accessibilityLabel={`${myName} and ${partnerName}. Open settings.`}
      hitSlop={10}
    >
      <Animated.View style={[styles.row, { width, height: size, transform: [{ scale }] }, shadow.card]}>
        {/* Partner sits behind-left; you sit in front-right, closest to the edge. */}
        <Face name={partnerName} uri={partnerUri} grad={gradients.violet} size={size} />
        <View style={{ marginLeft: -overlap }}>
          <Face name={myName} uri={myUri} grad={gradients.primary} size={size} />
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    // The soft lift lives here; the white rims do the separating.
    borderRadius: 999,
  },
  rim: {
    borderColor: colors.surface, // clean white rim where the circles overlap
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  initial: { color: colors.white, fontFamily: font.family.display, letterSpacing: font.tracking.heading },
});
