# PokerStraights Engine (TypeScript)

TypeScript port of the solo mode of the original Unity *PokerStraights* card game.
Engine + parity tests only — no UI, no networking, no persistence.

## Status

- [x] Project scaffold (TypeScript strict + Vitest)
- [x] Card model (`id = suit*100 + rank`, Spades bare, blank filler = 500)
- [x] Deck (random 52-card shuffle, injectable RNG)
- [x] Board topology (two 4×5 grids with opposite corners cut → 18 cells / 9 hands per grid)
- [x] Parity fixture data (24 hand IDs, verified against the original binary)
- [ ] Scoring port (`GetNameOfHand`, `LookupHandPointValue`, `HandIDValue`, `AddScoreToHand`) —
      **blocked on access to the original C# source**
- [ ] Parity harness asserting exact hand IDs + points
- [ ] Canonical completed-board integration test (totals 133 / 153 / 286)

## Layout

- `src/engine/cards.ts` — card ID encoding/decoding
- `src/engine/deck.ts` — shuffle (solo mode only; tournament deck plumbing was cut)
- `src/engine/board.ts` — cell mask, hand membership, `BoardState`
- `tests/fixtures/parity-fixture.ts` — ground-truth hand ID → points table + canonical board

The engine scores any `BoardState` without knowing who placed the cards, so a future
multi-player mode (human + AI on independent boards) needs no engine changes.

## Commands

```sh
npm install
npm test        # vitest
npm run typecheck
```
