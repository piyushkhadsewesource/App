import { Image } from 'expo-image';
import React, { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  AppHeader,
  Body,
  Button,
  Card,
  EmptyState,
  Field,
  Muted,
  Screen,
  Tag,
  Title,
} from '../components/ui';
import { addDaysISO, formatDate, todayISO } from '../lib/date';
import { monthMatrix, monthTitle, shiftMonth, WEEKDAYS } from '../lib/calendar';
import {
  captureStreak,
  daysWithMoments,
  groupByDay,
  hasMomentToday,
  momentsForDate,
} from '../lib/moments';
import { capturePhoto, PhotoSource } from '../services/photo';
import { useApp } from '../state/AppContext';
import { colors, font, radius, shadow, spacing } from '../theme';
import { ISODate, Moment } from '../types/models';

function dayLabel(date: ISODate): string {
  const today = todayISO();
  if (date === today) return 'Today';
  if (date === addDaysISO(today, -1)) return 'Yesterday';
  return formatDate(date);
}

export default function MomentsScreen() {
  const app = useApp();
  const { moments, meId } = app;

  const [view, setView] = useState<'feed' | 'calendar'>('feed');
  const [pending, setPending] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [viewing, setViewing] = useState<Moment | null>(null);

  const now = new Date();
  const [cal, setCal] = useState({ year: now.getFullYear(), month0: now.getMonth() });
  const [selectedDay, setSelectedDay] = useState<ISODate>(todayISO());

  const streak = useMemo(() => captureStreak(moments, meId), [moments, meId]);
  const doneToday = hasMomentToday(moments, meId);
  const groups = useMemo(() => groupByDay(moments), [moments]);
  const markedDays = useMemo(() => daysWithMoments(moments), [moments]);
  const weeks = useMemo(() => monthMatrix(cal.year, cal.month0), [cal]);
  const selectedMoments = useMemo(() => momentsForDate(moments, selectedDay), [moments, selectedDay]);

  async function pick(source: PhotoSource) {
    try {
      const uri = await capturePhoto(source);
      if (uri) {
        setPending(uri);
        setCaption('');
      }
    } catch (e) {
      Alert.alert(
        source === 'camera' ? 'Camera unavailable' : 'Photos unavailable',
        source === 'camera'
          ? 'We could not open the camera here. Try "Choose" to pick a photo instead.'
          : 'Please allow photo access, then try again.',
      );
    }
  }

  async function shareMoment() {
    if (!pending) return;
    await app.addMoment({ image: pending, caption: caption.trim() || undefined });
    setPending(null);
    setCaption('');
  }

  return (
    <Screen scroll>
      <AppHeader
        title="Moments"
        subtitle="A photo a day, together"
        right={streak > 0 ? <Tag label={`🔥 ${streak} day${streak === 1 ? '' : 's'}`} color={colors.warn} /> : undefined}
      />

      {/* Capture / compose */}
      {pending ? (
        <Card style={{ marginBottom: spacing.lg }}>
          <Image source={{ uri: pending }} style={styles.preview} contentFit="cover" />
          <Field
            value={caption}
            onChangeText={setCaption}
            placeholder="Add a few words (optional)…"
            multiline
            style={{ marginTop: spacing.md }}
          />
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <Button label="Share moment" onPress={shareMoment} style={{ flex: 1 }} />
            <Button label="Discard" variant="ghost" onPress={() => setPending(null)} style={{ flex: 1 }} />
          </View>
        </Card>
      ) : (
        <Card tone={doneToday ? 'surface' : 'rose'} style={{ marginBottom: spacing.lg }}>
          <Title>{doneToday ? 'Add another moment' : 'Capture today’s moment'}</Title>
          <Muted style={{ marginTop: 4 }}>
            {doneToday
              ? 'You’ve captured today. Add more any time.'
              : 'One photo from your day keeps the gallery growing. Your partner sees it too.'}
          </Muted>
          <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.md }}>
            <Button label="📷  Take photo" onPress={() => pick('camera')} style={{ flex: 1 }} />
            <Button label="🖼️  Choose" variant="soft" onPress={() => pick('library')} style={{ flex: 1 }} />
          </View>
        </Card>
      )}

      {/* View switch */}
      <View style={styles.segment}>
        <SegBtn label="Feed" active={view === 'feed'} onPress={() => setView('feed')} />
        <SegBtn label="Calendar" active={view === 'calendar'} onPress={() => setView('calendar')} />
      </View>

      {view === 'feed' ? (
        groups.length === 0 ? (
          <Card>
            <EmptyState emoji="📸" title="No moments yet" text="Capture your first photo above. A year from now, this gallery will mean everything." />
          </Card>
        ) : (
          <View style={{ gap: spacing.xl }}>
            {groups.map((g) => (
              <View key={g.date}>
                <Text style={styles.dayHeader}>{dayLabel(g.date)}</Text>
                <View style={styles.grid}>
                  {g.items.map((m) => (
                    <Pressable key={m.id} style={styles.thumbWrap} onPress={() => setViewing(m)}>
                      <Image source={{ uri: m.image }} style={styles.thumb} contentFit="cover" />
                      <View style={styles.thumbTag}>
                        <Text style={styles.thumbTagText}>{app.isMine(m.authorId) ? 'You' : app.authorName(m.authorId)}</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )
      ) : (
        <CalendarView
          weeks={weeks}
          year={cal.year}
          month0={cal.month0}
          marked={markedDays}
          moments={moments}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
          onShiftMonth={(d) => setCal((c) => shiftMonth(c.year, c.month0, d))}
          selectedMoments={selectedMoments}
          onOpen={setViewing}
          authorName={(id) => (app.isMine(id) ? 'You' : app.authorName(id))}
        />
      )}

      {/* Full-photo viewer */}
      <Modal visible={!!viewing} transparent animationType="fade" onRequestClose={() => setViewing(null)}>
        <View style={styles.modalBg}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setViewing(null)} />
          {viewing ? (
            <View style={styles.modalCard}>
              <Image source={{ uri: viewing.image }} style={styles.modalImage} contentFit="contain" />
              <View style={{ padding: spacing.lg }}>
                <Muted>
                  {dayLabel(viewing.date)} · {app.isMine(viewing.authorId) ? 'You' : app.authorName(viewing.authorId)}
                </Muted>
                {viewing.caption ? <Body style={{ marginTop: 4 }}>{viewing.caption}</Body> : null}
                <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.md }}>
                  <Button label="Close" variant="soft" onPress={() => setViewing(null)} style={{ flex: 1 }} />
                  {app.isMine(viewing.authorId) ? (
                    <Button
                      label="Delete"
                      variant="outline"
                      color={colors.danger}
                      style={{ flex: 1 }}
                      onPress={() => {
                        const id = viewing.id;
                        setViewing(null);
                        Alert.alert('Delete this moment?', 'This cannot be undone.', [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Delete', style: 'destructive', onPress: () => app.removeMoment(id) },
                        ]);
                      }}
                    />
                  ) : null}
                </View>
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </Screen>
  );
}

function SegBtn({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.segBtn, active && styles.segBtnActive]}>
      <Text style={[styles.segText, active && styles.segTextActive]}>{label}</Text>
    </Pressable>
  );
}

function CalendarView({
  weeks,
  year,
  month0,
  marked,
  moments,
  selectedDay,
  onSelectDay,
  onShiftMonth,
  selectedMoments,
  onOpen,
  authorName,
}: {
  weeks: ReturnType<typeof monthMatrix>;
  year: number;
  month0: number;
  marked: Set<ISODate>;
  moments: Moment[];
  selectedDay: ISODate;
  onSelectDay: (d: ISODate) => void;
  onShiftMonth: (delta: number) => void;
  selectedMoments: Moment[];
  onOpen: (m: Moment) => void;
  authorName: (id: string) => string;
}) {
  const firstByDay = useMemo(() => {
    const map = new Map<ISODate, Moment>();
    for (const m of moments) if (!map.has(m.date)) map.set(m.date, m);
    return map;
  }, [moments]);

  return (
    <View>
      <Card>
        <View style={styles.calHead}>
          <Pressable onPress={() => onShiftMonth(-1)} hitSlop={12}>
            <Text style={styles.calArrow}>‹</Text>
          </Pressable>
          <Text style={styles.calTitle}>{monthTitle(year, month0)}</Text>
          <Pressable onPress={() => onShiftMonth(1)} hitSlop={12}>
            <Text style={styles.calArrow}>›</Text>
          </Pressable>
        </View>

        <View style={styles.weekRow}>
          {WEEKDAYS.map((w, i) => (
            <Text key={i} style={styles.weekday}>{w}</Text>
          ))}
        </View>

        {weeks.map((week, wi) => (
          <View key={wi} style={styles.weekRow}>
            {week.map((cell, ci) => {
              if (!cell.date) return <View key={ci} style={styles.cell} />;
              const has = marked.has(cell.date);
              const isSel = cell.date === selectedDay;
              const thumb = firstByDay.get(cell.date);
              return (
                <Pressable key={ci} style={styles.cell} onPress={() => onSelectDay(cell.date!)}>
                  <View style={[styles.cellInner, isSel && styles.cellSelected]}>
                    {has && thumb ? (
                      <Image source={{ uri: thumb.image }} style={styles.cellImage} contentFit="cover" />
                    ) : null}
                    <Text style={[styles.cellDay, has && styles.cellDayOnImage]}>{cell.day}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </Card>

      <Text style={styles.dayHeader}>{dayLabel(selectedDay)}</Text>
      {selectedMoments.length === 0 ? (
        <Card>
          <EmptyState emoji="🗓️" title="No photos this day" text="Pick another date, or capture a moment today." />
        </Card>
      ) : (
        <View style={{ gap: spacing.md }}>
          {selectedMoments.map((m) => (
            <Pressable key={m.id} onPress={() => onOpen(m)}>
              <Card style={{ padding: 0, overflow: 'hidden' }}>
                <Image source={{ uri: m.image }} style={styles.bigPhoto} contentFit="cover" />
                <View style={{ padding: spacing.md }}>
                  <Muted>{authorName(m.authorId)}</Muted>
                  {m.caption ? <Body style={{ marginTop: 2 }}>{m.caption}</Body> : null}
                </View>
              </Card>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  preview: { width: '100%', aspectRatio: 4 / 5, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },

  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    padding: 4,
    marginBottom: spacing.lg,
  },
  segBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.pill, alignItems: 'center' },
  segBtnActive: { backgroundColor: colors.surface, ...shadow.soft },
  segText: { fontSize: font.size.md, fontWeight: font.weight.semibold, color: colors.textSoft },
  segTextActive: { color: colors.text },

  dayHeader: { fontSize: font.size.md, fontWeight: font.weight.bold, color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  thumbWrap: { width: '31.8%', aspectRatio: 1, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surfaceAlt },
  thumb: { width: '100%', height: '100%' },
  thumbTag: { position: 'absolute', left: 6, bottom: 6, backgroundColor: 'rgba(46,42,42,0.55)', borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  thumbTagText: { color: colors.white, fontSize: 10, fontWeight: font.weight.semibold },

  calHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  calArrow: { fontSize: 26, color: colors.primary, fontWeight: font.weight.bold, width: 36, textAlign: 'center' },
  calTitle: { fontSize: font.size.lg, fontWeight: font.weight.bold, color: colors.text },
  weekRow: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', fontSize: 11, color: colors.textFaint, fontWeight: font.weight.semibold, marginBottom: 4 },
  cell: { flex: 1, aspectRatio: 1, padding: 2 },
  cellInner: { flex: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: 'transparent' },
  cellSelected: { borderWidth: 2, borderColor: colors.primary },
  cellImage: { ...StyleSheet.absoluteFillObject },
  cellDay: { fontSize: font.size.sm, color: colors.textSoft, fontWeight: font.weight.medium },
  cellDayOnImage: { color: colors.white, fontWeight: font.weight.bold, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 3 },

  bigPhoto: { width: '100%', aspectRatio: 4 / 5 },

  modalBg: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  modalCard: { width: '100%', maxWidth: 460, backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' },
  modalImage: { width: '100%', aspectRatio: 1, backgroundColor: colors.surfaceAlt },
});
