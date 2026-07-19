import React, { ReactNode, useRef } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font, gradients, radius, shadow, spacing } from '../theme';
import { spring } from '../theme/motion';
import { hLight } from '../lib/haptics';
import { Press } from './Motion';

// ── Screen shell ───────────────────────────────────────────────────────────
export function Screen({
  children,
  scroll,
  contentStyle,
}: {
  children: ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  const base: ViewStyle = { flex: 1, backgroundColor: colors.bg, paddingTop: insets.top };
  // Non-scroll screens have no large bottom content padding (the scroll path
  // already reserves ~100px), so honour the bottom safe-area here to keep
  // content clear of the home-indicator / gesture bar on button-less phones.
  if (!scroll) return <View style={[base, { paddingBottom: insets.bottom }]}>{children}</View>;

  const list = (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      contentContainerStyle={[styles.scrollContent, contentStyle]}
    >
      {children}
    </ScrollView>
  );

  // iOS: KeyboardAvoidingView lifts the field above the keyboard.
  // Android: the window is set to "pan" (app.json) so the OS keeps the focused
  // field visible; a wrapping KeyboardAvoidingView would only fight it.
  if (Platform.OS === 'ios') {
    return (
      <KeyboardAvoidingView style={base} behavior="padding">
        {list}
      </KeyboardAvoidingView>
    );
  }
  return <View style={base}>{list}</View>;
}

// ── Header ───────────────────────────────────────────────────────────────
export function AppHeader({
  title,
  subtitle,
  right,
  onBack,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onBack?: () => void;
}) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={12} style={styles.back} accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
      ) : null}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.h1}>{title}</Text>
          {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
    </View>
  );
}

// ── Card ───────────────────────────────────────────────────────────────────
export function Card({
  children,
  style,
  onPress,
  tone = 'surface',
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  tone?: 'surface' | 'rose' | 'violet' | 'gold' | 'green';
}) {
  const toneBg: Record<string, string> = {
    surface: colors.surface,
    rose: colors.primarySoft,
    violet: colors.accentSoft,
    gold: colors.goldSoft,
    green: colors.goodSoft,
  };
  const body = (
    <View style={[styles.card, { backgroundColor: toneBg[tone] }, shadow.card, style]}>
      {children}
    </View>
  );
  if (!onPress) return body;
  // Tappable cards gently spring inward on press for a tactile, physical feel.
  return (
    <Press onPress={onPress} scaleTo={0.985} haptic accessibilityRole="button">
      {body}
    </Press>
  );
}

// ── Text helpers ───────────────────────────────────────────────────────────
export function Title({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}
export function Body({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.body, style]}>{children}</Text>;
}
export function Muted({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.muted, style]}>{children}</Text>;
}
export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {right}
    </View>
  );
}

// ── Button ───────────────────────────────────────────────────────────────
type Variant = 'primary' | 'soft' | 'outline' | 'ghost';
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  icon,
  style,
  color = colors.primary,
}: {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  icon?: string;
  style?: StyleProp<ViewStyle>;
  color?: string;
}) {
  const fg =
    variant === 'primary' ? colors.white : variant === 'outline' ? color : colors.text;
  const content = (
    <Text numberOfLines={1} style={[styles.buttonText, { color: fg }]}>
      {icon ? `${icon}  ` : ''}
      {label}
    </Text>
  );

  // Spring the WHOLE visible pill inward on press: the object under the finger
  // is the button surface, so the gradient, background and label all move as
  // one. A plain Pressable stays the touch target (the most reliable on
  // device) and keeps layout styles; the visuals live on an inner animated
  // fill that scales.
  const scale = useRef(new Animated.Value(1)).current;
  const press = (v: number) => Animated.spring(scale, { toValue: v, useNativeDriver: true, ...spring.snappy }).start();
  const pressProps = {
    onPress,
    disabled,
    onPressIn: () => {
      if (disabled) return;
      press(0.97);
      hLight(); // tactile detent on every button tap (no-op on web)
    },
    onPressOut: () => press(1),
  };

  const bg =
    variant === 'primary' ? 'transparent' : variant === 'soft' ? colors.surfaceAlt : 'transparent';
  const border = variant === 'outline' ? { borderWidth: 1.5, borderColor: color } : null;
  const gradientColors = color === colors.primary ? gradients.primary : ([color, color] as [string, string]);

  return (
    <Pressable
      {...pressProps}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={[styles.button, variant === 'primary' ? shadow.soft : null, style]}
    >
      <Animated.View
        style={[
          styles.buttonSurface,
          { backgroundColor: bg },
          border,
          disabled ? { opacity: 0.45 } : null,
          { transform: [{ scale }] },
        ]}
      >
        {variant === 'primary' ? (
          <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, styles.buttonFill]} />
        ) : null}
        {content}
      </Animated.View>
    </Pressable>
  );
}

