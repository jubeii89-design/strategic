/**
 * Greedy AI policy (v1) for the solo board — placement + pass decisions.
 *
 * The AI is myopic (one-ply, no search). It scores each candidate placement by
 * how it changes the *potential* of the two hands the cell belongs to, where a
 * hand's potential is the best value it can still reach given the cards already
 * in it (an optimistic estimate that collapses to the exact score once the hand
 * is full). It places the card in the best cell, and passes only when placing
 * would spoil potential everywhere AND a pass is still affordable (enough draws
 * remain to fill every empty cell).
 *
 * This module is a policy over the engine + game state; it holds no UI and no
 * player identity, so it drives a human's or an AI's GameState identically.
 */

import {
  type BoardState,
  type Cell,
  type CardId,
  type Category,
  GameMode,
  allHands,
  cardAt,
  categoryValue,
  evaluateHand,
  rankOf,
  suitOf,
} from "../engine/index.js";
import type { GameState } from "./gameState.js";

/**
 * The minimal read-only view the policy needs. GameState satisfies it, and
 * tests can supply a plain object with a crafted board and current card.
 */
export interface PolicyView {
  readonly mode: GameMode;
  readonly currentCard: CardId | null;
  readonly remaining: number;
  snapshot(): { board: BoardState; isOver: boolean };
}

const isGolf = (m: GameMode) => m === GameMode.GolfMode;
/** Better = higher points (poker) or fewer strokes (golf). */
function better(a: number, b: number, mode: GameMode): boolean {
  return isGolf(mode) ? a < b : a > b;
}

/**
 * Best value a hand of `size` cards can still reach given the `placed` cards,
 * in the given mode. Empty hand → best possible; full hand → exact score.
 */
export function bestAchievableValue(placed: readonly CardId[], size: number, mode: GameMode): number {
  if (placed.length === size) {
    return evaluateHand(placed, mode).points;
  }
  const remaining = size - placed.length;
  const suits = placed.map(suitOf);
  const ranks = placed.map(rankOf);
  const sameSuit = suits.every((s) => s === suits[0]); // vacuously true when empty

  // rank multiplicities (Ace = 1)
  const mult = new Map<number, number>();
  for (const r of ranks) mult.set(r, (mult.get(r) ?? 0) + 1);
  const maxMult = ranks.length ? Math.max(...mult.values()) : 0;
  const distinctRanks = mult.size;
  const hasDupRank = ranks.length !== distinctRanks;

  // How many ranks already have a pair, and can we still form a second pair?
  const pairsNow = [...mult.values()].filter((c) => c >= 2).length;

  // straight still reachable? placed distinct ranks must fit a length-`size`
  // window (Ace low or, when it helps, Ace high = 14). Duplicates kill it.
  function straightReachable(): boolean {
    if (hasDupRank) return false;
    if (ranks.length === 0) return true;
    const fits = (vals: number[]) => {
      const lo = Math.min(...vals);
      const hi = Math.max(...vals);
      return hi - lo <= size - 1;
    };
    const low = ranks.slice();
    const high = ranks.map((r) => (r === 1 ? 14 : r)); // Ace high
    return fits(low) || fits(high);
  }
  const straightOK = straightReachable();
  const flushOK = sameSuit;
  const sfOK = flushOK && straightOK;
  // royal only at size 5, needs the 10-A window and a suit
  const royalOK =
    size === 5 &&
    flushOK &&
    (ranks.length === 0 ||
      (!hasDupRank && ranks.every((r) => r === 1 || r >= 10)));

  const reach = (cat: Category): boolean => {
    switch (cat) {
      case "royal":
        return royalOK;
      case "sf":
        return sfOK;
      case "quads":
        return size >= 4 && maxMult + remaining >= 4;
      case "fullHouse":
        // size 5: need a trip and a separate pair still reachable
        if (size !== 5) return false;
        return maxMult + remaining >= 3 && canFormFullHouse(mult, remaining);
      case "flush":
        return flushOK;
      case "straight":
        return straightOK;
      case "trips":
        return maxMult + remaining >= 3;
      case "twoPair":
        return size >= 4 && canFormTwoPair(mult, remaining, pairsNow);
      case "pair":
        return maxMult + remaining >= 2;
      case "nothing":
        return true;
    }
  };

  // Pick the best-valued reachable category for this size/mode.
  let best: number | undefined;
  for (const cat of REACH_ORDER) {
    if (!reach(cat)) continue;
    const v = categoryValue(cat, size, mode);
    if (v === undefined) continue;
    if (best === undefined || better(v, best, mode)) best = v;
  }
  // "nothing" is always reachable, so best is always defined.
  return best ?? categoryValue("nothing", size, mode)!;
}

