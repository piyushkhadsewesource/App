import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { APP_NAME } from '../config';
import DateTimeModal from '../components/DateTimeModal';
import { AppHeader, Body, Button, Card, Field, Muted, Screen, SectionTitle, Tag, Title } from '../components/ui';
import { formatDate, isoToDate, toISODate } from '../lib/date';
import { useApp } from '../state/AppContext';
import { colors, font, radius, spacing } from '../theme';

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

      <SectionTitle>Your details</SectionTitle>
      <Card>
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
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chevron: { fontSize: 26, color: colors.textFaint },
  fieldLabel: { fontSize: font.size.sm, fontFamily: font.family.semibold, color: colors.textSoft, marginBottom: spacing.xs },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  dateText: { fontSize: font.size.md, color: colors.text, fontFamily: font.family.body },
  datePlaceholder: { color: colors.textFaint },
  dateCaret: { fontSize: 20, color: colors.textFaint },
  codeError: { fontSize: font.size.sm, color: colors.danger, fontFamily: font.family.body, marginBottom: spacing.md, marginTop: -spacing.sm },
});
