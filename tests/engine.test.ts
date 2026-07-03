import { describe, expect, it } from "vitest";
import {
  BLANK_CARD_ID,
  fullDeckIds,
  isValidCardId,
  makeCardId,
  rankOf,
  Suit,
  suitOf,
} from "../src/engine/cards.js";
import { mulberry32, shuffledDeck } from "../src/engine/deck.js";
import {
  allHands,
  emptyBoard,
  handsOfGrid,
  isPlayableCell,
  placeCard,
  playableCells,
} from "../src/engine/board.js";
import {
  CANONICAL_BACK_NINE,
  CANONICAL_BACK_TOTAL,
  CANONICAL_FRONT_NINE,
  CANONICAL_FRONT_TOTAL,
  CANONICAL_ROUND_TOTAL,
  HAND_POINTS,
} from "./fixtures/parity-fixture.js";

describe("card model", () => {
  it("encodes ids as suit*100 + rank", () => {
    expect(makeCardId(Suit.Spades, 1)).toBe(1);
    expect(makeCardId(Suit.Spades, 13)).toBe(13);
    expect(makeCardId(Suit.Hearts, 1)).toBe(101);
    expect(makeCardId(Suit.Clubs, 7)).toBe(207);
    expect(makeCardId(Suit.Diamonds, 13)).toBe(313);
  });

  it("decodes suit and rank", () => {
    expect(suitOf(207)).toBe(Suit.Clubs);
    expect(rankOf(207)).toBe(7);
    expect(rankOf(1)).toBe(1); // Ace of spades, Ace = 1
  });

  it("has 52 distinct valid ids and 500 is not one of them", () => {
    const ids = fullDeckIds();
    expect(ids).toHaveLength(52);
    expect(new Set(ids).size).toBe(52);
    for (const id of ids) expect(isValidCardId(id)).toBe(true);
    expect(isValidCardId(BLANK_CARD_ID)).toBe(false);
  });
});

describe("deck", () => {
  it("shuffles all 52 cards exactly once, deterministically per seed", () => {
    const a = shuffledDeck(mulberry32(42));
    const b = shuffledDeck(mulberry32(42));
    const c = shuffledDeck(mulberry32(7));
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
    expect([...a].sort((x, y) => x - y)).toEqual(fullDeckIds());
  });
});

describe("board topology", () => {
  it("cuts corners (0,0) and (3,4) leaving 18 cells per grid in rows 3-4-4-4-3", () => {
    expect(isPlayableCell(0, 0)).toBe(false);
    expect(isPlayableCell(3, 4)).toBe(false);
    const cells = playableCells(0);
    expect(cells).toHaveLength(18);
    const rowCounts = [0, 1, 2, 3, 4].map(
      (r) => cells.filter((c) => c.row === r).length,
    );
    expect(rowCounts).toEqual([3, 4, 4, 4, 3]);
  });

  it("has 9 hands per grid (5 rows + 4 columns), 18 total, of 3-5 cards", () => {
    const hands = handsOfGrid(0);
    expect(hands).toHaveLength(9);
    expect(allHands()).toHaveLength(18);
    const sizes = hands.map((h) => h.cells.length);
    // Matches the original scorecard's PAR row: 3,4,4,4,3 | 4,5,5,4
    expect(sizes).toEqual([3, 4, 4, 4, 3, 4, 5, 5, 4]);
  });

  it("rejects placement on cut corners and occupied cells", () => {
    const board = emptyBoard();
    placeCard(board, { grid: 0, col: 1, row: 1 }, 207);
    expect(() => placeCard(board, { grid: 0, col: 1, row: 1 }, 208)).toThrow();
    expect(() => placeCard(board, { grid: 0, col: 0, row: 0 }, 208)).toThrow();
  });
});

describe("parity fixture integrity", () => {
  it("contains all 24 hand IDs", () => {
    expect(Object.keys(HAND_POINTS)).toHaveLength(24);
  });

  it("canonical board per-hand points match the fixture table and totals", () => {
    for (const h of [...CANONICAL_FRONT_NINE, ...CANONICAL_BACK_NINE]) {
      expect(HAND_POINTS[h.id]).toBe(h.points);
    }
    const sum = (hs: readonly { points: number }[]) =>
      hs.reduce((t, h) => t + h.points, 0);
    expect(sum(CANONICAL_FRONT_NINE)).toBe(CANONICAL_FRONT_TOTAL);
    expect(sum(CANONICAL_BACK_NINE)).toBe(CANONICAL_BACK_TOTAL);
    expect(CANONICAL_FRONT_TOTAL + CANONICAL_BACK_TOTAL).toBe(CANONICAL_ROUND_TOTAL);
  });
});
