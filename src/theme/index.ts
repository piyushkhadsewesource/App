import { Platform, ViewStyle } from 'react-native';
import { colors } from './colors';

export { colors };
export type { ColorKey } from './colors';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 12,
  md: 16,
  lg: 24,
  xl: 30,
  pill: 999,
} as const;

export const font = {
  size: { xs: 12, sm: 13, md: 15, lg: 17, xl: 21, xxl: 27, huge: 36 },
  // Letter-spacing scale. The big editorial serif reads best set tight; small
  // UI labels and all-caps tags read best a touch open. Centralising these keeps
  // the typographic voice consistent across every screen.
  tracking: { display: -0.9, heading: -0.4, body: 0.05, label: 0.1, caps: 0.6 },
  weight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  // Premium pairing: Fraunces (editorial serif) for display, Inter for UI.
  family: {
    display: 'Fraunces_700Bold',
    displaySemi: 'Fraunces_600SemiBold',
    body: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
  },
} as const;

/** Signature gradients for hero surfaces and primary actions. */
export const gradients = {
  primary: ['#EC6E94', '#D24A7B'] as const,
  hero: ['#EC6E94', '#8A6FE0'] as const,
  roseSoft: ['#FCE9F0', '#F1ECFB'] as const,
  goldSoft: ['#FBF1DC', '#FBE6D6'] as const,
  violet: ['#8E7BE6', '#6F5BD0'] as const,
  // Per-game signatures for the play hub and card decks.
  gameRose: ['#FF8FB1', '#E8638C'] as const,
  gameViolet: ['#9C8CF0', '#6F5BD0'] as const,
  gameGold: ['#F6C56B', '#E2902F'] as const,
  gameTeal: ['#5FC9A8', '#3E9C86'] as const,
  gameGreen: ['#7BC47F', '#4FA486'] as const,
  gameSunset: ['#FFB36B', '#F5894F'] as const,
  gameBerry: ['#F77FB0', '#9C6BE0'] as const,
};

const cardShadow: ViewStyle =
  Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#5A2E40',
      shadowOpacity: 0.1,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 10 },
    },
    android: { elevation: 3 },
    // react-native-web honours boxShadow for a clean, soft card lift.
    default: { boxShadow: '0 12px 30px rgba(80, 46, 64, 0.10)' } as ViewStyle,
  }) ?? {};

const softShadow: ViewStyle =
  Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#5A2E40',
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },
    android: { elevation: 1 },
    default: { boxShadow: '0 5px 16px rgba(80, 46, 64, 0.07)' } as ViewStyle,
  }) ?? {};

const heroShadow: ViewStyle =
  Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#C7416B',
      shadowOpacity: 0.32,
      shadowRadius: 26,
      shadowOffset: { width: 0, height: 14 },
    },
    android: { elevation: 6 },
    default: { boxShadow: '0 16px 34px rgba(199, 65, 107, 0.28)' } as ViewStyle,
  }) ?? {};

export const shadow = { card: cardShadow, soft: softShadow, hero: heroShadow };
