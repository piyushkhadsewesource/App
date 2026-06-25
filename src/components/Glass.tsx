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
  pointerEvents,
}: {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  overlay?: string;
  onLayout?: (e: LayoutChangeEvent) => void;
  // Lets callers make the whole blur non-interactive. On Android an expo-blur
  // BlurView can swallow touches from its children, so any interactive content
  // should live as a sibling on top and the blur should be pointerEvents="none".
  pointerEvents?: 'auto' | 'none' | 'box-none' | 'box-only';
}) {
  return (
    <BlurView intensity={intensity} tint={tint} style={style} onLayout={onLayout} pointerEvents={pointerEvents}>
      {overlay ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: overlay }]} /> : null}
      {children}
    </BlurView>
  );
}
