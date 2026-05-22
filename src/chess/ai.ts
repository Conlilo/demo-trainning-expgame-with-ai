import { Chess, Move } from "./engine";

// Material values in centipawns. The king is never captured, so it has no value.
const PIECE_VALUE: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 0,
};

const MATE = 1_000_000;

// Board score from White's point of view (positive = White is better).
function evaluate(game: Chess): number {
  let score = 0;
  for (const row of game.board()) {
    for (const square of row) {
      if (!square) continue;
      const value = PIECE_VALUE[square.type];
      score += square.color === "w" ? value : -value;
    }
  }
  return score;
}

// Negamax search with alpha-beta pruning. `color` is +1 for White, -1 for Black.
function negamax(
  game: Chess,
  depth: number,
  alpha: number,
  beta: number,
  color: number
): number {
  if (game.isGameOver()) {
    if (game.isCheckmate()) {
      // The side to move is checkmated. Prefer mates that happen sooner.
      return -(MATE + depth);
    }
    return 0; // stalemate / draw
  }
  if (depth === 0) {
    return color * evaluate(game);
  }

  let best = -Infinity;
  for (const move of game.moves()) {
    game.move(move);
    const score = -negamax(game, depth - 1, -beta, -alpha, -color);
    game.undo();
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break; // cutoff
  }
  return best;
}

/**
 * Picks the best move for the side to move in the given position.
 * Returns an engine Move, or null if there are no legal moves.
 */
export function findBestMove(fen: string, depth = 3): Move | null {
  const game = new Chess(fen);
  const moves = game.moves();
  if (moves.length === 0) return null;

  // Shuffle so the engine varies between moves of equal value.
  for (let i = moves.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [moves[i], moves[j]] = [moves[j], moves[i]];
  }

  const color = game.turn() === "w" ? 1 : -1;
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
