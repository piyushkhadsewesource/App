// A smooth iOS-style scroll wheel column. Uncontrolled after mount; reports the
// centred index on settle, and re-centres when `resetKey` changes.
import React, { useEffect, useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, font, radius } from '../theme';

export const WHEEL_ITEM_H = 42;
const VISIBLE = 5;
const PAD = ((VISIBLE - 1) / 2) * WHEEL_ITEM_H;

export default function Wheel({
  data,
  initialIndex,
  onChange,
  resetKey,
  width = 70,
}: {
  data: string[];
  initialIndex: number;
  onChange: (i: number) => void;
  resetKey?: string | number;
  width?: number;
}) {
  const ref = useRef<ScrollView>(null);
  const idxRef = useRef(initialIndex);
  const [center, setCenter] = useState(initialIndex);

  useEffect(() => {
    idxRef.current = initialIndex;
    setCenter(initialIndex);
    const id = setTimeout(() => ref.current?.scrollTo({ y: initialIndex * WHEEL_ITEM_H, animated: false }), 0);
    return () => clearTimeout(id);
  }, [resetKey, initialIndex]);

  const clamp = (i: number) => Math.max(0, Math.min(data.length - 1, i));

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = clamp(Math.round(e.nativeEvent.contentOffset.y / WHEEL_ITEM_H));
    if (i !== center) setCenter(i);
  };

  const onEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = clamp(Math.round(e.nativeEvent.contentOffset.y / WHEEL_ITEM_H));
    ref.current?.scrollTo({ y: i * WHEEL_ITEM_H, animated: true });
    setCenter(i);
    if (i !== idxRef.current) {
      idxRef.current = i;
      onChange(i);
    }
  };

  return (
    <View style={[styles.wrap, { width, height: VISIBLE * WHEEL_ITEM_H }]}>
      <View pointerEvents="none" style={styles.band} />
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={WHEEL_ITEM_H}
        decelerationRate="fast"
        scrollEventThrottle={16}
        nestedScrollEnabled
        onScroll={onScroll}
        onMomentumScrollEnd={onEnd}
        contentContainerStyle={{ paddingVertical: PAD }}
      >
        {data.map((d, i) => {
          const dist = Math.abs(i - center);
          return (
            <View key={i} style={styles.item}>
              <Text
                style={[
                  styles.text,
                  dist === 0 ? styles.active : dist === 1 ? styles.near : styles.far,
                ]}
              >
                {d}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden' },
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: PAD,
    height: WHEEL_ITEM_H,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  item: { height: WHEEL_ITEM_H, alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: font.family.bold, textAlign: 'center' },
  active: { fontSize: font.size.lg, color: colors.text },
  near: { fontSize: font.size.md, color: colors.textSoft, opacity: 0.85 },
  far: { fontSize: font.size.sm, color: colors.textFaint, opacity: 0.5 },
});
