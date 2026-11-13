import { describe, expect, it } from "vitest";
import {
  DemoGameState,
  DEMO_COLS,
  DEMO_PREPLACED_CARDS,
  DEMO_ROWS,
  DEMO_STARTING_CARDS_LEFT,
  DEMO_TOTAL_CELLS,
  scoreDemoBoard,
} from "../src/demo/demoGameState.js";
import { GameMode, mulberry32, type Cell } from "../src/engine/index.js";

const seeded = (seed = 1) => new DemoGameState(GameMode.PokerStraightsMode, mulberry32(seed));

const demoCells: Cell[] = [];
for (let row = 0; row < DEMO_ROWS; row++)
  for (let col = 0; col < DEMO_COLS; col++) demoCells.push({ grid: 0, col, row });

describe("demo game state", () => {
  it("auto-places 2 cards and deals a current card deterministically", () => {
    const a = seeded(42);
    const b = seeded(42);
    expect(a.snapshot().placedCount).toBe(DEMO_PREPLACED_CARDS);
    expect(a.remaining).toBe(DEMO_STARTING_CARDS_LEFT);
    expect(a.currentCard).not.toBeNull();
    expect(a.preplaced).toEqual(b.preplaced);
    expect(a.currentCard).toBe(b.currentCard);
    const cells = a.preplaced.map((p) => `${p.cell.grid},${p.cell.col},${p.cell.row}`);
    expect(new Set(cells).size).toBe(DEMO_PREPLACED_CARDS);
  });

  it("place() fills a cell, advances the card, and ticks the counter", () => {
    const g = seeded(7);
    const open = demoCells.find((c) => g.canPlace(c))!;
    const before = g.remaining;
    const card = g.currentCard;
    g.place(open);
    expect(g.snapshot().board.cards[open.grid]![open.row]![open.col]).toBe(card);
    expect(g.remaining).toBe(before - 1);
    expect(g.snapshot().placedCount).toBe(DEMO_PREPLACED_CARDS + 1);
  });

  it("rejects placing on an occupied cell", () => {
    const g = seeded(3);
    const taken = g.preplaced[0]!.cell;
    expect(g.canPlace(taken)).toBe(false);
    expect(() => g.place(taken)).toThrow();
  });

  it("canPlace rejects cells outside the 3x3 mini-board", () => {
    const g = seeded(5);
    expect(g.canPlace({ grid: 0, col: 0, row: DEMO_ROWS })).toBe(false); // row 3, out of bounds
    expect(g.canPlace({ grid: 0, col: DEMO_COLS, row: 0 })).toBe(false); // col 3, out of bounds
    expect(g.canPlace({ grid: 1, col: 0, row: 0 })).toBe(false); // the real game's second grid
  });

  it("pass() advances the card and ticks the counter without placing", () => {
    const g = seeded(9);
    const placed = g.snapshot().placedCount;
    const before = g.remaining;
    g.pass();
    expect(g.snapshot().placedCount).toBe(placed);
    expect(g.remaining).toBe(before - 1);
  });

  it("plays to completion: board fills and scoreDemoBoard totals equal summed hand points", () => {
    const g = seeded(123);
    let guard = 0;
    while (!g.isOver && guard++ < 100) {
      const cell = demoCells.find((c) => g.canPlace(c));
      if (cell) g.place(cell);
      else g.pass();
    }
    expect(g.isOver).toBe(true);
    const snap = g.snapshot();
    // greedy fill always completes the mini-board before the draw budget runs out
    expect(snap.placedCount).toBe(DEMO_TOTAL_CELLS);
    const score = scoreDemoBoard(snap.board, GameMode.PokerStraightsMode);
    expect(score.hands.every((h) => h.complete)).toBe(true);
    const summed = score.hands.reduce((t, h) => t + h.points, 0);
    expect(score.round).toBe(summed);
    expect(g.handCompletions).toHaveLength(6);
  });

  it("ends via the draw counter if the player keeps passing", () => {
    const g = seeded(55);
    let guard = 0;
    while (!g.isOver && guard++ < 100) g.pass();
    expect(g.isOver).toBe(true);
    expect(g.remaining).toBe(0);
  });
});
