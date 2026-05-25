/**
 * A self-contained Xiangqi (Chinese chess) engine.
 *
 * Board model: a flat array of 90 cells, 9 files x 10 ranks.
 *   - Index 0 is a0 (top-left from Red's perspective on screen).
 *   - Index 89 is i9 (bottom-right). Red sits at the bottom (rank 9), Black at top.
 *   - idx = rank * 9 + file. file 0 = 'a', rank 0 = top row.
 */

export type Color = "r" | "b";
/** k=King, a=Advisor, e=Elephant, h=Horse, r=Chariot, c=Cannon, p=Pawn. */
export type PieceSymbol = "k" | "a" | "e" | "h" | "r" | "c" | "p";
export type Square = string; // e.g. "e7"

export type Piece = { type: PieceSymbol; color: Color };

export type Move = {
  from: Square;
  to: Square;
  color: Color;
  piece: PieceSymbol;
  flags: string; // "n" normal, "c" capture
  captured?: PieceSymbol;
};

export type MoveInput = Move | { from: Square; to: Square };

type Snapshot = {
  board: (Piece | null)[];
  turn: Color;
};

const W = 9;
const H = 10;
const FILES = "abcdefghi";
const ORTHOGONAL = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const DIAGONAL = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

/** All 8 (destDr, destDf, legDr, legDf) tuples for a horse move. */
const HORSE_MOVES = [
  [-2, -1, -1, 0], [-2, 1, -1, 0],
  [2, -1, 1, 0], [2, 1, 1, 0],
  [-1, -2, 0, -1], [1, -2, 0, -1],
  [-1, 2, 0, 1], [1, 2, 0, 1],
];

const sqName = (idx: number): Square =>
  FILES[idx % W] + ((idx / W) | 0);
const parseSquare = (s: Square): number =>
  Number(s.slice(1)) * W + (s.charCodeAt(0) - 97);
const onBoard = (r: number, f: number): boolean =>
  r >= 0 && r < H && f >= 0 && f < W;
const opposite = (c: Color): Color => (c === "r" ? "b" : "r");

const inPalace = (r: number, f: number, color: Color): boolean => {
  if (f < 3 || f > 5) return false;
  return color === "r" ? r >= 7 && r <= 9 : r >= 0 && r <= 2;
};
/** True if `r` is on `color`'s home side of the river. */
const ownSide = (r: number, color: Color): boolean =>
  color === "r" ? r >= 5 : r <= 4;
const crossedRiver = (r: number, color: Color): boolean => !ownSide(r, color);

export class Xiangqi {
  private _board: (Piece | null)[] = new Array(W * H).fill(null);
  private _turn: Color = "r";
  private _snapshots: Snapshot[] = [];
  private _moveHistory: Move[] = [];
  private _cache: Move[] | null = null;

  constructor() {
    this._setupInitial();
  }

  private _setupInitial(): void {
    const back: PieceSymbol[] = ["r", "h", "e", "a", "k", "a", "e", "h", "r"];
    for (let f = 0; f < W; f++) {
      this._board[0 * W + f] = { type: back[f], color: "b" };
      this._board[9 * W + f] = { type: back[f], color: "r" };
    }
    // Cannons.
    for (const f of [1, 7]) {
      this._board[2 * W + f] = { type: "c", color: "b" };
      this._board[7 * W + f] = { type: "c", color: "r" };
    }
    // Pawns.
    for (const f of [0, 2, 4, 6, 8]) {
      this._board[3 * W + f] = { type: "p", color: "b" };
      this._board[6 * W + f] = { type: "p", color: "r" };
    }
  }

  // ---- Queries -------------------------------------------------------------

  turn(): Color {
    return this._turn;
  }

  get(square: Square): Piece | undefined {
    return this._board[parseSquare(square)] ?? undefined;
  }

