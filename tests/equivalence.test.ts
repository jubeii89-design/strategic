import { describe, expect, it } from "vitest";
import { evaluateHandLegacy, evaluateHandPure, GameMode } from "../src/engine/index.js";
import { BLANK_CARD_ID, fullDeckIds } from "../src/engine/cards.js";
import { mulberry32 } from "../src/engine/deck.js";

const MODES = [GameMode.PokerStraightsMode, GameMode.GolfMode] as const;

function assertSame(cardIds: number[], mode: GameMode): void {
  const legacy = evaluateHandLegacy(cardIds, mode);
  const pure = evaluateHandPure(cardIds, mode);
  const label = `[${cardIds.join(",")}] mode=${mode}`;
  expect(`${label} → ${pure.handID}|${pure.points}|${pure.handName}|${pure.factorValue}`).toBe(
    `${label} → ${legacy.handID}|${legacy.points}|${legacy.handName}|${legacy.factorValue}`,
  );
}

describe("pure implementation ≡ legacy port", () => {
  it("agrees on 30,000 random real-card hands in both modes", () => {
    const rng = mulberry32(20260704);
    const deck = fullDeckIds();
    for (let round = 0; round < 5000; round++) {
      // draw up to 5 distinct cards per round, test sizes 3..5
      const drawn: number[] = [];
      const pool = [...deck];
      for (let k = 0; k < 5; k++) {
        const i = Math.floor(rng() * pool.length);
        drawn.push(pool[i]!);
        pool.splice(i, 1);
      }
      for (const size of [3, 4, 5]) {
        for (const mode of MODES) {
          assertSame(drawn.slice(0, size), mode);
        }
      }
    }
  });

  it("agrees on hands containing blank (500) hole-filler cards", () => {
    const rng = mulberry32(999);
    const deck = [...fullDeckIds(), BLANK_CARD_ID, BLANK_CARD_ID, BLANK_CARD_ID, BLANK_CARD_ID];
    for (let round = 0; round < 3000; round++) {
      const drawn: number[] = [];
      const pool = [...deck];
      for (let k = 0; k < 5; k++) {
        const i = Math.floor(rng() * pool.length);
        drawn.push(pool[i]!);
        pool.splice(i, 1);
      }
      for (const size of [3, 4, 5]) {
        for (const mode of MODES) {
          assertSame(drawn.slice(0, size), mode);
        }
      }
    }
  });

  it("agrees on adversarial directed hands", () => {
    const B = BLANK_CARD_ID;
    const directed: number[][] = [
      [B, B, B], // all-blank "trips that is also a flush"
      [B, B, B, B], // all-blank quads/flush
      [B, B, B, B, 7], // blank quads + kicker
      [B, B, 7, 107, 207], // blank pair vs real pair interplay
      [B, 1, 2, 3], // blank-assisted straight (min = 0)
      [B, 101, 102], // blank + suited A,2
      [112, 113, 101], // Q,K,A suited: golf stale-lookup royal
      [110, 111, 112, 113, 101], // royal
      [1, 2, 3, 4, 5], // ace-low straight flush
      [10, 111, 212, 313, 1], // 10,J,Q,K,A mixed
      [13, 1, 2], // K,A,2 — not a straight
      [11, 13, 1, 5], // J,K,A,x — not a straight
      [10, 11, 12, 13], // 10,J,Q,K
    ];
    for (const cards of directed) {
      for (const mode of MODES) {
        assertSame(cards, mode);
      }
    }
  });
});
