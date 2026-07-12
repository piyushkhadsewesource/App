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

/**
 * An editorial, artist-curated palette — earthy, high-fashion tones (terracotta,
 * sage, indigo) instead of default digital pastels. The `ch` codes are the
 * stored data and MUST never change; recolouring is render-only, so every
 * existing drawing simply re-emerges in the richer palette.
 */
export const CANVAS_SWATCHES: { ch: string; color: string; name: string }[] = [
  { ch: '1', color: '#26222B', name: 'Ink' },
  { ch: '2', color: '#C9536F', name: 'Velvet' },
  { ch: '3', color: '#EFC3CE', name: 'Blush' },
  { ch: '4', color: '#C96F4A', name: 'Terracotta' },
  { ch: '5', color: '#E3AE4B', name: 'Ochre' },
  { ch: '6', color: '#9DB89C', name: 'Sage' },
  { ch: '7', color: '#4E7D6B', name: 'Fern' },
  { ch: '8', color: '#3F3D6E', name: 'Indigo' },
  { ch: '9', color: '#A99BD1', name: 'Wisteria' },
  { ch: 'a', color: '#7FA3C0', name: 'Mist' },
  { ch: 'b', color: '#FFFDF8', name: 'Ivory' },
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

// ─────────────────────────────────────────────────────────────────────────
// Vector strokes — the canvas's second life. Freehand ink drawn with SVG at
// the screen's native frame rate; the legacy pixel board (above) still renders
// underneath, so nothing either of them ever drew is lost.
//
// A stroke is stored with coordinates normalized to 0..1 of the square canvas
// side, so the same drawing renders pixel-perfect on any phone, on web, and in
// the Home thumbnail. The whole drawing is one JSON string on the synced doc:
// one stroke = one Firestore write, sent only on finger lift.
// ─────────────────────────────────────────────────────────────────────────

export interface CanvasStroke {
  /** Ink colour (hex). */
  c: string;
  /** Stroke width as a fraction of the canvas side (0..1). */
  w: number;
  /** Flattened points [x0, y0, x1, y1, …], each normalized to 0..1. */
  p: number[];
  /** Author id — lets each person undo their own last stroke. */
  by?: string;
}

/** The three brush weights (fractions of the canvas side). */
export const CANVAS_BRUSHES = [
  { key: 'fine', name: 'Fine pen', w: 0.009 },
  { key: 'soft', name: 'Soft marker', w: 0.022 },
  { key: 'bold', name: 'Bold brush', w: 0.045 },
] as const;
export type BrushKey = (typeof CANVAS_BRUSHES)[number]['key'];

/** The eraser is paper-coloured ink, a touch broader than the chosen brush. */
export const ERASER_WIDTH_FACTOR = 2.2;

/** Keep the synced doc far below Firestore's 1MB ceiling. */
export const CANVAS_STROKES_BUDGET = 360_000; // serialized chars
const MAX_STROKE_POINTS = 512;
const MIN_POINT_GAP = 0.004; // normalized; drops sensor jitter, keeps curves

const round4 = (v: number) => Math.round(v * 10_000) / 10_000;

/**
 * Turn a raw finger trace (px, canvas-local) into a stored stroke's points:
 * normalized, clamped to the board, jitter-filtered and capped. Returns at
 * least one point for a plain tap (which renders as a dot).
 */
export function compactStrokePoints(ptsPx: number[], box: number): number[] {
  if (!box || ptsPx.length < 2) return [];
  const out: number[] = [];
  let lastX = Number.NaN;
  let lastY = Number.NaN;
  for (let i = 0; i + 1 < ptsPx.length && out.length < MAX_STROKE_POINTS * 2; i += 2) {
    const x = Math.min(1, Math.max(0, ptsPx[i] / box));
    const y = Math.min(1, Math.max(0, ptsPx[i + 1] / box));
    if (!Number.isNaN(lastX)) {
      const dx = x - lastX;
      const dy = y - lastY;
      if (dx * dx + dy * dy < MIN_POINT_GAP * MIN_POINT_GAP) continue;
    }
    out.push(round4(x), round4(y));
    lastX = x;
    lastY = y;
  }
  // A tap produces one point after filtering; make sure it survives.
  if (out.length === 0) out.push(round4(Math.min(1, Math.max(0, ptsPx[0] / box))), round4(Math.min(1, Math.max(0, ptsPx[1] / box))));
  return out;
}

/** Parse the synced strokes JSON defensively — bad data renders as no ink. */
export function parseStrokes(raw: unknown): CanvasStroke[] {
  if (typeof raw !== 'string' || raw.length < 2) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    const out: CanvasStroke[] = [];
    for (const s of arr) {
      if (!s || typeof s !== 'object') continue;
      const { c, w, p, by } = s as Partial<CanvasStroke>;
      if (typeof c !== 'string' || typeof w !== 'number' || !Array.isArray(p) || p.length < 2) continue;
      if (!p.every((n) => typeof n === 'number' && Number.isFinite(n))) continue;
      out.push({ c, w, p, by: typeof by === 'string' ? by : undefined });
    }
    return out;
  } catch {
    return [];
  }
}

export function serializeStrokes(strokes: CanvasStroke[]): string {
  return JSON.stringify(strokes);
}

/**
 * A stroke's SVG path at a given render size, smoothed through its points
 * (Catmull-Rom converted to cubic Béziers). A single point becomes a dot via
 * a zero-ish segment + round line caps.
 */
export function strokePath(p: number[], scale: number): string {
  const n = p.length >> 1;
  if (n === 0 || !scale) return '';
  const px = (i: number) => p[i * 2] * scale;
  const py = (i: number) => p[i * 2 + 1] * scale;
  const r = (v: number) => Math.round(v * 10) / 10;
  if (n === 1) {
    const x = r(px(0));
    const y = r(py(0));
    return `M ${x} ${y} L ${x + 0.1} ${y}`;
  }
  let d = `M ${r(px(0))} ${r(py(0))}`;
  for (let i = 0; i < n - 1; i += 1) {
    const x0 = px(Math.max(0, i - 1));
    const y0 = py(Math.max(0, i - 1));
    const x1 = px(i);
    const y1 = py(i);
    const x2 = px(i + 1);
    const y2 = py(i + 1);
    const x3 = px(Math.min(n - 1, i + 2));
    const y3 = py(Math.min(n - 1, i + 2));
    d += ` C ${r(x1 + (x2 - x0) / 6)} ${r(y1 + (y2 - y0) / 6)} ${r(x2 - (x3 - x1) / 6)} ${r(y2 - (y3 - y1) / 6)} ${r(x2)} ${r(y2)}`;
  }
  return d;
}

/**
 * One stable string identifying everything visible on the board (vector ink +
 * legacy pixels). Used for "have I seen this?" bookkeeping (fog, widget) and
 * for echo-suppression around our own writes.
 */
export function canvasSignature(doc: { strokes?: unknown; pixels?: unknown } | null | undefined): string {
  const s = typeof doc?.strokes === 'string' ? doc.strokes : '';
  const p = typeof doc?.pixels === 'string' ? doc.pixels : '';
  return `${s}|${p}`;
}

/** Whether the synced doc has any visible ink at all (strokes or pixels). */
export function canvasHasInk(doc: { strokes?: unknown; pixels?: unknown } | null | undefined): boolean {
  if (typeof doc?.strokes === 'string' && parseStrokes(doc.strokes).length > 0) return true;
  return typeof doc?.pixels === 'string' && !isBlank(doc.pixels);
}
