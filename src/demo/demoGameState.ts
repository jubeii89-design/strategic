/**
 * Game loop for the standalone demo build — a deliberately separate, smaller
 * sibling of `src/game/gameState.ts`, not a slice of it.
 *
 * The real game's hands are full rows/columns of its 4x5 cut-corner grid (5
 * row-hands + 4 column-hands per grid), and every cell belongs to some row,
 * so there is no way to keep all of a grid's cells while showing fewer than
 * 9 hands. A genuinely smaller "taste" needs its own topology: a 3x3
 * mini-grid, no cut corners, 9 cells, 3 row-hands (holes 1-3) + 3
 * column-hands (holes 4-6) = 6 hands, each hand exactly 3 cards. Par equals
 * hand length here, the same convention the real scorecard already uses
 * (length-3 hands are par 3 there too), so every demo hand is par 3.
 *
 * Only pure, geometry-agnostic engine primitives are imported — `emptyBoard`
 * and `cardAt` are plain array accessors, and `evaluateHand` scores any 3-5
 * card array without knowing about grids at all. `playableCells`/
 * `handsOfGrid`/`isPlayableCell` are NOT used, and neither is `placeCard`:
 * it re-validates against `isPlayableCell` internally, which enforces the
 * real grid's cut-corner rule and would wrongly reject this board's (0,0)
 * cell. Writing a card onto the board is instead a trivial local helper.
 */

import {
  type BoardState,
  type Cell,
  type CardId,
  type HandScore,
  GameMode,
  emptyBoard,
  cardAt,
  evaluateHand,
  rankOf,
  type Rng,
  shuffledDeck,
} from "../engine/index.js";

/** Write a card onto the board — no cut-corner check; the demo has none. */
function placeDemoCard(board: BoardState, cell: Cell, id: CardId): void {
  board.cards[cell.grid]![cell.row]![cell.col] = id;
}

export const DEMO_ROWS = 3;
export const DEMO_COLS = 3;
export const DEMO_PREPLACED_CARDS = 2;
export const DEMO_STARTING_CARDS_LEFT = 10;
export const DEMO_TOTAL_CELLS = DEMO_ROWS * DEMO_COLS; // 9

export type DemoHandKind = "row" | "column";

export interface DemoHandDef {
  hole: number; // 1-3 rows, 4-6 columns
  kind: DemoHandKind;
  cells: Cell[]; // always 3 cells
}

/** 3 row-hands (holes 1-3) then 3 column-hands (holes 4-6), grid 0 only. */
function demoHands(): DemoHandDef[] {
  const hands: DemoHandDef[] = [];
  for (let row = 0; row < DEMO_ROWS; row++) {
    const cells: Cell[] = [];
    for (let col = 0; col < DEMO_COLS; col++) cells.push({ grid: 0, col, row });
    hands.push({ hole: row + 1, kind: "row", cells });
  }
  for (let col = 0; col < DEMO_COLS; col++) {
    const cells: Cell[] = [];
    for (let row = 0; row < DEMO_ROWS; row++) cells.push({ grid: 0, col, row });
    hands.push({ hole: DEMO_ROWS + col + 1, kind: "column", cells });
  }
  return hands;
}

export interface DemoHandResult extends HandScore {
  hole: number;
  hand: DemoHandDef;
  complete: boolean;
}

export interface DemoBoardScore {
  hands: DemoHandResult[];
  round: number;
}

/** Score the demo's 6 hands. Mirrors `scoreBoard()` but over this mini topology. */
export function scoreDemoBoard(board: BoardState, mode: GameMode): DemoBoardScore {
  const results: DemoHandResult[] = demoHands().map((hand) => {
    const ids = hand.cells.map((cell) => cardAt(board, cell));
    if (ids.some((id) => id === null)) {
      return { hole: hand.hole, hand, complete: false, points: 0, handID: "", factorValue: "", handName: "" };
    }
    const score = evaluateHand(ids as number[], mode);
    return { hole: hand.hole, hand, complete: true, ...score };
  });
  const round = results.filter((r) => r.complete).reduce((t, r) => t + r.points, 0);
  return { hands: results, round };
}

