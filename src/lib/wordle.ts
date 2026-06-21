// Daily Wordle: a shared 5-letter word per calendar day, plus guess scoring.
import { ISODate } from '../types/models';

// A large pool of friendly 5-letter words. Any accidental non-5-letter entry is
// filtered out at runtime, so the daily pick is always exactly five letters.
const RAW = [
  'ABOUT', 'ABOVE', 'ACORN', 'ACUTE', 'ADMIT', 'ADOPT', 'ADORE', 'AGENT', 'AGREE', 'ALERT',
  'ALIKE', 'ALIVE', 'ALLOW', 'ALONE', 'ALONG', 'ALPHA', 'AMBER', 'AMPLE', 'ANGEL', 'ANGER',
  'ANGLE', 'ANKLE', 'APPLE', 'APRON', 'ARENA', 'ARGUE', 'ARISE', 'AROMA', 'ARRAY', 'ARROW',
  'ASIDE', 'ASSET', 'AUDIO', 'AVOID', 'AWAKE', 'AWARD', 'AWARE', 'BACON', 'BADGE', 'BAKER',
  'BASIC', 'BEACH', 'BEARD', 'BEAST', 'BEGIN', 'BEING', 'BERRY', 'BIRTH', 'BLAZE', 'BLEND',
  'BLISS', 'BLOOM', 'BOARD', 'BOAST', 'BONUS', 'BOOST', 'BRAIN', 'BRAND', 'BRAVE', 'BREAD',
  'BREAK', 'BRICK', 'BRIDE', 'BRIEF', 'BRING', 'BROAD', 'BROWN', 'BRUSH', 'BUILD', 'BUNCH',
  'BURST', 'CABIN', 'CANDY', 'CARGO', 'CAROL', 'CHAIR', 'CHARM', 'CHASE', 'CHEER', 'CHESS',
  'CHILD', 'CHILL', 'CHORD', 'CIVIC', 'CLAIM', 'CLEAN', 'CLEAR', 'CLICK', 'CLIMB', 'CLOCK',
  'CLOUD', 'COACH', 'COAST', 'COCOA', 'COMET', 'CORAL', 'COUCH', 'COUNT', 'COURT', 'COVER',
  'CRAFT', 'CRANE', 'CRAVE', 'CRISP', 'CROWN', 'CRUSH', 'CURVE', 'CYCLE', 'DAILY', 'DAISY',
  'DANCE', 'DREAM', 'DRESS', 'DRIFT', 'DRINK', 'DRIVE', 'EAGLE', 'EARLY', 'EARTH', 'ELDER',
  'ELITE', 'EMBER', 'ENJOY', 'ENTER', 'EQUAL', 'ESSAY', 'EVENT', 'EVERY', 'EXACT', 'EXTRA',
  'FAINT', 'FAIRY', 'FAITH', 'FANCY', 'FAVOR', 'FEAST', 'FENCE', 'FERRY', 'FEVER', 'FIELD',
  'FINAL', 'FIRST', 'FLAME', 'FLASH', 'FLEET', 'FLOAT', 'FLORA', 'FLOUR', 'FLUTE', 'FOCUS',
  'FORGE', 'FROST', 'FRUIT', 'FUDGE', 'GIANT', 'GLEAM', 'GLIDE', 'GLOBE', 'GLORY', 'GLOVE',
  'GRACE', 'GRAND', 'GRAPE', 'GRASS', 'GREAT', 'GREEN', 'GROVE', 'GUEST', 'GUIDE', 'HAPPY',
  'HEART', 'HEAVY', 'HELLO', 'HONEY', 'HONOR', 'HOTEL', 'HOUSE', 'HUMAN', 'HUMOR', 'IDEAL',
  'IMAGE', 'INDEX', 'INNER', 'IVORY', 'JELLY', 'JEWEL', 'JOLLY', 'JUICE', 'JUMBO', 'KOALA',
  'LABEL', 'LARGE', 'LAUGH', 'LAYER', 'LEMON', 'LEVEL', 'LIGHT', 'LILAC', 'LINEN', 'LOTUS',
  'LOVER', 'LOYAL', 'LUCKY', 'LUNAR', 'LUNCH', 'MAGIC', 'MANGO', 'MAPLE', 'MARCH', 'MEDAL',
  'MELON', 'MERRY', 'MOCHA', 'MONEY', 'MONTH', 'MOTOR', 'MOUNT', 'MOUSE', 'MOVIE', 'MUSIC',
  'NIGHT', 'NOBLE', 'NORTH', 'NOVEL', 'NURSE', 'OCEAN', 'OLIVE', 'ONION', 'OPERA', 'ORBIT',
  'ORGAN', 'OTTER', 'PAINT', 'PANDA', 'PAPER', 'PARTY', 'PASTA', 'PEACE', 'PEACH', 'PEARL',
  'PEDAL', 'PENNY', 'PETAL', 'PHONE', 'PIANO', 'PILOT', 'PIXEL', 'PIZZA', 'PLANT', 'PLATE',
  'PLAZA', 'POLAR', 'PORCH', 'POUND', 'POWER', 'PRIDE', 'PRIME', 'PRIZE', 'PROUD', 'PULSE',
  'QUEEN', 'QUEST', 'QUICK', 'QUIET', 'QUILT', 'RADAR', 'RADIO', 'RALLY', 'RANCH', 'RAPID',
  'REACH', 'REALM', 'REBEL', 'RELAX', 'RHYME', 'RIVER', 'ROAST', 'ROBIN', 'ROYAL', 'SALAD',
  'SANDY', 'SAUCE', 'SCENE', 'SCARF', 'SCOUT', 'SENSE', 'SEVEN', 'SHADE', 'SHAKE', 'SHARE',
  'SHARP', 'SHEEP', 'SHEET', 'SHELF', 'SHINE', 'SHINY', 'SHIRT', 'SHORE', 'SHOUT', 'SIGHT',
  'SIXTH', 'SIXTY', 'SKATE', 'SKILL', 'SLEEP', 'SLICE', 'SLIDE', 'SMALL', 'SMART', 'SMILE',
  'SMOKE', 'SNACK', 'SNAKE', 'SNOWY', 'SOLAR', 'SOLID', 'SOUND', 'SOUTH', 'SPACE', 'SPARK',
  'SPEAK', 'SPICE', 'SPICY', 'SPINE', 'SPOON', 'SPORT', 'SPRAY', 'STACK', 'STAGE', 'STAIR',
  'STAMP', 'STAND', 'START', 'STEAM', 'STEEL', 'STILL', 'STONE', 'STORE', 'STORM', 'STORY',
  'STOVE', 'STRAW', 'STUDY', 'STYLE', 'SUGAR', 'SUITE', 'SUNNY', 'SUSHI', 'SWEAT', 'SWEET',
  'SWING', 'SWORD', 'TABLE', 'TANGO', 'TASTE', 'TEACH', 'THANK', 'THEME', 'THINK', 'THORN',
  'THREE', 'THROW', 'THUMB', 'TIGER', 'TIGHT', 'TITLE', 'TOAST', 'TODAY', 'TOKEN', 'TOOTH',
  'TORCH', 'TOTAL', 'TOUCH', 'TOWER', 'TRACE', 'TRACK', 'TRADE', 'TRAIL', 'TRAIN', 'TREAT',
  'TREND', 'TRIBE', 'TRICK', 'TRUNK', 'TRUST', 'TRUTH', 'TULIP', 'TWICE', 'TWIST', 'ULTRA',
  'UNCLE', 'UNION', 'UNITE', 'UNITY', 'UPPER', 'URBAN', 'VALUE', 'VAULT', 'VENUE', 'VERSE',
  'VIDEO', 'VILLA', 'VINYL', 'VITAL', 'VIVID', 'VOCAL', 'VOICE', 'WAGON', 'WALTZ', 'WATCH',
  'WATER', 'WHALE', 'WHEAT', 'WHEEL', 'WHERE', 'WHICH', 'WHITE', 'WHOLE', 'WINDY', 'WORLD',
  'WORTH', 'WOVEN', 'WRIST', 'WRITE', 'YACHT', 'YEAST', 'YIELD', 'YOUNG', 'YOUTH', 'ZEBRA',
];

