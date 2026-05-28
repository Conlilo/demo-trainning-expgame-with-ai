/**
 * A self-contained chess engine — full rules, no external library.
 *
 * Board model: a flat array of 64 cells. Index 0 is a8, index 63 is h1
 * (row-major, top-down) so it matches the layout returned by `board()`.
 */

export type Color = "w" | "b";
export type PieceSymbol = "p" | "n" | "b" | "r" | "q" | "k";
export type Square = string; // e.g. "e4"

export type Piece = { type: PieceSymbol; color: Color };

export type Move = {
  from: Square;
  to: Square;
  color: Color;
  piece: PieceSymbol;
  /** Combination of: n normal, c capture, b double-push, e en-passant, k/q castle. */
  flags: string;
  promotion?: PieceSymbol;
  captured?: PieceSymbol;
};

/** What `move()` accepts: an engine Move, or a plain coordinate request. */
export type MoveInput =
  | Move
  | { from: Square; to: Square; promotion?: PieceSymbol };

type Castling = { wK: boolean; wQ: boolean; bK: boolean; bQ: boolean };

type Snapshot = {
  board: (Piece | null)[];
  turn: Color;
  castling: Castling;
  ep: number | null;
  half: number;
  full: number;
};

const FILES = "abcdefgh";
const START_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const KNIGHT_DELTAS = [
  [-2, -1], [-2, 1], [-1, -2], [-1, 2],
  [1, -2], [1, 2], [2, -1], [2, 1],
];
const KING_DELTAS = [
  [-1, -1], [-1, 0], [-1, 1], [0, -1],
  [0, 1], [1, -1], [1, 0], [1, 1],
];
const BISHOP_DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const ROOK_DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

const sqName = (idx: number): Square => FILES[idx & 7] + (8 - (idx >> 3));
const parseSquare = (s: Square): number =>
  (8 - Number(s[1])) * 8 + (s.charCodeAt(0) - 97);
const onBoard = (r: number, f: number): boolean =>
  r >= 0 && r < 8 && f >= 0 && f < 8;
const opposite = (c: Color): Color => (c === "w" ? "b" : "w");

export class Chess {
  private _board: (Piece | null)[] = new Array(64).fill(null);
  private _turn: Color = "w";
  private _castling: Castling = { wK: true, wQ: true, bK: true, bQ: true };
  private _ep: number | null = null;
  private _half = 0;
  private _full = 1;

  private _snapshots: Snapshot[] = [];
  private _moveHistory: Move[] = [];
  private _positions: string[] = [];
  private _cache: Move[] | null = null;

  constructor(fen: string = START_FEN) {
    this._loadFen(fen);
    this._positions.push(this._positionKey());
  }

  // ---- FEN -----------------------------------------------------------------

  private _loadFen(fen: string): void {
    const [placement, turn, castle, ep, half, full] = fen.trim().split(/\s+/);

    this._board = new Array(64).fill(null);
    placement.split("/").forEach((rankStr, r) => {
      let f = 0;
      for (const ch of rankStr) {
        if (/\d/.test(ch)) {
          f += Number(ch);
        } else {
          const color: Color = ch === ch.toUpperCase() ? "w" : "b";
          this._board[r * 8 + f] = { type: ch.toLowerCase() as PieceSymbol, color };
          f++;
        }
      }
    });

    this._turn = turn === "b" ? "b" : "w";
    this._castling = {
      wK: castle.includes("K"),
      wQ: castle.includes("Q"),
      bK: castle.includes("k"),
      bQ: castle.includes("q"),
    };
    this._ep = ep && ep !== "-" ? parseSquare(ep) : null;
    this._half = Number(half) || 0;
    this._full = Number(full) || 1;
  }

  fen(): string {
    const c = this._castling;
    const castle =
      (c.wK ? "K" : "") + (c.wQ ? "Q" : "") + (c.bK ? "k" : "") + (c.bQ ? "q" : "");
    const ep = this._ep == null ? "-" : sqName(this._ep);
    return `${this._placementFen()} ${this._turn} ${castle || "-"} ${ep} ${this._half} ${this._full}`;
  }

