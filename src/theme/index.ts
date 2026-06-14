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
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

export const font = {
  size: { xs: 12, sm: 13, md: 15, lg: 17, xl: 20, xxl: 26, huge: 34 },
  weight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

const cardShadow: ViewStyle =
  Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#5A4038',
      shadowOpacity: 0.1,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
    },
    android: { elevation: 3 },
    default: {},
  }) ?? {};

const softShadow: ViewStyle =
  Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#5A4038',
      shadowOpacity: 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
    },
    android: { elevation: 1 },
    default: {},
  }) ?? {};

export const shadow = { card: cardShadow, soft: softShadow };