  /** 10x9 grid (rank 0 = top, file 0 = 'a'). Each cell carries its square name. */
  board(): ({ square: Square; type: PieceSymbol; color: Color } | null)[][] {
    const grid: ({ square: Square; type: PieceSymbol; color: Color } | null)[][] =
      [];
    for (let r = 0; r < H; r++) {
      const row: ({ square: Square; type: PieceSymbol; color: Color } | null)[] =
        [];
      for (let f = 0; f < W; f++) {
        const idx = r * W + f;
        const p = this._board[idx];
        row.push(p ? { square: sqName(idx), type: p.type, color: p.color } : null);
      }
      grid.push(row);
    }
    return grid;
  }

  history(_options?: { verbose?: boolean }): Move[] {
    return this._moveHistory.slice();
  }

  moves(options?: { square?: Square }): Move[] {
    const all = this._legalMoves();
    return options?.square
      ? all.filter((m) => m.from === options.square)
      : all.slice();
  }

  inCheck(): boolean {
    return this._inCheckOnBoard(this._board, this._turn);
  }

  isCheckmate(): boolean {
    return this.inCheck() && this._legalMoves().length === 0;
  }

  /** In Xiangqi, stalemate is a LOSS for the side to move (not a draw). */
  isStalemate(): boolean {
    return !this.inCheck() && this._legalMoves().length === 0;
  }

  isGameOver(): boolean {
    return this._legalMoves().length === 0;
  }

  // ---- Making moves --------------------------------------------------------

  move(input: MoveInput): Move | null {
    let mv: Move | null;
    if (typeof (input as Move).flags === "string") {
      mv = input as Move;
    } else {
      mv = this._matchMove(input as { from: Square; to: Square });
      if (!mv) return null;
    }
    this._apply(mv);
    return mv;
  }

  private _matchMove(req: { from: Square; to: Square }): Move | null {
    return (
      this._legalMoves().find(
        (m) => m.from === req.from && m.to === req.to
      ) ?? null
    );
  }

  undo(): Move | null {
    const snap = this._snapshots.pop();
    if (!snap) return null;
    const mv = this._moveHistory.pop() ?? null;
    this._board = snap.board;
    this._turn = snap.turn;
    this._cache = null;
    return mv;
  }

  private _apply(mv: Move): void {
    this._snapshots.push({
      board: this._board.slice(),
      turn: this._turn,
    });
    this._applyToBoard(this._board, mv);
    this._turn = opposite(this._turn);
    this._moveHistory.push(mv);
    this._cache = null;
  }

  private _applyToBoard(board: (Piece | null)[], mv: Move): void {
    const from = parseSquare(mv.from);
    const to = parseSquare(mv.to);
    const piece = board[from]!;
    board[from] = null;
    board[to] = piece;
  }

  // ---- Move generation -----------------------------------------------------

  private _legalMoves(): Move[] {
    if (this._cache) return this._cache;
    const legal: Move[] = [];
    for (const mv of this._pseudoMoves(this._turn)) {
      const copy = this._board.slice();
      this._applyToBoard(copy, mv);
      if (!this._inCheckOnBoard(copy, this._turn)) legal.push(mv);
    }
    this._cache = legal;
    return legal;
  }

  private _pseudoMoves(color: Color): Move[] {
    const moves: Move[] = [];
    for (let i = 0; i < W * H; i++) {
      const piece = this._board[i];
      if (!piece || piece.color !== color) continue;
      switch (piece.type) {
        case "p": this._genPawn(i, color, moves); break;
        case "k": this._genKing(i, color, moves); break;
        case "a": this._genAdvisor(i, color, moves); break;
        case "e": this._genElephant(i, color, moves); break;
        case "h": this._genHorse(i, color, moves); break;
        case "r": this._genChariot(i, color, moves); break;
        case "c": this._genCannon(i, color, moves); break;
      }
    }
    return moves;
  }

  private _genPawn(i: number, color: Color, moves: Move[]): void {
    const r = (i / W) | 0;
    const f = i % W;
    const dir = color === "r" ? -1 : 1;
    this._tryStep(i, r + dir, f, color, moves);
    if (crossedRiver(r, color)) {
      this._tryStep(i, r, f - 1, color, moves);
      this._tryStep(i, r, f + 1, color, moves);
    }
  }