export const WORDS = RAW.filter((w) => w.length === 5);

export const WORD_LEN = 5;
export const MAX_GUESSES = 6;

/** Days since the Unix epoch for a calendar date (timezone-stable). */
function epochDay(dateISO: ISODate): number {
  const [y, m, d] = dateISO.split('-').map((x) => parseInt(x, 10));
  if (!y || !m || !d) return 0;
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

/** The shared word of the day (same for both partners on the same date). */
export function dailyWord(dateISO: ISODate): string {
  const i = ((epochDay(dateISO) % WORDS.length) + WORDS.length) % WORDS.length;
  return WORDS[i] ?? 'HEART';
}

export type LetterState = 'correct' | 'present' | 'absent';

/** Score a guess against the answer, with correct duplicate-letter handling. */
export function scoreGuess(guess: string, answer: string): LetterState[] {
  const g = guess.toUpperCase();
  const a = answer.toUpperCase();
  const res: LetterState[] = new Array(g.length).fill('absent');
  const counts: Record<string, number> = {};
  for (const ch of a) counts[ch] = (counts[ch] ?? 0) + 1;
  // First pass: greens.
  for (let i = 0; i < g.length; i++) {
    if (g[i] === a[i]) {
      res[i] = 'correct';
      counts[g[i]]--;
    }
  }
  // Second pass: yellows where a copy remains.
  for (let i = 0; i < g.length; i++) {
    if (res[i] === 'correct') continue;
    if (counts[g[i]] > 0) {
      res[i] = 'present';
      counts[g[i]]--;
    }
  }
  return res;
}

/** Best known state for each letter across all guesses, for the keyboard. */
export function keyboardStates(guesses: string[], answer: string): Record<string, LetterState> {
  const rank: Record<LetterState, number> = { absent: 0, present: 1, correct: 2 };
  const out: Record<string, LetterState> = {};
  for (const guess of guesses) {
    const score = scoreGuess(guess, answer);
    for (let i = 0; i < guess.length; i++) {
      const ch = guess[i];
      const s = score[i];
      if (!out[ch] || rank[s] > rank[out[ch]]) out[ch] = s;
    }
  }
  return out;
}
