/**
 * Solo-mode deck: a plain random shuffle of the 52 cards.
 *
 * The original tournament/server deck plumbing (DayData, fixed 47-card server
 * decks, prime-walk) is intentionally not ported — it was cut from scope.
 *
 * The RNG is injectable so tests are deterministic. It must return a float in
 * [0, 1), like Math.random.
 */

import { type CardId, fullDeckIds } from "./cards.js";

export type Rng = () => number;

/** Fisher–Yates shuffle of a fresh 52-card deck. */
export function shuffledDeck(rng: Rng = Math.random): CardId[] {
  const deck = fullDeckIds();
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = deck[i]!;
    deck[i] = deck[j]!;
    deck[j] = tmp;
  }
  return deck;
}

/** Small deterministic RNG (mulberry32) for tests. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
