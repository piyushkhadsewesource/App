// ─────────────────────────────────────────────────────────────────────────
// Reusable motion primitives. These wrap existing behaviour only: a Press still
// fires the same onPress, a Reveal renders the same children. Nothing about the
// app's logic changes, it just arrives with a buttery spring.
// ─────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef } from 'react';
import { Animated, GestureResponderEvent, Pressable, StyleProp, ViewStyle, AccessibilityRole } from 'react-native';
import { hLight } from '../lib/haptics';
import { duration, easeOut, spring } from '../theme/motion';

/**
 * A tappable that springs down on press-in and back on release, for a tactile,
 * physical feel. Haptics are opt-in (default off) so we never double-buzz the
 * handlers that already fire their own haptics.
 */
export function Press({
  children,
  onPress,
  style,
  scaleTo = 0.96,
  haptic = false,
  disabled,
  hitSlop,
  accessibilityRole,
  accessibilityLabel,
}: {
  children: React.ReactNode;
  onPress?: (e: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  haptic?: boolean;
  disabled?: boolean;
  hitSlop?: number;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v: number) => Animated.spring(scale, { toValue: v, useNativeDriver: true, ...spring.snappy }).start();
  return (
    <Pressable
      disabled={disabled}
      hitSlop={hitSlop}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      onPressIn={() => !disabled && to(scaleTo)}
      onPressOut={() => to(1)}
      onPress={(e) => {
        if (disabled) return;
        if (haptic) hLight();
        onPress?.(e);
      }}
    >
      <Animated.View style={[{ transform: [{ scale }] }, style]}>{children}</Animated.View>
    </Pressable>
  );
}

/**
 * Fades and lifts its children into place on mount. Pass an increasing `delay`
 * to a list of these for a staggered cascade (e.g. an activity feed).
 */
export function Reveal({
  children,
  delay = 0,
  distance = 14,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  distance?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const id = setTimeout(() => {
      Animated.timing(v, { toValue: 1, duration: duration.base, easing: easeOut, useNativeDriver: true }).start();
    }, delay);
    return () => clearTimeout(id);
  }, [v, delay]);
  return (
    <Animated.View
      style={[
        { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }] },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}
