import React, { useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Alert } from '../lib/alert';
import DateTimeModal from '../components/DateTimeModal';
import GoldenBand from '../components/GoldenBand';
import Sheet from '../components/Sheet';
import { AppHeader, Body, Button, Card, EmptyState, Field, Muted, Screen } from '../components/ui';
import { Reveal } from '../components/Motion';
import { useToast } from '../components/ToastHost';
import { addDaysISO, isoToDate, todayISO } from '../lib/date';
import { hLight, hSuccess } from '../lib/haptics';
import { freeAfterMin, goldenWindow, minLabel } from '../lib/ourDay';
import { useApp } from '../state/AppContext';
import { colors, font, radius, shadow, spacing } from '../theme';
import { easeOut, prefersReducedMotion } from '../theme/motion';
import { ScheduleItem } from '../types/models';

const ICONS = ['📌', '💼', '🍽️', '🏋️', '📞', '🎓', '🛌', '✈️', '🛒', '☕', '💗', '🎉'];
const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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
  const toast = useToast();
  const [viewDate, setViewDate] = useState(todayISO());

  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState<string | undefined>(undefined);
  const [whenTs, setWhenTs] = useState(() => dayAt(todayISO(), 9, 0));
  const [note, setNote] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  const itemsFor = (iso: string) => app.schedule.filter((s) => s.date === iso).sort((a, b) => a.startMin - b.startMin);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const dayItems = useMemo(() => itemsFor(viewDate), [app.schedule, viewDate]);

  // ── The ritual header: when do you each come free, and where's the shared
  //    window? Computed from the same items the timeline shows. ─────────────
  const ritual = useMemo(() => {
    const isToday = viewDate === todayISO();
    const fromMin = isToday ? new Date().getHours() * 60 + new Date().getMinutes() : 0;
    const mine = dayItems.filter((s) => app.isMine(s.authorId) && s.kind !== 'moment');
    const theirs = dayItems.filter((s) => !app.isMine(s.authorId) && s.kind !== 'moment');
    return {
      isToday,
      fromMin,
      mine,
      theirs,
      myFree: freeAfterMin(mine, fromMin),
      theirFree: theirs.length > 0 ? freeAfterMin(theirs, fromMin) : undefined, // undefined = day not shared yet
      window: goldenWindow(mine, theirs, fromMin),
      theirsShared: theirs.length > 0,
    };
  }, [dayItems, viewDate, app]);

  const proposeMoment = () => {
    if (!ritual.window) return;
    hSuccess();
    toast.show(`Asked ${partner} to keep ${minLabel(ritual.window.start)} for you 💗`, 2600);
    void app.addScheduleItem({
      date: viewDate,
      startMin: ritual.window.start,
      endMin: Math.min(ritual.window.start + 60, 1439),
      title: 'A moment together',
      icon: '💗',
      kind: 'moment',
    });
  };
  const days = useMemo(() => weekDays(viewDate), [viewDate]);
  const myPrevItems = useMemo(
    () => app.schedule.filter((s) => s.date === addDaysISO(viewDate, -1) && s.authorId === app.meId),
    [app.schedule, viewDate, app.meId],
  );
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
    if (date !== viewDate) setViewDate(date);
    if (id) await app.updateScheduleItem(id, { title: title.trim(), startMin, icon: icon ?? '', note, date });
    else await app.addScheduleItem({ date, startMin, title: title.trim(), icon, note: note.trim() || undefined });
  };

  const confirmDelete = (it: ScheduleItem) => {
    Alert.alert('Remove this plan?', `"${it.title}" will be removed from your day.`, [
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

  const copyPrev = () => {
    hLight();
    app.copyScheduleDay(addDaysISO(viewDate, -1), viewDate);
  };
  const duplicate = () => {
    if (!editingItem) return;
    const it = editingItem;
    closeForm();
    app.addScheduleItem({ date: it.date, startMin: it.startMin, title: it.title, icon: it.icon, note: it.note });
  };

  const renderItem = (it: ScheduleItem, index: number) => {
    const mine = app.isMine(it.authorId);
    const accent = mine ? colors.primary : colors.accent;
    const isMoment = it.kind === 'moment';
    const isBusy = it.kind === 'busy';
    const accepted = isMoment && !!it.acceptedBy;
    const card = (
      <View
        style={[
          styles.itemCard,
          isMoment && styles.momentCard,
          isBusy && styles.busyCard,
        ]}
      >
        <View style={styles.itemHead}>
          {isBusy ? <Text style={{ fontSize: 15 }}>🗓️</Text> : it.icon ? <Text style={{ fontSize: 16 }}>{it.icon}</Text> : null}
          <Body style={{ fontFamily: font.family.semibold, flex: 1 }}>{it.title}</Body>
          {mine && !isBusy ? (
            <Pressable hitSlop={14} onPress={() => confirmDelete(it)} accessibilityRole="button" accessibilityLabel={`Remove ${it.title}`}>
              <Text style={styles.x}>×</Text>
            </Pressable>
          ) : null}
        </View>
        {it.note ? <Muted style={{ marginTop: 2 }}>{it.note}</Muted> : null}
        {isMoment ? (
          accepted ? (
            <Text style={styles.momentState}>You're both in 🤍</Text>
          ) : !mine ? (
            <View style={{ marginTop: spacing.sm }}>
              <Button
                label="I'll be there 🤍"
                onPress={() => {
                  hSuccess();
                  void app.updateScheduleItem(it.id, { acceptedBy: app.meId });
                }}
              />
            </View>
          ) : (
            <Text style={styles.momentState}>waiting for {partner}…</Text>
          )
        ) : isBusy ? (
          <Text style={[styles.author, { color: colors.textFaint }]}>{mine ? 'you' : partner} · from calendar</Text>
        ) : !mine ? (
          // Partner plans carry their name in violet; my own cards need no
          // label (the rose rail dot says whose they are, the tap edits).
          <Text style={[styles.author, { color: accent }]}>{partner}</Text>
        ) : null}
      </View>
    );
    const editable = mine && !isBusy;
    return (
      <Reveal key={it.id} delay={Math.min(index, 8) * 40}>
        <View style={styles.itemRow}>
          <Text style={styles.itemTime}>{minLabel(it.startMin)}</Text>
          <View style={styles.rail}>
            <View style={styles.railLine} />
            <View style={[styles.dot, { backgroundColor: isMoment ? colors.primaryDark : isBusy ? colors.textFaint : accent }]} />
          </View>
          <View style={{ flex: 1 }}>
            {editable && !isMoment ? (
              <Pressable onPress={() => openEdit(it)} style={({ pressed }) => (pressed ? { opacity: 0.8 } : null)}>{card}</Pressable>
            ) : (
              card
            )}
          </View>
        </View>
      </Reveal>
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

      {/* ── The ritual: the shape of the day, then the words for it ── */}
      <View style={styles.ritualCard}>
        <Text style={styles.ritualKicker}>{ritual.isToday ? 'Tonight' : dayLabel(viewDate)}</Text>
        {ritual.window ? (
          <Text style={styles.ritualLine}>
            {ritual.theirsShared
              ? `You're both free ${minLabel(ritual.window.start)} – ${minLabel(ritual.window.end)}`
              : `You're free from ${minLabel(ritual.window.start)}`}
          </Text>
        ) : (
          <Text style={styles.ritualLine}>
            {ritual.myFree != null ? `You come free around ${minLabel(ritual.myFree)}` : 'A full day, side by side'}
          </Text>
        )}

        {/* The Golden Band: both lanes on one track, the shared hour glowing */}
        {dayItems.length > 0 ? (
          <GoldenBand
            mine={ritual.mine}
            theirs={ritual.theirs}
            window={ritual.window}
            nowMin={ritual.isToday ? ritual.fromMin : undefined}
            style={{ marginTop: spacing.md }}
          />
        ) : null}

        <Muted style={{ marginTop: spacing.sm }}>
          {ritual.window
            ? ritual.theirsShared
              ? ritual.theirFree != null
                ? `${partner} comes free around ${minLabel(ritual.theirFree)} · you around ${ritual.myFree != null ? minLabel(ritual.myFree) : 'now'}`
                : `${partner}'s day is clear too`
              : `${partner} hasn't shared ${ritual.isToday ? 'today' : 'this day'} yet, theirs will appear here`
            : ritual.theirsShared
              ? 'No shared hour left. Even ten minutes counts 🤍'
              : `Add your day below so ${partner} knows when to find you.`}
        </Muted>

        {ritual.window && ritual.theirsShared && !dayItems.some((s) => s.kind === 'moment') ? (
          <HoldToPromise
            label={`Hold to keep ${minLabel(ritual.window.start)} for each other 💗`}
            onCommit={proposeMoment}
            style={{ marginTop: spacing.md }}
          />
        ) : null}
      </View>

      {/* Week strip */}
      <View style={styles.weekCard}>
        <View style={styles.weekHead}>
          <Pressable onPress={() => setViewDate(addDaysISO(viewDate, -7))} hitSlop={12} style={styles.wkNav} accessibilityRole="button" accessibilityLabel="Previous week">
            <Text style={styles.wkNavText}>‹</Text>
          </Pressable>
          <Text style={styles.weekRange}>{weekRangeLabel(days)}</Text>
          <Pressable onPress={() => setViewDate(addDaysISO(viewDate, 7))} hitSlop={12} style={styles.wkNav} accessibilityRole="button" accessibilityLabel="Next week">
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
                onPress={() => setViewDate(d.iso)}
                accessibilityRole="button"
                accessibilityLabel={`${dayLabel(d.iso)} ${d.num}`}
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

      <View style={{ marginBottom: spacing.lg }}>
        <Button label="＋  Add to the plan" onPress={openAdd} />
        {myPrevItems.length > 0 ? (
          <>
            <View style={{ height: spacing.sm }} />
            <Button label={`📋  Copy ${dayLabel(addDaysISO(viewDate, -1)).toLowerCase()}'s plan`} variant="soft" onPress={copyPrev} />
          </>
        ) : null}
      </View>

      {/* The timeline */}
      {dayItems.length === 0 ? (
        <Card tone="surface">
          <EmptyState
            emoji="🗓️"
            title={`Nothing planned ${dayLabel(viewDate).toLowerCase()}`}
            text={`Add what your day looks like so ${partner} knows when you’re free.`}
          />
        </Card>
      ) : (
        dayItems.map(renderItem)
      )}

      {/* Add / edit, in a sheet so the day behind never jumps */}
      <Sheet visible={adding} onClose={closeForm}>
        <Text style={styles.formTitle}>{editingId ? 'Edit plan' : 'Add to the plan'}</Text>
        <Field label="What's planned?" value={title} onChangeText={setTitle} placeholder="e.g. Team standup, gym, call with mom" />
        <Text style={styles.fieldLabel}>Pick an icon (optional)</Text>
        <View style={styles.iconRow}>
          {ICONS.map((ic) => (
            <Pressable
              key={ic}
              onPress={() => setIcon(icon === ic ? undefined : ic)}
              accessibilityRole="button"
              accessibilityLabel={`Icon ${ic}`}
              accessibilityState={{ selected: icon === ic }}
              style={[styles.iconChip, icon === ic && styles.iconChipOn]}
            >
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
            <Button label="Duplicate this plan" variant="soft" onPress={duplicate} />
            <View style={{ height: spacing.sm }} />
            <Button label="Remove from plan" variant="outline" color={colors.danger} onPress={() => confirmDelete(editingItem)} />
          </>
        ) : null}
        <View style={{ height: spacing.sm }} />
        <Button label="Cancel" variant="ghost" onPress={closeForm} />

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
      </Sheet>
    </Screen>
  );
}

/**
 * Hold-to-promise: the propose-a-moment commitment control. Pressing fills the
 * pill left-to-right over ~900ms (slow, linear: the user is deciding); letting
 * go early snaps back in ~130ms (fast: the system is responding). Completing
 * the fill commits. Under reduced motion it's a plain tap.
 */
function HoldToPromise({
  label,
  onCommit,
  style,
}: {
  label: string;
  onCommit: () => void;
  style?: object;
}) {
  const fill = useRef(new Animated.Value(0)).current;
  const [w, setW] = useState(0);
  const committed = useRef(false);
  const reduce = prefersReducedMotion();

  const start = () => {
    if (reduce) return;
    committed.current = false;
    Animated.timing(fill, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true }).start(({ finished }) => {
      if (finished && !committed.current) {
        committed.current = true;
        onCommit();
        fill.setValue(0);
      }
    });
  };
  const cancel = () => {
    if (committed.current) return;
    Animated.timing(fill, { toValue: 0, duration: 130, easing: easeOut, useNativeDriver: true }).start();
  };
  const tx = fill.interpolate({ inputRange: [0, 1], outputRange: [-Math.max(w, 1), 0] });

  return (
    <Pressable
      onPressIn={start}
      onPressOut={cancel}
      onPress={reduce ? onCommit : undefined}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={reduce ? undefined : 'Press and hold to confirm'}
      style={[styles.hold, style]}
    >
      <Text style={styles.holdLabelDark} numberOfLines={1}>{label}</Text>
      {w > 0 ? (
        // The fill window slides in; the inner counter-translate keeps the
        // white label pinned in place, so the color sweeps across the text.
        <Animated.View style={[StyleSheet.absoluteFill, styles.holdFill, { transform: [{ translateX: tx }] }]}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.holdFillInner, { transform: [{ translateX: Animated.multiply(tx, -1) }] }]}>
            <Text style={styles.holdLabelLight} numberOfLines={1}>{label}</Text>
          </Animated.View>
        </Animated.View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  todayBtn: { backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 6 },
  todayText: { fontFamily: font.family.bold, color: colors.primary, fontSize: font.size.sm },

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

  formTitle: { fontSize: font.size.lg, fontFamily: font.family.displaySemi, color: colors.text, marginBottom: spacing.sm, letterSpacing: font.tracking.heading },
  fieldLabel: { fontSize: font.size.sm, fontFamily: font.family.semibold, color: colors.textSoft, marginBottom: spacing.xs, marginTop: spacing.xs },
  iconRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  iconChip: { width: 42, height: 42, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt, borderWidth: 1.5, borderColor: 'transparent' },
  iconChipOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, height: 50, marginBottom: spacing.md },
  pickIcon: { fontSize: 18 },
  pickText: { flex: 1, fontSize: font.size.md, fontFamily: font.family.semibold, color: colors.text },
  chev: { fontSize: 22, color: colors.textFaint },

  ritualCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg + spacing.xs,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    ...shadow.card,
  },
  ritualKicker: { fontSize: font.size.sm, fontFamily: font.family.semibold, color: colors.textSoft, marginBottom: 2, letterSpacing: font.tracking.label },
  ritualLine: {
    fontSize: font.size.xl,
    lineHeight: 28,
    fontFamily: font.family.displaySemi,
    color: colors.text,
    letterSpacing: font.tracking.heading,
  },

  hold: {
    height: 54,
    borderRadius: radius.pill,
    overflow: 'hidden',
    backgroundColor: colors.primarySoft,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  holdFill: { backgroundColor: colors.primary, borderRadius: radius.pill },
  holdFillInner: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  holdLabelDark: { fontSize: font.size.md, fontFamily: font.family.bold, color: colors.primaryDark, letterSpacing: 0.3 },
  holdLabelLight: { fontSize: font.size.md, fontFamily: font.family.bold, color: colors.white, letterSpacing: 0.3 },

  itemRow: { flexDirection: 'row', alignItems: 'flex-start' },
  itemTime: { width: 66, fontSize: font.size.sm, fontFamily: font.family.bold, color: colors.textSoft, paddingTop: 14 },
  rail: { width: 22, alignSelf: 'stretch', alignItems: 'center' },
  railLine: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: colors.border },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 3, borderColor: colors.bg, marginTop: 12 },
  itemCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(90,46,64,0.08)', padding: spacing.md, marginBottom: spacing.md, ...shadow.soft },
  momentCard: { backgroundColor: colors.primarySoft, borderColor: 'rgba(232,99,140,0.25)' },
  busyCard: { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
  momentState: { marginTop: spacing.sm, fontSize: font.size.sm, fontFamily: font.family.semibold, color: colors.primaryDark, fontStyle: 'italic' },
  itemHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  author: { fontSize: 11, fontFamily: font.family.bold, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: spacing.sm },
  x: { fontSize: 22, color: colors.textFaint, paddingHorizontal: 4 },
});
