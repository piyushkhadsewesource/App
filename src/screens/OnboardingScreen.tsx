import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { APP_NAME, APP_TAGLINE } from '../config';
import { genPairingCode } from '../services/identity';
import { useApp } from '../state/AppContext';
import { colors, font, spacing } from '../theme';
import { Body, Button, Card, Field, Muted, Screen, Title } from '../components/ui';

export default function OnboardingScreen() {
  const { createIdentity, cloud } = useApp();
  const [name, setName] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [anniversary, setAnniversary] = useState('');
  const [code, setCode] = useState(genPairingCode());

  const valid = name.trim().length > 0 && partnerName.trim().length > 0 && code.trim().length > 0;

  return (
    <Screen scroll>
      <View style={{ alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.lg }}>
        <Text style={{ fontSize: 52 }}>🤍</Text>
        <Text style={{ fontSize: font.size.huge, fontWeight: font.weight.bold, color: colors.text }}>
          {APP_NAME}
        </Text>
        <Muted style={{ marginTop: 4 }}>{APP_TAGLINE}</Muted>
      </View>

      <Card tone="rose" style={{ marginBottom: spacing.lg }}>
        <Body>
          A private space for just the two of you — to feel each other’s days, keep your memories,
          and stay close across the distance.
        </Body>
      </Card>

      <Field label="Your name" value={name} onChangeText={setName} placeholder="e.g. Aarav" />
      <Field
        label="Your partner’s name"
        value={partnerName}
        onChangeText={setPartnerName}
        placeholder="e.g. Riya"
      />
      <Field
        label="Anniversary (optional)"
        value={anniversary}
        onChangeText={setAnniversary}
        placeholder="YYYY-MM-DD"
        autoCapitalize="none"
      />

      <Field
        label="Your shared pairing code"
        value={code}
        onChangeText={(t) => setCode(t.toUpperCase())}
        autoCapitalize="characters"
      />
      <Muted style={{ marginTop: -spacing.sm, marginBottom: spacing.lg }}>
        {cloud
          ? 'Both phones must use the SAME code — that’s what privately links the two of you. Share it with your partner and enter it on both phones.'
          : 'Running on-device for now. When you turn on cloud sync (see Settings), this same code links both phones.'}
      </Muted>

      <Button
        label="Begin our space"
        disabled={!valid}
        onPress={() =>
          createIdentity({
            name,
            partnerName,
            spaceId: code,
            anniversary: anniversary.trim() || undefined,
          })
        }
      />
      <View style={{ height: spacing.sm }} />
      <Muted style={{ textAlign: 'center' }}>
        Everything stays between you two. No feeds, no followers, no one else.
      </Muted>
    </Screen>
  );
}
