/**
 * PHASE-3 PURE IMPLEMENTATION.
 *
 * Behaviour-equivalent rewrite of scoring-legacy.ts (the statement-level port
 * of the decompiled Engine.cs) with no mutable instance state. Equivalence is
 * enforced by tests/equivalence.test.ts, which compares this implementation
 * against the legacy port over the parity fixture and tens of thousands of
 * random hands (including blank-500 cards) in both game modes.
 *
 * Faithfully modelled legacy semantics that survive the rewrite:
 * - Category selection = highest point value wins, evaluated in the original
 *   branch order with a `>` guard (first of equals wins).
 * - The `points` field is written by EVERY probed category, so the reported
 *   points come from the LAST category whose condition matched, while the
 *   hand ID/name come from the guard winner. These diverge only for hands
 *   containing blank (id 500) cards, e.g. an all-blank "trips" that is also
 *   a "flush". HandIDValue re-asserts the points for "nothing" hands.
 * - Straight detection quirks: the Ace-high checks replace the minimum before
 *   the generic scan, so e.g. a 5-card hand with both Ten and Ace is only a
 *   straight if it is exactly 10,J,Q,K,A.
 * - Golf-mode 3-card royal (Q,K,A suited) yields 0 strokes (the original hits
 *   a missing lookup case and returns stale state, which is 0 when fresh).
 */

import { GameMode, type HandScore } from "./scoring-legacy.js";

type Category =
  | "royal"
  | "sf"
  | "quads"
  | "fullHouse"
  | "flush"
  | "straight"
  | "trips"
  | "twoPair"
  | "pair"
  | "nothing";

type PerSize = Partial<Record<number, number>>;

const POKER_POINTS: Record<Category, PerSize> = {
  royal: { 5: 58, 4: 47, 3: 35 }, // below 5 cards a royal scores as a plain SF
  sf: { 5: 50, 4: 47, 3: 35 },
  quads: { 5: 42, 4: 43 },
  fullHouse: { 5: 38 },
  flush: { 5: 34, 4: 22, 3: 14 },
  straight: { 5: 31, 4: 25, 3: 18 },
  trips: { 5: 19, 4: 28, 3: 33 },
  twoPair: { 5: 16, 4: 23 },
  pair: { 5: 5, 4: 7, 3: 9 },
  nothing: { 5: -5, 4: -4, 3: -3 },
};

const GOLF_STROKES: Record<Category, PerSize> = {
  royal: { 5: 2, 4: 2, 3: 0 }, // 3-card royal: stale-lookup bug in the original → 0
  sf: { 5: 3, 4: 2, 3: 1 },
  quads: { 5: 3, 4: 2 },
  fullHouse: { 5: 4 },
  flush: { 5: 4, 4: 4, 3: 3 },
  straight: { 5: 5, 4: 3, 3: 2 },
  trips: { 5: 5, 4: 3, 3: 2 },
  twoPair: { 5: 5, 4: 4 },
  pair: { 5: 6, 4: 5, 3: 3 },
  nothing: { 5: 7, 4: 6, 3: 4 },
};

const HAND_IDS: Record<Category, Partial<Record<number, string>>> = {
  royal: { 5: "5A", 4: "4A", 3: "3A" },
  sf: { 5: "5B", 4: "4A", 3: "3A" },
  quads: { 5: "5C", 4: "4B" },
  fullHouse: { 5: "5D" },
  flush: { 5: "5E", 4: "4F", 3: "3D" },
  straight: { 5: "5F", 4: "4D", 3: "3C" },
  trips: { 5: "5G", 4: "4C", 3: "3B" },
  twoPair: { 5: "5H", 4: "4E" },
  pair: { 5: "5I", 4: "4G", 3: "3E" },
  nothing: { 5: "5J", 4: "4H", 3: "3F" },
};

