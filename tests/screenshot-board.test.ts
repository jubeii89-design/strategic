import { describe, expect, it } from "vitest";
import { fullDeckIds, isValidCardId } from "../src/engine/cards.js";
import { isPlayableCell } from "../src/engine/board.js";
import { HAND_POINTS } from "./fixtures/parity-fixture.js";
import {
  SCREENSHOT_BACK_GRID,
  SCREENSHOT_BACK_IDS,
  SCREENSHOT_FRONT_GRID,
  SCREENSHOT_FRONT_IDS,
} from "./fixtures/screenshot-board.js";

/**
 * Data-integrity checks for the screenshot-transcribed board. The end-to-end
 * scoreBoard() assertion is added once the scoring port lands.
 */
describe("screenshot board fixture", () => {
  const grids = [SCREENSHOT_FRONT_GRID, SCREENSHOT_BACK_GRID];

  it("fills exactly the 18 playable cells per grid with valid, distinct cards", () => {
    const seen = new Set<number>();
    for (const grid of grids) {
      let placed = 0;
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 4; col++) {
          const card = grid[row]![col]!;
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
    // all 36 cards drawn from the one 52-card deck
    const deck = new Set(fullDeckIds());
    for (const id of seen) expect(deck.has(id)).toBe(true);
  });

  it("expected hand IDs are all known fixture IDs with the right sizes", () => {
    const structural = [3, 4, 4, 4, 3, 4, 5, 5, 4];
    for (const ids of [SCREENSHOT_FRONT_IDS, SCREENSHOT_BACK_IDS]) {
      expect(ids).toHaveLength(9);
      ids.forEach((id, hole) => {
        expect(HAND_POINTS[id]).toBeDefined();
        // full board: every hand's card count equals its structural size
        expect(Number(id[0])).toBe(structural[hole]);
      });
    }
  });
});
