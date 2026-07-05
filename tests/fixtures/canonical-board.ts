/**
 * The canonical completed game from the task brief (PokerStraights mode,
 * round total 286), transcribed from the owner's screenshot.
 *
 * Scorecard: HAND ID row / SCORE row:
 *   1:3A/35 2:4B/43 3:4F/22 4:4G/7 5:3E/9 6:4H/-4 7:4H/-4 8:4C/28 9:3F/-3  → 133
 *   10:3A/35 11:4H/-4 12:4F/22 13:4H/-4 14:3C/18 15:4C/28 16:5G/19 17:5H/16 18:4E/23 → 153
 *
 * KEY FINDING — why holes 7-9 don't match the final board: the original game
 * froze those three hands' scores before their last card arrived. In this
 * game the last three cards placed were 3♥,4♥,5♥ into row 0 (completing
 * hole 1), and columns 7/8/9 kept the scores of the 4/4/3 cards below row 0.
 * Board-state scoring of the final layout therefore yields 5J/5G/4H for
 * holes 7-9 (front 122, round 275), while evaluating the frozen card subsets
 * reproduces the scorecard exactly.
 *
 * The freeze trigger is NOT fully explained by the available source:
 * CardHand.CheckIfHandIsComplete (supplied separately) returns true only
 * when every slot is filled — but it also sets
 * handCompletedAnimationCompleted = true as a side effect, and once that
 * flag is set the hand is never (re)scored by CheckForCompletedHands.
 * CardSlot.cs (also supplied) is ruled out: SetCard/GetCard are synchronous
 * with placement and CardSlot holds no completion or scoring logic. The
 * remaining candidates for the shortened 4/4/3-card evaluations are the
 * rest of CardHand.cs (SetScore / animation state / any per-placement
 * update) or a build difference between the screenshots' executable and the
 * decompiled assembly. Either way it is game-loop behaviour, deliberately
 * outside the scorer.
 */

import type { CardId } from "../../src/engine/cards.js";

const S = 0, H = 100, C = 200, D = 300;
const _ = null; // cut corner

export const CANONICAL_FRONT_GRID: readonly (CardId | null)[][] = [
  [_, H + 3, H + 4, H + 5], // .   3♥  4♥  5♥   (placed last, after cols locked)
  [H + 1, S + 1, C + 1, D + 1], // A♥  A♠  A♣  A♦
  [S + 7, S + 8, S + 2, S + 13], // 7♠  8♠  2♠  K♠
  [C + 10, S + 10, H + 2, S + 3], // 10♣ 10♠ 2♥  3♠
  [C + 13, D + 2, C + 2, _], // K♣  2♦  2♣  .
];

export const CANONICAL_BACK_GRID: readonly (CardId | null)[][] = [
  [_, H + 6, H + 7, H + 8], // .   6♥  7♥  8♥
  [H + 12, H + 11, C + 9, C + 8], // Q♥  J♥  9♣  8♣
  [S + 12, S + 11, S + 9, S + 6], // Q♠  J♠  9♠  6♠
  [C + 12, C + 11, S + 5, C + 6], // Q♣  J♣  5♠  6♣
  [D + 3, S + 4, C + 5, _], // 3♦  4♠  5♣  .
];

/** Scorecard hand IDs, holes 1-18 (rows 0-4 then cols 0-3 per grid). */
export const CANONICAL_SCORECARD_IDS = [
  "3A", "4B", "4F", "4G", "3E", "4H", "4H", "4C", "3F",
  "3A", "4H", "4F", "4H", "3C", "4C", "5G", "5H", "4E",
] as const;

export const CANONICAL_TOTALS = { front: 133, back: 153, round: 286 } as const;

/**
 * The card subsets holes 7-9 were locked with (their cells minus the row-0
 * card that had not been placed yet).
 */
export const CANONICAL_LOCKED_HANDS: Readonly<Record<number, CardId[]>> = {
  7: [S + 1, S + 8, S + 10, D + 2], // col 1 minus 3♥
  8: [C + 1, S + 2, H + 2, C + 2], // col 2 minus 4♥
  9: [D + 1, S + 13, S + 3], // col 3 minus 5♥
};

/** What pure board-state scoring of the FINAL layout yields for holes 7-9. */
export const CANONICAL_FINAL_BOARD_IDS_7_TO_9 = ["5J", "5G", "4H"] as const;
