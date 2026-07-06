/**
 * Integration oracle: a complete game transcribed from a screenshot of the
 * original PokerStraights (golf-mode presentation), scorecard included. The
 * full 36-card layout is known, so this board is fed through scoreBoard() and
 * asserted end-to-end in BOTH game modes.
 *
 * Layout convention matches src/engine/board.ts: rows top→bottom (0..4),
 * columns left→right (0..3), cut corners (0,0) and (3,4).
 * Hole order per grid: rows 0-4 then columns 0-3 (verified against
 * Engine.FinishLoadingCardHandList: the original numbers rows bottom-up with
 * y=4 at the top of the screen, which is row 0 here).
 *
 * The screenshot scorecard read (hole: handID, golf strokes; PAR 3,4,4,4,3 |
 * 4,5,5,4 per grid):
 *   1:3D/3  2:4H/6  3:4F/4  4:4H/6  5:3E/3  6:4F/4  7:5J/7  8:5J/7  9:4H/6  → 46
 *   10:3C/2 11:4F/4 12:4A/2 13:4H/6 14:3C/2 15:4H/6 16:5J/7 17:5I/6 18:4D/3 → 38
 * Round: 84 strokes.
 *
 * NOTE: hole 12 (A♣2♣3♣4♣) was originally transcribed as "4B", but the
 * decompiled HandIDValue maps straight flushes to "4A" (4B is four of a
 * kind); the tiny scorecard glyph was misread. The golf strokes (2, an
 * Eagle) are identical either way and confirm the hand.
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
  "3C", "4F", "4A", "4H", "3C", // rows: 5-6-7 straight; club flush; A-4♣ straight flush; nothing; J-Q-K straight
  "4H", "5J", "5I", "4D", // cols: nothing; nothing; pair of jacks; 3-6 straight
] as const;

/** Golf strokes per hole, straight off the screenshot scorecard. */
export const SCREENSHOT_FRONT_STROKES = [3, 6, 4, 6, 3, 4, 7, 7, 6] as const; // = 46
export const SCREENSHOT_BACK_STROKES = [2, 4, 2, 6, 2, 6, 7, 6, 3] as const; // = 38
export const SCREENSHOT_GOLF_TOTALS = { front: 46, back: 38, round: 84 } as const;
