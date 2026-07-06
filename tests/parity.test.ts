import { describe, expect, it } from "vitest";
import { evaluateHand, GameMode } from "../src/engine/index.js";
import { HAND_POINTS } from "./fixtures/parity-fixture.js";

// Card-id helpers: Spades bare, Hearts +100, Clubs +200, Diamonds +300; A=1..K=13.
const S = (n: number) => n;
const H = (n: number) => 100 + n;
const C = (n: number) => 200 + n;
const D = (n: number) => 300 + n;

/**
 * Concrete hands per handIDString. Every entry must produce EXACTLY this ID
 * and the fixture's point value in PokerStraights mode.
 */
const HANDS: Record<string, number[][]> = {
  // --- 5-card ---
  "5A": [
    [H(10), H(11), H(12), H(13), H(1)], // royal flush, hearts
    [S(1), S(13), S(12), S(11), S(10)], // royal flush, spades, shuffled order
  ],
  "5B": [
    [H(2), H(3), H(4), H(5), H(6)], // straight flush
    [S(1), S(2), S(3), S(4), S(5)], // Ace-low straight flush
    [D(9), D(10), D(11), D(12), D(13)], // K-high straight flush (has 10+K, no A)
  ],
  "5C": [
    [S(7), H(7), C(7), D(7), S(2)], // four of a kind
    [S(13), H(13), C(13), D(13), H(1)], // quad kings + ace kicker
  ],
  "5D": [
    [S(3), H(3), C(3), S(9), H(9)], // full house
    [S(1), H(1), C(1), S(12), D(12)], // aces full of queens
  ],
  "5E": [
    [H(2), H(5), H(7), H(9), H(13)], // flush
    [C(1), C(3), C(6), C(9), C(11)], // flush with ace
  ],
  "5F": [
    [S(4), H(5), C(6), D(7), S(8)], // straight
    [S(10), H(11), C(12), D(13), S(1)], // Ace-high straight, mixed suits
    [S(1), H(2), C(3), D(4), S(5)], // Ace-low straight, mixed suits
  ],
  "5G": [
    [S(5), H(5), C(5), S(2), H(9)], // three of a kind
    [S(1), H(1), C(1), S(7), H(4)], // trip aces
  ],
  "5H": [
    [S(4), H(4), S(9), C(9), S(13)], // two pairs
    [S(1), H(1), S(2), H(2), C(8)], // aces and twos
  ],
  "5I": [
    [S(6), H(6), S(2), C(9), D(12)], // pair
    [S(1), D(1), S(5), C(8), H(11)], // pair of aces
  ],
  "5J": [
    [S(2), H(4), C(6), D(9), S(12)], // nothing
    [H(1), H(4), S(7), H(3), H(2)], // 4-hearts + spade: no sub-hand extraction
  ],
  // --- 4-card ---
  "4A": [
    [C(11), C(12), C(13), C(1)], // J,Q,K,A suited ("royal" 4-card = straight flush)
    [D(5), D(6), D(7), D(8)], // plain straight flush
    [C(1), C(2), C(3), C(4)], // Ace-low straight flush (screenshot hole 12)
  ],
  "4B": [
    [S(9), H(9), C(9), D(9)], // four of a kind
  ],
  "4C": [
    [S(3), H(3), C(3), S(7)], // three of a kind
    [S(1), H(1), D(1), C(9)], // trip aces
  ],
  "4D": [
    [S(10), H(11), C(12), D(13)], // straight
    [S(11), H(12), C(13), D(1)], // J,Q,K,A mixed suits (Ace-high)
    [S(1), H(2), C(3), D(4)], // A,2,3,4 mixed suits (Ace-low)
  ],
  "4E": [
    [S(5), H(5), S(8), C(8)], // two pairs
  ],
  "4F": [
    [S(2), S(7), S(9), S(11)], // flush
  ],
  "4G": [
    [S(4), H(4), S(9), C(13)], // pair
  ],
  "4H": [
    [S(2), H(5), C(9), D(13)], // nothing
    [S(1), H(4), S(13), S(6)], // screenshot hole 2
  ],
  // --- 3-card ---
  "3A": [
    [H(12), H(13), H(1)], // Q,K,A suited ("royal" 3-card = straight flush)
    [S(4), S(5), S(6)], // plain straight flush
    [D(1), D(2), D(3)], // Ace-low straight flush
  ],
  "3B": [
    [S(8), H(8), C(8)], // three of a kind
  ],
  "3C": [
    [S(5), H(6), C(7)], // straight
    [S(12), H(13), C(1)], // Q,K,A mixed suits (Ace-high)
    [S(1), H(2), C(3)], // A,2,3 mixed suits (Ace-low)
  ],
  "3D": [
    [H(2), H(7), H(11)], // flush
  ],
  "3E": [
    [S(9), H(9), S(4)], // pair
    [S(9), H(2), S(2)], // screenshot hole 5
  ],
  "3F": [
    [S(2), H(7), C(12)], // nothing
  ],
};

