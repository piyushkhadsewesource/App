// ─────────────────────────────────────────────────────────────────────────
// A number that rolls when it changes: the old value slides up and fades out
// as the new one slides in from below, like a flip-clock / odometer. Used for
// the live reunion countdown so the seconds tick with a buttery roll.
// ─────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleProp, TextStyle, View } from 'react-native';
import { easeOut } from '../theme/motion';

export function RollingNumber({
  value,
  style,
  height = 42,
}: {
  value: number;
  style?: StyleProp<TextStyle>;
  height?: number;
}) {
  const v = useRef(new Animated.Value(1)).current;
  const prev = useRef(value);
  const [pair, setPair] = useState<[number, number]>([value, value]);

  useEffect(() => {
    if (value === prev.current) return;
    const from = prev.current;
    prev.current = value;
    setPair([from, value]);
    v.setValue(0);
    Animated.timing(v, { toValue: 1, duration: 300, easing: easeOut, useNativeDriver: true }).start(({ finished }) => {
      if (finished) setPair([value, value]); // settle: only the new value remains
    });
  }, [value, v]);

  const [from, to] = pair;
  const rolling = from !== to;
  // Each digit fills the row and is centred, so the container keeps a real size
  // (it spans its parent) and the values never collapse or clip.
  const fill: TextStyle = { position: 'absolute', left: 0, right: 0, top: 0, height, lineHeight: height, textAlign: 'center' };

  return (
    <View style={{ height, alignSelf: 'stretch', overflow: 'hidden' }}>
      {rolling ? (
        <Animated.Text
          style={[
            style,
            fill,
            {
              opacity: v.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
              transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -height] }) }],
            },
          ]}
        >
          {from}
        </Animated.Text>
      ) : null}
      <Animated.Text
        style={[
          style,
          fill,
          {
            opacity: rolling ? v : 1,
            transform: [{ translateY: rolling ? v.interpolate({ inputRange: [0, 1], outputRange: [height, 0] }) : 0 }],
          },
        ]}
      >
        {to}
      </Animated.Text>
    </View>
  );
}