  private _genKing(i: number, color: Color, moves: Move[]): void {
    const r = (i / W) | 0;
    const f = i % W;
    for (const [dr, df] of ORTHOGONAL) {
      const nr = r + dr;
      const nf = f + df;
      if (!inPalace(nr, nf, color)) continue;
      this._tryStep(i, nr, nf, color, moves);
    }
  }

  private _genAdvisor(i: number, color: Color, moves: Move[]): void {
    const r = (i / W) | 0;
    const f = i % W;
    for (const [dr, df] of DIAGONAL) {
      const nr = r + dr;
      const nf = f + df;
      if (!inPalace(nr, nf, color)) continue;
      this._tryStep(i, nr, nf, color, moves);
    }
  }

  private _genElephant(i: number, color: Color, moves: Move[]): void {
    const r = (i / W) | 0;
    const f = i % W;
    for (const [dr, df] of DIAGONAL) {
      const nr = r + 2 * dr;
      const nf = f + 2 * df;
      if (!onBoard(nr, nf) || !ownSide(nr, color)) continue;
      // The "elephant eye" — midpoint must be empty.
      if (this._board[(r + dr) * W + (f + df)]) continue;
      this._tryStep(i, nr, nf, color, moves);
    }
  }

  private _genHorse(i: number, color: Color, moves: Move[]): void {
    const r = (i / W) | 0;
    const f = i % W;
    for (const [dr, df, lr, lf] of HORSE_MOVES) {
      const nr = r + dr;
      const nf = f + df;
      if (!onBoard(nr, nf)) continue;
      // The horse's "leg" — adjacent orthogonal square must be empty.
      if (this._board[(r + lr) * W + (f + lf)]) continue;
      this._tryStep(i, nr, nf, color, moves);
    }
  }

  private _genChariot(i: number, color: Color, moves: Move[]): void {
    const r = (i / W) | 0;
    const f = i % W;
    for (const [dr, df] of ORTHOGONAL) {
      let nr = r + dr;
      let nf = f + df;
      while (onBoard(nr, nf)) {
        const target = this._board[nr * W + nf];
        if (!target) {
          this._pushMove(i, nr * W + nf, "n", moves);
        } else {
          if (target.color !== color) this._pushMove(i, nr * W + nf, "c", moves);
          break;
        }
        nr += dr;
        nf += df;
      }
    }
  }

  private _genCannon(i: number, color: Color, moves: Move[]): void {
    const r = (i / W) | 0;
    const f = i % W;
    for (const [dr, df] of ORTHOGONAL) {
      let nr = r + dr;
      let nf = f + df;
      // Non-capture: slides like a chariot while squares are empty.
      while (onBoard(nr, nf) && !this._board[nr * W + nf]) {
        this._pushMove(i, nr * W + nf, "n", moves);
        nr += dr;
        nf += df;
      }
      if (!onBoard(nr, nf)) continue;
      // Capture: skip the screen, then capture the next piece (if enemy).
      nr += dr;
      nf += df;
      while (onBoard(nr, nf)) {
        const t = this._board[nr * W + nf];
        if (t) {
          if (t.color !== color) this._pushMove(i, nr * W + nf, "c", moves);
          break;
        }
        nr += dr;
        nf += df;
      }
    }
  }

  /** Adds a single-step move (or capture) if the destination is on the board. */
  private _tryStep(
    from: number,
    nr: number,
    nf: number,
    color: Color,
    moves: Move[]
  ): void {
    if (!onBoard(nr, nf)) return;
    const target = this._board[nr * W + nf];
    if (!target) this._pushMove(from, nr * W + nf, "n", moves);
    else if (target.color !== color) this._pushMove(from, nr * W + nf, "c", moves);
  }

  private _pushMove(
    from: number,
    to: number,
    flag: string,
    moves: Move[]
  ): void {
    const piece = this._board[from]!;
    moves.push({
      from: sqName(from),
      to: sqName(to),
      color: piece.color,
      piece: piece.type,
      flags: flag,
      captured: flag === "c" ? this._board[to]?.type : undefined,
    });
  }

  // ---- King safety ---------------------------------------------------------

  private _kingIndex(board: (Piece | null)[], color: Color): number {
    for (let i = 0; i < W * H; i++) {
      const p = board[i];
      if (p && p.type === "k" && p.color === color) return i;
    }
    return -1;
  }

