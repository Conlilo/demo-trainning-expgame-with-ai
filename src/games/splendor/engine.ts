// ---------------------------------------------------------------------------
// Splendor — pure game engine.
//
// No React, no I/O: every exported function is either a pure helper that reads
// state, or an "action" that takes a GameState and returns a NEW GameState
// (state is treated as immutable so React can diff cheaply). Card and Noble
// objects are static and shared by reference — only the mutable containers
// (player records, bank, board/deck arrays) are cloned.
// ---------------------------------------------------------------------------

export type Gem = "diamond" | "sapphire" | "emerald" | "ruby" | "onyx";
/** A token in the bank: the five gems plus the gold joker. */
export type Token = Gem | "gold";
export type Tier = 1 | 2 | 3;

export const GEMS: Gem[] = ["diamond", "sapphire", "emerald", "ruby", "onyx"];
export const TOKENS: Token[] = [...GEMS, "gold"];
export const TIERS: Tier[] = [1, 2, 3];

/** Prestige needed to trigger the final round. */
export const WIN_SCORE = 15;
/** Face-up development cards per tier. */
export const BOARD_SLOTS = 4;
/** Max tokens a player may hold at the end of their turn. */
export const TOKEN_LIMIT = 10;
/** Max development cards a player may have reserved at once. */
export const RESERVE_LIMIT = 3;

export type GemCount = Record<Gem, number>;
export type TokenBank = Record<Token, number>;

export function emptyGems(): GemCount {
  return { diamond: 0, sapphire: 0, emerald: 0, ruby: 0, onyx: 0 };
}
export function emptyTokens(): TokenBank {
  return { diamond: 0, sapphire: 0, emerald: 0, ruby: 0, onyx: 0, gold: 0 };
}

export type Card = {
  id: string;
  tier: Tier;
  gem: Gem; // permanent bonus colour granted when purchased
  points: number; // prestige
  cost: GemCount;
};

export type Noble = {
  id: string;
  points: number;
  req: GemCount; // required bonus cards of each colour
};

export type PlayerState = {
  id: number;
  name: string;
  isAI: boolean;
  tokens: TokenBank; // gems + gold currently held
  cards: Card[]; // purchased development cards
  reserved: Card[]; // reserved (face-down) cards, max RESERVE_LIMIT
  nobles: Noble[]; // claimed noble tiles
};

export type GameState = {
  players: PlayerState[];
  current: number; // index of the player to move
  bank: TokenBank; // tokens available to take
  decks: Record<Tier, Card[]>; // face-down draw piles (index 0 = top)
  board: Record<Tier, (Card | null)[]>; // BOARD_SLOTS face-up cards per tier
  nobles: Noble[]; // noble tiles still on offer
  lastRound: boolean; // someone reached WIN_SCORE — finish the round
  winner: number | null; // player index once the game is over, else null
  log: string[]; // human-readable turn history (newest last)
};

// ---------------------------------------------------------------------------
// Card & noble data — the standard 90-card / 10-noble structure.
//
// Cards are generated from per-tier archetypes. For a card whose bonus colour
// is X, its cost is spread over the *other four* colours (a, b, c, d) in a
// fixed rotation, so no single colour is over-demanded. This reproduces the
// real distribution (8 cards/colour in tier 1, 6 in tier 2, 4 in tier 3) and
// the real point/cost scaling (T1: 0–1pt, T2: 1–3pt, T3: 3–5pt).
// ---------------------------------------------------------------------------

type Archetype = { points: number; cost: [number, number, number, number] };

const TIER1: Archetype[] = [
  { points: 0, cost: [1, 1, 1, 1] },
  { points: 0, cost: [2, 1, 1, 1] },
  { points: 0, cost: [2, 2, 0, 1] },
  { points: 0, cost: [3, 1, 1, 0] },
  { points: 0, cost: [2, 1, 0, 0] },
  { points: 0, cost: [2, 2, 0, 0] },
  { points: 0, cost: [3, 0, 0, 0] },
  { points: 1, cost: [4, 0, 0, 0] },
];

