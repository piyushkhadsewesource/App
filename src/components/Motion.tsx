// ─────────────────────────────────────────────────────────────────────────
// Reusable motion primitives. These wrap existing behaviour only: a Press still
// fires the same onPress, a Reveal renders the same children. Nothing about the
// app's logic changes, it just arrives with a buttery spring.
// ─────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef } from 'react';
import { Animated, GestureResponderEvent, PanResponder, Pressable, StyleProp, ViewStyle, AccessibilityRole } from 'react-native';
import { hLight } from '../lib/haptics';
import { duration, easeOut, prefersReducedMotion, spring } from '../theme/motion';

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
  // One driver for both transforms keeps them exactly in sync: 0 = at rest,
  // 1 = fully pressed. Scale alone reads as a zoom; scale plus a ~1.5px sink
  // reads as pressing INTO the surface, which is what makes a tap feel physical.
  const p = useRef(new Animated.Value(0)).current;
  const scale = p.interpolate({ inputRange: [0, 1], outputRange: [1, scaleTo] });
  const sink = p.interpolate({ inputRange: [0, 1], outputRange: [0, 1.5] });
  const to = (v: number) => Animated.spring(p, { toValue: v, useNativeDriver: true, ...spring.snappy }).start();
  return (
    <Pressable
      disabled={disabled}
      hitSlop={hitSlop}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      onPressIn={() => !disabled && to(1)}
      onPressOut={() => to(0)}
      onPress={(e) => {
        if (disabled) return;
        if (haptic) hLight();
        onPress?.(e);
      }}
    >
      <Animated.View style={[{ transform: [{ scale }, { translateY: sink }] }, style]}>{children}</Animated.View>
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
  // Reduced motion: keep the meaning (a fade), drop the movement and stagger.
  const reduce = prefersReducedMotion();
  useEffect(() => {
    const id = setTimeout(
      () => {
        Animated.timing(v, {
          toValue: 1,
          duration: reduce ? duration.fast : duration.base,
          easing: easeOut,
          useNativeDriver: true,
        }).start();
      },
      reduce ? 0 : delay,
    );
    return () => clearTimeout(id);
  }, [v, delay, reduce]);
  const lift = reduce ? 0 : distance;
  return (
    <Animated.View
      style={[
        { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [lift, 0] }) }] },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

/**
 * Swipe-to-dismiss wrapper (whispers, quiet cards). Follows the finger
 * horizontally; a flick past ~0.11 px/ms OR a drag past 80px dismisses, else
 * it springs home. Taps pass through untouched, so children stay pressable.
 */
export function SwipeAway({
  children,
  onDismiss,
  style,
}: {
  children: React.ReactNode;
  onDismiss: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const x = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const done = useRef(false);
  const dismiss = (dir: 1 | -1) => {
    if (done.current) return;
    done.current = true;
    hLight();
    Animated.parallel([
      Animated.timing(x, { toValue: dir * 400, duration: duration.fast, easing: easeOut, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 0, duration: duration.fast, easing: easeOut, useNativeDriver: true }),
    ]).start(() => onDismiss());
  };
  const responder = useRef(
    PanResponder.create({
      // Claim the gesture only once it's clearly horizontal, so taps and
      // vertical scrolls keep working.
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderMove: (_e, g) => x.setValue(g.dx),
      onPanResponderRelease: (_e, g) => {
        const flick = Math.abs(g.vx) > 0.11 && Math.abs(g.dx) > 24;
        if (flick || Math.abs(g.dx) > 80) dismiss(g.dx >= 0 ? 1 : -1);
        else Animated.spring(x, { toValue: 0, useNativeDriver: true, ...spring.snappy }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(x, { toValue: 0, useNativeDriver: true, ...spring.snappy }).start();
      },
    }),
  ).current;
  return (
    <Animated.View {...responder.panHandlers} style={[{ opacity: fade, transform: [{ translateX: x }] }, style]}>
      {children}
    </Animated.View>
  );
}
