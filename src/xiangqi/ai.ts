import { Xiangqi, Move } from "./engine";

// Piece values in centipawn-ish units. The king is handled via checkmate.
const PIECE_VALUE: Record<string, number> = {
  k: 0,
  r: 900, // Chariot — the strongest sliding piece
  c: 450, // Cannon
  h: 400, // Horse
  a: 200, // Advisor
  e: 200, // Elephant
  p: 100, // Pawn
};

const MATE = 1_000_000;

/** Board score from Red's perspective. Pawns are worth more once past the river. */
function evaluate(game: Xiangqi): number {
  let score = 0;
  const grid = game.board();
  for (let r = 0; r < grid.length; r++) {
    for (const cell of grid[r]) {
      if (!cell) continue;
      let value = PIECE_VALUE[cell.type];
      if (cell.type === "p") {
        const crossed =
          cell.color === "r" ? r <= 4 : r >= 5;
        if (crossed) value += 100;
      }
      score += cell.color === "r" ? value : -value;
    }
  }
  return score;
}

function negamax(
  game: Xiangqi,
  depth: number,
  alpha: number,
  beta: number,
  color: number
): number {
  if (game.isGameOver()) {
    // The side to move has no legal moves — either checkmated or stalemated.
    // In Xiangqi both end the game and the side to move loses.
    return -(MATE + depth);
  }
  if (depth === 0) return color * evaluate(game);

  let best = -Infinity;
  for (const move of game.moves()) {
    game.move(move);
    const score = -negamax(game, depth - 1, -beta, -alpha, -color);
    game.undo();
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

/**
 * Picks the best move for the side to move. Mutates `game` during the search
 * but every make is paired with an undo, so the position is restored on return.
 */
export function findBestMove(game: Xiangqi, depth = 3): Move | null {
  const moves = game.moves();
  if (moves.length === 0) return null;

  for (let i = moves.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [moves[i], moves[j]] = [moves[j], moves[i]];
  }

  const color = game.turn() === "r" ? 1 : -1;
  let bestMove = moves[0];
  let bestScore = -Infinity;

  for (const move of moves) {
    game.move(move);
    const score = -negamax(game, depth - 1, -Infinity, Infinity, -color);
    game.undo();
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }
  return bestMove;
}
