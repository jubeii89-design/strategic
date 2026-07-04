import { describe, expect, it } from "vitest";
import { type BoardState, evaluateHand, GameMode, scoreBoard } from "../src/engine/index.js";
import { HAND_POINTS } from "./fixtures/parity-fixture.js";
import {
  CANONICAL_BACK_GRID,
  CANONICAL_FINAL_BOARD_IDS_7_TO_9,
  CANONICAL_FRONT_GRID,
  CANONICAL_LOCKED_HANDS,
  CANONICAL_SCORECARD_IDS,
  CANONICAL_TOTALS,
} from "./fixtures/canonical-board.js";

function canonicalBoard(): BoardState {
  return {
    cards: [
      CANONICAL_FRONT_GRID.map((row) => [...row]),
      CANONICAL_BACK_GRID.map((row) => [...row]),
    ],
  };
}

describe("canonical 286 board (task-brief oracle)", () => {
  it("scorecard IDs and totals are consistent with the fixture table", () => {
    const points = CANONICAL_SCORECARD_IDS.map((id) => HAND_POINTS[id]!);
    const front = points.slice(0, 9).reduce((a, b) => a + b, 0);
    const back = points.slice(9).reduce((a, b) => a + b, 0);
    expect(front).toBe(CANONICAL_TOTALS.front);
    expect(back).toBe(CANONICAL_TOTALS.back);
    expect(front + back).toBe(CANONICAL_TOTALS.round);
  });

  it("reproduces the scorecard EXACTLY (133/153/286) once holes 7-9 use their locked card subsets", () => {
    const board = canonicalBoard();
    const result = scoreBoard(board, GameMode.PokerStraightsMode);
    let front = 0;
    let back = 0;
    result.hands.forEach((hand, i) => {
      const hole = i + 1;
      const locked = CANONICAL_LOCKED_HANDS[hole];
      const score = locked ? evaluateHand(locked, GameMode.PokerStraightsMode) : hand;
      expect(`hole ${hole}: ${score.handID}=${score.points}`).toBe(
        `hole ${hole}: ${CANONICAL_SCORECARD_IDS[i]}=${HAND_POINTS[CANONICAL_SCORECARD_IDS[i]!]}`,
      );
      if (hole <= 9) front += score.points;
      else back += score.points;
    });
    expect(front).toBe(CANONICAL_TOTALS.front);
    expect(back).toBe(CANONICAL_TOTALS.back);
    expect(front + back).toBe(CANONICAL_TOTALS.round);
  });

  it("characterization: pure board-state scoring of the final layout differs only at holes 7-9", () => {
    const result = scoreBoard(canonicalBoard(), GameMode.PokerStraightsMode);
    result.hands.forEach((hand, i) => {
      const hole = i + 1;
      if (hole === 7 || hole === 8 || hole === 9) {
        expect(hand.handID).toBe(CANONICAL_FINAL_BOARD_IDS_7_TO_9[hole - 7]);
      } else {
        expect(`hole ${hole}: ${hand.handID}=${hand.points}`).toBe(
          `hole ${hole}: ${CANONICAL_SCORECARD_IDS[i]}=${HAND_POINTS[CANONICAL_SCORECARD_IDS[i]!]}`,
        );
      }
    });
    // 5J(-5) + 5G(19) + 4H(-4) at holes 7-9 instead of -4/28/-3: front 122, round 275
    expect(result.frontNine).toBe(122);
    expect(result.backNine).toBe(153);
    expect(result.round).toBe(275);
  });
});
