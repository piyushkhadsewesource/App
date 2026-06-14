import React, { ReactNode } from 'react';
import {
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font, radius, shadow, spacing } from '../theme';

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
  if (!scroll) return <View style={base}>{children}</View>;
  return (
    <View style={base}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scrollContent, contentStyle]}
      >
        {children}
      </ScrollView>
    </View>
  );
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
        <Pressable onPress={onBack} hitSlop={12} style={styles.back}>
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
  return (
    <Pressable onPress={onPress} style={({ pressed }) => (pressed ? { opacity: 0.85 } : null)}>
      {body}
    </Pressable>
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
  const bg =
    variant === 'primary' ? color : variant === 'soft' ? colors.surfaceAlt : 'transparent';
  const fg =
    variant === 'primary' ? colors.white : variant === 'outline' ? color : colors.text;
  const border = variant === 'outline' ? { borderWidth: 1.5, borderColor: color } : null;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg },
        border,
        disabled ? { opacity: 0.45 } : null,
        pressed ? { opacity: 0.85 } : null,
        style,
      ]}
    >
      <Text style={[styles.buttonText, { color: fg }]}>
        {icon ? `${icon}  ` : ''}
        {label}
      </Text>
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
}: {
  name: string;
  color?: string;
  size?: number;
}) {
  const initial = (name?.trim()?.[0] ?? '?').toUpperCase();
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
      ]}
    >
      <Text style={{ color: colors.white, fontSize: size * 0.42, fontWeight: font.weight.bold }}>
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
        placeholderTextColor={colors.textFaint}
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
            onPress={() => onChange(n)}
            style={[
              styles.levelDot,
              {
                backgroundColor: n <= value ? color : colors.surfaceAlt,
                borderColor: n <= value ? color : colors.border,
              },
            ]}
          >
            <Text style={{ color: n <= value ? colors.white : colors.textFaint, fontWeight: '700' }}>
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
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.max(2, Math.min(100, value))}%`, backgroundColor: color }]} />
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
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl * 2.5 },
  header: { marginBottom: spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  back: { marginBottom: spacing.sm },
  backText: { color: colors.textSoft, fontSize: font.size.md, fontWeight: font.weight.semibold },
  h1: { fontSize: font.size.xxl, fontWeight: font.weight.bold, color: colors.text },
  sub: { fontSize: font.size.md, color: colors.textSoft, marginTop: 2 },

  card: { borderRadius: radius.lg, padding: spacing.lg },
  title: { fontSize: font.size.lg, fontWeight: font.weight.bold, color: colors.text },
  body: { fontSize: font.size.md, color: colors.text, lineHeight: 22 },
  muted: { fontSize: font.size.sm, color: colors.textSoft, lineHeight: 20 },

  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: { fontSize: font.size.lg, fontWeight: font.weight.bold, color: colors.text },

  button: {
    height: 52,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  buttonText: { fontSize: font.size.md, fontWeight: font.weight.bold },

  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  pillText: { fontSize: font.size.sm, fontWeight: font.weight.semibold },

  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, alignSelf: 'flex-start' },
  tagText: { fontSize: font.size.xs, fontWeight: font.weight.bold, textTransform: 'uppercase', letterSpacing: 0.5 },

  avatar: { alignItems: 'center', justifyContent: 'center' },

  fieldLabel: { fontSize: font.size.sm, fontWeight: font.weight.semibold, color: colors.textSoft, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: font.size.md,
    color: colors.text,
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
  levelLabelText: { fontSize: font.size.xs, color: colors.textFaint },

  progressTrack: { height: 10, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radius.pill },

  empty: { alignItems: 'center', paddingVertical: spacing.xl, paddingHorizontal: spacing.lg },
  emptyTitle: { fontSize: font.size.lg, fontWeight: font.weight.bold, color: colors.text, marginBottom: 4 },
  emptyText: { fontSize: font.size.md, color: colors.textSoft, textAlign: 'center', lineHeight: 21 },

  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
});
