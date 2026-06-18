import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces/600SemiBold';
import { Fraunces_700Bold } from '@expo-google-fonts/fraunces/700Bold';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { DefaultTheme, NavigationContainer, Theme } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
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
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const fontsReady = fontsLoaded || !!fontError;
  // Never block the app on font loading for more than a few seconds.
  const [fontTimeout, setFontTimeout] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setFontTimeout(true), 4000);
    return () => clearTimeout(t);
  }, []);

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

  if (!ready || (!fontsReady && !fontTimeout)) {
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

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    console.warn('[tether] render error:', error);
  }
  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, backgroundColor: '#FBF8F6', padding: 24, justifyContent: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#2E2A2A', marginBottom: 10 }}>Tether hit a snag</Text>
          <Text selectable style={{ fontSize: 14, color: '#C7416B', lineHeight: 20 }}>
            {String(this.state.error?.message ?? this.state.error)}
          </Text>
          <Text style={{ marginTop: 16, fontSize: 13, color: '#6F6663' }}>
            Please screenshot this and send it to me.
          </Text>
        </View>
      );
    }
    return <>{this.props.children}</>;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AppProvider>
          <StatusBar style="dark" />
          <Root />
        </AppProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
