/**
 * Integration oracle #2: a complete game transcribed from a screenshot of the
 * original PokerStraights, scorecard included. Unlike the task's canonical
 * scorecard (IDs only), the full 36-card layout is known, so this board can be
 * fed through scoreBoard() and asserted end-to-end.
 *
 * Layout convention matches src/engine/board.ts: rows top→bottom (0..4),
 * columns left→right (0..3), cut corners (0,0) and (3,4).
 * Hole order per grid: rows 0-4 then columns 0-3.
 *
 * The original scorecard read (hole: handID, golf strokes / par):
 *   1:3D 2:4H 3:4F 4:4H 5:3E 6:4F 7:5J 8:5J 9:4H   (front, golf 46)
 *   10:3C 11:4F 12:4B 13:4H 14:3C 15:4H 16:5J 17:5I 18:4D   (back, golf 38)
 * Golf strokes are a presentation layer; the engine asserts hand IDs and
 * poker POINTS (from the parity fixture table).
 */

import type { CardId } from "../../src/engine/cards.js";

const S = 0, H = 100, C = 200; // suit offsets used below (no diamonds were placed)
const _ = null; // cut corner

/** cards[row][col] for the front (left) grid. */
export const SCREENSHOT_FRONT_GRID: readonly (CardId | null)[][] = [
  [_, H + 1, H + 6, H + 7], // .  A♥  6♥  7♥
  [S + 1, H + 4, S + 13, S + 6], // A♠  4♥  K♠  6♠
  [S + 4, S + 7, S + 10, S + 11], // 4♠  7♠  10♠ J♠
  [S + 8, H + 3, S + 12, H + 5], // 8♠  3♥  Q♠  5♥
  [S + 9, H + 2, S + 2, _], // 9♠  2♥  2♠  .
];

/** cards[row][col] for the back (right) grid. */
export const SCREENSHOT_BACK_GRID: readonly (CardId | null)[][] = [
  [_, S + 5, C + 7, C + 6], // .   5♠  7♣  6♣
  [C + 10, C + 9, C + 8, C + 5], // 10♣ 9♣  8♣  5♣
  [C + 1, C + 2, C + 3, C + 4], // A♣  2♣  3♣  4♣
  [H + 9, H + 10, H + 11, S + 3], // 9♥  10♥ J♥  3♠
  [H + 12, H + 13, C + 11, _], // Q♥  K♥  J♣  .
];

/** Expected handIDString per hole (rows 0-4 then cols 0-3), per grid. */
export const SCREENSHOT_FRONT_IDS = [
  "3D", "4H", "4F", "4H", "3E", // rows: heart flush; nothing; spade flush; nothing; pair of 2s
  "4F", "5J", "5J", "4H", // cols: spade flush; nothing; nothing; nothing
] as const;

export const SCREENSHOT_BACK_IDS = [
  "3C", "4F", "4B", "4H", "3C", // rows: 5-6-7 straight; club flush; A-4♣ straight flush; nothing; J-Q-K straight
  "4H", "5J", "5I", "4D", // cols: nothing; nothing; pair of jacks; 3-6 straight
] as const;