  private _inCheckOnBoard(board: (Piece | null)[], color: Color): boolean {
    const kingIdx = this._kingIndex(board, color);
    if (kingIdx < 0) return true; // king missing — treat as illegal
    if (this._kingsFacing(board)) return true;
    return this._isAttacked(board, kingIdx, opposite(color));
  }

  /** Flying-general rule: the two kings may not see each other on an empty file. */
  private _kingsFacing(board: (Piece | null)[]): boolean {
    const rk = this._kingIndex(board, "r");
    const bk = this._kingIndex(board, "b");
    if (rk < 0 || bk < 0) return false;
    if (rk % W !== bk % W) return false;
    const lo = Math.min(rk, bk);
    const hi = Math.max(rk, bk);
    for (let p = lo + W; p < hi; p += W) {
      if (board[p]) return false;
    }
    return true;
  }

  private _isAttacked(
    board: (Piece | null)[],
    target: number,
    byColor: Color
  ): boolean {
    return (
      this._attackedByChariot(board, target, byColor) ||
      this._attackedByCannon(board, target, byColor) ||
      this._attackedByHorse(board, target, byColor) ||
      this._attackedByPawn(board, target, byColor)
    );
  }

  private _attackedByChariot(
    board: (Piece | null)[],
    target: number,
    byColor: Color
  ): boolean {
    const tr = (target / W) | 0;
    const tf = target % W;
    for (const [dr, df] of ORTHOGONAL) {
      let nr = tr + dr;
      let nf = tf + df;
      while (onBoard(nr, nf)) {
        const p = board[nr * W + nf];
        if (p) {
          if (p.color === byColor && p.type === "r") return true;
          break;
        }
        nr += dr;
        nf += df;
      }
    }
    return false;
  }

  private _attackedByCannon(
    board: (Piece | null)[],
    target: number,
    byColor: Color
  ): boolean {
    const tr = (target / W) | 0;
    const tf = target % W;
    for (const [dr, df] of ORTHOGONAL) {
      let nr = tr + dr;
      let nf = tf + df;
      // Walk to the first piece (the screen).
      while (onBoard(nr, nf) && !board[nr * W + nf]) {
        nr += dr;
        nf += df;
      }
      if (!onBoard(nr, nf)) continue;
      // Skip the screen and look for the next piece.
      nr += dr;
      nf += df;
      while (onBoard(nr, nf)) {
        const p = board[nr * W + nf];
        if (p) {
          if (p.color === byColor && p.type === "c") return true;
          break;
        }
        nr += dr;
        nf += df;
      }
    }
    return false;
  }

  private _attackedByHorse(
    board: (Piece | null)[],
    target: number,
    byColor: Color
  ): boolean {
    const tr = (target / W) | 0;
    const tf = target % W;
    // Try every square a horse could be sitting on to reach the target.
    for (const [dr, df, lr, lf] of HORSE_MOVES) {
      const hr = tr - dr;
      const hf = tf - df;
      if (!onBoard(hr, hf)) continue;
      const p = board[hr * W + hf];
      if (!p || p.color !== byColor || p.type !== "h") continue;
      // The horse's leg must be empty (relative to the horse, not the target).
      if (board[(hr + lr) * W + (hf + lf)]) continue;
      return true;
    }
    return false;
  }

  private _attackedByPawn(
    board: (Piece | null)[],
    target: number,
    byColor: Color
  ): boolean {
    const tr = (target / W) | 0;
    const tf = target % W;
    // The square the attacking pawn would be standing on.
    const pawnR = byColor === "r" ? tr + 1 : tr - 1;
    if (onBoard(pawnR, tf)) {
      const p = board[pawnR * W + tf];
      if (p && p.color === byColor && p.type === "p") return true;
    }
    // Sideways attacks are only available after the pawn has crossed the river.
    for (const df of [-1, 1]) {
      if (!onBoard(tr, tf + df)) continue;
      const p = board[tr * W + tf + df];
      if (!p || p.color !== byColor || p.type !== "p") continue;
      if (crossedRiver(tr, byColor)) return true;
    }
    return false;
  }
}
