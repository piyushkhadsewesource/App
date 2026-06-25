// ─────────────────────────────────────────────────────────────────────────
// A single app-wide toast. Call useToast().show('Saved 🤍') from anywhere; a
// frosted glass pill springs down from the top and auto-dismisses. Replaces the
// per-screen inline toast cards with one consistent, premium confirmation.
// ─────────────────────────────────────────────────────────────────────────
import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font, radius, shadow, spacing } from '../theme';
import { duration, easeOut, spring } from '../theme/motion';
import { Glass } from './Glass';

type ToastCtx = { show: (message: string, ms?: number) => void };
const Ctx = createContext<ToastCtx>({ show: () => {} });

export function useToast(): ToastCtx {
  return useContext(Ctx);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [msg, setMsg] = useState<string | null>(null);
  const v = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (message: string, ms = 2400) => {
      setMsg(message);
      Animated.spring(v, { toValue: 1, useNativeDriver: true, ...spring.snappy }).start();
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        Animated.timing(v, { toValue: 0, duration: duration.base, easing: easeOut, useNativeDriver: true }).start(
          ({ finished }) => finished && setMsg(null),
        );
      }, ms);
    },
    [v],
  );

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      {msg ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.wrap,
            {
              top: insets.top + 10,
              opacity: v,
              transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-28, 0] }) }],
            },
          ]}
        >
          <Glass style={styles.toast} overlay="rgba(255,255,255,0.72)" pointerEvents="none">
            <Text style={styles.text}>{msg}</Text>
          </Glass>
        </Animated.View>
      ) : null}
    </Ctx.Provider>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: spacing.lg, right: spacing.lg, alignItems: 'center', zIndex: 1000 },
  toast: {
    borderRadius: radius.pill,
    overflow: 'hidden',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(90,46,64,0.08)',
    ...shadow.card,
  },
  text: { fontFamily: font.family.semibold, color: colors.text, fontSize: font.size.md, textAlign: 'center' },
});