  /** The piece-placement field of a FEN string. */
  private _placementFen(): string {
    let placement = "";
    for (let r = 0; r < 8; r++) {
      let empty = 0;
      for (let f = 0; f < 8; f++) {
        const p = this._board[r * 8 + f];
        if (!p) {
          empty++;
          continue;
        }
        if (empty) {
          placement += empty;
          empty = 0;
        }
        placement += p.color === "w" ? p.type.toUpperCase() : p.type;
      }
      if (empty) placement += empty;
      if (r < 7) placement += "/";
    }
    return placement;
  }

  /** FEN minus the move counters — identifies a position for repetition. */
  private _positionKey(): string {
    return this.fen().split(" ").slice(0, 4).join(" ");
  }

  // ---- Queries -------------------------------------------------------------

  turn(): Color {
    return this._turn;
  }

  get(square: Square): Piece | undefined {
    return this._board[parseSquare(square)] ?? undefined;
  }

  /** 8x8 grid, row 0 = rank 8. Each cell carries its own square name. */
  board(): ({ square: Square; type: PieceSymbol; color: Color } | null)[][] {
    const grid: ({ square: Square; type: PieceSymbol; color: Color } | null)[][] = [];
    for (let r = 0; r < 8; r++) {
      const row: ({ square: Square; type: PieceSymbol; color: Color } | null)[] = [];
      for (let f = 0; f < 8; f++) {
        const idx = r * 8 + f;
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

  /** Legal moves, optionally restricted to a single origin square. */
  moves(options?: { square?: Square; verbose?: boolean }): Move[] {
    const all = this._legalMoves();
    return options?.square
      ? all.filter((m) => m.from === options.square)
      : all.slice();
  }

  inCheck(): boolean {
    return this._isAttacked(
      this._board,
      this._kingIndex(this._board, this._turn),
      opposite(this._turn)
    );
  }

  isCheckmate(): boolean {
    return this.inCheck() && this._legalMoves().length === 0;
  }

  isStalemate(): boolean {
    return !this.inCheck() && this._legalMoves().length === 0;
  }

  isInsufficientMaterial(): boolean {
    const bishopSquareColors: number[] = [];
    let knights = 0;
    for (let i = 0; i < 64; i++) {
      const p = this._board[i];
      if (!p || p.type === "k") continue;
      if (p.type === "p" || p.type === "r" || p.type === "q") return false;
      if (p.type === "b") bishopSquareColors.push(((i >> 3) + (i & 7)) % 2);
      else knights++;
    }
    const total = bishopSquareColors.length + knights;
    if (total <= 1) return true; // K vs K, or K + one minor vs K
    return (
      // Bishops only, all on the same colour squares — cannot force mate.
      knights === 0 && bishopSquareColors.every((c) => c === bishopSquareColors[0])
    );
  }

  isThreefoldRepetition(): boolean {
    const key = this._positions[this._positions.length - 1];
    return this._positions.filter((k) => k === key).length >= 3;
  }

  isDraw(): boolean {
    return (
      this.isStalemate() ||
      this.isInsufficientMaterial() ||
      this.isThreefoldRepetition() ||
      this._half >= 100
    );
  }

  isGameOver(): boolean {
    return this.isCheckmate() || this.isDraw();
  }

  // ---- Making moves --------------------------------------------------------

  move(input: MoveInput): Move | null {
    let mv: Move | null;
    if (typeof (input as Move).flags === "string") {
      mv = input as Move; // Trusted: produced by this engine's moves().
    } else {
      mv = this._matchMove(input as { from: Square; to: Square; promotion?: PieceSymbol });
      if (!mv) return null;
    }
    this._apply(mv);
    return mv;
  }

  /** Validates a coordinate request from the UI against the legal move list. */
  private _matchMove(req: {
    from: Square;
    to: Square;
    promotion?: PieceSymbol;
  }): Move | null {
    return (
      this._legalMoves().find(
        (m) =>
          m.from === req.from &&
          m.to === req.to &&
          (m.promotion ?? null) === (req.promotion ?? null)
      ) ?? null
    );
  }

  undo(): Move | null {
    const snap = this._snapshots.pop();
    if (!snap) return null;
    const mv = this._moveHistory.pop() ?? null;
    this._positions.pop();
    this._board = snap.board;
    this._turn = snap.turn;
    this._castling = snap.castling;
    this._ep = snap.ep;
    this._half = snap.half;
    this._full = snap.full;
    this._cache = null;
    return mv;
  }

  private _apply(mv: Move): void {
    const from = parseSquare(mv.from);
    const to = parseSquare(mv.to);
    const piece = this._board[from]!;
    const isCapture = mv.flags.includes("c") || mv.flags.includes("e");

    this._snapshots.push({
      board: this._board.slice(),
      turn: this._turn,
      castling: { ...this._castling },
      ep: this._ep,
      half: this._half,
      full: this._full,
    });

    this._applyToBoard(this._board, mv);
    this._updateCastlingRights(piece, from, to);

    // En-passant target exists only on the move right after a double push.
    this._ep = mv.flags.includes("b") ? (from + to) / 2 : null;
    this._half = piece.type === "p" || isCapture ? 0 : this._half + 1;
    if (this._turn === "b") this._full++;
    this._turn = opposite(this._turn);

    this._moveHistory.push(mv);
    this._positions.push(this._positionKey());
    this._cache = null;
  }

  /** Castling is lost when the king/rook leaves home or a home rook is taken. */
  private _updateCastlingRights(piece: Piece, from: number, to: number): void {
    if (piece.type === "k") {
      if (piece.color === "w") {
        this._castling.wK = false;
        this._castling.wQ = false;
      } else {
        this._castling.bK = false;
        this._castling.bQ = false;
      }
    }
    for (const idx of [from, to]) {
      if (idx === 56) this._castling.wQ = false; // a1
      else if (idx === 63) this._castling.wK = false; // h1
      else if (idx === 0) this._castling.bQ = false; // a8
      else if (idx === 7) this._castling.bK = false; // h8
    }
  }

  /** Applies a move's piece changes to a board array (used live and for search). */
  private _applyToBoard(board: (Piece | null)[], mv: Move): void {
    const from = parseSquare(mv.from);
    const to = parseSquare(mv.to);
    const piece = board[from]!;

    board[from] = null;

    if (mv.flags.includes("e")) {
      // En-passant: the captured pawn sits on the mover's rank, target file.
      board[(from >> 3) * 8 + (to & 7)] = null;
    }

    board[to] = mv.promotion ? { type: mv.promotion, color: piece.color } : piece;

    if (mv.flags.includes("k")) {
      const r = from >> 3; // kingside: rook h-file -> f-file
      board[r * 8 + 5] = board[r * 8 + 7];
      board[r * 8 + 7] = null;
    } else if (mv.flags.includes("q")) {
      const r = from >> 3; // queenside: rook a-file -> d-file
      board[r * 8 + 3] = board[r * 8 + 0];
      board[r * 8 + 0] = null;
    }
  }

  // ---- Move generation -----------------------------------------------------

  private _legalMoves(): Move[] {
    if (this._cache) return this._cache;

    const legal: Move[] = [];
    for (const mv of this._pseudoMoves(this._turn)) {
      const copy = this._board.slice();
      this._applyToBoard(copy, mv);
      const safe = !this._isAttacked(
        copy,
        this._kingIndex(copy, this._turn),
        opposite(this._turn)
      );
      if (safe) legal.push(mv);
    }
    this._cache = legal;
    return legal;
  }

  /** All pseudo-legal moves (king-safety not yet checked) for `color`. */
  private _pseudoMoves(color: Color): Move[] {
    const moves: Move[] = [];
    for (let i = 0; i < 64; i++) {
      const piece = this._board[i];
      if (!piece || piece.color !== color) continue;

      switch (piece.type) {
        case "p":
          this._genPawn(i, color, moves);
          break;
        case "n":
          this._genStepper(i, color, KNIGHT_DELTAS, moves);
          break;
        case "k":
          this._genStepper(i, color, KING_DELTAS, moves);
          this._genCastling(i, color, moves);
          break;
        case "b":
          this._genSlider(i, color, BISHOP_DIRS, moves);
          break;
        case "r":
          this._genSlider(i, color, ROOK_DIRS, moves);
          break;
        case "q":
          this._genSlider(i, color, [...BISHOP_DIRS, ...ROOK_DIRS], moves);
          break;
      }
    }
    return moves;
  }

  private _genPawn(i: number, color: Color, moves: Move[]): void {
    const r = i >> 3;
    const f = i & 7;
    const dir = color === "w" ? -1 : 1;
    const startRank = color === "w" ? 6 : 1;
    const board = this._board;

    // Forward one square, and two from the starting rank.
    if (onBoard(r + dir, f) && !board[(r + dir) * 8 + f]) {
      this._pushPawn(i, (r + dir) * 8 + f, "n", moves);
      if (r === startRank && !board[(r + 2 * dir) * 8 + f]) {
        this._pushMove(i, (r + 2 * dir) * 8 + f, "b", moves);
      }
    }
    // Diagonal captures and en-passant.
    for (const df of [-1, 1]) {
      const nr = r + dir;
      const nf = f + df;
      if (!onBoard(nr, nf)) continue;
      const to = nr * 8 + nf;
      const target = board[to];
      if (target && target.color !== color) {
        this._pushPawn(i, to, "c", moves);
      } else if (this._ep != null && to === this._ep) {
        this._pushMove(i, to, "e", moves);
      }
    }
  }

  /** Single-step pieces: knight and king. */
  private _genStepper(
    i: number,
    color: Color,
    deltas: number[][],
    moves: Move[]
  ): void {
    const r = i >> 3;
    const f = i & 7;
    for (const [dr, df] of deltas) {
      if (!onBoard(r + dr, f + df)) continue;
      const to = (r + dr) * 8 + (f + df);
      const target = this._board[to];
      if (!target) this._pushMove(i, to, "n", moves);
      else if (target.color !== color) this._pushMove(i, to, "c", moves);
    }
  }

  /** Sliding pieces: bishop, rook, queen. */
  private _genSlider(
    i: number,
    color: Color,
    dirs: number[][],
    moves: Move[]
  ): void {
    const r = i >> 3;
    const f = i & 7;
    for (const [dr, df] of dirs) {
      let nr = r + dr;
      let nf = f + df;
      while (onBoard(nr, nf)) {
        const target = this._board[nr * 8 + nf];
        if (!target) {
          this._pushMove(i, nr * 8 + nf, "n", moves);
        } else {
          if (target.color !== color) this._pushMove(i, nr * 8 + nf, "c", moves);
          break;
        }
        nr += dr;
        nf += df;
      }
    }
  }

  private _genCastling(kingIdx: number, color: Color, moves: Move[]): void {
    const rank = color === "w" ? 7 : 0;
    const home = rank * 8 + 4;
    if (kingIdx !== home) return;

    const opp = opposite(color);
    const board = this._board;
    if (this._isAttacked(board, home, opp)) return; // cannot castle out of check

    const rookOk = (idx: number): boolean =>
      board[idx]?.type === "r" && board[idx]?.color === color;
    const empty = (idx: number): boolean => !board[idx];
    const safe = (idx: number): boolean => !this._isAttacked(board, idx, opp);

    const kingside = color === "w" ? this._castling.wK : this._castling.bK;
    if (
      kingside &&
      rookOk(rank * 8 + 7) &&
      empty(rank * 8 + 5) &&
      empty(rank * 8 + 6) &&
      safe(rank * 8 + 5) &&
      safe(rank * 8 + 6)
    ) {
      this._pushMove(home, rank * 8 + 6, "k", moves);
    }

    const queenside = color === "w" ? this._castling.wQ : this._castling.bQ;
    if (
      queenside &&
      rookOk(rank * 8 + 0) &&
      empty(rank * 8 + 3) &&
      empty(rank * 8 + 2) &&
      empty(rank * 8 + 1) &&
      safe(rank * 8 + 3) &&
      safe(rank * 8 + 2)
    ) {
      this._pushMove(home, rank * 8 + 2, "q", moves);
    }
  }

  /** Appends a move; expands to four entries when a pawn promotes. */
  private _pushPawn(from: number, to: number, flag: string, moves: Move[]): void {
    const toRank = to >> 3;
    if (toRank === 0 || toRank === 7) {
      for (const promo of ["q", "r", "b", "n"] as PieceSymbol[]) {
        this._pushMove(from, to, flag, moves, promo);
      }
    } else {
      this._pushMove(from, to, flag, moves);
    }
  }

  private _pushMove(
    from: number,
    to: number,
    flag: string,
    moves: Move[],
    promotion?: PieceSymbol
  ): void {
    const piece = this._board[from]!;
    let captured: PieceSymbol | undefined;
    if (flag.includes("c")) captured = this._board[to]?.type;
    else if (flag.includes("e")) captured = "p";
    moves.push({
      from: sqName(from),
      to: sqName(to),
      color: piece.color,
      piece: piece.type,
      flags: flag,
      promotion,
      captured,
    });
  }

  // ---- Attack detection ----------------------------------------------------

  private _kingIndex(board: (Piece | null)[], color: Color): number {
    for (let i = 0; i < 64; i++) {
      const p = board[i];
      if (p && p.type === "k" && p.color === color) return i;
    }
    return -1;
  }

  /** True if `byColor` attacks `target` on the given board. */
  private _isAttacked(
    board: (Piece | null)[],
    target: number,
    byColor: Color
  ): boolean {
    if (target < 0) return false;
    const tr = target >> 3;
    const tf = target & 7;

    return (
      this._attackedByPawn(board, tr, tf, byColor) ||
      this._attackedByStep(board, tr, tf, KNIGHT_DELTAS, byColor, "n") ||
      this._attackedByStep(board, tr, tf, KING_DELTAS, byColor, "k") ||
      this._attackedBySlider(board, tr, tf, BISHOP_DIRS, byColor, ["b", "q"]) ||
      this._attackedBySlider(board, tr, tf, ROOK_DIRS, byColor, ["r", "q"])
    );
  }

  private _attackedByPawn(
    board: (Piece | null)[],
    tr: number,
    tf: number,
    byColor: Color
  ): boolean {
    // A pawn attacks the rank "ahead" of it, so the attacker sits behind.
    const rank = byColor === "w" ? tr + 1 : tr - 1;
    for (const df of [-1, 1]) {
      if (!onBoard(rank, tf + df)) continue;
      const p = board[rank * 8 + tf + df];
      if (p && p.color === byColor && p.type === "p") return true;
    }
    return false;
  }

  private _attackedByStep(
    board: (Piece | null)[],
    tr: number,
    tf: number,
    deltas: number[][],
    byColor: Color,
    type: PieceSymbol
  ): boolean {
    for (const [dr, df] of deltas) {
      if (!onBoard(tr + dr, tf + df)) continue;
      const p = board[(tr + dr) * 8 + tf + df];
      if (p && p.color === byColor && p.type === type) return true;
    }
    return false;
  }

  private _attackedBySlider(
    board: (Piece | null)[],
    tr: number,
    tf: number,
    dirs: number[][],
    byColor: Color,
    types: PieceSymbol[]
  ): boolean {
    for (const [dr, df] of dirs) {
      let nr = tr + dr;
      let nf = tf + df;
      while (onBoard(nr, nf)) {
        const p = board[nr * 8 + nf];
        if (p) {
          if (p.color === byColor && types.includes(p.type)) return true;
          break;
        }
        nr += dr;
        nf += df;
      }
    }
    return false;
  }
}