// ── Pill / Chip ────────────────────────────────────────────────────────────
export function Pill({
  label,
  active,
  onPress,
  color = colors.primary,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      style={[
        styles.pill,
        active
          ? { backgroundColor: color, borderColor: color }
          : { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.pillText, { color: active ? colors.white : colors.textSoft }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Tag({ label, color = colors.accent }: { label: string; color?: string }) {
  return (
    <View style={[styles.tag, { backgroundColor: color + '22' }]}>
      <Text style={[styles.tagText, { color }]}>{label}</Text>
    </View>
  );
}

// ── Avatar ───────────────────────────────────────────────────────────────
export function Avatar({
  name,
  color = colors.primary,
  size = 40,
  uri,
}: {
  name: string;
  color?: string;
  size?: number;
  /** Optional profile photo (small data URI); falls back to the initial. */
  uri?: string | null;
}) {
  const initial = (name?.trim()?.[0] ?? '?').toUpperCase();
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
        transition={150}
        accessibilityLabel={name}
      />
    );
  }
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
      ]}
    >
      <Text style={{ color: colors.white, fontSize: size * 0.44, fontFamily: font.family.display }}>
        {initial}
      </Text>
    </View>
  );
}

// ── Text field ───────────────────────────────────────────────────────────
export function Field({
  label,
  style,
  ...props
}: TextInputProps & { label?: string; style?: StyleProp<TextStyle> }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <TextInput
        // textSoft, not textFaint: placeholder text must clear 4.5:1 on paper.
        placeholderTextColor={colors.textSoft}
        style={[styles.input, props.multiline ? styles.inputMultiline : null, style]}
        {...props}
      />
    </View>
  );
}