/** Poker hand-name IDs (AddScoreToHand's switch). */
const POKER_NAME_ID: Record<Category, PerSize> = {
  royal: { 5: 1, 4: 2, 3: 2 },
  sf: { 5: 2, 4: 2, 3: 2 },
  quads: { 5: 3, 4: 3 },
  fullHouse: { 5: 4 },
  flush: { 5: 5, 4: 5, 3: 5 },
  straight: { 5: 6, 4: 6, 3: 6 },
  trips: { 5: 7, 4: 7, 3: 7 },
  twoPair: { 5: 8, 4: 8 },
  pair: { 5: 9, 4: 9, 3: 9 },
  nothing: { 5: 10, 4: 10, 3: 10 },
};

/** Golf hand-name IDs (GetNameOfHand's golf `result` values). */
const GOLF_NAME_ID: Record<Category, PerSize> = {
  royal: { 5: 12, 4: 13, 3: 14 },
  sf: { 5: 13, 4: 13, 3: 14 },
  quads: { 5: 13, 4: 13 },
  fullHouse: { 5: 15 },
  flush: { 5: 15, 4: 17, 3: 17 },
  straight: { 5: 17, 4: 15, 3: 15 },
  trips: { 5: 17, 4: 15, 3: 15 },
  twoPair: { 5: 17, 4: 17 },
  pair: { 5: 18, 4: 18, 3: 17 },
  nothing: { 5: 19, 4: 19, 3: 18 },
};

const NAME_TEXT: Record<number, string> = {
  1: "Royal Flush",
  2: "Straight Flush",
  3: "Four of a Kind",
  4: "Full House",
  5: "Flush",
  6: "Straight",
  7: "Three of a Kind",
  8: "Two Pairs",
  9: "Pair",
  10: "High Card",
  12: "Albatross",
  13: "Eagle",
  14: "Eagle Hole In One",
  15: "Birdie",
  16: "Irdie",
  17: "Par",
  18: "Bogey",
  19: "Double",
};

function factorChar(v: number): string {
  if (v >= 2 && v <= 9) return String(v);
  if (v === 10) return "T";
  if (v === 11) return "J";
  if (v === 12) return "Q";
  if (v === 13) return "K";
  if (v === 1) return "A";
  return ""; // 0 / out of range: LookUpFactorPointValue falls through
}

/** Straight detection with the original's Ace-handling quirks. */
function isStraight(numbers: readonly number[], hasAce: boolean, hasKing: boolean, hasTen: boolean): boolean {
  const n = numbers.length;
  const min = Math.min(...numbers);
  const inc = (x: number) => numbers.includes(x);
  if (n === 5) {
    if (hasTen && hasAce) return inc(11) && inc(12) && inc(13); // 10,J,Q,K,A only
    return inc(min + 1) && inc(min + 2) && inc(min + 3) && inc(min + 4);
  }
  if (n === 4) {
    if (hasKing && hasAce) return inc(11) && inc(12); // J,Q,K,A only
    return inc(min + 1) && inc(min + 2) && inc(min + 3);
  }
  if (n === 3) {
    if (hasKing && hasAce) return inc(12); // Q,K,A only
    return inc(min + 1) && inc(min + 2);
  }
  return false;
}

