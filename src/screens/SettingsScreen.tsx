import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { APP_NAME } from '../config';
import { AppHeader, Body, Button, Card, Field, Muted, Screen, SectionTitle, Tag, Title } from '../components/ui';
import { useApp } from '../state/AppContext';
import { colors, font, spacing } from '../theme';

export default function SettingsScreen({ navigation }: any) {
  const app = useApp();
  const id = app.identity;
  const [name, setName] = useState(id?.name ?? '');
  const [partnerName, setPartnerName] = useState(id?.partnerName ?? '');
  const [anniversary, setAnniversary] = useState(id?.anniversary ?? '');
  const [code, setCode] = useState(id?.spaceId ?? '');
  const [saved, setSaved] = useState(false);

  async function save() {
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
    Alert.alert(
      'Reset everything?',
      'This clears your space on THIS phone (names, check-ins, memories, letters). This can’t be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: () => app.resetEverything() },
      ],
    );
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
            : 'Running on-device. To sync with your partner’s phone, add your free Firebase keys in src/config.ts — see SETUP.md for the 5-minute guide.'}
        </Body>
      </Card>

      <SectionTitle>Your details</SectionTitle>
      <Card>
        <Field label="Your name" value={name} onChangeText={setName} />
        <Field label="Partner’s name" value={partnerName} onChangeText={setPartnerName} />
        <Field label="Anniversary" value={anniversary} onChangeText={setAnniversary} placeholder="YYYY-MM-DD" autoCapitalize="none" />
        <Field label="Pairing code (same on both phones)" value={code} onChangeText={(t) => setCode(t.toUpperCase())} autoCapitalize="characters" />
        <Muted style={{ marginBottom: spacing.md }}>
          Changing the code switches you to a different shared space.
        </Muted>
        <Button label={saved ? 'Saved ✓' : 'Save changes'} onPress={save} />
      </Card>

      <SectionTitle>About</SectionTitle>
      <Card>
        <Body>{APP_NAME} — a private emotional-connection space for two. No feeds, no ads, no one else.</Body>
        <Muted style={{ marginTop: spacing.sm }}>Made with care, for closing the distance.</Muted>
      </Card>

      <View style={{ height: spacing.xl }} />
      <Button label="Reset everything" variant="outline" color={colors.danger} onPress={confirmReset} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
