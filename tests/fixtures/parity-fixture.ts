/**
 * Ground-truth parity fixture: handIDString → poker points.
 *
 * VERIFIED against the original game binary. The apparent ranking inversions
 * (e.g. 4A=47 above 4B=43) are intentional — do NOT "correct" them.
 *
 * First character = card count in the identified hand.
 * Second character = hand-type letter; the letter → hand-type mapping is
 * decoded from HandIDValue / GetNameOfHand in the original source.
 */
export const HAND_POINTS: Readonly<Record<string, number>> = {
  "5A": 58, "5B": 50, "5C": 42, "5D": 38, "5E": 34,
  "5F": 31, "5G": 19, "5H": 16, "5I": 5, "5J": -5,
  "4A": 47, "4B": 43, "4C": 28, "4D": 25,
  "4E": 23, "4F": 22, "4G": 7, "4H": -4,
  "3A": 35, "3B": 33, "3C": 18, "3D": 14, "3E": 9, "3F": -3,
};

/**
 * Canonical completed board from a screenshot of the original game
 * (integration oracle). Per-hand IDs and points, in on-screen order.
 */
export const CANONICAL_FRONT_NINE = [
  { id: "3A", points: 35 }, { id: "4B", points: 43 }, { id: "4F", points: 22 },
  { id: "4G", points: 7 }, { id: "3E", points: 9 }, { id: "4H", points: -4 },
  { id: "4H", points: -4 }, { id: "4C", points: 28 }, { id: "3F", points: -3 },
] as const;

export const CANONICAL_BACK_NINE = [
  { id: "3A", points: 35 }, { id: "4H", points: -4 }, { id: "4F", points: 22 },
  { id: "4H", points: -4 }, { id: "3C", points: 18 }, { id: "4C", points: 28 },
  { id: "5G", points: 19 }, { id: "5H", points: 16 }, { id: "4E", points: 23 },
] as const;

export const CANONICAL_FRONT_TOTAL = 133;
export const CANONICAL_BACK_TOTAL = 153;
export const CANONICAL_ROUND_TOTAL = 286;
