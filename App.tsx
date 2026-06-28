import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces/600SemiBold';
import { Fraunces_700Bold } from '@expo-google-fonts/fraunces/700Bold';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { createNavigationContainerRef, DefaultTheme, NavigationContainer, Theme } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SosOverlay from './src/components/SosOverlay';
import { ToastProvider } from './src/components/ToastHost';
import RootNavigator from './src/navigation/RootNavigator';
import OnboardingScreen from './src/screens/OnboardingScreen';
import { refreshPlanReminders, refreshReminders, scheduleLetterDeliveries, syncOccasionReminders } from './src/services/notifications';
import { AppProvider, useApp } from './src/state/AppContext';
import { colors } from './src/theme';

// Hold the native splash on screen until the first real frame is ready, so cold
// start goes splash -> app with no flash of a loading spinner. Best-effort.
SplashScreen.preventAutoHideAsync().catch(() => {});

const navTheme: Theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.bg, primary: colors.primary },
};

// A ref so a tapped notification can route into the app from anywhere, even
// from a cold start.
const navigationRef = createNavigationContainerRef();

/** Map a notification's payload to the screen it should open, or null. */
function routeForNotification(data: Record<string, unknown> | undefined): string | null {
  switch ((data?.kind ?? data?.type) as string | undefined) {
    case 'letter':
      return 'Letters';
    case 'occasion':
      return 'Occasions';
    case 'plan':
      return 'Schedule';
    case 'moment':
      return 'Moments';
    case 'ping':
    case 'sos': // the full-screen alarm overlay fires from synced alerts; land here too
      return 'MissYou';
    default:
      return null;
  }
}

function handleNotificationResponse(response: Notifications.NotificationResponse | null) {
  if (!response) return;
  const data = response.notification.request.content.data as Record<string, unknown> | undefined;
  const route = routeForNotification(data);
  if (route && navigationRef.isReady()) {
    // @ts-expect-error — routing by screen name across the nested navigators.
    navigationRef.navigate(route);
  }
}

function Root() {
  const { ready, identity, moments, meId, occasions, schedule, letters } = useApp();
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

  // Re-arm the daily "plan your day" reminder; it skips days you've already planned.
  const plannedKey = schedule
    .filter((s) => s.authorId === meId)
    .map((s) => s.date)
    .sort()
    .join(',');
  useEffect(() => {
    if (identity) refreshPlanReminders(plannedKey ? Array.from(new Set(plannedKey.split(','))) : [], identity?.partnerName);
  }, [plannedKey, identity?.partnerName, identity]);

  // Arm a delivery nudge for each sealed letter the partner wrote to me, so a
  // "deliver later" letter actually announces itself when its time arrives.
  const letterKey = letters
    .filter((l) => l.authorId !== meId && !l.openedAt && l.deliverAt > Date.now())
    .map((l) => `${l.id}:${l.deliverAt}`)
    .sort()
    .join('|');
  useEffect(() => {
    if (identity) {
      scheduleLetterDeliveries(
        letters.filter((l) => l.authorId !== meId && !l.openedAt),
        identity.partnerName,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [letterKey, identity]);

  // Schedule local reminders for saved anniversaries and special dates.
  const occKey = occasions
    .map((o) => `${o.id}:${o.date}:${o.recurrence}:${o.remindDaysBefore}:${o.icon ?? ''}`)
    .sort()
    .join('|');
  useEffect(() => {
    if (identity) syncOccasionReminders(occasions);
  }, [occKey, identity]);

  // Once identity and fonts are settled, reveal the app and let the native
  // splash fade away. On web (no native splash) this is a harmless no-op.
  const appReady = ready && (fontsReady || fontTimeout);
  useEffect(() => {
    if (appReady) SplashScreen.hideAsync().catch(() => {});
  }, [appReady]);

  // Only route taps once the navigator is actually mounted (identity present).
  useNotificationRouting(appReady && !!identity);

  if (!appReady) {
    // The native splash is still covering this on devices; the spinner is the
    // web fallback (and a safety net if the splash ever fails to hide).
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!identity) return <OnboardingScreen />;

  return (
    <>
      <NavigationContainer ref={navigationRef} theme={navTheme}>
        <RootNavigator />
      </NavigationContainer>
      <SosOverlay />
    </>
  );
}

/** Route notification taps (live, and the one that cold-started the app). */
function useNotificationRouting(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const sub = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);
    // A tap that launched the app from a killed state isn't delivered to the
    // listener above; pick it up once, after the navigator has had a beat to mount.
    let timer: ReturnType<typeof setTimeout> | null = null;
    Notifications.getLastNotificationResponseAsync()
      .then((resp) => {
        if (resp) timer = setTimeout(() => handleNotificationResponse(resp), 350);
      })
      .catch(() => {});
    return () => {
      sub.remove();
      if (timer) clearTimeout(timer);
    };
  }, [active]);
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
          <ToastProvider>
            <StatusBar style="dark" />
            <Root />
          </ToastProvider>
        </AppProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