const TIER2: Archetype[] = [
  { points: 1, cost: [3, 2, 2, 0] },
  { points: 1, cost: [0, 2, 2, 3] },
  { points: 2, cost: [5, 0, 0, 0] },
  { points: 2, cost: [4, 2, 1, 0] },
  { points: 2, cost: [5, 3, 0, 0] },
  { points: 3, cost: [6, 0, 0, 0] },
];

const TIER3: Archetype[] = [
  { points: 3, cost: [3, 3, 5, 3] },
  { points: 4, cost: [7, 0, 0, 0] },
  { points: 4, cost: [6, 3, 3, 0] },
  { points: 5, cost: [7, 3, 0, 0] },
];

const ARCHETYPES: Record<Tier, Archetype[]> = { 1: TIER1, 2: TIER2, 3: TIER3 };

/** The four non-bonus colours for `gem`, in a fixed rotation. */
function otherGems(gem: Gem): [Gem, Gem, Gem, Gem] {
  const i = GEMS.indexOf(gem);
  return [
    GEMS[(i + 1) % 5],
    GEMS[(i + 2) % 5],
    GEMS[(i + 3) % 5],
    GEMS[(i + 4) % 5],
  ];
}

function buildAllCards(): Record<Tier, Card[]> {
  const out: Record<Tier, Card[]> = { 1: [], 2: [], 3: [] };
  for (const tier of TIERS) {
    for (const gem of GEMS) {
      const others = otherGems(gem);
      ARCHETYPES[tier].forEach((arch, idx) => {
        const cost = emptyGems();
        arch.cost.forEach((n, k) => {
          if (n > 0) cost[others[k]] = n;
        });
        out[tier].push({
          id: `t${tier}-${gem}-${idx}`,
          tier,
          gem,
          points: arch.points,
          cost,
        });
      });
    }
  }
  return out;
}

/** The ten noble tiles (each worth 3 prestige). */
function buildNobles(): Noble[] {
  const reqs: Array<Partial<GemCount>> = [
    { emerald: 4, sapphire: 4 },
    { diamond: 4, onyx: 4 },
    { ruby: 4, onyx: 4 },
    { sapphire: 4, diamond: 4 },
    { emerald: 4, ruby: 4 },
    { diamond: 3, sapphire: 3, emerald: 3 },
    { onyx: 3, ruby: 3, diamond: 3 },
    { sapphire: 3, emerald: 3, ruby: 3 },
    { emerald: 3, ruby: 3, onyx: 3 },
    { diamond: 3, sapphire: 3, onyx: 3 },
  ];
  return reqs.map((r, i) => ({
    id: `noble-${i}`,
    points: 3,
    req: { ...emptyGems(), ...r },
  }));
}

