// ─────────────────────────────────────────────────────────────────────────
// A gentle double-thump heartbeat loop, for presence indicators. When your
// partner has been active recently their pulse face quietly beats, so the app
// feels alive and connected even across the distance.
// ─────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, ViewStyle } from 'react-native';
import { prefersReducedMotion } from '../theme/motion';

export function Heartbeat({
  children,
  active = true,
  style,
}: {
  children: React.ReactNode;
  active?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active || prefersReducedMotion()) {
      v.setValue(0); // still, but present: colour and copy carry it
      return;
    }
    // lub-dub ... rest. Two quick thumps then a pause, like a real heartbeat.
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 130, useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(v, { toValue: 0.7, duration: 120, useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.delay(1150),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, v]);
  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });
  return <Animated.View style={[{ transform: [{ scale }] }, style]}>{children}</Animated.View>;
}
