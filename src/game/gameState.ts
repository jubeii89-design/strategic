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
  allHands,
  cardAt,
  emptyBoard,
  isPlayableCell,
  placeCard,
  playableCells,
  rankOf,
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

/** One card placed or passed, in play order. */
export interface PlayLogEntry {
  seq: number;
  action: "place" | "pass";
  card: CardId;
  cell: Cell | null; // null for a pass
}

/** Recorded once a hand's last cell fills: its cards and the 2 highest-ranked. */
export interface HandCompletion {
  hole: number; // 1-18, scorecard order
  cards: CardId[]; // every card in the hand, in cell order
  topCards: CardId[]; // the 2 highest-ranked cards (Ace treated as high)
}

/** Poker high-card ranking (Ace = 14) used only to pick the "highest" cards. */
function highRank(id: CardId): number {
  const r = rankOf(id);
  return r === 1 ? 14 : r;
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
  private seq = 0;
  /** cells auto-filled at start, exposed for the UI's reveal animation. */
  readonly preplaced: { cell: Cell; card: CardId }[] = [];
  /** Every place/pass action, in order — "the cards as they are played". */
  readonly playLog: PlayLogEntry[] = [];
  /** One entry per hand, recorded the moment its last cell fills. */
  readonly handCompletions: HandCompletion[] = [];

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
      this.checkHandCompletions(cell);
    }
    this.drawNext();
  }

  /** If `cell` completed a hand (row or column), record its top 2 cards once. */
  private checkHandCompletions(cell: Cell): void {
    allHands().forEach((hand, i) => {
      const hole = i + 1;
      if (this.handCompletions.some((h) => h.hole === hole)) return; // already recorded
      if (!hand.cells.some((c) => c.grid === cell.grid && c.col === cell.col && c.row === cell.row)) return;
      const ids = hand.cells.map((c) => cardAt(this.board, c));
      if (ids.some((id) => id === null)) return; // not complete yet
      const cards = ids as CardId[];
      const topCards = [...cards].sort((a, b) => highRank(b) - highRank(a)).slice(0, 2);
      this.handCompletions.push({ hole, cards, topCards });
    });
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
    const card = this.current!;
    placeCard(this.board, cell, card);
    this.placed++;
    this.cardsLeft--;
    this.playLog.push({ seq: this.seq++, action: "place", card, cell });
    this.checkHandCompletions(cell);
    this.drawNext();
  }

  /** Discard the current card without placing it; ticks the counter. */
  pass(): void {
    if (this.over || this.current === null) throw new Error("no card to pass");
    this.playLog.push({ seq: this.seq++, action: "pass", card: this.current, cell: null });
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
