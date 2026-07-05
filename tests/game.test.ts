import { describe, expect, it } from "vitest";
import { GameState, PREPLACED_CARDS, STARTING_CARDS_LEFT, TOTAL_CELLS } from "../src/game/gameState.js";
import { GameMode, mulberry32, playableCells, scoreBoard } from "../src/engine/index.js";

const seeded = (seed = 1) => new GameState(GameMode.PokerStraightsMode, mulberry32(seed));

describe("solo game state", () => {
  it("auto-places 6 cards and deals a current card deterministically", () => {
    const a = seeded(42);
    const b = seeded(42);
    expect(a.snapshot().placedCount).toBe(PREPLACED_CARDS);
    expect(a.remaining).toBe(STARTING_CARDS_LEFT);
    expect(a.currentCard).not.toBeNull();
    // same seed → same preplacement and same current card
    expect(a.preplaced).toEqual(b.preplaced);
    expect(a.currentCard).toBe(b.currentCard);
    // 6 distinct cells, all playable, no cut corners
    const cells = a.preplaced.map((p) => `${p.cell.grid},${p.cell.col},${p.cell.row}`);
    expect(new Set(cells).size).toBe(PREPLACED_CARDS);
  });

  it("place() fills a cell, advances the card, and ticks the counter", () => {
    const g = seeded(7);
    const open = [...playableCells(0), ...playableCells(1)].find((c) => g.canPlace(c))!;
    const before = g.remaining;
    const card = g.currentCard;
    g.place(open);
    expect(g.snapshot().board.cards[open.grid]![open.row]![open.col]).toBe(card);
    expect(g.remaining).toBe(before - 1);
    expect(g.snapshot().placedCount).toBe(PREPLACED_CARDS + 1);
  });

  it("rejects placing on an occupied cell", () => {
    const g = seeded(3);
    const taken = g.preplaced[0]!.cell;
    expect(g.canPlace(taken)).toBe(false);
    expect(() => g.place(taken)).toThrow();
  });

  it("pass() advances the card and ticks the counter without placing", () => {
    const g = seeded(9);
    const placed = g.snapshot().placedCount;
    const before = g.remaining;
    g.pass();
    expect(g.snapshot().placedCount).toBe(placed);
    expect(g.remaining).toBe(before - 1);
  });

  it("plays to completion: board fills and scoreBoard totals equal summed hand points", () => {
    const g = seeded(123);
    let guard = 0;
    while (!g.isOver && guard++ < 200) {
      const cell = [...playableCells(0), ...playableCells(1)].find((c) => g.canPlace(c));
      if (cell) g.place(cell);
      else g.pass();
    }
    expect(g.isOver).toBe(true);
    const snap = g.snapshot();
    // greedy fill always completes the board before 41 draws run out
    expect(snap.placedCount).toBe(TOTAL_CELLS);
    const score = scoreBoard(snap.board, GameMode.PokerStraightsMode);
    expect(score.hands.every((h) => h.complete)).toBe(true);
    const summed = score.hands.reduce((t, h) => t + h.points, 0);
    expect(score.round).toBe(summed);
    expect(score.round).toBe(score.frontNine + score.backNine);
  });

  it("ends via the draw counter if the player keeps passing", () => {
    const g = seeded(55);
    let guard = 0;
    while (!g.isOver && guard++ < 100) g.pass();
    expect(g.isOver).toBe(true);
    expect(g.remaining).toBe(0);
  });
});
