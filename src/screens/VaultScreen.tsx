import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Alert } from '../lib/alert';
import DateTimeModal from '../components/DateTimeModal';
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
import { hLight } from '../lib/haptics';
import { useApp } from '../state/AppContext';
import { colors, font, radius, spacing } from '../theme';
import { Memory, MemoryKind } from '../types/models';

const EMOJIS = ['🎡', '🌅', '🍜', '✈️', '🏖️', '🎂', '💍', '🎤', '📸', '🌧️', '⭐️', '🎁'];
const KINDS: { key: MemoryKind; label: string }[] = [
  { key: 'milestone', label: 'Milestone' },
  { key: 'photo', label: 'Photo' },
  { key: 'voice', label: 'Voice note' },
  { key: 'note', label: 'Note' },
];
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function full(d: Date): string {
  return `${WD[d.getDay()]}, ${d.getDate()} ${MO[d.getMonth()]} ${d.getFullYear()}`;
}

export default function VaultScreen({ navigation }: any) {
  const app = useApp();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [date, setDate] = useState(todayISO());
  const [emoji, setEmoji] = useState('⭐️');
  const [kind, setKind] = useState<MemoryKind>('milestone');
  const [pickerOpen, setPickerOpen] = useState(false);

  const sorted = useMemo(
    () => [...app.memories].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt)),
    [app.memories],
  );

  const reset = () => {
    setTitle('');
    setDesc('');
    setDate(todayISO());
    setEmoji('⭐️');
    setKind('milestone');
    setEditingId(null);
    setAdding(false);
  };
  const openAdd = () => { hLight(); reset(); setAdding(true); };
  const openEdit = (m: Memory) => {
    hLight();
    setEditingId(m.id);
    setTitle(m.title);
    setDesc(m.description ?? '');
    setDate(m.date);
    setEmoji(m.emoji || '⭐️');
    setKind(m.kind);
    setAdding(true);
  };

  const save = async () => {
    if (!title.trim()) return;
    const payload = { title: title.trim(), description: desc.trim() || undefined, date: date.trim() || todayISO(), emoji, kind };
    const id = editingId;
    reset();
    if (id) await app.updateMemory(id, payload);
    else await app.addMemory(payload);
  };

  const confirmRemove = (m: Memory) => {
    Alert.alert('Delete this memory?', `"${m.title}" will be removed for both of you.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          if (editingId === m.id) reset();
          app.removeMemory(m.id);
        },
      },
    ]);
  };

  const editingItem = editingId ? sorted.find((m) => m.id === editingId) ?? null : null;

  return (
    <Screen scroll>
      <AppHeader title="Memory vault" subtitle="Milestones and keepsakes" onBack={() => navigation.goBack()} />

      {adding ? (
        <Card style={{ marginBottom: spacing.lg }}>
          <Text style={styles.formTitle}>{editingId ? 'Edit this memory' : 'Add a memory'}</Text>
          <Field label="What happened?" value={title} onChangeText={setTitle} placeholder="e.g. Our first video call till sunrise" />
          <Field label="Tell the story (optional)" value={desc} onChangeText={setDesc} placeholder="A detail you never want to forget…" multiline />

          <Text style={styles.label}>When</Text>
          <Pressable onPress={() => setPickerOpen(true)} style={styles.row}>
            <Text style={styles.rowIcon}>📅</Text>
            <Text style={styles.rowText}>{full(isoToDate(date))}</Text>
            <Text style={styles.chev}>›</Text>
          </Pressable>

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
          <Button label={editingId ? 'Save changes' : 'Save memory'} disabled={!title.trim()} onPress={save} />
          {editingItem ? (
            <>
              <View style={{ height: spacing.sm }} />
              <Button label="Delete this memory" variant="outline" color={colors.danger} onPress={() => confirmRemove(editingItem)} />
            </>
          ) : null}
          <View style={{ height: spacing.sm }} />
          <Button label="Cancel" variant="ghost" onPress={reset} />
        </Card>
      ) : (
        <Button label="＋  Add a memory" onPress={openAdd} style={{ marginBottom: spacing.lg }} />
      )}

      {sorted.length === 0 ? (
        <Card>
          <EmptyState emoji="📸" title="No memories yet" text="Tap ＋ to save your first one. One year from now, you'll be glad you did." />
        </Card>
      ) : (
        <View style={{ gap: spacing.md }}>
          {sorted.map((m) => {
            const isOnThisDay = m.date.slice(5) === todayISO().slice(5) && m.date.slice(0, 4) !== todayISO().slice(0, 4);
            // Either of you can edit any memory; the author shown below stays put
            // (updateMemory never rewrites authorId), so credit is preserved.
            return (
              <Card key={m.id} tone={isOnThisDay ? 'gold' : 'surface'} onPress={() => openEdit(m)}>
                <View style={styles.memHead}>
                  <Text style={{ fontSize: 30 }}>{m.emoji ?? '⭐️'}</Text>
                  <View style={{ flex: 1 }}>
                    <Title>{m.title}</Title>
                    <Muted>
                      {formatDate(m.date)} · {app.authorName(m.authorId)}
                      {isOnThisDay ? ' · on this day 💫' : ''}
                    </Muted>
                  </View>
                  <Text style={styles.editHint}>Edit ›</Text>
                </View>
                {m.description ? <Body style={{ marginTop: spacing.sm }}>{m.description}</Body> : null}
              </Card>
            );
          })}
        </View>
      )}

      <DateTimeModal
        visible={pickerOpen}
        mode="date"
        allowPast
        title="When did it happen?"
        initial={isoToDate(date).getTime()}
        onCancel={() => setPickerOpen(false)}
        onConfirm={(ts) => {
          const d = new Date(ts);
          setDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
          setPickerOpen(false);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  formTitle: { fontSize: font.size.md, fontFamily: font.family.displaySemi, color: colors.text, marginBottom: spacing.sm },
  label: { fontSize: font.size.sm, fontFamily: font.family.semibold, color: colors.textSoft, marginBottom: spacing.sm, marginTop: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, height: 50, marginBottom: spacing.xs },
  rowIcon: { fontSize: 18 },
  rowText: { flex: 1, fontSize: font.size.md, fontFamily: font.family.semibold, color: colors.text },
  chev: { fontSize: 22, color: colors.textFaint },
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
  editHint: { fontSize: font.size.xs, color: colors.primaryDark, fontFamily: font.family.bold },
});
