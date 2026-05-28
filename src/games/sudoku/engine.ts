/**
 * Sudoku rules helpers — pure functions over a flat 81-cell board.
 * Index = row * 9 + col. Empty cells store 0.
 */

export type Cell = {
  value: number; // 0 = empty
  given: boolean; // pre-filled, not editable
};

export type Board = Cell[];

export const SIZE = 9;
export const TOTAL = SIZE * SIZE;

export function rowOf(idx: number): number {
  return Math.floor(idx / SIZE);
}

export function colOf(idx: number): number {
  return idx % SIZE;
}

export function boxOf(idx: number): number {
  return Math.floor(rowOf(idx) / 3) * 3 + Math.floor(colOf(idx) / 3);
}

export function fromString(s: string): Board {
  const cleaned = s.replace(/[^0-9.]/g, "");
  if (cleaned.length !== TOTAL) {
    throw new Error(
      `Sudoku string must contain ${TOTAL} digits/dots, got ${cleaned.length}`
    );
  }
  return Array.from({ length: TOTAL }, (_, i) => {
    const ch = cleaned[i];
    const v = ch === "." ? 0 : Number(ch);
    return { value: v, given: v !== 0 };
  });
}

/** Indices that conflict with the given cell on its row/column/box. */
function peers(idx: number): number[] {
  const r = rowOf(idx);
  const c = colOf(idx);
  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;
  const out = new Set<number>();
  for (let i = 0; i < SIZE; i++) {
    out.add(r * SIZE + i);
    out.add(i * SIZE + c);
  }
  for (let dr = 0; dr < 3; dr++)
    for (let dc = 0; dc < 3; dc++) out.add((br + dr) * SIZE + (bc + dc));
  out.delete(idx);
  return Array.from(out);
}

/** Set of cell indices that violate the rules (same value in row/col/box). */
export function findConflicts(board: Board): Set<number> {
  const bad = new Set<number>();
  for (let i = 0; i < TOTAL; i++) {
    const v = board[i].value;
    if (v === 0) continue;
    for (const j of peers(i)) {
      if (board[j].value === v) {
        bad.add(i);
        bad.add(j);
      }
    }
  }
  return bad;
}

export function isSolved(board: Board): boolean {
  for (let i = 0; i < TOTAL; i++) if (board[i].value === 0) return false;
  return findConflicts(board).size === 0;
}

/** Count remaining placements for each digit 1..9 (assumes 9 of each in a solved puzzle). */
export function digitsRemaining(board: Board): Record<number, number> {
  const counts: Record<number, number> = {
    1: 9, 2: 9, 3: 9, 4: 9, 5: 9, 6: 9, 7: 9, 8: 9, 9: 9,
  };
  for (const cell of board) {
    if (cell.value >= 1 && cell.value <= 9) counts[cell.value]--;
  }
  return counts;
}
