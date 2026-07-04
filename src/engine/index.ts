/**
 * Public engine API. Scores any BoardState without knowing who placed the
 * cards — no player identity, turn logic, or persistence in this module.
 */

import { type BoardState, type HandDef, allHands, cardAt } from "./board.js";
import {
  CardWithScoringInfo,
  GameMode,
  type HandScore,
  LegacyScoringEngine,
} from "./scoring-legacy.js";

import { evaluateHandPure } from "./scoring.js";

export { GameMode } from "./scoring-legacy.js";
export type { HandScore } from "./scoring-legacy.js";
export { evaluateHandPure } from "./scoring.js";
export * from "./board.js";
export * from "./cards.js";
export * from "./deck.js";

export type ScoringImpl = "pure" | "legacy";

export interface HandResult extends HandScore {
  /** Hole number 1-18, scorecard order. */
  hole: number;
  hand: HandDef;
  complete: boolean;
}

export interface BoardScore {
  hands: HandResult[];
  frontNine: number;
  backNine: number;
  round: number;
}

/**
 * Evaluate one hand of 3-5 cards with the legacy (statement-level ported)
 * implementation. Equivalent to the original's draw-card-then-complete-hand
 * sequence: per-card flags are reset, then CalculateScoreForHand runs.
 */
export function evaluateHandLegacy(
  cardIds: readonly number[],
  gameMode: GameMode = GameMode.PokerStraightsMode,
): HandScore {
  const engine = new LegacyScoringEngine(gameMode);
  engine.resetPerCardFlags();
  const cards = cardIds.map((id) => new CardWithScoringInfo(id));
  const score = engine.calculateScoreForHand(cards, false);
  if (score === null) {
    throw new RangeError(`unsupported hand size: ${cardIds.length}`);
  }
  return score;
}

/**
 * Evaluate one hand of 3-5 cards. Defaults to the pure implementation, which
 * the equivalence suite keeps in lockstep with the legacy port.
 */
export function evaluateHand(
  cardIds: readonly number[],
  gameMode: GameMode = GameMode.PokerStraightsMode,
  impl: ScoringImpl = "pure",
): HandScore {
  return impl === "legacy" ? evaluateHandLegacy(cardIds, gameMode) : evaluateHandPure(cardIds, gameMode);
}

/**
 * Score a board. Incomplete hands (any empty cell) are reported with
 * complete: false and zero points, matching the original where a hand is only
 * scored once every slot is filled.
 */
export function scoreBoard(
  board: BoardState,
  gameMode: GameMode = GameMode.PokerStraightsMode,
  impl: ScoringImpl = "pure",
): BoardScore {
  const results: HandResult[] = [];
  allHands().forEach((hand, i) => {
    const ids = hand.cells.map((cell) => cardAt(board, cell));
    const hole = i + 1;
    if (ids.some((id) => id === null)) {
      results.push({
        hole,
        hand,
        complete: false,
        points: 0,
        handID: "",
        factorValue: "",
        handName: "",
      });
      return;
    }
    const score = evaluateHand(ids as number[], gameMode, impl);
    results.push({ hole, hand, complete: true, ...score });
  });
  const sum = (from: number, to: number) =>
    results.filter((r) => r.hole >= from && r.hole <= to && r.complete).reduce((t, r) => t + r.points, 0);
  const frontNine = sum(1, 9);
  const backNine = sum(10, 18);
  return { hands: results, frontNine, backNine, round: frontNine + backNine };
}
