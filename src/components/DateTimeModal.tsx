// A themed pop-up calendar + scroll-wheel time picker (no native dependency)
// that works on web and device alike, and matches the app's premium look.
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Wheel from './Wheel';
import { colors, font, radius, shadow, spacing } from '../theme';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MON_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WD_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const WD_FULL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const pad = (n: number) => String(n).padStart(2, '0');
const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 60 }, (_, i) => pad(i));
const AMPM = ['AM', 'PM'];

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

type Mode = 'datetime' | 'date' | 'time';

export default function DateTimeModal({
  visible,
  initial,
  onCancel,
  onConfirm,
  mode = 'datetime',
  allowPast = false,
  title,
}: {
  visible: boolean;
  initial: number;
  onCancel: () => void;
  onConfirm: (ts: number) => void;
  mode?: Mode;
  allowPast?: boolean;
  title?: string;
}) {
  const [viewY, setViewY] = useState(2026);
  const [viewM, setViewM] = useState(0);
  const [selY, setSelY] = useState(2026);
  const [selM, setSelM] = useState(0);
  const [selD, setSelD] = useState(1);
  const [hour, setHour] = useState(12);
  const [minute, setMinute] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const ms = initial && initial > 0 ? initial : Date.now();
    const base = new Date(Number.isNaN(new Date(ms).getTime()) ? Date.now() : ms);
    setViewY(base.getFullYear());
    setViewM(base.getMonth());
    setSelY(base.getFullYear());
    setSelM(base.getMonth());
    setSelD(base.getDate());
    setHour(base.getHours());
    setMinute(base.getMinutes());
  }, [visible, initial]);

  const today = startOfToday();
  const firstWeekday = new Date(viewY, viewM, 1).getDay();
  const daysInMonth = new Date(viewY, viewM + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  const atFloor = !allowPast && (viewY < today.getFullYear() || (viewY === today.getFullYear() && viewM <= today.getMonth()));

  const prevMonth = () => {
    if (atFloor) return;
    if (viewM === 0) { setViewY(viewY - 1); setViewM(11); } else setViewM(viewM - 1);
  };
  const nextMonth = () => {
    if (viewM === 11) { setViewY(viewY + 1); setViewM(0); } else setViewM(viewM + 1);
  };

  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const isPM = hour >= 12;
  const selWeekday = WD_FULL[new Date(selY, selM, selD).getDay()];
  const rk = `${visible ? 1 : 0}:${initial}`;

  const setFromWheels = (newH12: number, newIsPM: boolean, newMin: number) => {
    const base = newH12 % 12;
    setHour(newIsPM ? base + 12 : base);
    setMinute(newMin);
  };

  const confirm = () => {
    const d = new Date(selY, selM, selD, mode === 'date' ? 9 : hour, mode === 'date' ? 0 : minute, 0, 0);
    if (!Number.isNaN(d.getTime())) onConfirm(d.getTime());
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          {title ? <Text style={styles.title}>{title}</Text> : null}

          {mode !== 'time' ? (
            <>
              <View style={styles.monthHeader}>
                <Pressable onPress={prevMonth} hitSlop={12} disabled={atFloor} style={styles.navBtn}>
                  <Text style={[styles.navArrow, atFloor && { color: colors.border }]}>‹</Text>
                </Pressable>
                <Text style={styles.monthTitle}>{MONTHS[viewM]} {viewY}</Text>
                <Pressable onPress={nextMonth} hitSlop={12} style={styles.navBtn}>
                  <Text style={styles.navArrow}>›</Text>
                </Pressable>
              </View>

              <View style={styles.weekRow}>
                {WD_SHORT.map((w) => (
                  <Text key={w} style={styles.weekday}>{w}</Text>
                ))}
              </View>

              {rows.map((row, ri) => (
                <View key={ri} style={styles.dayRow}>
                  {row.map((d, ci) => {
                    if (d == null) return <View key={ci} style={styles.dayCell} />;
                    const cellDate = new Date(viewY, viewM, d);
                    const disabled = !allowPast && cellDate < today;
                    const selected = selY === viewY && selM === viewM && selD === d;
                    const isToday = cellDate.getTime() === today.getTime();
                    return (
                      <Pressable key={ci} style={styles.dayCell} disabled={disabled} onPress={() => { setSelY(viewY); setSelM(viewM); setSelD(d); }}>
                        <View style={[styles.dayInner, selected && styles.daySelected, !selected && isToday && styles.dayToday]}>
                          <Text style={[styles.dayText, disabled && styles.dayDisabled, selected && styles.daySelText]}>{d}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </>
          ) : null}

          {mode !== 'date' ? (
            <>
              {mode === 'datetime' ? <View style={styles.divider} /> : null}
              <View style={styles.timeTop}>
                <Text style={styles.timeWhen}>
                  {mode === 'time' ? 'Set the time' : `${selWeekday}, ${selD} ${MON_SHORT[selM]}`}
                </Text>
                <Text style={styles.timeBig}>{h12}:{pad(minute)} {isPM ? 'PM' : 'AM'}</Text>
              </View>
              <View style={styles.wheels}>
                <Wheel data={HOURS} initialIndex={h12 - 1} resetKey={rk} width={64}
                  onChange={(i) => setFromWheels(i + 1, isPM, minute)} />
                <Text style={styles.colon}>:</Text>
                <Wheel data={MINUTES} initialIndex={minute} resetKey={rk} width={64}
                  onChange={(i) => setFromWheels(h12, isPM, i)} />
                <Wheel data={AMPM} initialIndex={isPM ? 1 : 0} resetKey={rk} width={64}
                  onChange={(i) => setFromWheels(h12, i === 1, minute)} />
              </View>
            </>
          ) : null}

          <View style={styles.actions}>
            <Pressable onPress={onCancel} style={[styles.actionBtn, styles.cancelBtn]}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={confirm} style={[styles.actionBtn, styles.confirmBtn]}>
              <Text style={styles.confirmText}>Confirm</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  sheet: { width: '100%', maxWidth: 380, backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, ...shadow.hero },
  title: { fontSize: font.size.lg, fontFamily: font.family.displaySemi, color: colors.text, marginBottom: spacing.md, textAlign: 'center' },

  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  navBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, backgroundColor: colors.surfaceAlt },
  navArrow: { fontSize: 24, color: colors.text, fontFamily: font.family.bold, lineHeight: 26 },
  monthTitle: { fontSize: font.size.lg, fontFamily: font.family.displaySemi, color: colors.text },

  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekday: { flex: 1, textAlign: 'center', fontSize: 11, color: colors.textFaint, fontFamily: font.family.semibold },

  dayRow: { flexDirection: 'row' },
  dayCell: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayInner: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  daySelected: { backgroundColor: colors.primary, ...shadow.soft },
  dayToday: { borderWidth: 1.5, borderColor: colors.primary },
  dayText: { fontSize: font.size.md, color: colors.text, fontFamily: font.family.medium },
  daySelText: { color: colors.white, fontFamily: font.family.bold },
  dayDisabled: { color: colors.border },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: spacing.md },

  timeTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: spacing.xs },
  timeWhen: { fontSize: font.size.md, color: colors.textSoft, fontFamily: font.family.semibold },
  timeBig: { fontSize: font.size.xl, color: colors.text, fontFamily: font.family.displaySemi },
  wheels: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  colon: { fontSize: font.size.xl, fontFamily: font.family.bold, color: colors.textSoft },

  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  actionBtn: { flex: 1, height: 50, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { backgroundColor: colors.surfaceAlt },
  cancelText: { fontSize: font.size.md, color: colors.text, fontFamily: font.family.bold },
  confirmBtn: { backgroundColor: colors.primary, ...shadow.soft },
  confirmText: { fontSize: font.size.md, color: colors.white, fontFamily: font.family.bold },
});
