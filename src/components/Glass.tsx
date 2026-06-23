// ─────────────────────────────────────────────────────────────────────────
// A frosted-glass surface. Real platform blur on iOS/Android and web
// backdrop-filter, with a soft translucent tint layered on top so content
// stays legible even where the blur is weak or unsupported.
// ─────────────────────────────────────────────────────────────────────────
import { BlurView } from 'expo-blur';
import React, { ReactNode } from 'react';
import { LayoutChangeEvent, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

export function Glass({
  children,
  style,
  intensity = 32,
  tint = 'light',
  overlay = 'rgba(251,248,246,0.6)',
  onLayout,
}: {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  overlay?: string;
  onLayout?: (e: LayoutChangeEvent) => void;
}) {
  return (
    <BlurView intensity={intensity} tint={tint} style={style} onLayout={onLayout}>
      {overlay ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: overlay }]} /> : null}
      {children}
    </BlurView>
  );
}
