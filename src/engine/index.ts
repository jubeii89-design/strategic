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

export { GameMode } from "./scoring-legacy.js";
export type { HandScore } from "./scoring-legacy.js";
export * from "./board.js";
export * from "./cards.js";
export * from "./deck.js";

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
 * Evaluate one hand of 3-5 cards. Equivalent to the original's
 * draw-card-then-complete-hand sequence: per-card flags are reset, then
 * CalculateScoreForHand runs.
 */
export function evaluateHand(cardIds: readonly number[], gameMode: GameMode = GameMode.PokerStraightsMode): HandScore {
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
 * Score a board. Incomplete hands (any empty cell) are reported with
 * complete: false and zero points, matching the original where a hand is only
 * scored once every slot is filled.
 */
export function scoreBoard(board: BoardState, gameMode: GameMode = GameMode.PokerStraightsMode): BoardScore {
  const engine = new LegacyScoringEngine(gameMode);
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
    engine.resetPerCardFlags(); // the original resets these on each card draw
    const score = engine.calculateScoreForHand(
      (ids as number[]).map((id) => new CardWithScoringInfo(id)),
      true,
    );
    results.push({ hole, hand, complete: true, ...score! });
  });
  const sum = (from: number, to: number) =>
    results.filter((r) => r.hole >= from && r.hole <= to && r.complete).reduce((t, r) => t + r.points, 0);
  const frontNine = sum(1, 9);
  const backNine = sum(10, 18);
  return { hands: results, frontNine, backNine, round: frontNine + backNine };
}
