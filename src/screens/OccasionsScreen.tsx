import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimeModal from '../components/DateTimeModal';
import { AppHeader, Body, Button, Card, EmptyState, Field, Muted, Screen } from '../components/ui';
import { isoToDate, todayISO } from '../lib/date';
import { hLight } from '../lib/haptics';
import { daysUntil, nextOccurrence, ordinal, sortByNext, untilLabel, yearsAt } from '../lib/occasions';
import { useApp } from '../state/AppContext';
import { colors, font, radius, shadow, spacing } from '../theme';
import { Occasion } from '../types/models';

const ICONS = ['💍', '🎂', '❤️', '🎉', '🌹', '✨', '🎁', '🥂', '🏡', '📅', '💞', '⭐'];
const REMINDS = [
  { label: 'On the day', v: 0 },
  { label: '1 day before', v: 1 },
  { label: '3 days before', v: 3 },
  { label: '1 week before', v: 7 },
];
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function full(d: Date): string {
  return `${WD[d.getDay()]}, ${d.getDate()} ${MO[d.getMonth()]} ${d.getFullYear()}`;
}

export default function OccasionsScreen({ navigation }: any) {
  const app = useApp();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState('❤️');
  const [date, setDate] = useState(todayISO());
  const [recurrence, setRecurrence] = useState<'yearly' | 'monthly' | 'once'>('yearly');
  const [remind, setRemind] = useState(1);
  const [pickerOpen, setPickerOpen] = useState(false);

  const list = useMemo(() => sortByNext(app.occasions), [app.occasions]);

  const reset = () => {
    setTitle('');
    setIcon('❤️');
    setDate(todayISO());
    setRecurrence('yearly');
    setRemind(1);
    setEditingId(null);
    setAdding(false);
  };
  const openAdd = () => { hLight(); reset(); setAdding(true); };
  const openEdit = (o: Occasion) => {
    hLight();
    setEditingId(o.id);
    setTitle(o.title);
    setIcon(o.icon || '❤️');
    setDate(o.date);
    setRecurrence(o.recurrence);
    setRemind(o.remindDaysBefore);
    setAdding(true);
  };

  const save = async () => {
    if (!title.trim()) return;
    const payload = { title: title.trim(), date, recurrence, remindDaysBefore: remind, icon };
    const id = editingId;
    reset();
    if (id) await app.updateOccasion(id, payload);
    else await app.addOccasion(payload);
  };

  const confirmRemove = (o: Occasion) => {
    Alert.alert('Remove this date?', `"${o.title}" and its reminders will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          if (editingId === o.id) reset();
          app.removeOccasion(o.id);
        },
      },
    ]);
  };

  const editingItem = editingId ? list.find((o) => o.id === editingId) ?? null : null;

  return (
    <Screen scroll>
      <AppHeader title="Dates to remember" subtitle="Anniversaries & special days" onBack={() => navigation.goBack()} />

      {adding ? (
        <Card style={{ marginBottom: spacing.lg }}>
          <Text style={styles.formTitle}>{editingId ? 'Edit this date' : 'Add a date'}</Text>
          <Field label="What are we celebrating?" value={title} onChangeText={setTitle} placeholder="e.g. Our anniversary, Riya's birthday" />

          <Text style={styles.label}>Pick an icon</Text>
          <View style={styles.iconRow}>
            {ICONS.map((ic) => (
              <Pressable key={ic} onPress={() => setIcon(ic)} style={[styles.iconChip, icon === ic && styles.iconChipOn]}>
                <Text style={{ fontSize: 18 }}>{ic}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Date</Text>
          <Pressable onPress={() => setPickerOpen(true)} style={styles.row}>
            <Text style={styles.rowIcon}>📅</Text>
            <Text style={styles.rowText}>{full(isoToDate(date))}</Text>
            <Text style={styles.chev}>›</Text>
          </Pressable>

          <Text style={styles.label}>Repeats</Text>
          <View style={styles.seg}>
            {(['yearly', 'monthly', 'once'] as const).map((r) => (
              <Pressable key={r} onPress={() => setRecurrence(r)} style={[styles.segBtn, recurrence === r && styles.segOn]}>
                <Text style={[styles.segText, recurrence === r && styles.segTextOn]}>
                  {r === 'yearly' ? 'Every year' : r === 'monthly' ? 'Every month' : 'One time'}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Remind us</Text>
          <View style={styles.chipsWrap}>
            {REMINDS.map((rm) => (
              <Pressable key={rm.v} onPress={() => setRemind(rm.v)} style={[styles.remChip, remind === rm.v && styles.remChipOn]}>
                <Text style={[styles.remText, remind === rm.v && styles.remTextOn]}>{rm.label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={{ height: spacing.sm }} />
          <Button label={editingId ? 'Save changes' : 'Save this date'} onPress={save} />
          {editingItem ? (
            <>
              <View style={{ height: spacing.sm }} />
              <Button label="Remove this date" variant="outline" color={colors.danger} onPress={() => confirmRemove(editingItem)} />
            </>
          ) : null}
          <View style={{ height: spacing.sm }} />
          <Button label="Cancel" variant="ghost" onPress={reset} />
        </Card>
      ) : (
        <Button label="＋  Add a date" onPress={openAdd} style={{ marginBottom: spacing.lg }} />
      )}

      {list.length === 0 ? (
        <Card tone="surface">
          <EmptyState
            emoji="🎀"
            title="No dates saved yet"
            text="Add your anniversary, birthdays and the little dates that matter, we’ll count down to each and remind you both."
          />
        </Card>
      ) : (
        list.map((o) => {
          const next = nextOccurrence(o);
          const days = daysUntil(next);
          const yrs = yearsAt(o, next);
          const soon = days <= 7;
          return (
            <Card key={o.id} tone={soon ? 'rose' : 'surface'} onPress={() => openEdit(o)} style={{ marginBottom: spacing.md }}>
              <View style={styles.itemHead}>
                <Text style={{ fontSize: 26 }}>{o.icon || '💗'}</Text>
                <View style={{ flex: 1 }}>
                  <Body style={{ fontFamily: font.family.semibold }}>{o.title}</Body>
                  <Muted>
                    {o.recurrence === 'yearly' && yrs && yrs > 0 ? `${ordinal(yrs)} anniversary · ` : ''}
                    {full(next)}
                  </Muted>
                </View>
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{untilLabel(days)}</Text>
                </View>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.meta}>
                  {o.recurrence === 'yearly' ? '🔁 Every year' : o.recurrence === 'monthly' ? '🔁 Every month' : '📌 One time'}
                  {'   '}
                  🔔 {o.remindDaysBefore === 0 ? 'On the day' : `${o.remindDaysBefore}d before`}
                </Text>
                <Pressable hitSlop={8} onPress={() => confirmRemove(o)}>
                  <Text style={styles.x}>Remove</Text>
                </Pressable>
              </View>
            </Card>
          );
        })
      )}

      <DateTimeModal
        visible={pickerOpen}
        mode="date"
        allowPast
        title="Pick the date"
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
  label: { fontSize: font.size.sm, fontFamily: font.family.semibold, color: colors.textSoft, marginBottom: spacing.xs, marginTop: spacing.sm },
  iconRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  iconChip: { width: 42, height: 42, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt, borderWidth: 1.5, borderColor: 'transparent' },
  iconChipOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },

  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, height: 50 },
  rowIcon: { fontSize: 18 },
  rowText: { flex: 1, fontSize: font.size.md, fontFamily: font.family.semibold, color: colors.text },
  chev: { fontSize: 22, color: colors.textFaint },

  seg: { flexDirection: 'row', backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, padding: 4, gap: 2 },
  segBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.pill, alignItems: 'center' },
  segOn: { backgroundColor: colors.surface, ...shadow.soft },
  segText: { fontSize: font.size.sm, fontFamily: font.family.semibold, color: colors.textSoft },
  segTextOn: { color: colors.text },

  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  remChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt, borderWidth: 1.5, borderColor: 'transparent' },
  remChipOn: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  remText: { fontSize: font.size.sm, fontFamily: font.family.semibold, color: colors.textSoft },
  remTextOn: { color: colors.primaryDark },

  itemHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  countBadge: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 5 },
  countText: { color: colors.white, fontFamily: font.family.bold, fontSize: font.size.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md },
  meta: { fontSize: font.size.xs, color: colors.textSoft, fontFamily: font.family.semibold },
  x: { fontSize: font.size.sm, color: colors.danger, fontFamily: font.family.semibold },
});