/** Pure equivalent of the legacy CalculateScoreForHand for 3-5 card hands. */
export function evaluateHandPure(
  cardIds: readonly number[],
  gameMode: GameMode = GameMode.PokerStraightsMode,
): HandScore {
  const n = cardIds.length;
  if (n < 3 || n > 5) throw new RangeError(`unsupported hand size: ${n}`);
  const numbers = cardIds.map((id) => id % 100);
  const types = cardIds.map((id) => Math.floor(id / 100) + 1);

  const flush = types.every((t) => t === types[0]);
  const hasAce = numbers.includes(1);
  const hasKing = numbers.includes(13);
  const hasTen = numbers.includes(10);
  const straight = isStraight(numbers, hasAce, hasKing, hasTen);

  // distinct numbers in first-seen order, with counts (SameKind)
  const distinct: number[] = [];
  for (const x of numbers) if (!distinct.includes(x)) distinct.push(x);
  const countOf = (x: number) => numbers.filter((y) => y === x).length;
  const quadNum = distinct.find((x) => countOf(x) === 4);
  const tripNum = distinct.find((x) => countOf(x) === 3);
  const pairNums = distinct.filter((x) => countOf(x) === 2);

  const table = gameMode === GameMode.GolfMode ? GOLF_STROKES : POKER_POINTS;

  // Candidate categories in the original branch order. `pointsField` mirrors
  // the legacy `points` field: written by every matched category; the winner
  // is picked by the `>` guard on the best value so far (num, init -20).
  const candidates: Category[] = [];
  if (quadNum !== undefined) candidates.push("quads");
  if (tripNum !== undefined && pairNums.length > 0) candidates.push("fullHouse");
  else if (tripNum !== undefined) candidates.push("trips");
  else if (pairNums.length >= 2) candidates.push("twoPair");
  else if (pairNums.length === 1) candidates.push("pair");
  if (flush) candidates.push(straight ? (hasKing && hasAce ? "royal" : "sf") : "flush");
  if (straight && !flush) candidates.push("straight");
  if (candidates.length === 0) candidates.push("nothing");

  let num = -20;
  let winner: Category = "nothing";
  let pointsField = 0;
  for (const cat of candidates) {
    const pts = table[cat][n]!;
    pointsField = pts;
    if (pts > num) {
      winner = cat;
      num = pts;
    }
  }
  // HandIDValue re-asserts the points for "nothing" hands in both modes.
  if (winner === "nothing") {
    pointsField = table.nothing[n]!;
  }

  const nameID = (gameMode === GameMode.GolfMode ? GOLF_NAME_ID : POKER_NAME_ID)[winner][n]!;
  const handID = HAND_IDS[winner][n]!;
  const handName = NAME_TEXT[nameID] ?? "";

  // --- factor values (scorecard metadata) -------------------------------
  // The legacy factor blocks run in sequence and overwrite each other; the
  // flush/straight/nothing block runs last, so it wins whenever it applies.
  let primary = 0;
  let secondary = 0;
  const maxOf = (xs: number[]) => (xs.length > 0 ? Math.max(...xs) : 0);
  if (flush || straight || candidates.includes("nothing")) {
    if (hasAce) {
      if (straight) {
        secondary = 1;
        primary = maxOf(numbers);
      } else {
        primary = 1;
        secondary = maxOf(numbers.filter((x) => x > 1));
      }
    } else {
      // max and second max (over all cards, duplicates included)
      let a = 0;
      let b = 0;
      for (const x of numbers) {
        if (x > a) {
          b = a;
          a = x;
        } else if (x > b) {
          b = x;
        }
      }
      primary = a;
      secondary = b;
    }
  } else if (quadNum !== undefined) {
    primary = quadNum;
    secondary = n === 5 ? maxOf(numbers.filter((x) => x !== quadNum)) : quadNum;
  } else if (tripNum !== undefined && pairNums.length > 0) {
    primary = tripNum;
    secondary = pairNums[0]!;
  } else if (pairNums.length >= 2) {
    primary = Math.max(pairNums[0]!, pairNums[1]!);
    secondary = Math.min(pairNums[0]!, pairNums[1]!);
  } else if (pairNums.length === 1) {
    const p = pairNums[0]!;
    primary = p;
    secondary = hasAce && p !== 1 ? 1 : maxOf(numbers.filter((x) => x !== p));
  } else if (tripNum !== undefined) {
    primary = tripNum;
    if (n === 3) {
      secondary = tripNum;
    } else {
      secondary = hasAce && tripNum !== 1 ? 1 : maxOf(numbers.filter((x) => x !== tripNum));
    }
  }
  const factorValue = factorChar(primary) + factorChar(secondary);

  return { points: pointsField, handID, factorValue, handName };
}
