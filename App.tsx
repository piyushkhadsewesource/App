import { DefaultTheme, NavigationContainer, Theme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SosOverlay from './src/components/SosOverlay';
import RootNavigator from './src/navigation/RootNavigator';
import OnboardingScreen from './src/screens/OnboardingScreen';
import { refreshReminders } from './src/services/notifications';
import { AppProvider, useApp } from './src/state/AppContext';
import { colors } from './src/theme';

const navTheme: Theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.bg, primary: colors.primary },
};

function Root() {
  const { ready, identity, moments, meId } = useApp();

  // Re-arm the smart photo reminders whenever launch happens or the set of
  // days you've already posted changes (so today's reminders stop once shared).
  const postedKey = moments
    .filter((m) => m.authorId === meId)
    .map((m) => m.date)
    .sort()
    .join(',');
  useEffect(() => {
    refreshReminders(postedKey ? postedKey.split(',') : [], identity?.partnerName);
  }, [postedKey, identity?.partnerName]);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!identity) return <OnboardingScreen />;

  return (
    <>
      <NavigationContainer theme={navTheme}>
        <RootNavigator />
      </NavigationContainer>
      <SosOverlay />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="dark" />
        <Root />
      </AppProvider>
    </SafeAreaProvider>
  );
}
