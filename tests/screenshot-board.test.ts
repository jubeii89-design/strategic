import { describe, expect, it } from "vitest";
import { fullDeckIds, isValidCardId } from "../src/engine/cards.js";
import { type BoardState, GRIDS, ROWS, COLS, isPlayableCell } from "../src/engine/board.js";
import { GameMode, scoreBoard } from "../src/engine/index.js";
import { HAND_POINTS } from "./fixtures/parity-fixture.js";
import {
  SCREENSHOT_BACK_GRID,
  SCREENSHOT_BACK_IDS,
  SCREENSHOT_BACK_STROKES,
  SCREENSHOT_FRONT_GRID,
  SCREENSHOT_FRONT_IDS,
  SCREENSHOT_FRONT_STROKES,
  SCREENSHOT_GOLF_TOTALS,
} from "./fixtures/screenshot-board.js";

function screenshotBoard(): BoardState {
  return {
    cards: [
      SCREENSHOT_FRONT_GRID.map((row) => [...row]),
      SCREENSHOT_BACK_GRID.map((row) => [...row]),
    ],
  };
}

const EXPECTED_IDS = [...SCREENSHOT_FRONT_IDS, ...SCREENSHOT_BACK_IDS];

describe("screenshot board fixture integrity", () => {
  it("fills exactly the 18 playable cells per grid with valid, distinct cards", () => {
    const board = screenshotBoard();
    const seen = new Set<number>();
    for (let g = 0; g < GRIDS; g++) {
      let placed = 0;
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const card = board.cards[g]![row]![col];
          if (!isPlayableCell(col, row)) {
            expect(card).toBeNull();
            continue;
          }
          expect(card).not.toBeNull();
          expect(isValidCardId(card!)).toBe(true);
          expect(seen.has(card!)).toBe(false);
          seen.add(card!);
          placed++;
        }
      }
      expect(placed).toBe(18);
    }
    const deck = new Set(fullDeckIds());
    for (const id of seen) expect(deck.has(id)).toBe(true);
  });
});

describe("screenshot board end-to-end (integration oracle)", () => {
  it("PokerStraights mode reproduces every hand ID with fixture points", () => {
    const result = scoreBoard(screenshotBoard(), GameMode.PokerStraightsMode);
    expect(result.hands).toHaveLength(18);
    result.hands.forEach((hand, i) => {
      expect(hand.complete).toBe(true);
      expect(`hole ${hand.hole}: ${hand.handID}`).toBe(`hole ${i + 1}: ${EXPECTED_IDS[i]}`);
      expect(hand.points).toBe(HAND_POINTS[EXPECTED_IDS[i]!]);
    });
    const expectedFront = SCREENSHOT_FRONT_IDS.reduce((t, id) => t + HAND_POINTS[id]!, 0);
    const expectedBack = SCREENSHOT_BACK_IDS.reduce((t, id) => t + HAND_POINTS[id]!, 0);
    expect(result.frontNine).toBe(expectedFront);
    expect(result.backNine).toBe(expectedBack);
    expect(result.round).toBe(expectedFront + expectedBack);
  });

  it("Golf mode reproduces the screenshot scorecard exactly: 46 / 38 / 84 strokes", () => {
    const result = scoreBoard(screenshotBoard(), GameMode.GolfMode);
    const expectedStrokes = [...SCREENSHOT_FRONT_STROKES, ...SCREENSHOT_BACK_STROKES];
    result.hands.forEach((hand, i) => {
      expect(`hole ${hand.hole}: ${hand.handID} ${hand.points}`).toBe(
        `hole ${i + 1}: ${EXPECTED_IDS[i]} ${expectedStrokes[i]}`,
      );
    });
    expect(result.frontNine).toBe(SCREENSHOT_GOLF_TOTALS.front);
    expect(result.backNine).toBe(SCREENSHOT_GOLF_TOTALS.back);
    expect(result.round).toBe(SCREENSHOT_GOLF_TOTALS.round);
  });

  it("scores partial boards without knowing about turns or players", () => {
    const board = screenshotBoard();
    board.cards[1]![2]![1] = null; // remove 2♣: back rows 12 & col 16 incomplete
    const result = scoreBoard(board, GameMode.PokerStraightsMode);
    const incomplete = result.hands.filter((h) => !h.complete).map((h) => h.hole);
    expect(incomplete).toEqual([12, 16]);
    const full = scoreBoard(screenshotBoard(), GameMode.PokerStraightsMode);
    expect(result.round).toBe(
      full.round - HAND_POINTS["4A"]! - HAND_POINTS["5J"]!,
    );
  });
});