const REACH_ORDER: readonly Category[] = [
  "royal", "sf", "quads", "fullHouse", "flush", "straight", "trips", "twoPair", "pair", "nothing",
];

function canFormFullHouse(mult: Map<number, number>, remaining: number): boolean {
  // best case: pour `remaining` into the two most common ranks to reach 3 + 2
  const counts = [...mult.values()].sort((a, b) => b - a);
  const top = counts[0] ?? 0;
  const second = counts[1] ?? 0;
  let need = Math.max(0, 3 - top) + Math.max(0, 2 - second);
  // if fewer than two distinct ranks present, extra slots become new ranks
  const distinctAfter = mult.size + Math.max(0, remaining - Math.max(0, 3 - top) - Math.max(0, 2 - second));
  if (mult.size + remaining < 2 || distinctAfter < 0) return false;
  return need <= remaining && mult.size + remaining >= 2;
}

function canFormTwoPair(mult: Map<number, number>, remaining: number, pairsNow: number): boolean {
  if (pairsNow >= 2) return true;
  const singles = [...mult.values()].filter((c) => c === 1).length;
  // each new pair needs to bring a rank up to 2
  let need = 0;
  if (pairsNow === 1) {
    need = singles >= 1 ? 1 : 2; // one more pair
  } else {
    need = 2; // two pairs from scratch (each rank needs one more copy, or new ranks need two)
    if (singles >= 2) need = 2;
    else if (singles === 1) need = 3;
    else need = 4;
  }
  return remaining >= need;
}

/** Cards currently in a hand's cells (skips empty cells). */
function handCards(board: BoardState, cells: readonly Cell[]): CardId[] {
  const out: CardId[] = [];
  for (const c of cells) {
    const id = cardAt(board, c);
    if (id !== null) out.push(id);
  }
  return out;
}

export interface AiDecision {
  action: "place" | "pass";
  cell?: Cell;
}

/**
 * Decide the greedy action for `state`'s current card. Returns the best cell to
 * place in, or a pass. Deterministic given the board (ties broken by scan
 * order: earlier hole, earlier cell).
 */
export function greedyDecision(state: PolicyView): AiDecision {
  const card = state.currentCard;
  const snap = state.snapshot();
  if (card === null || snap.isOver) return { action: "pass" };
  const mode = state.mode;
  const hands = allHands();

  // For a candidate cell, sum the potential delta over the two hands it's in.
  let bestCell: Cell | null = null;
  let bestDelta = -Infinity; // in "higher is better" space (golf deltas are negated)

  const emptyCells: Cell[] = [];
  for (const hand of hands) {
    for (const cell of hand.cells) {
      if (cardAt(snap.board, cell) === null) emptyCells.push(cell);
    }
  }
  // de-dup (each cell appears in a row hand and a column hand)
  const seen = new Set<string>();
  const cells = emptyCells.filter((c) => {
    const k = `${c.grid},${c.col},${c.row}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  for (const cell of cells) {
    const affected = hands.filter((h) =>
      h.cells.some((c) => c.grid === cell.grid && c.col === cell.col && c.row === cell.row),
    );
    let delta = 0;
    for (const h of affected) {
      const before = bestAchievableValue(handCards(snap.board, h.cells), h.cells.length, mode);
      const withCard = handCards(snap.board, h.cells);
      withCard.push(card);
      const after = bestAchievableValue(withCard, h.cells.length, mode);
      // convert to "higher is better": golf improvements are decreases
      delta += isGolf(mode) ? before - after : after - before;
    }
    if (delta > bestDelta) {
      bestDelta = delta;
      bestCell = cell;
    }
  }

  if (bestCell === null) return { action: "pass" };

  // Pass only if the best placement strictly hurts potential AND we can still
  // afford to fill every empty cell without this draw.
  const canAffordPass = state.remaining > cells.length;
  if (bestDelta < 0 && canAffordPass) {
    return { action: "pass" };
  }
  return { action: "place", cell: bestCell };
}

/** Apply one greedy action to `state`. Returns the action taken. */
export function greedyStep(state: GameState): AiDecision {
  if (state.isOver) return { action: "pass" };
  const decision = greedyDecision(state);
  if (decision.action === "place" && decision.cell) {
    state.place(decision.cell);
  } else {
    state.pass();
  }
  return decision;
}
