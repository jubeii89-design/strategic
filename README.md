# PokerStraights Engine (TypeScript)

TypeScript port of the solo mode of the original Unity *PokerStraights* card game.
Engine + parity tests only — no UI, no networking, no persistence.

## Status

- [x] Card model (`id = suit*100 + rank`, Spades bare, blank filler = 500)
- [x] Deck (random 52-card shuffle, injectable RNG)
- [x] Board topology (two 4×5 grids with opposite corners cut → 18 cells / 9 hands per grid,
      hole order verified against `Engine.FinishLoadingCardHandList`)
- [x] Scoring, ported statement-for-statement from the decompiled `Engine.cs`
      (`GetNameOfHand`, `HandIDValue`, `LookupHandPointValue`, `AddScoreToHand`) —
      both PokerStraights points and golf strokes
- [x] Parity harness: all 24 hand IDs × concrete hands, exact IDs + points
- [x] Completed-game screenshot as end-to-end oracle: golf mode reproduces the
      original scorecard exactly (46 / 38 / 84)
- [x] Pure-function refactor (`src/engine/scoring.ts`) kept equivalent to the legacy
      port by a 48k-hand randomized cross-check (IDs, points, names, factor values)

## Layout

- `src/engine/cards.ts` — card ID encoding/decoding
- `src/engine/deck.ts` — shuffle (solo mode only; tournament deck plumbing was cut)
- `src/engine/board.ts` — cell mask, hand membership, `BoardState`
- `src/engine/scoring-legacy.ts` — phase-1 "ugly" port; kept as the porting reference,
  exercised by the same suites as the pure implementation
- `src/engine/scoring.ts` — phase-3 pure implementation (default)
- `src/engine/index.ts` — public API: `evaluateHand(cards, mode)`, `scoreBoard(board, mode)`
- `tests/` — parity fixture, screenshot-board oracle, equivalence suite

The engine scores any `BoardState` without knowing who placed the cards, so a future
multi-player mode (human + AI on independent boards) needs no engine changes.

## Hand ID reference (decoded from the original code)

| Type | 5 cards | 4 cards | 3 cards |
|---|---|---|---|
| Royal Flush | 5A = 58 | (scores as SF) | (scores as SF) |
| Straight Flush | 5B = 50 | 4A = 47 | 3A = 35 |
| Four of a Kind | 5C = 42 | 4B = 43 | — |
| Full House | 5D = 38 | — | — |
| Flush | 5E = 34 | 4F = 22 | 3D = 14 |
| Straight | 5F = 31 | 4D = 25 | 3C = 18 |
| Three of a Kind | 5G = 19 | 4C = 28 | 3B = 33 |
| Two Pairs | 5H = 16 | 4E = 23 | — |
| Pair | 5I = 5 | 4G = 7 | 3E = 9 |
| Nothing | 5J = −5 | 4H = −4 | 3F = −3 |

## Canonical 286 board — hand-lock finding

The task brief's canonical scorecard (front 133 / back 153 / round 286) is reproduced
exactly by the engine (`tests/canonical-board.test.ts`), with one important mechanic
uncovered along the way: the original game **locks each hand's score the moment the
hand "completes" during play and never re-scores it**. In the canonical game the last
three cards placed were 3♥,4♥,5♥ into the top row (completing hole 1) *after* columns
7/8/9 had already locked their scores from the cards below — so the scorecard shows
`4H,4C,3F` for those holes even though the final layout evaluates to `5J,5G,4H`
(pure board-state scoring of the final layout gives 122/153/275; the locked subsets
give the scorecard's 133/153/286). The lock-in trigger lives in
`CardHand.CheckIfHandIsComplete` (not part of the supplied source) and is game-loop
behaviour, deliberately outside the scorer — pure board-state scoring stays
placement-order independent, as required for the future multi-player mode.

## Commands

```sh
npm install
npm test        # vitest
npm run typecheck
```
