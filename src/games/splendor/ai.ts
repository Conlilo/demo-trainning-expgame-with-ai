// ---------------------------------------------------------------------------
// Splendor — heuristic AI.
//
// Greedy "engine builder": buy the most valuable affordable card, otherwise
// pick up the tokens that move it toward its best target card, otherwise
// reserve a strong card (and grab the gold that comes with it). Always returns
// a legal move; `pass` is only a last resort that never triggers in practice.
// ---------------------------------------------------------------------------

import {
  BOARD_SLOTS,
  BoardRef,
  Card,
  Gem,
  GEMS,
  GameState,
  Move,
  RESERVE_LIMIT,
  ReservedRef,
  Tier,
  TIERS,
  affordability,
  bonuses,
  canTake2,
  canTake3,
  emptyGems,
  totalTokens,
} from "./engine";

type Buyable = { ref: BoardRef | ReservedRef; card: Card; gold: number };

/** Every card the current player can pay for right now (board + reserved). */
function affordableCards(s: GameState): Buyable[] {
  const me = s.players[s.current];
  const out: Buyable[] = [];
  for (const tier of TIERS) {
    for (let i = 0; i < BOARD_SLOTS; i++) {
      const card = s.board[tier][i];
      if (!card) continue;
      const aff = affordability(me, card);
      if (aff.ok) out.push({ ref: { from: "board", tier, index: i }, card, gold: aff.goldNeeded });
    }
  }
  me.reserved.forEach((card, i) => {
    const aff = affordability(me, card);
    if (aff.ok) out.push({ ref: { from: "reserved", index: i }, card, gold: aff.goldNeeded });
  });
  return out;
}

/** How much a noble visit is helped by owning one more card of `gem`. */
function nobleProgress(s: GameState, gem: Gem): number {
  const me = s.players[s.current];
  const bon = bonuses(me);
  let v = 0;
  for (const n of s.nobles) {
    const remaining = GEMS.reduce((sum, g) => sum + Math.max(0, n.req[g] - bon[g]), 0);
    // A card of `gem` only helps if this noble still needs that colour.
    if (n.req[gem] - bon[gem] > 0 && remaining > 0) v += 4 / remaining;
  }
  return v;
}

/** Heuristic worth of acquiring `card` now. */
function cardValue(s: GameState, card: Card, gold: number): number {
  const me = s.players[s.current];
  const bon = bonuses(me);
  let v = card.points * 6;
  // A bonus colour we own little of is worth more (builds the engine).
  v += Math.max(0, 3 - bon[card.gem]) * 1.2;
  v += nobleProgress(s, card.gem);
  v += card.tier * 0.4;
  v -= gold * 0.5; // spending the flexible gold has a small cost
  return v;
}

/** The best card on the board the AI should work toward buying next. */
function pickTarget(s: GameState): Card | null {
  const me = s.players[s.current];
  let best: Card | null = null;
  let bestScore = -Infinity;
  const consider = (card: Card | null) => {
    if (!card) return;
    const aff = affordability(me, card);
    // Cheaper-to-finish, higher-value cards make better targets.
    const deficit = neededGems(s, card);
    const totalDeficit = GEMS.reduce((sum, g) => sum + deficit[g], 0);
    const sc = cardValue(s, card, aff.goldNeeded) - totalDeficit * 0.8;
    if (sc > bestScore) {
      bestScore = sc;
      best = card;
    }
  };
  for (const tier of TIERS) for (let i = 0; i < BOARD_SLOTS; i++) consider(s.board[tier][i]);
  me.reserved.forEach(consider);
  return best;
}

/** Coloured tokens still needed to buy `card` (after bonuses & held tokens). */
function neededGems(s: GameState, card: Card) {
  const me = s.players[s.current];
  const bon = bonuses(me);
  const need = emptyGems();
  for (const g of GEMS) {
    need[g] = Math.max(0, card.cost[g] - bon[g] - me.tokens[g]);
  }
  return need;
}

function gemsInBank(s: GameState): Gem[] {
  return GEMS.filter((g) => s.bank[g] > 0);
}

/** Choose a legal move for the current (AI) player. */
export function chooseMove(s: GameState): Move {
  const me = s.players[s.current];
  const buyables = affordableCards(s);

  // 1. Buy the best affordable card if it is worth it. Always grab anything
  //    with prestige, anything that summons a noble, or when hoarding tokens.
  if (buyables.length > 0) {
    buyables.sort((a, b) => cardValue(s, b.card, b.gold) - cardValue(s, a.card, a.gold));
    const top = buyables[0];
    const summonsNoble = wouldSummonNoble(s, top.card.gem);
    const worthIt =
      top.card.points > 0 ||
      summonsNoble ||
      totalTokens(me) >= 8 ||
      cardValue(s, top.card, top.gold) >= 3;
    if (worthIt) return { type: "purchase", ref: top.ref };
  }

  // 2. Otherwise gather tokens toward the best target card.
  const target = pickTarget(s);
  if (target) {
    const need = neededGems(s, target);
    const wanted = GEMS.filter((g) => need[g] > 0 && s.bank[g] > 0).sort(
      (a, b) => need[b] - need[a]
    );

    // Two-of-a-kind when one colour is in heavy demand and the stack allows it.
    const heavy = wanted.find((g) => need[g] >= 2 && canTake2(s, g));
    if (wanted.length < 3 && heavy) return { type: "take2", color: heavy };

    if (wanted.length >= 1) {
      const pick = wanted.slice(0, 3);
      if (canTake3(s, pick)) return { type: "take3", colors: pick };
    }
  }

  // 3. Nothing to build toward: take any three distinct tokens.
  const available = gemsInBank(s);
  if (available.length > 0) {
    const pick = available.slice(0, 3);
    if (canTake3(s, pick)) return { type: "take3", colors: pick };
  }
  const two = GEMS.find((g) => canTake2(s, g));
  if (two) return { type: "take2", color: two };

  // 4. Can't take tokens — reserve the best high-tier card (and gain gold).
  if (me.reserved.length < RESERVE_LIMIT) {
    const ref = bestReserveTarget(s);
    if (ref) return { type: "reserve", ref };
  }

  return { type: "pass" };
}

/** Would owning one more card of `gem` immediately satisfy a waiting noble? */
function wouldSummonNoble(s: GameState, gem: Gem): boolean {
  const me = s.players[s.current];
  const bon = { ...bonuses(me) };
  bon[gem]++;
  return s.nobles.some((n) => GEMS.every((g) => bon[g] >= n.req[g]));
}

/** Highest-tier face-up card to reserve (falls back to a non-empty deck). */
function bestReserveTarget(s: GameState): BoardRef | null {
  for (const tier of [3, 2, 1] as Tier[]) {
    for (let i = 0; i < BOARD_SLOTS; i++) {
      if (s.board[tier][i]) return { from: "board", tier, index: i };
    }
  }
  return null;
}
