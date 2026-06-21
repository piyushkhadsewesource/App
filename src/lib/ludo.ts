// Ludo engine: a 52-cell main loop on a 15x15 board, two players (a, b) with
// four tokens each. Token position p:
//   -1      = in base (yard)
//   0..50   = steps along this player's path (abs cell = (offset + p) % 52)
//   51..55  = home column (5 cells)
//   56      = home (finished)

export type Side = 'a' | 'b';

// Main loop coordinates as [row, col] on a 15x15 grid, clockwise (52 cells).
export const PATH: [number, number][] = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5], [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  [0, 7], [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [6, 9], [6, 10], [6, 11], [6, 12],
  [6, 13], [6, 14], [7, 14], [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9], [9, 8],
  [10, 8], [11, 8], [12, 8], [13, 8], [14, 8], [14, 7], [14, 6], [13, 6], [12, 6], [11, 6],
  [10, 6], [9, 6], [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0], [7, 0], [6, 0],
];

export const START_OFFSET: Record<Side, number> = { a: 0, b: 26 };

// Cells (absolute indices) where a token cannot be captured.
export const SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

export const HOME_COL: Record<Side, [number, number][]> = {
  a: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  b: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
};
export const HOME_CENTER: Record<Side, [number, number]> = { a: [7, 6], b: [7, 8] };

const BASE_SLOTS: Record<Side, [number, number][]> = {
  a: [[1.5, 1.5], [1.5, 3.5], [3.5, 1.5], [3.5, 3.5]],
  b: [[10.5, 10.5], [10.5, 12.5], [12.5, 10.5], [12.5, 12.5]],
};

/** Where a token sits, as fractional [row, col] on the 15x15 grid. */
export function tokenRC(side: Side, tokenIndex: number, p: number): [number, number] {
  if (p < 0) return BASE_SLOTS[side][tokenIndex] ?? [2, 2];
  if (p <= 50) return PATH[(START_OFFSET[side] + p) % 52];
  if (p <= 55) return HOME_COL[side][p - 51];
  return HOME_CENTER[side];
}

/** Absolute main-loop cell for a position, or null if not on the loop. */
export function absCell(side: Side, p: number): number | null {
  return p >= 0 && p <= 50 ? (START_OFFSET[side] + p) % 52 : null;
}

/** Indices of tokens that can legally move with this die. */
export function legalTokens(tokens: number[], die: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const p = tokens[i];
    if (p === 56) continue;
    if (p === -1) {
      if (die === 6) out.push(i);
    } else if (p + die <= 56) {
      out.push(i);
    }
  }
  return out;
}

/** Resulting position for a token after a die (assumes the move is legal). */
export function movedPos(p: number, die: number): number {
  return p === -1 ? 0 : p + die;
}

export function isHome(p: number): boolean {
  return p === 56;
}
