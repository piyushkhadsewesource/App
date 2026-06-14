import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
  SectionTitle,
  Title,
} from '../components/ui';
import { formatCountdown, formatDate, isoToDate, now, todayISO } from '../lib/date';
import { useApp } from '../state/AppContext';
import { colors, font, spacing } from '../theme';

const DAY = 24 * 3600 * 1000;
const PRESETS: { key: string; label: string; ms: number }[] = [
  { key: 'tom', label: 'Tomorrow', ms: DAY },
  { key: 'week', label: 'In a week', ms: 7 * DAY },
  { key: 'month', label: 'In a month', ms: 30 * DAY },
];

export default function LettersScreen({ navigation }: any) {
  const app = useApp();
  const { letters, meId, identity } = app;
  const partnerName = identity?.partnerName ?? 'them';

  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [occasion, setOccasion] = useState('');
  const [preset, setPreset] = useState('week');
  const [customDate, setCustomDate] = useState('');

  const t = Date.now();
  const ready = useMemo(
    () => letters.filter((l) => l.authorId !== meId && l.deliverAt <= t && !l.openedAt).sort((a, b) => b.deliverAt - a.deliverAt),
    [letters, meId, t],
  );
  const sealed = useMemo(
    () => letters.filter((l) => l.authorId !== meId && l.deliverAt > t).sort((a, b) => a.deliverAt - b.deliverAt),
    [letters, meId, t],
  );
  const opened = useMemo(
    () => letters.filter((l) => l.authorId !== meId && !!l.openedAt).sort((a, b) => (b.openedAt ?? 0) - (a.openedAt ?? 0)),
    [letters, meId],
  );
  const mine = useMemo(
    () => letters.filter((l) => l.authorId === meId).sort((a, b) => a.deliverAt - b.deliverAt),
    [letters, meId],
  );

  function deliverAtFromInputs(): number {
    if (customDate.trim()) {
      const d = isoToDate(customDate.trim());
      if (!isNaN(d.getTime())) return Math.max(now(), d.getTime());
    }
    const p = PRESETS.find((x) => x.key === preset) ?? PRESETS[1];
    return now() + p.ms;
  }

  async function sendLetter() {
    await app.addLetter({
      title: title.trim(),
      body: body.trim(),
      occasion: occasion.trim() || undefined,
      deliverAt: deliverAtFromInputs(),
    });
    setTitle('');
    setBody('');
    setOccasion('');
    setCustomDate('');
    setPreset('week');
    setComposing(false);
  }

  return (
    <Screen scroll>
      <AppHeader
        title="Love letters"
        subtitle="Write now, deliver later"
        onBack={() => navigation.goBack()}
        right={<Button label={composing ? '×' : '✎'} variant="soft" onPress={() => setComposing((c) => !c)} style={styles.addBtn} />}
      />

      {composing ? (
        <Card style={{ marginBottom: spacing.lg }} tone="rose">
          <Field label="Title" value={title} onChangeText={setTitle} placeholder="Open me when…" />
          <Field label="Your letter" value={body} onChangeText={setBody} placeholder={`Dear ${partnerName},`} multiline style={{ minHeight: 150 }} />
          <Field label="Occasion (optional)" value={occasion} onChangeText={setOccasion} placeholder="anniversary · a hard day · just because" />
          <Text style={styles.label}>Deliver</Text>
          <View style={styles.pillRow}>
            {PRESETS.map((p) => (
              <Pill key={p.key} label={p.label} active={preset === p.key && !customDate} onPress={() => { setPreset(p.key); setCustomDate(''); }} />
            ))}
          </View>
          <View style={{ height: spacing.sm }} />
          <Field label="…or a specific date" value={customDate} onChangeText={setCustomDate} placeholder="YYYY-MM-DD" autoCapitalize="none" />
          <Button label="Seal & schedule 💌" disabled={!title.trim() || !body.trim()} onPress={sendLetter} />
        </Card>
      ) : null}

      {/* Ready to open */}
      {ready.length > 0 ? (
        <>
          <SectionTitle>Ready to open 💌</SectionTitle>
          <View style={{ gap: spacing.md }}>
            {ready.map((l) => (
              <Card key={l.id} tone="gold">
                <Title>{l.title}</Title>
                {l.occasion ? <Muted style={{ marginTop: 2 }}>For: {l.occasion}</Muted> : null}
                <Muted style={{ marginTop: 2 }}>From {partnerName} · written {formatDate(l.createdAt)}</Muted>
                <View style={{ height: spacing.md }} />
                <Button label="Open this letter" onPress={() => app.openLetter(l.id)} />
              </Card>
            ))}
          </View>
        </>
      ) : null}

      {/* Sealed / waiting */}
      {sealed.length > 0 ? (
        <>
          <SectionTitle>Sealed for later</SectionTitle>
          <View style={{ gap: spacing.sm }}>
            {sealed.map((l) => (
              <Card key={l.id} style={styles.sealedRow}>
                <Text style={{ fontSize: 24 }}>🔒</Text>
                <View style={{ flex: 1 }}>
                  <Body style={{ fontWeight: font.weight.semibold }}>{l.title}</Body>
                  <Muted>From {partnerName} · opens {formatCountdown(l.deliverAt)}</Muted>
                </View>
              </Card>
            ))}
          </View>
        </>
      ) : null}

      {/* Opened */}
      {opened.length > 0 ? (
        <>
          <SectionTitle>Letters you’ve opened</SectionTitle>
          <View style={{ gap: spacing.md }}>
            {opened.map((l) => (
              <Card key={l.id}>
                <Title>{l.title}</Title>
                <Muted style={{ marginTop: 2, marginBottom: spacing.sm }}>From {partnerName}</Muted>
                <Body style={styles.letterBody}>{l.body}</Body>
              </Card>
            ))}
          </View>
        </>
      ) : null}

      {/* Mine */}
      {mine.length > 0 ? (
        <>
          <SectionTitle>Letters you scheduled</SectionTitle>
          <View style={{ gap: spacing.sm }}>
            {mine.map((l) => (
              <Card key={l.id} style={styles.sealedRow}>
                <Text style={{ fontSize: 22 }}>{l.deliverAt <= t ? '📬' : '⏳'}</Text>
                <View style={{ flex: 1 }}>
                  <Body style={{ fontWeight: font.weight.semibold }}>{l.title}</Body>
                  <Muted>For {partnerName} · {l.openedAt ? 'opened' : l.deliverAt <= t ? 'delivered' : `delivers ${formatCountdown(l.deliverAt)}`}</Muted>
                </View>
              </Card>
            ))}
          </View>
        </>
      ) : null}

      {ready.length + sealed.length + opened.length + mine.length === 0 && !composing ? (
        <Card>
          <EmptyState emoji="💌" title="No letters yet" text="Write something for the future — an anniversary, a hard exam day, or just because." />
          <Button label="Write your first letter" onPress={() => setComposing(true)} />
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  addBtn: { height: 40, width: 48, paddingHorizontal: 0 },
  label: { fontSize: font.size.sm, fontWeight: font.weight.semibold, color: colors.textSoft, marginBottom: spacing.sm, marginTop: spacing.xs },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  sealedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  letterBody: { lineHeight: 24 },
});
