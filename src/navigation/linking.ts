// ─────────────────────────────────────────────────────────────────────────
// Web URL routing for React Navigation. Applied ONLY on web (native keeps its
// verified in-memory navigation + notification routing) so every screen has a
// real URL: the address bar reflects where you are, a refresh reopens the same
// screen, and the browser's back/forward buttons map to navigation.
//
// Firebase Hosting rewrites every path to /index.html (the SPA fallback), so
// the app always boots; this config is what then resolves the path to a screen.
// ─────────────────────────────────────────────────────────────────────────
import { Platform } from 'react-native';
import type { LinkingOptions } from '@react-navigation/native';

const config = {
  screens: {
    Tabs: {
      // The tab bar's own paths, nested under the shell.
      screens: {
        Home: '',
        Pulse: 'pulse',
        MissYou: 'miss-you',
        Moments: 'moments',
        More: 'more',
      },
    },
    Vault: 'vault',
    Letters: 'letters',
    Deck: 'deck',
    Journal: 'journal',
    Insights: 'insights',
    Future: 'future',
    Countdown: 'countdown',
    Reminders: 'reminders',
    Settings: 'settings',
    Games: 'games',
    ChoiceGame: 'choice-game',
    KnowMe: 'know-me',
    TicTacToe: 'tic-tac-toe',
    Wordle: 'wordle',
    Snakes: 'snakes',
    Ludo: 'ludo',
    Canvas: 'canvas',
    Glass: 'glass',
    Compass: 'compass',
    Walk: 'walk',
    Schedule: 'schedule',
    Occasions: 'occasions',
    Issues: 'issues',
    IssueDetail: 'issue/:id',
  },
} as const;

/** Web-only linking; undefined on native so nothing changes there. */
export const linking: LinkingOptions<Record<string, object | undefined>> | undefined =
  Platform.OS === 'web'
    ? {
        prefixes: [typeof window !== 'undefined' ? window.location.origin : '/'],
        config: config as any,
      }
    : undefined;
