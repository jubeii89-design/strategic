/**
 * Card model, ported from the original game's integer card IDs.
 *
 * id = suit * 100 + rank
 *   Spades   1–13   (suit 0, bare)
 *   Hearts  101–113 (suit 1)
 *   Clubs   201–213 (suit 2)
 *   Diamonds 301–313 (suit 3)
 * rank ("number" in the original) is 1–13 with Ace = 1.
 * Ace-high straights are handled inside the hand evaluator, not here.
 *
 * id 500 is the blank hole-filler used by the original engine.
 */

export type CardId = number;

export const BLANK_CARD_ID = 500;

export enum Suit {
  Spades = 0,
  Hearts = 1,
  Clubs = 2,
  Diamonds = 3,
}

export const SUITS: readonly Suit[] = [
  Suit.Spades,
  Suit.Hearts,
  Suit.Clubs,
  Suit.Diamonds,
];

export const RANKS: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

export function makeCardId(suit: Suit, rank: number): CardId {
  if (rank < 1 || rank > 13) throw new RangeError(`rank out of range: ${rank}`);
  return suit * 100 + rank;
}

export function isBlank(id: CardId): boolean {
  return id === BLANK_CARD_ID;
}

export function suitOf(id: CardId): Suit {
  if (isBlank(id)) throw new RangeError("blank card has no suit");
  return Math.floor(id / 100) as Suit;
}

/** rank 1–13, Ace = 1 (the original's `number` field) */
export function rankOf(id: CardId): number {
  if (isBlank(id)) throw new RangeError("blank card has no rank");
  return id % 100;
}

export function isValidCardId(id: CardId): boolean {
  if (!Number.isInteger(id)) return false;
  const rank = id % 100;
  const suit = Math.floor(id / 100);
  return rank >= 1 && rank <= 13 && suit >= 0 && suit <= 3;
}

/** All 52 card IDs, suit-major (Spades 1..13, Hearts 101..113, ...). */
export function fullDeckIds(): CardId[] {
  const ids: CardId[] = [];
  for (const suit of SUITS) for (const rank of RANKS) ids.push(makeCardId(suit, rank));
  return ids;
}
