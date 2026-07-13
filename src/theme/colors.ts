// A warm, intimate palette, soft paper, rose, and quiet violet.
export const colors = {
  bg: '#FBF8F6',
  surface: '#FFFFFF',
  surfaceAlt: '#F6F0EC',
  border: '#F0E8E3',

  text: '#2E2A2A',
  textSoft: '#6F6663',
  textFaint: '#A89F9B',

  primary: '#E8638C', // rose
  primarySoft: '#FCE8EE',
  primaryDark: '#C7416B',

  accent: '#7C6BD6', // violet
  accentSoft: '#ECE8FA',

  gold: '#D89A2E',
  goldSoft: '#FAF0D8',

  good: '#4FA486',
  goodSoft: '#E1F1EA',

  // Deepened fill variants: surfaces that carry white text (game tiles, keys)
  // need more ink than the accent shades to clear the 3:1 large-text floor.
  goldDeep: '#B8811F',
  goodDeep: '#3E8A6F',
  mutedDeep: '#7E7379',
  keycap: '#E7DED8',

  warn: '#E0894B',
  warnSoft: '#FBEBDD',

  danger: '#D9534F',
  dangerSoft: '#F8E3E2',

  white: '#FFFFFF',
  overlay: 'rgba(46,42,42,0.45)',
} as const;

export type ColorKey = keyof typeof colors;
