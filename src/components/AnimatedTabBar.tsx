// ─────────────────────────────────────────────────────────────────────────
// A bespoke glass tab bar. Same navigation behaviour as the default bar (it
// reads the navigator's state/descriptors and emits the same tabPress events),
// just wrapped in frosted glass with a spring-morphing active pill and an icon
// that bounces as it becomes the focused tab.
// ─────────────────────────────────────────────────────────────────────────
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font } from '../theme';
import { spring } from '../theme/motion';
import { Glass } from './Glass';

export default function AnimatedTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [rowW, setRowW] = useState(0);
  const tabW = rowW > 0 ? rowW / state.routes.length : 0;

  // The active pill springs horizontally to sit under the focused tab.
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (tabW > 0) Animated.spring(x, { toValue: state.index * tabW, useNativeDriver: true, ...spring.snappy }).start();
  }, [state.index, tabW, x]);

  return (
    <Glass style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]} overlay="rgba(251,248,246,0.82)">
      <View style={styles.row} onLayout={(e) => setRowW(e.nativeEvent.layout.width)}>
        {tabW > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.pill, { width: tabW - 22, transform: [{ translateX: x }] }]}
          />
        ) : null}
        {state.routes.map((route, i) => {
          const { options } = descriptors[route.key];
          const focused = state.index === i;
          const label = (options.title ?? route.name) as string;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };
          return (
            <TabButton
              key={route.key}
              focused={focused}
              label={label}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
              icon={options.tabBarIcon}
              onPress={onPress}
            />
          );
        })}
      </View>
    </Glass>
  );
}

function TabButton({
  focused,
  label,
  accessibilityLabel,
  icon,
  onPress,
}: {
  focused: boolean;
  label: string;
  accessibilityLabel: string;
  icon?: (props: { focused: boolean; color: string; size: number }) => React.ReactNode;
  onPress: () => void;
}) {
  // The icon gently springs up and scales when its tab becomes active.
  const s = useRef(new Animated.Value(focused ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(s, { toValue: focused ? 1 : 0, useNativeDriver: true, ...spring.bouncy }).start();
  }, [focused, s]);
  const scale = s.interpolate({ inputRange: [0, 1], outputRange: [1, 1.16] });
  const lift = s.interpolate({ inputRange: [0, 1], outputRange: [0, -2] });

  return (
    <Pressable
      onPress={onPress}
      style={styles.tab}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View style={{ transform: [{ scale }, { translateY: lift }] }}>
        {icon ? icon({ focused, color: focused ? colors.primary : colors.textFaint, size: 22 }) : null}
      </Animated.View>
      <Text style={[styles.label, { color: focused ? colors.primaryDark : colors.textFaint }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(90,46,64,0.08)' },
  row: { flexDirection: 'row', alignItems: 'center', paddingTop: 9, position: 'relative' },
  pill: { position: 'absolute', left: 11, top: 2, height: 46, borderRadius: 16, backgroundColor: colors.primarySoft },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4, gap: 2 },
  label: { fontSize: 11, fontFamily: font.family.semibold },
});
