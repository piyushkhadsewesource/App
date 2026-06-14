import React, { useMemo, useState } from 'react';
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
import { formatDate, isoToDate, todayISO } from '../lib/date';
import { useApp } from '../state/AppContext';
import { colors, font, radius, spacing } from '../theme';
import { MemoryKind } from '../types/models';

const EMOJIS = ['🎡', '🌅', '🍜', '✈️', '🏖️', '🎂', '💍', '🎤', '📸', '🌧️', '⭐️', '🎁'];
const KINDS: { key: MemoryKind; label: string }[] = [
  { key: 'milestone', label: 'Milestone' },
  { key: 'photo', label: 'Photo' },
  { key: 'voice', label: 'Voice note' },
  { key: 'note', label: 'Note' },
];

export default function VaultScreen() {
  const app = useApp();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [date, setDate] = useState(todayISO());
  const [emoji, setEmoji] = useState('⭐️');
  const [kind, setKind] = useState<MemoryKind>('milestone');

  const sorted = useMemo(
    () => [...app.memories].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt)),
    [app.memories],
  );

  async function save() {
    await app.addMemory({
      title: title.trim(),
      description: desc.trim() || undefined,
      date: date.trim() || todayISO(),
      emoji,
      kind,
    });
    setTitle('');
    setDesc('');
    setDate(todayISO());
    setEmoji('⭐️');
    setKind('milestone');
    setAdding(false);
  }

  return (
    <Screen scroll>
      <AppHeader
        title="Memory vault"
        subtitle="The moments worth keeping"
        right={<Button label={adding ? '×' : '＋'} variant="soft" onPress={() => setAdding((a) => !a)} style={styles.addBtn} />}
      />

      {adding ? (
        <Card style={{ marginBottom: spacing.lg }}>
          <Field label="What happened?" value={title} onChangeText={setTitle} placeholder="e.g. Our first video call till sunrise" />
          <Field label="Tell the story (optional)" value={desc} onChangeText={setDesc} placeholder="A detail you never want to forget…" multiline />
          <Field label="When" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" autoCapitalize="none" />
          <Text style={styles.label}>A symbol for it</Text>
          <View style={styles.emojiRow}>
            {EMOJIS.map((e) => (
              <Pressable
                key={e}
                onPress={() => setEmoji(e)}
                style={[styles.emojiPick, emoji === e && { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}
              >
                <Text style={{ fontSize: 22 }}>{e}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>Kind</Text>
          <View style={styles.pillRow}>
            {KINDS.map((k) => (
              <Pill key={k.key} label={k.label} active={kind === k.key} onPress={() => setKind(k.key)} />
            ))}
          </View>
          <View style={{ height: spacing.md }} />
          <Button label="Save memory" disabled={!title.trim()} onPress={save} />
        </Card>
      ) : null}

      {sorted.length === 0 ? (
        <Card>
          <EmptyState emoji="📸" title="No memories yet" text="Tap ＋ to save your first one. One year from now, you’ll be glad you did." />
        </Card>
      ) : (
        <View style={{ gap: spacing.md }}>
          {sorted.map((m) => {
            const isOnThisDay = m.date.slice(5) === todayISO().slice(5) && m.date.slice(0, 4) !== todayISO().slice(0, 4);
            return (
              <Card key={m.id} tone={isOnThisDay ? 'gold' : 'surface'}>
                <View style={styles.memHead}>
                  <Text style={{ fontSize: 30 }}>{m.emoji ?? '⭐️'}</Text>
                  <View style={{ flex: 1 }}>
                    <Title>{m.title}</Title>
                    <Muted>
                      {formatDate(m.date)} · {app.authorName(m.authorId)}
                      {isOnThisDay ? ' · on this day 💫' : ''}
                    </Muted>
                  </View>
                </View>
                {m.description ? <Body style={{ marginTop: spacing.sm }}>{m.description}</Body> : null}
                {app.isMine(m.authorId) ? (
                  <Pressable
                    onPress={() =>
                      Alert.alert('Delete memory?', m.title, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => app.removeMemory(m.id) },
                      ])
                    }
                    style={{ marginTop: spacing.sm }}
                  >
                    <Text style={styles.delete}>Remove</Text>
                  </Pressable>
                ) : null}
              </Card>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  addBtn: { height: 40, width: 48, paddingHorizontal: 0 },
  label: { fontSize: font.size.sm, fontWeight: font.weight.semibold, color: colors.textSoft, marginBottom: spacing.sm, marginTop: spacing.xs },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  emojiPick: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  memHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  delete: { color: colors.danger, fontWeight: font.weight.semibold, fontSize: font.size.sm },
});