/** Gem tokens of each colour in the bank, by player count. Gold is always 5. */
function bankSizeFor(playerCount: number): number {
  if (playerCount <= 2) return 4;
  if (playerCount === 3) return 5;
  return 7;
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export type SeatConfig = { name: string; isAI: boolean };

/** Build a fresh, shuffled game for the given seats (2–4 players). */
export function setup(seats: SeatConfig[]): GameState {
  const all = buildAllCards();
  const decks: Record<Tier, Card[]> = {
    1: shuffle(all[1]),
    2: shuffle(all[2]),
    3: shuffle(all[3]),
  };
  const board: Record<Tier, (Card | null)[]> = { 1: [], 2: [], 3: [] };
  for (const tier of TIERS) {
    for (let i = 0; i < BOARD_SLOTS; i++) {
      board[tier].push(decks[tier].shift() ?? null);
    }
  }

  const gem = bankSizeFor(seats.length);
  const bank: TokenBank = {
    diamond: gem,
    sapphire: gem,
    emerald: gem,
    ruby: gem,
    onyx: gem,
    gold: 5,
  };

  const nobles = shuffle(buildNobles()).slice(0, seats.length + 1);

  const players: PlayerState[] = seats.map((s, i) => ({
    id: i,
    name: s.name,
    isAI: s.isAI,
    tokens: emptyTokens(),
    cards: [],
    reserved: [],
    nobles: [],
  }));

  return {
    players,
    current: 0,
    bank,
    decks,
    board,
    nobles,
    lastRound: false,
    winner: null,
    log: [],
  };
}

// ---------------------------------------------------------------------------
// Derived helpers (pure reads).
// ---------------------------------------------------------------------------

/** Permanent gem discount from a player's purchased cards. */
export function bonuses(p: PlayerState): GemCount {
  const b = emptyGems();
  for (const c of p.cards) b[c.gem]++;
  return b;
}

export function cardPoints(p: PlayerState): number {
  return p.cards.reduce((s, c) => s + c.points, 0);
}

export function score(p: PlayerState): number {
  return cardPoints(p) + p.nobles.reduce((s, n) => s + n.points, 0);
}

export function totalTokens(p: PlayerState): number {
  return TOKENS.reduce((s, t) => s + p.tokens[t], 0);
}

/**
 * Can `p` afford `card`? Bonuses discount the cost; gold covers any shortfall.
 * Returns the gold needed (0 if payable with coloured tokens alone), or null
 * if even gold can't cover it.
 */
export function affordability(
  p: PlayerState,
  card: Card
): { ok: boolean; goldNeeded: number } {
  const bon = bonuses(p);
  let gold = 0;
  for (const g of GEMS) {
    const need = Math.max(0, card.cost[g] - bon[g]);
    const pay = Math.min(need, p.tokens[g]);
    gold += need - pay; // shortfall must come from gold
  }
  return { ok: gold <= p.tokens.gold, goldNeeded: gold };
}

export function canAfford(p: PlayerState, card: Card): boolean {
  return affordability(p, card).ok;
}

/** Noble tiles whose requirements `p` currently meets. */
export function eligibleNobles(p: PlayerState, pool: Noble[]): Noble[] {
  const bon = bonuses(p);
  return pool.filter((n) => GEMS.every((g) => bon[g] >= n.req[g]));
}

/** Winner index by prestige, breaking ties by fewest development cards. */
export function computeWinner(players: PlayerState[]): number {
  let best = 0;
  for (let i = 1; i < players.length; i++) {
    const a = players[i];
    const b = players[best];
    const sa = score(a);
    const sb = score(b);
    if (sa > sb || (sa === sb && a.cards.length < b.cards.length)) best = i;
  }
  return best;
}

// ---------------------------------------------------------------------------
// Moves.
// ---------------------------------------------------------------------------

/** A face-up card on the board. */
export type BoardRef = { from: "board"; tier: Tier; index: number };
/** One of the current player's reserved cards. */
export type ReservedRef = { from: "reserved"; index: number };
/** The (hidden) top of a draw pile — only valid for reserving. */
export type DeckRef = { from: "deck"; tier: Tier };

export type Move =
  | { type: "take3"; colors: Gem[] } // 1–3 distinct gem colours
  | { type: "take2"; color: Gem } // 2 of one colour (needs ≥4 in bank)
  | { type: "reserve"; ref: BoardRef | DeckRef }
  | { type: "purchase"; ref: BoardRef | ReservedRef }
  | { type: "pass" }; // safety valve — no legal action available

// --- clone helpers (mutable containers only; cards/nobles are shared) -------

function clonePlayer(p: PlayerState): PlayerState {
  return {
    ...p,
    tokens: { ...p.tokens },
    cards: p.cards.slice(),
    reserved: p.reserved.slice(),
    nobles: p.nobles.slice(),
  };
}

function cloneState(s: GameState): GameState {
  return {
    players: s.players.map(clonePlayer),
    current: s.current,
    bank: { ...s.bank },
    decks: { 1: s.decks[1].slice(), 2: s.decks[2].slice(), 3: s.decks[3].slice() },
    board: { 1: s.board[1].slice(), 2: s.board[2].slice(), 3: s.board[3].slice() },
    nobles: s.nobles.slice(),
    lastRound: s.lastRound,
    winner: s.winner,
    log: s.log.slice(),
  };
}

/** Look up the card a ref points at (board / reserved). Null for deck refs. */
export function cardAt(
  s: GameState,
  ref: BoardRef | ReservedRef
): Card | null {
  if (ref.from === "board") return s.board[ref.tier][ref.index];
  return s.players[s.current].reserved[ref.index] ?? null;
}

// --- legality checks --------------------------------------------------------

export function canTake3(s: GameState, colors: Gem[]): boolean {
  if (s.winner != null) return false;
  const distinct = new Set(colors);
  if (distinct.size !== colors.length) return false; // must be different
  if (colors.length < 1 || colors.length > 3) return false;
  // Fewer than 3 is only allowed when not enough colours are available.
  const available = GEMS.filter((g) => s.bank[g] > 0).length;
  if (colors.length < Math.min(3, available)) return false;
  return colors.every((g) => s.bank[g] > 0);
}

export function canTake2(s: GameState, color: Gem): boolean {
  if (s.winner != null) return false;
  return s.bank[color] >= 4;
}

export function canReserve(s: GameState, ref: BoardRef | DeckRef): boolean {
  if (s.winner != null) return false;
  const me = s.players[s.current];
  if (me.reserved.length >= RESERVE_LIMIT) return false;
  if (ref.from === "board") return s.board[ref.tier][ref.index] != null;
  return s.decks[ref.tier].length > 0;
}

export function canPurchase(s: GameState, ref: BoardRef | ReservedRef): boolean {
  if (s.winner != null) return false;
  const card = cardAt(s, ref);
  if (!card) return false;
  return canAfford(s.players[s.current], card);
}

// --- replenishing the board -------------------------------------------------

function refill(s: GameState, tier: Tier, index: number): void {
  s.board[tier][index] = s.decks[tier].shift() ?? null;
}

// --- the action: applies a move's direct effect only ------------------------
//
// Does NOT enforce the token limit or advance the turn — callers run
// autoDiscard (if needed) and then finishTurn. This split lets a human resolve
// an over-limit discard interactively between the two steps.

export function applyAction(s: GameState, move: Move): GameState {
  const next = cloneState(s);
  const me = next.players[next.current];

  switch (move.type) {
    case "take3": {
      for (const g of move.colors) {
        next.bank[g]--;
        me.tokens[g]++;
      }
      next.log.push(`${me.name} lấy ${move.colors.map(gemVN).join(", ")}.`);
      break;
    }
    case "take2": {
      next.bank[move.color] -= 2;
      me.tokens[move.color] += 2;
      next.log.push(`${me.name} lấy 2 ${gemVN(move.color)}.`);
      break;
    }
    case "reserve": {
      let card: Card | null = null;
      if (move.ref.from === "board") {
        card = next.board[move.ref.tier][move.ref.index];
        if (card) refill(next, move.ref.tier, move.ref.index);
      } else {
        card = next.decks[move.ref.tier].shift() ?? null;
      }
      if (card) {
        me.reserved.push(card);
        let gotGold = false;
        if (next.bank.gold > 0) {
          next.bank.gold--;
          me.tokens.gold++;
          gotGold = true;
        }
        next.log.push(
          `${me.name} giữ 1 lá cấp ${card.tier}` + (gotGold ? " (+1 vàng)" : "") + "."
        );
      }
      break;
    }
    case "purchase": {
      const card = cardAt(next, move.ref);
      if (card) {
        payFor(next, me, card);
        me.cards.push(card);
        next.log.push(
          `${me.name} mua ${gemVN(card.gem)} cấp ${card.tier}` +
            (card.points ? ` (+${card.points}đ)` : "") +
            "."
        );
        if (move.ref.from === "board") {
          refill(next, move.ref.tier, move.ref.index);
        } else {
          me.reserved.splice(move.ref.index, 1);
        }
      }
      break;
    }
    case "pass":
      next.log.push(`${me.name} bỏ lượt.`);
      break;
  }
  return next;
}

/** Spend the player's tokens for `card`, returning spent tokens to the bank. */
function payFor(s: GameState, p: PlayerState, card: Card): void {
  const bon = bonuses(p);
  for (const g of GEMS) {
    const need = Math.max(0, card.cost[g] - bon[g]);
    const pay = Math.min(need, p.tokens[g]);
    p.tokens[g] -= pay;
    s.bank[g] += pay;
    const gold = need - pay;
    if (gold > 0) {
      p.tokens.gold -= gold;
      s.bank.gold += gold;
    }
  }
}

/**
 * Discard one held token of `color` back to the bank (used to resolve the
 * 10-token limit). Returns a new state.
 */
export function discardToken(s: GameState, color: Token): GameState {
  const next = cloneState(s);
  const me = next.players[next.current];
  if (me.tokens[color] > 0) {
    me.tokens[color]--;
    next.bank[color]++;
  }
  return next;
}

/**
 * Auto-discard down to TOKEN_LIMIT, shedding the most abundant colours first
 * (gold is kept until last — it is the most flexible). Used by the AI and as a
 * convenience for human players.
 */
export function autoDiscard(s: GameState): GameState {
  let next = s;
  let me = next.players[next.current];
  while (totalTokens(me) > TOKEN_LIMIT) {
    // Prefer discarding a coloured token we hold the most of; gold last.
    let pick: Token | null = null;
    let bestCount = -1;
    for (const g of GEMS) {
      if (me.tokens[g] > bestCount) {
        bestCount = me.tokens[g];
        pick = g;
      }
    }
    if (!pick || bestCount === 0) pick = "gold";
    next = discardToken(next, pick);
    me = next.players[next.current];
  }
  return next;
}

/**
 * End the current player's turn: claim an eligible noble (first match wins —
 * the rare multi-eligible case is resolved deterministically), check the
 * win trigger, then advance to the next player (or finish the game).
 */
export function finishTurn(s: GameState): GameState {
  const next = cloneState(s);
  const me = next.players[next.current];

  const eligible = eligibleNobles(me, next.nobles);
  if (eligible.length > 0) {
    const noble = eligible[0];
    me.nobles.push(noble);
    next.nobles = next.nobles.filter((n) => n.id !== noble.id);
    next.log.push(`${me.name} được quý tộc ghé thăm (+3đ)!`);
  }

  const wasLastSeat = next.current === next.players.length - 1;
  if (next.players.some((p) => score(p) >= WIN_SCORE)) {
    next.lastRound = true;
  }

  if (next.lastRound && wasLastSeat) {
    next.winner = computeWinner(next.players);
    next.log.push(`Kết thúc! ${next.players[next.winner].name} thắng.`);
    return next;
  }

  next.current = (next.current + 1) % next.players.length;
  return next;
}

/**
 * Apply a complete move for an automated player: action → auto-discard →
 * finish turn. Human turns drive these three steps from the UI instead.
 */
export function applyMove(s: GameState, move: Move): GameState {
  return finishTurn(autoDiscard(applyAction(s, move)));
}

// ---------------------------------------------------------------------------
// Localisation helper (kept here so the engine's log strings read naturally).
// ---------------------------------------------------------------------------

export function gemVN(g: Token): string {
  switch (g) {
    case "diamond":
      return "Kim cương";
    case "sapphire":
      return "Lam ngọc";
    case "emerald":
      return "Lục bảo";
    case "ruby":
      return "Hồng ngọc";
    case "onyx":
      return "Hắc ngọc";
    case "gold":
      return "Vàng";
  }
}