/** One card placed or passed, in play order. */
export interface DemoPlayLogEntry {
  seq: number;
  action: "place" | "pass";
  card: CardId;
  cell: Cell | null;
}

/** Recorded once a hand's last cell fills: its cards and the 2 highest-ranked. */
export interface DemoHandCompletion {
  hole: number;
  cards: CardId[];
  topCards: CardId[];
}

function highRank(id: CardId): number {
  const r = rankOf(id);
  return r === 1 ? 14 : r;
}

export class DemoGameState {
  readonly mode: GameMode;
  readonly board: BoardState;
  private readonly hands = demoHands();
  private deck: CardId[];
  private drawIndex = 0;
  private current: CardId | null = null;
  private cardsLeft = DEMO_STARTING_CARDS_LEFT;
  private placed = 0;
  private over = false;
  private seq = 0;
  readonly preplaced: { cell: Cell; card: CardId }[] = [];
  readonly playLog: DemoPlayLogEntry[] = [];
  readonly handCompletions: DemoHandCompletion[] = [];

  constructor(mode: GameMode, rng: Rng = Math.random) {
    this.mode = mode;
    this.board = emptyBoard();
    this.deck = shuffledDeck(rng); // unsliced 52-card deck; the demo needs at most 13 draws

    const open: Cell[] = [];
    for (let row = 0; row < DEMO_ROWS; row++)
      for (let col = 0; col < DEMO_COLS; col++) open.push({ grid: 0, col, row });

    for (let i = 0; i < DEMO_PREPLACED_CARDS; i++) {
      const card = this.deck[this.drawIndex++]!;
      const pick = Math.floor(rng() * open.length);
      const cell = open.splice(pick, 1)[0]!;
      placeDemoCard(this.board, cell, card);
      this.placed++;
      this.preplaced.push({ cell, card });
      this.checkHandCompletions(cell);
    }
    this.drawNext();
  }

  private checkHandCompletions(cell: Cell): void {
    for (const hand of this.hands) {
      if (this.handCompletions.some((h) => h.hole === hand.hole)) continue;
      if (!hand.cells.some((c) => c.col === cell.col && c.row === cell.row)) continue;
      const ids = hand.cells.map((c) => cardAt(this.board, c));
      if (ids.some((id) => id === null)) continue;
      const cards = ids as CardId[];
      const topCards = [...cards].sort((a, b) => highRank(b) - highRank(a)).slice(0, 2);
      this.handCompletions.push({ hole: hand.hole, cards, topCards });
    }
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
    if (this.placed >= DEMO_TOTAL_CELLS || this.cardsLeft <= 0 || this.current === null) {
      this.over = true;
    }
  }

  /** True only for an empty cell within the demo's 3x3 mini-board. */
  canPlace(cell: Cell): boolean {
    if (this.over || this.current === null) return false;
    if (cell.grid !== 0 || cell.row < 0 || cell.row >= DEMO_ROWS || cell.col < 0 || cell.col >= DEMO_COLS) {
      return false;
    }
    return cardAt(this.board, cell) === null;
  }

  place(cell: Cell): void {
    if (!this.canPlace(cell)) {
      throw new Error(`cannot place on cell (${cell.grid},${cell.col},${cell.row})`);
    }
    const card = this.current!;
    placeDemoCard(this.board, cell, card);
    this.placed++;
    this.cardsLeft--;
    this.playLog.push({ seq: this.seq++, action: "place", card, cell });
    this.checkHandCompletions(cell);
    this.drawNext();
  }

  pass(): void {
    if (this.over || this.current === null) throw new Error("no card to pass");
    this.playLog.push({ seq: this.seq++, action: "pass", card: this.current, cell: null });
    this.cardsLeft--;
    this.drawNext();
  }

  snapshot() {
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
