import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimeModal from '../components/DateTimeModal';
import { AppHeader, Body, Button, Card, Field, Muted, Screen } from '../components/ui';
import { addDaysISO, isoToDate, todayISO } from '../lib/date';
import { hLight } from '../lib/haptics';
import { useApp } from '../state/AppContext';
import { colors, font, radius, shadow, spacing } from '../theme';
import { ScheduleItem } from '../types/models';

const ICONS = ['📌', '💼', '🍽️', '🏋️', '📞', '🎓', '🛌', '✈️', '🛒', '☕', '💗', '🎉'];
const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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
function isoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function dayAt(dateISO: string, h: number, m: number): number {
  const d = isoToDate(dateISO);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}
function whenLabel(ts: number): string {
  const d = new Date(ts);
  return `${dayLabel(isoOf(d))} · ${minLabel(d.getHours() * 60 + d.getMinutes())}`;
}
function weekDays(centerISO: string): { iso: string; num: number; letter: string }[] {
  const c = isoToDate(centerISO);
  const sun = new Date(c);
  sun.setDate(c.getDate() - c.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sun);
    d.setDate(sun.getDate() + i);
    return { iso: isoOf(d), num: d.getDate(), letter: DOW[d.getDay()] };
  });
}
function weekRangeLabel(days: { iso: string }[]): string {
  if (days.some((d) => d.iso === todayISO())) return 'This week';
  const a = isoToDate(days[0].iso);
  const b = isoToDate(days[6].iso);
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()}–${b.getDate()} ${MON[b.getMonth()]}`
    : `${a.getDate()} ${MON[a.getMonth()]} – ${b.getDate()} ${MON[b.getMonth()]}`;
}

export default function ScheduleScreen({ navigation }: any) {
  const app = useApp();
  const partner = app.identity?.partnerName ?? 'them';
  const [mode, setMode] = useState<'day' | 'week'>('day');
  const [viewDate, setViewDate] = useState(todayISO());

  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState<string | undefined>(undefined);
  const [whenTs, setWhenTs] = useState(() => dayAt(todayISO(), 9, 0));
  const [note, setNote] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  const itemsFor = (iso: string) => app.schedule.filter((s) => s.date === iso).sort((a, b) => a.startMin - b.startMin);
  const dayItems = useMemo(() => itemsFor(viewDate), [app.schedule, viewDate]);
  const days = useMemo(() => weekDays(viewDate), [viewDate]);
  const activity = (iso: string) => {
    const its = app.schedule.filter((s) => s.date === iso);
    return { mine: its.some((s) => app.isMine(s.authorId)), theirs: its.some((s) => !app.isMine(s.authorId)) };
  };

  const openAdd = () => {
    hLight();
    setEditingId(null);
    setTitle('');
    setIcon(undefined);
    setNote('');
    setWhenTs(dayAt(viewDate, 9, 0));
    setAdding(true);
  };
  const openEdit = (it: ScheduleItem) => {
    hLight();
    setEditingId(it.id);
    setTitle(it.title);
    setIcon(it.icon);
    setNote(it.note ?? '');
    setWhenTs(dayAt(it.date, Math.floor(it.startMin / 60), it.startMin % 60));
    setAdding(true);
  };
  const closeForm = () => {
    setAdding(false);
    setEditingId(null);
    setTitle('');
    setIcon(undefined);
    setNote('');
  };

  const save = async () => {
    if (!title.trim()) return;
    const d = new Date(whenTs);
    const date = isoOf(d);
    const startMin = d.getHours() * 60 + d.getMinutes();
    const id = editingId;
    closeForm();
    if (mode === 'day' && date !== viewDate) setViewDate(date);
    if (id) await app.updateScheduleItem(id, { title: title.trim(), startMin, icon: icon ?? '', note, date });
    else await app.addScheduleItem({ date, startMin, title: title.trim(), icon, note: note.trim() || undefined });
  };

  const confirmDelete = (it: ScheduleItem) => {
    Alert.alert('Remove this plan?', `“${it.title}” will be removed from your day.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          if (editingId === it.id) closeForm();
          app.removeScheduleItem(it.id);
        },
      },
    ]);
  };

  const editingItem = editingId ? app.schedule.find((s) => s.id === editingId) ?? null : null;

  const renderItem = (it: ScheduleItem) => {
    const mine = app.isMine(it.authorId);
    const accent = mine ? colors.primary : colors.accent;
    const card = (
      <View style={[styles.itemCard, { borderLeftColor: accent }]}>
        <View style={styles.itemHead}>
          {it.icon ? <Text style={{ fontSize: 16 }}>{it.icon}</Text> : null}
          <Body style={{ fontFamily: font.family.semibold, flex: 1 }}>{it.title}</Body>
          {mine ? (
            <Pressable hitSlop={8} onPress={() => confirmDelete(it)}>
              <Text style={styles.x}>×</Text>
            </Pressable>
          ) : null}
        </View>
        {it.note ? <Muted style={{ marginTop: 2 }}>{it.note}</Muted> : null}
        <Text style={[styles.author, { color: accent }]}>{mine ? 'You · tap to edit' : partner}</Text>
      </View>
    );
    return (
      <View key={it.id} style={styles.itemRow}>
        <Text style={styles.itemTime}>{minLabel(it.startMin)}</Text>
        <View style={styles.rail}>
          <View style={styles.railLine} />
          <View style={[styles.dot, { backgroundColor: accent }]} />
        </View>
        <View style={{ flex: 1 }}>
          {mine ? <Pressable onPress={() => openEdit(it)}>{card}</Pressable> : card}
        </View>
      </View>
    );
  };

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

      {/* Day / Week toggle */}
      <View style={styles.segment}>
        {(['day', 'week'] as const).map((m) => (
          <Pressable key={m} onPress={() => setMode(m)} style={[styles.seg, mode === m && styles.segOn]}>
            <Text style={[styles.segText, mode === m && styles.segTextOn]}>{m === 'day' ? 'Day' : 'Week'}</Text>
          </Pressable>
        ))}
      </View>

      {/* Week strip */}
      <View style={styles.weekCard}>
        <View style={styles.weekHead}>
          <Pressable onPress={() => setViewDate(addDaysISO(viewDate, -7))} hitSlop={8} style={styles.wkNav}>
            <Text style={styles.wkNavText}>‹</Text>
          </Pressable>
          <Text style={styles.weekRange}>{weekRangeLabel(days)}</Text>
          <Pressable onPress={() => setViewDate(addDaysISO(viewDate, 7))} hitSlop={8} style={styles.wkNav}>
            <Text style={styles.wkNavText}>›</Text>
          </Pressable>
        </View>
        <View style={styles.weekRow}>
          {days.map((d) => {
            const act = activity(d.iso);
            const selected = d.iso === viewDate;
            const isToday = d.iso === todayISO();
            return (
              <Pressable
                key={d.iso}
                onPress={() => { setViewDate(d.iso); if (mode === 'week') setMode('day'); }}
                style={[styles.dayPill, selected && styles.dayPillOn]}
              >
                <Text style={[styles.pillLetter, selected && styles.pillOnText]}>{d.letter}</Text>
                <View style={[styles.pillNumWrap, isToday && !selected && styles.pillToday]}>
                  <Text style={[styles.pillNum, selected && styles.pillOnText, isToday && !selected && { color: colors.primary }]}>{d.num}</Text>
                </View>
                <View style={styles.pillDots}>
                  {act.mine ? <View style={[styles.pdot, { backgroundColor: selected ? colors.white : colors.primary }]} /> : null}
                  {act.theirs ? <View style={[styles.pdot, { backgroundColor: selected ? colors.white : colors.accent }]} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Add / edit form */}
      {adding ? (
        <Card style={{ marginBottom: spacing.lg }}>
          <Text style={styles.formTitle}>{editingId ? 'Edit plan' : 'Add to the plan'}</Text>
          <Field label="What's planned?" value={title} onChangeText={setTitle} placeholder="e.g. Team standup, gym, call with mom" />
          <Text style={styles.fieldLabel}>Pick an icon (optional)</Text>
          <View style={styles.iconRow}>
            {ICONS.map((ic) => (
              <Pressable key={ic} onPress={() => setIcon(icon === ic ? undefined : ic)} style={[styles.iconChip, icon === ic && styles.iconChipOn]}>
                <Text style={{ fontSize: 18 }}>{ic}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.fieldLabel}>When</Text>
          <Pressable onPress={() => setPickerOpen(true)} style={styles.pickRow}>
            <Text style={styles.pickIcon}>📅</Text>
            <Text style={styles.pickText}>{whenLabel(whenTs)}</Text>
            <Text style={styles.chev}>›</Text>
          </Pressable>
          <Field label="Note (optional)" value={note} onChangeText={setNote} placeholder="Anything to add" />
          <Button label={editingId ? 'Save changes' : 'Add to plan'} onPress={save} />
          {editingItem ? (
            <>
              <View style={{ height: spacing.sm }} />
              <Button label="Remove from plan" variant="outline" color={colors.danger} onPress={() => confirmDelete(editingItem)} />
            </>
          ) : null}
          <View style={{ height: spacing.sm }} />
          <Button label="Cancel" variant="ghost" onPress={closeForm} />
        </Card>
      ) : (
        <Button label="＋  Add to the plan" onPress={openAdd} style={{ marginBottom: spacing.lg }} />
      )}

      {/* Content */}
      {mode === 'day' ? (
        dayItems.length === 0 ? (
          <Card tone="surface">
            <Muted style={{ textAlign: 'center' }}>
              Nothing planned for {dayLabel(viewDate).toLowerCase()} yet. Add what your day looks like so {partner} knows when you're free.
            </Muted>
          </Card>
        ) : (
          dayItems.map(renderItem)
        )
      ) : (
        days.map((d) => {
          const its = itemsFor(d.iso);
          const isToday = d.iso === todayISO();
          return (
            <View key={d.iso} style={{ marginBottom: spacing.lg }}>
              <View style={styles.agendaHead}>
                <Text style={styles.agendaDay}>{dayLabel(d.iso)}</Text>
                <Muted>{d.num} {MON[isoToDate(d.iso).getMonth()]}</Muted>
                {isToday ? <View style={styles.todayTag}><Text style={styles.todayTagText}>Today</Text></View> : null}
              </View>
              {its.length === 0 ? (
                <Text style={styles.agendaEmpty}>Nothing planned</Text>
              ) : (
                its.map((it) => {
                  const mine = app.isMine(it.authorId);
                  const accent = mine ? colors.primary : colors.accent;
                  const row = (
                    <View style={[styles.weekItem, { borderLeftColor: accent }]}>
                      <Text style={styles.weekTime}>{minLabel(it.startMin)}</Text>
                      {it.icon ? <Text style={{ fontSize: 15 }}>{it.icon}</Text> : <View style={[styles.weekDot, { backgroundColor: accent }]} />}
                      <Body style={{ flex: 1 }} >{it.title}</Body>
                      <Text style={[styles.weekWho, { color: accent }]}>{mine ? 'You' : partner}</Text>
                    </View>
                  );
                  return (
                    <View key={it.id}>{mine ? <Pressable onPress={() => openEdit(it)}>{row}</Pressable> : row}</View>
                  );
                })
              )}
            </View>
          );
        })
      )}

      <DateTimeModal
        visible={pickerOpen}
        mode="datetime"
        allowPast
        title="When?"
        initial={whenTs}
        onCancel={() => setPickerOpen(false)}
        onConfirm={(ts) => {
          setWhenTs(ts);
          setPickerOpen(false);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  todayBtn: { backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 6 },
  todayText: { fontFamily: font.family.bold, color: colors.primary, fontSize: font.size.sm },

  segment: { flexDirection: 'row', backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, padding: 4, marginBottom: spacing.md },
  seg: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.pill, alignItems: 'center' },
  segOn: { backgroundColor: colors.surface, ...shadow.soft },
  segText: { fontSize: font.size.sm, fontFamily: font.family.semibold, color: colors.textSoft },
  segTextOn: { color: colors.text },

  weekCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.lg, ...shadow.soft },
  weekHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  wkNav: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt },
  wkNavText: { fontSize: 18, color: colors.text, fontFamily: font.family.bold },
  weekRange: { fontSize: font.size.md, fontFamily: font.family.displaySemi, color: colors.text },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayPill: { flex: 1, marginHorizontal: 2, alignItems: 'center', paddingVertical: 6, borderRadius: radius.md },
  dayPillOn: { backgroundColor: colors.primary, ...shadow.soft },
  pillLetter: { fontSize: 11, fontFamily: font.family.semibold, color: colors.textFaint },
  pillOnText: { color: colors.white },
  pillNumWrap: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  pillToday: { borderWidth: 1.5, borderColor: colors.primary },
  pillNum: { fontSize: font.size.md, fontFamily: font.family.bold, color: colors.text },
  pillDots: { flexDirection: 'row', gap: 2, height: 6, marginTop: 3 },
  pdot: { width: 5, height: 5, borderRadius: 3 },

  formTitle: { fontSize: font.size.md, fontFamily: font.family.displaySemi, color: colors.text, marginBottom: spacing.sm },
  fieldLabel: { fontSize: font.size.sm, fontFamily: font.family.semibold, color: colors.textSoft, marginBottom: spacing.xs, marginTop: spacing.xs },
  iconRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  iconChip: { width: 42, height: 42, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt, borderWidth: 1.5, borderColor: 'transparent' },
  iconChipOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, height: 50, marginBottom: spacing.md },
  pickIcon: { fontSize: 18 },
  pickText: { flex: 1, fontSize: font.size.md, fontFamily: font.family.semibold, color: colors.text },
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

  agendaHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  agendaDay: { fontSize: font.size.lg, fontFamily: font.family.displaySemi, color: colors.text },
  todayTag: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 2 },
  todayTagText: { color: colors.white, fontSize: 10, fontFamily: font.family.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  agendaEmpty: { fontSize: font.size.sm, color: colors.textFaint, fontFamily: font.family.body, marginLeft: 4, marginBottom: spacing.sm },
  weekItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md, borderLeftWidth: 4, padding: spacing.md, marginBottom: spacing.sm, ...shadow.soft },
  weekTime: { width: 62, fontSize: font.size.xs, fontFamily: font.family.bold, color: colors.textSoft },
  weekDot: { width: 10, height: 10, borderRadius: 5 },
  weekWho: { fontSize: 10, fontFamily: font.family.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
});
