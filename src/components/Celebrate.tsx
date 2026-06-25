// ─────────────────────────────────────────────────────────────────────────
// A gentle shower of petals and hearts for the moments worth celebrating: a
// cleared grievance, a game won. Pass play; on its false -> true edge a batch
// rains down and fades, then cleans itself up. Non-interactive overlay.
// ─────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';

const EMOJIS = ['💗', '🌸', '✨', '🎉', '💞', '⭐️'];

type Particle = {
  id: number;
  emoji: string;
  left: number;
  drift: number;
  rot: number;
  size: number;
  v: Animated.Value;
};

export function Celebrate({ play }: { play?: boolean }) {
  const [parts, setParts] = useState<Particle[]>([]);
  const idRef = useRef(0);
  const prev = useRef(!!play);
  // Guard so a particle's finish-callback can't setState after unmount (e.g. if
  // you navigate away mid-celebration).
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  const fire = () => {
    const batch: Particle[] = Array.from({ length: 18 }).map(() => {
      const v = new Animated.Value(0);
      const id = idRef.current++;
      const duration = 1500 + Math.random() * 1100;
      Animated.timing(v, { toValue: 1, duration, useNativeDriver: true }).start(({ finished }) => {
        if (finished && mounted.current) setParts((ps) => ps.filter((x) => x.id !== id));
      });
      return {
        id,
        emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
        left: Math.random() * 100,
        drift: (Math.random() - 0.5) * 120,
        rot: (Math.random() - 0.5) * 360,
        size: 20 + Math.random() * 16,
        v,
      };
    });
    setParts((ps) => [...ps, ...batch]);
  };

  useEffect(() => {
    if (play && !prev.current) fire();
    prev.current = !!play;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play]);

  if (parts.length === 0) return null;
  const H = Dimensions.get('window').height;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {parts.map((p) => (
        <Animated.Text
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            top: -40,
            fontSize: p.size,
            opacity: p.v.interpolate({ inputRange: [0, 0.1, 0.85, 1], outputRange: [0, 1, 1, 0] }),
            transform: [
              { translateY: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, H + 80] }) },
              { translateX: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, p.drift] }) },
              { rotate: p.v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.rot}deg`] }) },
            ],
          }}
        >
          {p.emoji}
        </Animated.Text>
      ))}
    </View>
  );
}
