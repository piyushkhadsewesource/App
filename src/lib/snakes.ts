// Classic Snakes & Ladders board: jump map + display layout helpers.

// from -> to. Ladders go up (to > from); snakes go down (to < from).
export const SNL_JUMPS: Record<number, number> = {
  // ladders
  1: 38, 4: 14, 9: 31, 21: 42, 28: 84, 36: 44, 51: 67, 71: 91, 80: 100,
  // snakes
  16: 6, 47: 26, 49: 11, 56: 53, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 98: 78,
};

export function isLadder(cell: number): boolean {
  return SNL_JUMPS[cell] !== undefined && SNL_JUMPS[cell] > cell;
}
export function isSnake(cell: number): boolean {
  return SNL_JUMPS[cell] !== undefined && SNL_JUMPS[cell] < cell;
}

/** 10 rows, top (100s) to bottom (1s), numbered in boustrophedon order. */
export function boardRows(): number[][] {
  const rows: number[][] = [];
  for (let i = 0; i < 10; i++) {
    const rank = 9 - i; // 9 at top ... 0 at bottom
    const base = rank * 10;
    const nums: number[] = [];
    for (let c = 0; c < 10; c++) nums.push(base + (rank % 2 === 0 ? c + 1 : 10 - c));
    rows.push(nums);
  }
  return rows;
}

/** Apply a roll from a position: returns the resulting cell (with jumps). */
export function applyRoll(pos: number, die: number): number {
  let np = pos + die;
  if (np > 100) return pos; // overshoot: stay put, need an exact landing
  if (SNL_JUMPS[np] !== undefined) np = SNL_JUMPS[np];
  return np;
}
