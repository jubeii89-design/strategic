/**
 * Solo-mode game loop, reconstructed from the original Engine.cs behaviour but
 * with all Unity/network plumbing removed.
 *
 * Faithful rules (from Engine.Start / PlaceNextCardIntoSlot / PassCard /
 * CardsLeft / CheckIfGameIsFinished):
 * - The solo deck is 47 cards drawn from a full 52-card shuffle
 *   (Engine used `new int[47]`); the remaining 5 are never seen.
 * - 6 cards are auto-placed into random empty cells at the start.
 * - `cardsLeft` starts at 41 and ticks down by one on every place OR pass.
 * - The game ends when the board's 36 cells are all full, or the draw pile /
 *   counter is exhausted — whichever comes first.
 *
 * This layer knows nothing about the DOM or the human player specifically: a
 * future AI can drive the same place()/pass() API on its own GameState, and
 * the engine scores the board without knowing who placed the cards.
 */

import {
  type BoardState,
  type Cell,
  type CardId,
  GameMode,
  cardAt,
  emptyBoard,
  isPlayableCell,
  placeCard,
  playableCells,
  type Rng,
  shuffledDeck,
} from "../engine/index.js";

export const SOLO_DECK_SIZE = 47;
export const PREPLACED_CARDS = 6;
export const STARTING_CARDS_LEFT = 41;
export const TOTAL_CELLS = 36; // 18 playable cells per grid × 2 grids

export interface GameSnapshot {
  board: BoardState;
  currentCard: CardId | null;
  cardsLeft: number;
  placedCount: number;
  isOver: boolean;
  mode: GameMode;
}

export class GameState {
  readonly mode: GameMode;
  readonly board: BoardState;
  private deck: CardId[];
  private drawIndex = 0;
  private current: CardId | null = null;
  private cardsLeft = STARTING_CARDS_LEFT;
  private placed = 0;
  private over = false;
  /** cells auto-filled at start, exposed for the UI's reveal animation. */
  readonly preplaced: { cell: Cell; card: CardId }[] = [];

  constructor(mode: GameMode, rng: Rng = Math.random) {
    this.mode = mode;
    this.board = emptyBoard();
    this.deck = shuffledDeck(rng).slice(0, SOLO_DECK_SIZE);

    // Auto-place the first 6 cards into random empty cells.
    const open = [...playableCells(0), ...playableCells(1)];
    for (let i = 0; i < PREPLACED_CARDS; i++) {
      const card = this.deck[this.drawIndex++]!;
      const pick = Math.floor(rng() * open.length);
      const cell = open.splice(pick, 1)[0]!;
      placeCard(this.board, cell, card);
      this.placed++;
      this.preplaced.push({ cell, card });
    }
    this.drawNext();
  }

  private drawNext(): void {
    if (this.drawIndex < this.deck.length) {
      this.current = this.deck[this.drawIndex++]!;
    } else {
      this.current = null;
    }
    this.checkGameOver();
  }

  private checkGameOver(): void {
    if (this.placed >= TOTAL_CELLS || this.cardsLeft <= 0 || this.current === null) {
      this.over = true;
    }
  }

  /** True if `cell` is empty and playable and a card is in hand. */
  canPlace(cell: Cell): boolean {
    if (this.over || this.current === null) return false;
    if (!isPlayableCell(cell.col, cell.row)) return false;
    return cardAt(this.board, cell) === null;
  }

  /** Place the current card; advances to the next card and ticks the counter. */
  place(cell: Cell): void {
    if (!this.canPlace(cell)) {
      throw new Error(`cannot place on cell (${cell.grid},${cell.col},${cell.row})`);
    }
    placeCard(this.board, cell, this.current!);
    this.placed++;
    this.cardsLeft--;
    this.drawNext();
  }

  /** Discard the current card without placing it; ticks the counter. */
  pass(): void {
    if (this.over || this.current === null) throw new Error("no card to pass");
    this.cardsLeft--;
    this.drawNext();
  }

  snapshot(): GameSnapshot {
    return {
      board: this.board,
      currentCard: this.current,
      cardsLeft: Math.max(0, this.cardsLeft),
      placedCount: this.placed,
      isOver: this.over,
      mode: this.mode,
    };
  }

  get currentCard(): CardId | null {
    return this.current;
  }
  get isOver(): boolean {
    return this.over;
  }
  get remaining(): number {
    return Math.max(0, this.cardsLeft);
  }
}
