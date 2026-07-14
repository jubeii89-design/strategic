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

describe("play log and per-hand card tracking", () => {
  it("records every place/pass action in order, but preplaced cards aren't logged as played", () => {
    const g = seeded(11);
    expect(g.playLog).toEqual([]); // preplacement doesn't touch the play log
    const card1 = g.currentCard;
    const cell1 = [...playableCells(0), ...playableCells(1)].find((c) => g.canPlace(c))!;
    g.place(cell1);
    g.pass();
    expect(g.playLog).toHaveLength(2);
    expect(g.playLog[0]).toMatchObject({ seq: 0, action: "place", card: card1, cell: cell1 });
    expect(g.playLog[1]).toMatchObject({ seq: 1, action: "pass", cell: null });
  });

  it("records a hand's top 2 cards exactly once, the moment its last cell fills", () => {
    const g = seeded(21);
    let guard = 0;
    let lastCount = 0;
    while (!g.isOver && guard++ < 200) {
      const cell = [...playableCells(0), ...playableCells(1)].find((c) => g.canPlace(c));
      if (cell) g.place(cell);
      else g.pass();
      // handCompletions only ever grows, one entry per hole, never shrinks or duplicates
      expect(g.handCompletions.length).toBeGreaterThanOrEqual(lastCount);
      const holes = g.handCompletions.map((h) => h.hole);
      expect(new Set(holes).size).toBe(holes.length);
      lastCount = g.handCompletions.length;
    }
    expect(g.isOver).toBe(true);
    // a completed board (greedy fill always finishes it) records all 18 hands
    expect(g.handCompletions).toHaveLength(18);

    const score = scoreBoard(g.snapshot().board, GameMode.PokerStraightsMode);
    for (const completion of g.handCompletions) {
      const hand = score.hands.find((h) => h.hole === completion.hole)!;
      expect(hand.complete).toBe(true);
      // the recorded cards are exactly that hand's cells, in cell order
      const expectedIds = hand.hand.cells.map((c) => g.snapshot().board.cards[c.grid]![c.row]![c.col]);
      expect(completion.cards).toEqual(expectedIds);
      // topCards are 2 of the hand's cards, ranked highest-first (Ace high)
      expect(completion.topCards).toHaveLength(Math.min(2, completion.cards.length));
      for (const c of completion.topCards) expect(completion.cards).toContain(c);
      const rankHigh = (id: number) => (id % 100 === 1 ? 14 : id % 100);
      expect(rankHigh(completion.topCards[0]!)).toBeGreaterThanOrEqual(rankHigh(completion.topCards[1]!));
    }
  });
});