describe("parity: handIDString and points vs the verified fixture (PokerStraights mode)", () => {
  it("covers all 24 fixture hand IDs", () => {
    expect(Object.keys(HANDS).sort()).toEqual(Object.keys(HAND_POINTS).sort());
  });

  for (const impl of ["legacy", "pure"] as const) {
    describe(`implementation: ${impl}`, () => {
      for (const [id, hands] of Object.entries(HANDS)) {
        describe(`${id} → ${HAND_POINTS[id]} points`, () => {
          hands.forEach((cardIds, i) => {
            it(`hand #${i + 1}: [${cardIds.join(",")}]`, () => {
              const result = evaluateHand(cardIds, GameMode.PokerStraightsMode, impl);
              expect(result.handID).toBe(id);
              expect(result.points).toBe(HAND_POINTS[id]);
            });
          });
        });
      }
    });
  }
});

describe("golf mode strokes (verified against the completed-game screenshot scorecard)", () => {
  const golfCases: Array<{ cards: number[]; id: string; strokes: number }> = [
    { cards: [H(1), H(6), H(7)], id: "3D", strokes: 3 }, // hole 1
    { cards: [S(1), H(4), S(13), S(6)], id: "4H", strokes: 6 }, // hole 2
    { cards: [S(4), S(7), S(10), S(11)], id: "4F", strokes: 4 }, // hole 3
    { cards: [S(9), H(2), S(2)], id: "3E", strokes: 3 }, // hole 5
    { cards: [S(5), C(7), C(6)], id: "3C", strokes: 2 }, // hole 10
    { cards: [C(1), C(2), C(3), C(4)], id: "4A", strokes: 2 }, // hole 12: SF = Eagle
    { cards: [S(6), C(5), C(4), C(3)], id: "4D", strokes: 3 }, // hole 18 shape
    { cards: [C(7), C(8), C(3), H(11), C(11)], id: "5I", strokes: 6 }, // hole 17
    { cards: [S(2), H(4), C(6), D(9), S(12)], id: "5J", strokes: 7 },
    { cards: [S(9), H(9), C(9), D(9)], id: "4B", strokes: 2 }, // quads = Eagle
    { cards: [S(3), H(3), C(3), S(9), H(9)], id: "5D", strokes: 4 }, // full house = Birdie
    { cards: [S(2), H(7), C(12)], id: "3F", strokes: 4 }, // 3-card bogey... Double per code
  ];
  for (const impl of ["legacy", "pure"] as const) {
    for (const { cards, id, strokes } of golfCases) {
      it(`${impl}: ${id} scores ${strokes} strokes`, () => {
        const result = evaluateHand(cards, GameMode.GolfMode, impl);
        expect(result.handID).toBe(id);
        expect(result.points).toBe(strokes);
      });
    }
  }
});
