// A warm, intimate palette — soft paper, rose, and quiet violet.
export const colors = {
  bg: '#FBF7F4',
  surface: '#FFFFFF',
  surfaceAlt: '#F5EDE8',
  border: '#EDE1DA',

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

  warn: '#E0894B',
  warnSoft: '#FBEBDD',

  danger: '#D9534F',
  dangerSoft: '#F8E3E2',

  white: '#FFFFFF',
  overlay: 'rgba(46,42,42,0.45)',
} as const;

export type ColorKey = keyof typeof colors;
