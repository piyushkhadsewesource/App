// ─────────────────────────────────────────────────────────────────────────
// A bottom sheet for forms and pickers: content slides up over a fading
// scrim on the iOS drawer curve, and — crucially — the screen behind never
// reflows. Web-safe (RN Modal renders fine under react-native-web) and
// keyboard-aware on iOS.
// ─────────────────────────────────────────────────────────────────────────
import React, { ReactNode, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../theme';
import { duration, easeOut } from '../theme/motion';

// Ionic's iOS drawer curve: fast approach, long soft landing.
const drawerCurve = Easing.bezier(0.32, 0.72, 0, 1);

export default function Sheet({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const { height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const slide = useRef(new Animated.Value(0)).current; // 0 = offscreen, 1 = up

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(slide, { toValue: 1, duration: 280, easing: drawerCurve, useNativeDriver: true }).start();
    } else if (mounted) {
      // Exit faster than enter: the system is responding, not presenting.
      Animated.timing(slide, { toValue: 0, duration: duration.fast, easing: easeOut, useNativeDriver: true }).start(
        ({ finished }) => finished && setMounted(false),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!mounted) return null;

  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [winH, 0] });
  const panel = (
    <Animated.View style={[styles.panel, { paddingBottom: Math.max(insets.bottom, spacing.lg), transform: [{ translateY }] }]}>
      <View style={styles.grabber} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={{ maxHeight: winH * 0.78 }}
        contentContainerStyle={{ padding: spacing.lg + spacing.xs, paddingTop: spacing.md }}
      >
        {children}
      </ScrollView>
    </Animated.View>
  );

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay, opacity: slide }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
      </Animated.View>
      <View style={styles.host} pointerEvents="box-none">
        {Platform.OS === 'ios' ? (
          <KeyboardAvoidingView behavior="padding" pointerEvents="box-none" style={styles.host}>
            {panel}
          </KeyboardAvoidingView>
        ) : (
          panel
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  host: { flex: 1, justifyContent: 'flex-end' },
  panel: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    marginTop: spacing.sm,
  },
});
