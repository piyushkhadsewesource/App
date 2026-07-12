import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Alert } from '../lib/alert';
import { APP_NAME, firebaseConfig } from '../config';
import DateTimeModal from '../components/DateTimeModal';
import { AppHeader, Avatar, Body, Button, Card, Field, Muted, Screen, SectionTitle, Tag, Title } from '../components/ui';
import { useToast } from '../components/ToastHost';
import { addDaysISO, formatDate, isoToDate, todayISO, toISODate } from '../lib/date';
import { hSuccess } from '../lib/haptics';
import { icsToBusyBlocks } from '../lib/ics';
import { captureProfilePhoto } from '../services/photo';
import { useApp } from '../state/AppContext';
import { colors, font, radius, spacing } from '../theme';

const ICS_URL_KEY = '@tether/icsUrl';

// Firestore security rules enforce this pattern; validate client-side so the
// user gets instant feedback instead of a silent sync failure.
const CODE_RE = /^[A-Z0-9-]{4,128}$/;

export default function SettingsScreen({ navigation }: any) {
  const app = useApp();
  const id = app.identity;
  const [name, setName] = useState(id?.name ?? '');
  const [partnerName, setPartnerName] = useState(id?.partnerName ?? '');
  const [anniversary, setAnniversary] = useState(id?.anniversary ?? '');
  const [anniversaryPickerOpen, setAnniversaryPickerOpen] = useState(false);
  const [code, setCode] = useState(id?.spaceId ?? '');
  const [saved, setSaved] = useState(false);
  const [pickingPhoto, setPickingPhoto] = useState(false);
  const toast = useToast();

  // ── Calendar link (ICS import into Our Day) ──────────────────────────────
  // The secret feed URL never syncs anywhere — it stays on this device; only
  // the derived busy blocks are written to the shared space.
  const [icsUrl, setIcsUrl] = useState('');
  const [icsSavedUrl, setIcsSavedUrl] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(ICS_URL_KEY)
      .then((v) => {
        if (v) {
          setIcsSavedUrl(v);
          setIcsUrl(v);
        }
      })
      .catch(() => {});
  }, []);

  async function importCalendar() {
    const raw = icsUrl.trim();
    if (!raw || importing) return;
    if (!/^https:\/\//i.test(raw)) {
      Alert.alert('Check the link', 'Paste the full https:// calendar address (Google Calendar → Settings → "Secret address in iCal format").');
      return;
    }
    setImporting(true);
    try {
      // Web can't read calendar hosts directly (no CORS on ICS feeds); the
      // tiny icsFetch proxy in our Cloud Functions does it server-side.
      // Native fetches the feed directly.
      const target =
        Platform.OS === 'web'
          ? `https://us-central1-${firebaseConfig.projectId}.cloudfunctions.net/icsFetch?url=${encodeURIComponent(raw)}`
          : raw;
      const resp = await fetch(target);
      if (!resp.ok) throw new Error(`fetch ${resp.status}`);
      const text = await resp.text();
      if (!text.includes('BEGIN:VCALENDAR')) throw new Error('not an ICS feed');
      const from = todayISO();
      const to = addDaysISO(from, 7);
      const blocks = icsToBusyBlocks(text, from, to);
      const n = await app.importBusySchedule(from, to, blocks);
      await AsyncStorage.setItem(ICS_URL_KEY, raw);
      setIcsSavedUrl(raw);
      hSuccess();
      toast.show(n > 0 ? `Imported ${n} busy block${n === 1 ? '' : 's'} into Our Day 🗓️` : 'Linked — no events in the next 7 days', 3000);
    } catch {
      Alert.alert(
        'Could not import',
        'Double-check the link is the secret iCal address, and that the app has been deployed with the calendar function (npm run deploy:all).',
      );
    } finally {
      setImporting(false);
    }
  }

  async function removeCalendarLink() {
    await AsyncStorage.removeItem(ICS_URL_KEY).catch(() => {});
    const from = todayISO();
    await app.importBusySchedule(from, addDaysISO(from, 7), []);
    setIcsSavedUrl(null);
    setIcsUrl('');
    toast.show('Calendar link removed', 2200);
  }

  async function changePhoto() {
    if (pickingPhoto) return;
    setPickingPhoto(true);
    try {
      const image = await captureProfilePhoto();
      if (image) {
        const ok = await app.saveProfilePhoto(image);
        if (ok) {
          hSuccess();
          toast.show('That face, everywhere in your space 🤍', 2600);
        } else {
          toast.show("Couldn't save the photo — try again", 2400);
        }
      }
    } catch {
      Alert.alert('Photos permission needed', 'Allow photo access in Settings to choose a profile picture.');
    } finally {
      setPickingPhoto(false);
    }
  }

  const codeError = code.trim() && !CODE_RE.test(code.trim())
    ? 'Use only letters A–Z, numbers, and dashes. Minimum 4 characters.'
    : null;
  const canSave = name.trim().length > 0 && partnerName.trim().length > 0 && !codeError;

  async function save() {
    if (!canSave) return;
    await app.updateIdentity({
      name: name.trim(),
      partnerName: partnerName.trim(),
      anniversary: anniversary.trim() || undefined,
      spaceId: code.trim().toUpperCase(),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function confirmReset() {
    const message = app.cloud
      ? 'This unpairs this phone and clears its local cache. Your shared cloud space stays intact — your partner is unaffected and can still access all your data. This can\'t be undone on this device.'
      : 'This clears your space on THIS phone (names, check-ins, memories, letters). This can\'t be undone.';
    Alert.alert('Reset everything?', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => app.resetEverything() },
    ]);
  }

  return (
    <Screen scroll>
      <AppHeader title="Settings" subtitle="Your shared space" onBack={() => navigation.goBack()} />

      {/* Cloud status */}
      <Card tone={app.cloud ? 'green' : 'gold'} style={{ marginBottom: spacing.lg }}>
        <View style={styles.row}>
          <Title>Sync</Title>
          <Tag label={app.cloud ? 'Cloud ON' : 'On this phone'} color={app.cloud ? colors.good : colors.gold} />
        </View>
        <Body style={{ marginTop: spacing.sm }}>
          {app.cloud
            ? 'Your two phones are syncing live through Firebase. Use the same pairing code on both.'
            : "Running on-device. To sync with your partner's phone, add your free Firebase keys in src/config.ts, see SETUP.md for the 5-minute guide."}
        </Body>
        {app.cloud ? (
          <Muted style={{ marginTop: spacing.sm }}>
            Pairing check: this phone is "{app.meId}", linked to "{app.partnerId}". Your partner's
            phone should show the mirror of this. If a turn-based game ever sticks on "their turn",
            it means the names don't line up, re-enter each other's names the same way on both phones.
          </Muted>
        ) : null}
      </Card>

      <SectionTitle>Daily photo reminders</SectionTitle>
      <Card onPress={() => navigation.navigate('Reminders')}>
        <View style={styles.row}>
          <View style={{ flex: 1, paddingRight: spacing.md }}>
            <Title>Photo reminders</Title>
            <Muted style={{ marginTop: 4 }}>
              Choose your own nudge times. We skip a day once you've already shared a photo.
            </Muted>
          </View>
          <Text style={styles.chevron}>›</Text>
        </View>
      </Card>

      <SectionTitle>Calendar link</SectionTitle>
      <Card>
        <Body style={{ fontFamily: font.family.semibold }}>Let Our Day read your calendar</Body>
        <Muted style={{ marginTop: 4, marginBottom: spacing.md }}>
          Paste your calendar's secret iCal address and the next 7 days of busy times flow into
          Our Day on their own. Google Calendar: Settings → your calendar → "Secret address in
          iCal format". Apple: iCloud calendar sharing link. The link stays on this phone.
        </Muted>
        <Field
          value={icsUrl}
          onChangeText={setIcsUrl}
          placeholder="https://calendar.google.com/calendar/ical/…/basic.ics"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Button
          label={importing ? 'Importing…' : icsSavedUrl ? 'Re-import next 7 days' : 'Link & import'}
          disabled={!icsUrl.trim() || importing}
          onPress={importCalendar}
        />
        {icsSavedUrl ? (
          <>
            <View style={{ height: spacing.sm }} />
            <Button label="Remove link & imported blocks" variant="ghost" onPress={removeCalendarLink} />
          </>
        ) : null}
      </Card>

      <SectionTitle>Your details</SectionTitle>
      <Card>
        {/* Profile photo — shown beside your name all around the app */}
        <View style={styles.photoRow}>
          <Avatar name={id?.name ?? '?'} size={56} uri={app.myProfile?.image} />
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Your photo</Text>
            <Muted>{app.myProfile ? 'Looking lovely. Tap to change it.' : `Add a photo — ${id?.partnerName ?? 'your partner'} sees it too.`}</Muted>
          </View>
          <Button
            label={pickingPhoto ? '…' : app.myProfile ? 'Change' : 'Add'}
            variant="soft"
            onPress={changePhoto}
            style={{ height: 40, paddingHorizontal: spacing.md }}
          />
        </View>

        <Field label="Your name" value={name} onChangeText={setName} />
        <Field label="Partner's name" value={partnerName} onChangeText={setPartnerName} />

        {/* Anniversary — date picker instead of raw ISO text field */}
        <View style={{ marginBottom: spacing.md }}>
          <Text style={styles.fieldLabel}>Anniversary</Text>
          <Pressable
            onPress={() => setAnniversaryPickerOpen(true)}
            style={styles.dateRow}
            accessibilityRole="button"
            accessibilityLabel={anniversary ? `Anniversary: ${formatDate(anniversary)}. Tap to change.` : 'Set your anniversary date'}
          >
            <Text style={[styles.dateText, !anniversary && styles.datePlaceholder]}>
              {anniversary ? formatDate(anniversary) : 'Set your anniversary…'}
            </Text>
            <Text style={styles.dateCaret}>›</Text>
          </Pressable>
        </View>

        {/* Pairing code with inline validation */}
        <Field
          label="Pairing code (same on both phones)"
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase())}
          autoCapitalize="characters"
          autoCorrect={false}
        />
        {codeError ? (
          <Text style={styles.codeError}>{codeError}</Text>
        ) : (
          <Muted style={{ marginBottom: spacing.md }}>
            Changing the code switches you to a different shared space.
          </Muted>
        )}

        <Button
          label={saved ? 'Saved ✓' : 'Save changes'}
          onPress={save}
          disabled={!canSave}
        />
      </Card>

      <SectionTitle>About</SectionTitle>
      <Card>
        <Body>{APP_NAME}, a private space for two. Made by Piyush and Riya, for Piyush and Riya. No feeds, no ads, no one else.</Body>
        <Muted style={{ marginTop: spacing.sm }}>Made with love, for closing the distance. 🤍</Muted>
      </Card>

      <View style={{ height: spacing.xl }} />
      <Button label="Reset everything" variant="outline" color={colors.danger} onPress={confirmReset} />

      <DateTimeModal
        visible={anniversaryPickerOpen}
        initial={anniversary ? isoToDate(anniversary).getTime() : Date.now()}
        mode="date"
        allowPast={true}
        title="When's your anniversary?"
        onCancel={() => setAnniversaryPickerOpen(false)}
        onConfirm={(ts) => {
          setAnniversary(toISODate(new Date(ts)));
          setAnniversaryPickerOpen(false);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chevron: { fontSize: 26, color: colors.textFaint },
  fieldLabel: { fontSize: font.size.sm, fontFamily: font.family.semibold, color: colors.textSoft, marginBottom: spacing.xs },
  // Filled like every other field: writable surfaces are tinted, not outlined.
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
  },
  dateText: { fontSize: font.size.md, color: colors.text, fontFamily: font.family.body },
  datePlaceholder: { color: colors.textFaint },
  dateCaret: { fontSize: 20, color: colors.textFaint },
  codeError: { fontSize: font.size.sm, color: colors.danger, fontFamily: font.family.body, marginBottom: spacing.md, marginTop: -spacing.sm },
});
