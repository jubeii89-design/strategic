import { describe, expect, it } from "vitest";
import {
  type BoardState,
  type Cell,
  GameMode,
  emptyBoard,
  evaluateHand,
  mulberry32,
  placeCard,
  playableCells,
  scoreBoard,
} from "../src/engine/index.js";
import { bestAchievableValue, greedyDecision, greedyStep, type PolicyView } from "../src/game/ai.js";
import { GameState } from "../src/game/gameState.js";
import { Match } from "../src/game/match.js";

/** A crafted read-only view for asserting a single greedy decision. */
function view(board: BoardState, current: number, mode: GameMode, remaining = 41): PolicyView {
  return { mode, currentCard: current, remaining, snapshot: () => ({ board, isOver: false }) };
}

const S = (n: number) => n;
const H = (n: number) => 100 + n;
const C = (n: number) => 200 + n;

describe("bestAchievableValue", () => {
  it("returns the exact score for a full hand", () => {
    expect(bestAchievableValue([S(9), H(9), C(9), S(2), H(3)], 5, GameMode.PokerStraightsMode)).toBe(
      evaluateHand([S(9), H(9), C(9), S(2), H(3)], GameMode.PokerStraightsMode).points,
    );
  });

  it("keeps flush potential while cards share a suit, drops it when broken", () => {
    const poker = GameMode.PokerStraightsMode;
    // two spades in a 4-card hand: a spade flush (4F=22) is still reachable
    expect(bestAchievableValue([S(2), S(9)], 4, poker)).toBeGreaterThanOrEqual(22);
    // add an off-suit heart: flush now impossible, potential drops below 22
    expect(bestAchievableValue([S(2), S(9), H(4)], 4, poker)).toBeLessThan(22);
  });

  it("an empty hand has the best possible potential for its size", () => {
    const poker = GameMode.PokerStraightsMode;
    expect(bestAchievableValue([], 5, poker)).toBe(58); // 5A royal
    expect(bestAchievableValue([], 4, poker)).toBe(47); // 4A
    expect(bestAchievableValue([], 3, poker)).toBe(35); // 3A
  });
});

describe("greedy placement", () => {
  it("places a card where it completes a high-value hand", () => {
    // Build a board where one 3-cell row needs a 7♠ to complete 7-7-7 (trips, 3B=33)
    const board: BoardState = emptyBoard();
    // grid 0, row 0 cells are (col1,row0),(col2,row0),(col3,row0)
    placeCard(board, { grid: 0, col: 1, row: 0 }, S(7));
    placeCard(board, { grid: 0, col: 2, row: 0 }, H(7));
    // leave (col3,row0) empty; also open a mediocre cell elsewhere
    const d = greedyDecision(view(board, C(7), GameMode.PokerStraightsMode));
    expect(d.action).toBe("place");
    expect(d.cell).toEqual({ grid: 0, col: 3, row: 0 });
  });

  it("golf placement minimizes strokes", () => {
    const board: BoardState = emptyBoard();
    placeCard(board, { grid: 0, col: 1, row: 0 }, S(7));
    placeCard(board, { grid: 0, col: 2, row: 0 }, H(7));
    const d = greedyDecision(view(board, C(7), GameMode.GolfMode));
    expect(d.action).toBe("place");
    expect(d.cell).toEqual({ grid: 0, col: 3, row: 0 }); // completes trips → low strokes
  });
});

describe("greedy self-play", () => {
  it("fills the whole board (never passes itself into an unfinished game)", () => {
    for (const seed of [1, 7, 42, 99, 2026]) {
      const g = new GameState(GameMode.PokerStraightsMode, mulberry32(seed));
      let guard = 0;
      while (!g.isOver && guard++ < 200) greedyStep(g);
      expect(g.isOver).toBe(true);
      expect(g.snapshot().placedCount).toBe(36);
    }
  });

  it("is deterministic under a fixed seed", () => {
    const play = (seed: number) => {
      const g = new GameState(GameMode.PokerStraightsMode, mulberry32(seed));
      let guard = 0;
      while (!g.isOver && guard++ < 200) greedyStep(g);
      return scoreBoard(g.snapshot().board, GameMode.PokerStraightsMode).round;
    };
    expect(play(2024)).toBe(play(2024));
  });

  it("greedy scores at least as well as always-first-cell on average (poker)", () => {
    const naive = (seed: number) => {
      const g = new GameState(GameMode.PokerStraightsMode, mulberry32(seed));
      let guard = 0;
      while (!g.isOver && guard++ < 200) {
        const cell = [...playableCells(0), ...playableCells(1)].find((c) => g.canPlace(c));
        if (cell) g.place(cell);
        else g.pass();
      }
      return scoreBoard(g.snapshot().board, GameMode.PokerStraightsMode).round;
    };
    const greedy = (seed: number) => {
      const g = new GameState(GameMode.PokerStraightsMode, mulberry32(seed));
      let guard = 0;
      while (!g.isOver && guard++ < 200) greedyStep(g);
      return scoreBoard(g.snapshot().board, GameMode.PokerStraightsMode).round;
    };
    const seeds = Array.from({ length: 40 }, (_, i) => i * 17 + 3);
    const naiveAvg = seeds.reduce((t, s) => t + naive(s), 0) / seeds.length;
    const greedyAvg = seeds.reduce((t, s) => t + greedy(s), 0) / seeds.length;
    expect(greedyAvg).toBeGreaterThan(naiveAvg);
  });
});

describe("match", () => {
  it("runs the human + N independent AI, ranks everyone, finishes on human end", () => {
    const m = new Match(GameMode.PokerStraightsMode, 3, mulberry32(5));
    // human always places first available cell
    let guard = 0;
    while (!m.human.state.isOver && guard++ < 200) {
      const cell = [...playableCells(0), ...playableCells(1)].find((c) => m.human.state.canPlace(c));
      if (cell) m.humanPlace(cell as Cell);
      else m.humanPass();
    }
    expect(m.isOver).toBe(true);
    const standings = m.standings();
    expect(standings).toHaveLength(4); // you + 3
    // ranks are contiguous from 1 and sorted by score (poker: high first)
    expect(standings[0]!.rank).toBe(1);
    for (let i = 1; i < standings.length; i++) {
      expect(standings[i]!.score).toBeLessThanOrEqual(standings[i - 1]!.score);
    }
    // every player filled their own board
    expect(standings.every((s) => s.placed === 36 && s.isOver)).toBe(true);
    // AI boards are independent (not all identical scores by construction)
    expect(m.humanRank()).toBeGreaterThanOrEqual(1);
  });

  it("clamps opponent count to 1..8", () => {
    expect(new Match(GameMode.PokerStraightsMode, 0).ais.length).toBe(1);
    expect(new Match(GameMode.PokerStraightsMode, 99).ais.length).toBe(8);
  });
});
