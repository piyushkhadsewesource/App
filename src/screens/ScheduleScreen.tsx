import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimeModal from '../components/DateTimeModal';
import { AppHeader, Body, Button, Card, Field, Muted, Screen } from '../components/ui';
import { addDaysISO, isoToDate, todayISO } from '../lib/date';
import { hLight } from '../lib/haptics';
import { useApp } from '../state/AppContext';
import { colors, font, radius, shadow, spacing } from '../theme';

const ICONS = ['📌', '💼', '🍽️', '🏋️', '📞', '🎓', '🛌', '✈️', '🛒', '☕', '💗', '🎉'];

function minLabel(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}
function dayLabel(dateISO: string): string {
  const t = todayISO();
  if (dateISO === t) return 'Today';
  if (dateISO === addDaysISO(t, 1)) return 'Tomorrow';
  if (dateISO === addDaysISO(t, -1)) return 'Yesterday';
  const d = isoToDate(dateISO);
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()];
}
function longDate(dateISO: string): string {
  const d = isoToDate(dateISO);
  const mo = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
  return `${d.getDate()} ${mo} ${d.getFullYear()}`;
}

export default function ScheduleScreen({ navigation }: any) {
  const app = useApp();
  const partner = app.identity?.partnerName ?? 'them';
  const [viewDate, setViewDate] = useState(todayISO());

  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState<string | undefined>(undefined);
  const [startMin, setStartMin] = useState(9 * 60);
  const [note, setNote] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  const items = useMemo(
    () => app.schedule.filter((s) => s.date === viewDate).sort((a, b) => a.startMin - b.startMin),
    [app.schedule, viewDate],
  );

  const resetForm = () => {
    setTitle('');
    setIcon(undefined);
    setStartMin(9 * 60);
    setNote('');
    setAdding(false);
  };

  const save = async () => {
    if (!title.trim()) return;
    const payload = { date: viewDate, startMin, title: title.trim(), icon, note: note.trim() || undefined };
    resetForm();
    await app.addScheduleItem(payload);
  };

  const pickerInitial = useMemo(() => {
    const d = isoToDate(viewDate);
    d.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);
    return d.getTime();
  }, [viewDate, startMin]);

  return (
    <Screen scroll>
      <AppHeader
        title="Our day"
        subtitle="Share your plan, see each other's"
        onBack={() => navigation.goBack()}
        right={
          <Pressable onPress={() => setViewDate(todayISO())} style={styles.todayBtn}>
            <Text style={styles.todayText}>Today</Text>
          </Pressable>
        }
      />

      {/* Day selector */}
      <View style={styles.daySel}>
        <Pressable onPress={() => setViewDate(addDaysISO(viewDate, -1))} hitSlop={10} style={styles.dayNav}>
          <Text style={styles.dayNavText}>‹</Text>
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.dayLabel}>{dayLabel(viewDate)}</Text>
          <Muted>{longDate(viewDate)}</Muted>
        </View>
        <Pressable onPress={() => setViewDate(addDaysISO(viewDate, 1))} hitSlop={10} style={styles.dayNav}>
          <Text style={styles.dayNavText}>›</Text>
        </Pressable>
      </View>

      {/* Add */}
      {adding ? (
        <Card style={{ marginBottom: spacing.lg }}>
          <Field label="What's planned?" value={title} onChangeText={setTitle} placeholder="e.g. Team standup, gym, call with mom" />
          <Text style={styles.fieldLabel}>Pick an icon (optional)</Text>
          <View style={styles.iconRow}>
            {ICONS.map((ic) => (
              <Pressable key={ic} onPress={() => setIcon(icon === ic ? undefined : ic)} style={[styles.iconChip, icon === ic && styles.iconChipOn]}>
                <Text style={{ fontSize: 18 }}>{ic}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.fieldLabel}>Time</Text>
          <Pressable onPress={() => setPickerOpen(true)} style={styles.timeRow}>
            <Text style={styles.timeIcon}>🕑</Text>
            <Text style={styles.timeText}>{minLabel(startMin)}</Text>
            <Text style={styles.chev}>›</Text>
          </Pressable>
          <Field label="Note (optional)" value={note} onChangeText={setNote} placeholder="Anything to add" />
          <Button label="Add to plan" onPress={save} />
          <View style={{ height: spacing.sm }} />
          <Button label="Cancel" variant="ghost" onPress={resetForm} />
        </Card>
      ) : (
        <Button label="＋  Add to the plan" onPress={() => { hLight(); setAdding(true); }} style={{ marginBottom: spacing.lg }} />
      )}

      {/* Timeline */}
      {items.length === 0 ? (
        <Card tone="surface">
          <Muted style={{ textAlign: 'center' }}>
            Nothing planned for {dayLabel(viewDate).toLowerCase()} yet. Add what your day looks like so
            {' '}{partner} knows when you're free.
          </Muted>
        </Card>
      ) : (
        items.map((it) => {
          const mine = app.isMine(it.authorId);
          const accent = mine ? colors.primary : colors.accent;
          return (
            <View key={it.id} style={styles.itemRow}>
              <Text style={styles.itemTime}>{minLabel(it.startMin)}</Text>
              <View style={styles.rail}>
                <View style={styles.railLine} />
                <View style={[styles.dot, { backgroundColor: accent }]} />
              </View>
              <View style={[styles.itemCard, { borderLeftColor: accent }]}>
                <View style={styles.itemHead}>
                  {it.icon ? <Text style={{ fontSize: 16 }}>{it.icon}</Text> : null}
                  <Body style={{ fontFamily: font.family.semibold, flex: 1 }}>{it.title}</Body>
                  {mine ? (
                    <Pressable hitSlop={8} onPress={() => app.removeScheduleItem(it.id)}>
                      <Text style={styles.x}>×</Text>
                    </Pressable>
                  ) : null}
                </View>
                {it.note ? <Muted style={{ marginTop: 2 }}>{it.note}</Muted> : null}
                <Text style={[styles.author, { color: accent }]}>{mine ? 'You' : partner}</Text>
              </View>
            </View>
          );
        })
      )}

      <DateTimeModal
        visible={pickerOpen}
        mode="time"
        title="What time?"
        initial={pickerInitial}
        onCancel={() => setPickerOpen(false)}
        onConfirm={(ts) => {
          const d = new Date(ts);
          setStartMin(d.getHours() * 60 + d.getMinutes());
          setPickerOpen(false);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  todayBtn: { backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 6 },
  todayText: { fontFamily: font.family.bold, color: colors.primary, fontSize: font.size.sm },

  daySel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.lg, ...shadow.soft },
  dayNav: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt },
  dayNavText: { fontSize: 22, color: colors.text, fontFamily: font.family.bold },
  dayLabel: { fontSize: font.size.lg, fontFamily: font.family.displaySemi, color: colors.text },

  fieldLabel: { fontSize: font.size.sm, fontFamily: font.family.semibold, color: colors.textSoft, marginBottom: spacing.xs, marginTop: spacing.xs },
  iconRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  iconChip: { width: 42, height: 42, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt, borderWidth: 1.5, borderColor: 'transparent' },
  iconChipOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, height: 50, marginBottom: spacing.md },
  timeIcon: { fontSize: 18 },
  timeText: { flex: 1, fontSize: font.size.md, fontFamily: font.family.semibold, color: colors.text },
  chev: { fontSize: 22, color: colors.textFaint },

  itemRow: { flexDirection: 'row', alignItems: 'flex-start' },
  itemTime: { width: 66, fontSize: font.size.sm, fontFamily: font.family.bold, color: colors.textSoft, paddingTop: 14 },
  rail: { width: 22, alignSelf: 'stretch', alignItems: 'center' },
  railLine: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: colors.border },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 3, borderColor: colors.bg, marginTop: 12 },
  itemCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, borderLeftWidth: 4, padding: spacing.md, marginBottom: spacing.md, ...shadow.soft },
  itemHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  author: { fontSize: 11, fontFamily: font.family.bold, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: spacing.sm },
  x: { fontSize: 22, color: colors.textFaint, paddingHorizontal: 4 },
});
