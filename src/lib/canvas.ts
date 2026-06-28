// ─────────────────────────────────────────────────────────────────────────
// Our Shared Canvas — a small co-op pixel grid.
//
// The grid is stored as one flat string of `CANVAS_CELLS` characters, each a
// single palette index. '0' is the empty/background cell; '1'..'b' map to the
// curated swatches below. Encoding the whole board as a short string keeps the
// synced Firestore doc tiny (~256 bytes) and makes a "stroke" a single write.
// ─────────────────────────────────────────────────────────────────────────

export const CANVAS_SIZE = 16;
export const CANVAS_CELLS = CANVAS_SIZE * CANVAS_SIZE; // 256
export const EMPTY_CELL = '0';
export const EMPTY_CANVAS = EMPTY_CELL.repeat(CANVAS_CELLS);

// The empty cell renders as this soft "paper" colour (sits on the app surface).
export const CANVAS_PAPER = '#FBF6F1';

/** A curated, premium palette: warm pastels + a few rich accents. */
export const CANVAS_SWATCHES: { ch: string; color: string; name: string }[] = [
  { ch: '1', color: '#2E2A2A', name: 'Ink' },
  { ch: '2', color: '#EC6E94', name: 'Rose' },
  { ch: '3', color: '#F4A9C7', name: 'Blush' },
  { ch: '4', color: '#E2902F', name: 'Amber' },
  { ch: '5', color: '#F6C56B', name: 'Honey' },
  { ch: '6', color: '#5FC9A8', name: 'Mint' },
  { ch: '7', color: '#3E9C86', name: 'Pine' },
  { ch: '8', color: '#8A6FE0', name: 'Violet' },
  { ch: '9', color: '#B9A7F0', name: 'Lilac' },
  { ch: 'a', color: '#6FA8DC', name: 'Sky' },
  { ch: 'b', color: '#FFFFFF', name: 'Snow' },
];

const COLOR_MAP: Record<string, string> = CANVAS_SWATCHES.reduce(
  (m, s) => {
    m[s.ch] = s.color;
    return m;
  },
  { [EMPTY_CELL]: CANVAS_PAPER } as Record<string, string>,
);

/** The fill colour for a pixel char; unknown/missing chars fall back to paper. */
export function colorForPixel(ch: string | undefined): string {
  return (ch && COLOR_MAP[ch]) || CANVAS_PAPER;
}

/**
 * Coerce any stored value into a valid, full-length board. Handles null,
 * undefined, wrong length, or non-string input so the UI never breaks on
 * missing/partial data.
 */
export function normalizeCanvas(p: unknown): string {
  if (typeof p !== 'string' || p.length === 0) return EMPTY_CANVAS;
  if (p.length === CANVAS_CELLS) return p;
  if (p.length > CANVAS_CELLS) return p.slice(0, CANVAS_CELLS);
  return p + EMPTY_CELL.repeat(CANVAS_CELLS - p.length);
}

/** Return a new board with cell `index` set to `ch` (no-op if out of range). */
export function paintAt(pixels: string, index: number, ch: string): string {
  if (index < 0 || index >= CANVAS_CELLS) return pixels;
  const base = pixels.length === CANVAS_CELLS ? pixels : normalizeCanvas(pixels);
  if (base[index] === ch) return base;
  return base.slice(0, index) + ch + base.slice(index + 1);
}

/** Whether the board has any painted (non-empty) cell. */
export function isBlank(pixels: string): boolean {
  for (let i = 0; i < pixels.length; i += 1) if (pixels[i] !== EMPTY_CELL) return false;
  return true;
}
