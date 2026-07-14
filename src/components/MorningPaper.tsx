// ─────────────────────────────────────────────────────────────────────────
// The Morning Paper, on Home. Sealed, it tells you only HOW MUCH of the
// night there is ("3 things from Riya while you slept"), never what.
// Breaking the seal (one deliberate press, a heavy thump) unfolds the night
// in the order it happened, each item a door into the feature it came from.
// ─────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ActivityEvent } from '../lib/activity';
import { formatRelative } from '../lib/date';
import { hHeavy } from '../lib/haptics';
import { colors, font, radius, shadow, spacing } from '../theme';
import { Press, Reveal } from './Motion';
import { Muted } from './ui';

export default function MorningPaper({
  partnerName,
  items,
  onOpen,
  onNavigate,
}: {
  partnerName: string;
  items: ActivityEvent[];
  /** Called once when the seal breaks (persist the opened flag). */
  onOpen: () => void;
  onNavigate: (route: string, params?: Record<string, unknown>) => void;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Reveal>
        <Press
          onPress={() => {
            hHeavy(); // the seal tears
            setOpen(true);
            onOpen();
          }}
          scaleTo={0.98}
          accessibilityRole="button"
          accessibilityLabel={`Open the morning paper, ${items.length} things from ${partnerName}`}
          style={[styles.card, styles.sealed]}
        >
          <Text style={styles.emoji}>🗞️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>The morning paper</Text>
            <Muted>
              {items.length === 1 ? 'One thing' : `${items.length} things`} from {partnerName} while you slept
            </Muted>
          </View>
          <View style={styles.seal}>
            <Text style={styles.sealText}>🤍</Text>
          </View>
        </Press>
      </Reveal>
    );
  }

  return (
    <View style={[styles.card, styles.openCard]}>
      <View style={styles.openHead}>
        <Text style={styles.emoji}>🗞️</Text>
        <Text style={styles.title}>While you slept</Text>
      </View>
      {items.map((e, i) => (
        <Reveal key={e.id} delay={i * 70} distance={10}>
          <Press
            onPress={() => onNavigate(e.route, e.params)}
            scaleTo={0.985}
            accessibilityRole="button"
            accessibilityLabel={e.text}
            style={[styles.row, i > 0 && styles.rowDivider]}
          >
            <Text style={{ fontSize: 20 }}>{e.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowText} numberOfLines={2}>{e.text}</Text>
              <Muted>{formatRelative(e.at)}</Muted>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Press>
        </Reveal>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    backgroundColor: colors.goldSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(90,46,64,0.06)',
    marginBottom: spacing.md,
    ...shadow.card,
  },
  sealed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg + spacing.xs,
  },
  openCard: { paddingVertical: spacing.sm },
  openHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg + spacing.xs,
    paddingVertical: spacing.sm,
  },
  emoji: { fontSize: 26 },
  // A voice moment: the paper's masthead speaks Fraunces.
  title: { fontSize: font.size.lg, fontFamily: font.family.displaySemi, color: colors.text, letterSpacing: font.tracking.heading },
  seal: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(216,154,46,0.4)', // wax-gold rim
  },
  sealText: { fontSize: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg + spacing.xs,
  },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(90,46,64,0.1)' },
  rowText: { fontSize: font.size.md, color: colors.text, fontFamily: font.family.body, lineHeight: 21 },
  chevron: { fontSize: 22, color: colors.gold },
});