// ── Level selector (1..5) ────────────────────────────────────────────────
export function LevelSelector({
  value,
  onChange,
  lowLabel,
  highLabel,
  color = colors.primary,
}: {
  value: number;
  onChange: (v: number) => void;
  lowLabel: string;
  highLabel: string;
  color?: string;
}) {
  return (
    <View style={{ marginBottom: spacing.sm }}>
      <View style={styles.levelRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            onPress={() => {
              hLight(); // a tactile detent on each step
              onChange(n);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Level ${n}`}
            accessibilityState={{ selected: n <= value }}
            style={[
              styles.levelDot,
              {
                backgroundColor: n <= value ? color : colors.surfaceAlt,
                borderColor: n <= value ? color : colors.border,
              },
            ]}
          >
            <Text style={{ color: n <= value ? colors.white : colors.textFaint, fontFamily: font.family.bold }}>
              {n}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.levelLabels}>
        <Text style={styles.levelLabelText}>{lowLabel}</Text>
        <Text style={styles.levelLabelText}>{highLabel}</Text>
      </View>
    </View>
  );
}

// ── Progress bar ───────────────────────────────────────────────────────────
export function ProgressBar({ value, color = colors.primary }: { value: number; color?: string }) {
  // Honest data: zero shows as truly empty; any real progress gets a visible
  // 2% sliver so it never reads as nothing.
  const width = value <= 0 ? 0 : Math.max(2, Math.min(100, value));
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${width}%`, backgroundColor: color }]} />
    </View>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────
export function EmptyState({
  emoji,
  title,
  text,
}: {
  emoji: string;
  title: string;
  text?: string;
}) {
  return (
    <View style={styles.empty}>
      <Text style={{ fontSize: 40, marginBottom: spacing.sm }}>{emoji}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      {text ? <Text style={styles.emptyText}>{text}</Text> : null}
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  scrollContent: { padding: 20, paddingBottom: spacing.xxl * 2.5 },
  header: { marginBottom: spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  back: { marginBottom: spacing.sm },
  backText: { color: colors.textSoft, fontSize: font.size.md, fontFamily: font.family.semibold },
  h1: { fontSize: 32, lineHeight: 38, fontFamily: font.family.display, color: colors.text, letterSpacing: font.tracking.display },
  sub: { fontSize: font.size.md, lineHeight: 21, color: colors.textSoft, marginTop: 4, fontFamily: font.family.body, letterSpacing: font.tracking.label },

  card: {
    borderRadius: radius.lg,
    padding: spacing.lg + spacing.xs, // 20 — grid-aligned (was an off-grid 18)
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(90,46,64,0.06)',
  },
  // Serif discipline: Fraunces speaks (screen titles, section titles, payoff
  // lines); Inter labels. Card titles are UI labels, so they set in Inter.
  title: { fontSize: font.size.lg, lineHeight: 24, fontFamily: font.family.semibold, color: colors.text, letterSpacing: -0.2 },
  body: { fontSize: font.size.md, color: colors.text, lineHeight: 24, fontFamily: font.family.body, letterSpacing: font.tracking.body },
  muted: { fontSize: font.size.sm, color: colors.textSoft, lineHeight: 20, fontFamily: font.family.body, letterSpacing: font.tracking.label },

  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: { fontSize: font.size.xl + 1, lineHeight: 27, fontFamily: font.family.displaySemi, color: colors.text, letterSpacing: font.tracking.heading },

  button: {
    height: 54,
    borderRadius: radius.pill,
  },
  buttonSurface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.pill,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  buttonFill: { borderRadius: radius.pill },
  buttonText: { fontSize: font.size.md, fontFamily: font.family.bold, letterSpacing: 0.3 },

  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  pillText: { fontSize: font.size.sm, fontFamily: font.family.semibold },

  tag: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: radius.pill, alignSelf: 'flex-start' },
  tagText: { fontSize: 11, fontFamily: font.family.bold, textTransform: 'uppercase', letterSpacing: 0.6 },

  avatar: { alignItems: 'center', justifyContent: 'center' },

  fieldLabel: { fontSize: font.size.sm, fontFamily: font.family.semibold, color: colors.textSoft, marginBottom: spacing.xs, letterSpacing: font.tracking.label },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: font.size.md,
    color: colors.text,
    fontFamily: font.family.body,
  },
  inputMultiline: { minHeight: 110, textAlignVertical: 'top' },

  levelRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  levelDot: {
    flex: 1,
    height: 46,
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
  // textSoft, not textFaint: these small anchor labels are meaning, not
  // decoration, and must clear 4.5:1 on paper.
  levelLabelText: { fontSize: font.size.xs, color: colors.textSoft, fontFamily: font.family.body },

  progressTrack: { height: 10, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radius.pill },

  empty: { alignItems: 'center', paddingVertical: spacing.xl, paddingHorizontal: spacing.lg },
  emptyTitle: { fontSize: font.size.lg + 1, lineHeight: 24, fontFamily: font.family.displaySemi, color: colors.text, marginBottom: 4, letterSpacing: font.tracking.heading },
  emptyText: { fontSize: font.size.md, color: colors.textSoft, textAlign: 'center', lineHeight: 23, fontFamily: font.family.body, letterSpacing: font.tracking.body },

  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
});
