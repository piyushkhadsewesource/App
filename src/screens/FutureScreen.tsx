import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  AppHeader,
  Body,
  Button,
  Card,
  EmptyState,
  Field,
  Muted,
  Pill,
  Screen,
  Title,
} from '../components/ui';
import { useApp } from '../state/AppContext';
import { colors, font, radius, spacing } from '../theme';
import { FutureCategory } from '../types/models';

const CATS: { key: FutureCategory; emoji: string; label: string }[] = [
  { key: 'travel', emoji: '✈️', label: 'Travel' },
  { key: 'home', emoji: '🏡', label: 'Home' },
  { key: 'milestones', emoji: '💍', label: 'Milestones' },
  { key: 'everyday', emoji: '☕️', label: 'Everyday' },
  { key: 'dreams', emoji: '🌟', label: 'Dreams' },
];

export default function FutureScreen({ navigation }: any) {
  const app = useApp();
  const [text, setText] = useState('');
  const [cat, setCat] = useState<FutureCategory>('travel');

  const done = app.future.filter((f) => f.done).length;

  async function add() {
    await app.addFuture(cat, text.trim());
    setText('');
  }

  return (
    <Screen scroll>
      <AppHeader title="Future board" subtitle="The life you’re building together" onBack={() => navigation.goBack()} />

      <Card tone="green" style={{ marginBottom: spacing.lg }}>
        <Body>
          Distance is easier with a visible future. Dream it here together, and tick things off as
          they come true.
        </Body>
        {app.future.length > 0 ? (
          <Muted style={{ marginTop: spacing.sm }}>
            {done} of {app.future.length} made real so far 🌱
          </Muted>
        ) : null}
      </Card>

      {/* Add */}
      <Card style={{ marginBottom: spacing.lg }}>
        <Text style={styles.label}>Add a dream</Text>
        <View style={styles.pillRow}>
          {CATS.map((c) => (
            <Pill key={c.key} label={`${c.emoji} ${c.label}`} active={cat === c.key} onPress={() => setCat(c.key)} color={colors.good} />
          ))}
        </View>
        <View style={{ height: spacing.md }} />
        <Field value={text} onChangeText={setText} placeholder="e.g. Road-trip the coast for two weeks" multiline />
        <Button label="Add to our board" color={colors.good} disabled={!text.trim()} onPress={add} />
      </Card>

      {/* Grouped list */}
      {app.future.length === 0 ? (
        <Card>
          <EmptyState emoji="✨" title="Your board is empty" text="Add your first shared dream above." />
        </Card>
      ) : (
        CATS.map((c) => {
          const items = app.future.filter((f) => f.category === c.key).sort((a, b) => Number(a.done) - Number(b.done) || b.createdAt - a.createdAt);
          if (items.length === 0) return null;
          return (
            <View key={c.key} style={{ marginBottom: spacing.lg }}>
              <Title style={{ marginBottom: spacing.sm }}>{c.emoji} {c.label}</Title>
              <View style={{ gap: spacing.sm }}>
                {items.map((f) => (
                  <Card key={f.id} style={styles.itemRow}>
                    <Pressable onPress={() => app.toggleFuture(f.id, !f.done)} hitSlop={8} style={[styles.check, f.done && { backgroundColor: colors.good, borderColor: colors.good }]}>
                      {f.done ? <Text style={{ color: colors.white, fontFamily: font.family.bold }}>✓</Text> : null}
                    </Pressable>
                    <Body style={[{ flex: 1 }, f.done && styles.doneText]}>{f.text}</Body>
                    {app.isMine(f.authorId) ? (
                      <Pressable
                        hitSlop={8}
                        onPress={() =>
                          Alert.alert('Remove?', f.text, [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Remove', style: 'destructive', onPress: () => app.removeFuture(f.id) },
                          ])
                        }
                      >
                        <Text style={styles.remove}>×</Text>
                      </Pressable>
                    ) : null}
                  </Card>
                ))}
              </View>
            </View>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: font.size.sm, fontFamily: font.family.semibold, color: colors.textSoft, marginBottom: spacing.sm },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  check: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneText: { textDecorationLine: 'line-through', color: colors.textFaint },
  remove: { fontSize: 24, color: colors.textFaint, paddingHorizontal: spacing.sm },
});
