/**
 * Queens game rules — pure helpers.
 *
 * Board is a flat array length N*N. Each cell is "empty" | "marked" | "queen".
 * A valid solution places exactly N queens such that:
 *   - 1 queen per row
 *   - 1 queen per column
 *   - 1 queen per region (region id given by Puzzle.regions)
 *   - no two queens touch (8-directional adjacency forbidden)
 */

export type CellState = "empty" | "marked" | "queen";

export type Puzzle = {
  size: number;
  /** Region id 0..size-1 for each cell. Length = size*size. */
  regions: number[];
};

export type Board = CellState[];

export function rowOf(idx: number, size: number): number {
  return Math.floor(idx / size);
}

export function colOf(idx: number, size: number): number {
  return idx % size;
}

export function newBoard(size: number): Board {
  return Array.from({ length: size * size }, () => "empty" as CellState);
}

/** Cycle a single cell on tap: empty → marked → queen → empty. */
export function cycleCell(state: CellState): CellState {
  if (state === "empty") return "marked";
  if (state === "marked") return "queen";
  return "empty";
}

/** Indices that participate in a rule violation. */
export function findConflicts(board: Board, puzzle: Puzzle): Set<number> {
  const { size, regions } = puzzle;
  const queens: number[] = [];
  for (let i = 0; i < board.length; i++) {
    if (board[i] === "queen") queens.push(i);
  }

  const bad = new Set<number>();
  const rowMap = new Map<number, number[]>();
  const colMap = new Map<number, number[]>();
  const regMap = new Map<number, number[]>();

  for (const q of queens) {
    const r = rowOf(q, size);
    const c = colOf(q, size);
    const reg = regions[q];
    rowMap.set(r, [...(rowMap.get(r) ?? []), q]);
    colMap.set(c, [...(colMap.get(c) ?? []), q]);
    regMap.set(reg, [...(regMap.get(reg) ?? []), q]);
  }

  const flagDuplicates = (m: Map<number, number[]>): void => {
    for (const list of m.values()) {
      if (list.length > 1) for (const q of list) bad.add(q);
    }
  };
  flagDuplicates(rowMap);
  flagDuplicates(colMap);
  flagDuplicates(regMap);

  // 8-directional adjacency.
  for (let i = 0; i < queens.length; i++) {
    for (let j = i + 1; j < queens.length; j++) {
      const a = queens[i];
      const b = queens[j];
      const dr = Math.abs(rowOf(a, size) - rowOf(b, size));
      const dc = Math.abs(colOf(a, size) - colOf(b, size));
      if (dr <= 1 && dc <= 1) {
        bad.add(a);
        bad.add(b);
      }
    }
  }

  return bad;
}

export function isSolved(board: Board, puzzle: Puzzle): boolean {
  let queenCount = 0;
  for (const c of board) if (c === "queen") queenCount++;
  if (queenCount !== puzzle.size) return false;
  return findConflicts(board, puzzle).size === 0;
}

export function queensPlaced(board: Board): number {
  let n = 0;
  for (const c of board) if (c === "queen") n++;
  return n;
}

// ----- Puzzle generation --------------------------------------------------

function shuffled<T>(arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Place `size` queens (1 per row, 1 per col, no 8-adjacency) using
 * randomised backtracking. Returns queens[row] = col.
 */
export function generateQueensPlacement(size: number): number[] {
  const placed: number[] = [];
  const usedCols = new Set<number>();
  const indices = Array.from({ length: size }, (_, i) => i);

  function backtrack(row: number): boolean {
    if (row === size) return true;
    for (const c of shuffled(indices)) {
      if (usedCols.has(c)) continue;
      // Only adjacent-row queens can be 8-adjacent (rows further apart already
      // satisfy |dr|>=2). Cols unique by construction.
      if (row > 0 && Math.abs(c - placed[row - 1]) <= 1) continue;
      placed.push(c);
      usedCols.add(c);
      if (backtrack(row + 1)) return true;
      placed.pop();
      usedCols.delete(c);
    }
    return false;
  }
  backtrack(0);
  return placed;
}

/**
 * Grow regions seeded at each queen's cell into a balanced partition of the
 * board. Region id 0..size-1 (one per queen's row).
 */
export function growRegions(size: number, queens: number[]): number[] {
  const total = size * size;
  const regions = new Array<number>(total).fill(-1);
  const frontiers: Set<number>[] = [];
  for (let r = 0; r < size; r++) {
    const idx = r * size + queens[r];
    regions[idx] = r;
    frontiers.push(new Set([idx]));
  }

  let remaining = total - size;
  let safety = total * total;
  const dirs: [number, number][] = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  while (remaining > 0 && safety-- > 0) {
    for (const regId of shuffled(Array.from({ length: size }, (_, i) => i))) {
      const frontier = frontiers[regId];
      if (frontier.size === 0) continue;
      const cellIdx = shuffled(Array.from(frontier))[0];
      const r = Math.floor(cellIdx / size);
      const c = cellIdx % size;
      let claimed = false;
      let stillHasNeighbor = false;
      for (const [dr, dc] of shuffled(dirs)) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
        const nIdx = nr * size + nc;
        if (regions[nIdx] !== -1) continue;
        if (!claimed) {
          regions[nIdx] = regId;
          frontier.add(nIdx);
          remaining--;
          claimed = true;
        } else {
          stillHasNeighbor = true;
        }
      }
      if (!claimed) {
        // Re-scan: maybe this cell has no free neighbour at all.
        let any = false;
        for (const [dr, dc] of dirs) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
          if (regions[nr * size + nc] === -1) {
            any = true;
            break;
          }
        }
        if (!any) frontier.delete(cellIdx);
      } else if (!stillHasNeighbor) {
        // This cell exhausted; remove from frontier.
        frontier.delete(cellIdx);
      }
      if (remaining === 0) break;
    }
  }
  return regions;
}

export function generatePuzzle(size: number): Puzzle {
  const queens = generateQueensPlacement(size);
  const regions = growRegions(size, queens);
  return { size, regions };
}

/**
 * Cells forbidden by at least one placed queen — same row, same col, same
 * region, or 8-directionally adjacent. Cells already holding a queen are
 * excluded from the result.
 */
export function blockedCells(board: Board, puzzle: Puzzle): Set<number> {
  const { size, regions } = puzzle;
  const blocked = new Set<number>();
  for (let q = 0; q < board.length; q++) {
    if (board[q] !== "queen") continue;
    const qr = rowOf(q, size);
    const qc = colOf(q, size);
    const qReg = regions[q];
    for (let i = 0; i < board.length; i++) {
      if (i === q) continue;
      if (board[i] === "queen") continue;
      const r = rowOf(i, size);
      const c = colOf(i, size);
      const sameRow = r === qr;
      const sameCol = c === qc;
      const sameReg = regions[i] === qReg;
      const adj = Math.abs(r - qr) <= 1 && Math.abs(c - qc) <= 1;
      if (sameRow || sameCol || sameReg || adj) blocked.add(i);
    }
  }
  return blocked;
}
