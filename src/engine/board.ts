/**
 * Board topology for the two-grid solo ("golf") mode.
 *
 * Each grid is 4 columns × 5 rows with two opposite corners cut:
 * (col 0, row 0) top-left and (col 3, row 4) bottom-right, as visible in the
 * original game's board. That leaves 18 playable cells per grid, in rows of
 * 3-4-4-4-3.
 *
 * Hands: per grid, one hand per row (5) and one per column (4) = 9 hands;
 * grid 0 is the "front nine", grid 1 the "back nine" (18 hands total).
 * Structural hand lengths: rows {3,4,4,4,3}, columns {4,5,5,4}.
 *
 * Hand ordering is confirmed by the original game's scorecard: holes 1-5 are
 * the five rows top-to-bottom (par 3,4,4,4,3), holes 6-9 the four columns
 * left-to-right (par 4,5,5,4); grid 2 repeats this as holes 10-18. The cut
 * corners match a completed-game screenshot; re-confirm the axis orientation
 * against Engine.FinishLoadingCardHandList once the source is readable.
 *
 * This module knows nothing about players, turns, decks, or scoring — it only
 * describes cells and which cells form which hand.
 */

import type { CardId } from "./cards.js";

export const COLS = 4;
export const ROWS = 5;
export const GRIDS = 2;

export type GridIndex = 0 | 1;

export interface Cell {
  grid: GridIndex;
  col: number; // 0..3
  row: number; // 0..4
}

/** The two cut corners: top-left and bottom-right of each grid. */
export function isPlayableCell(col: number, row: number): boolean {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
  if (col === 0 && row === 0) return false;
  if (col === 3 && row === 4) return false;
  return true;
}

export function playableCells(grid: GridIndex): Cell[] {
  const cells: Cell[] = [];
  for (let row = 0; row < ROWS; row++)
    for (let col = 0; col < COLS; col++)
      if (isPlayableCell(col, row)) cells.push({ grid, col, row });
  return cells;
}

export type HandKind = "row" | "column";

export interface HandDef {
  grid: GridIndex;
  kind: HandKind;
  index: number; // row 0..4 or column 0..3
  cells: Cell[]; // 3–5 playable cells
}

/** The 9 hands of one grid: 5 row hands then 4 column hands (provisional order). */
export function handsOfGrid(grid: GridIndex): HandDef[] {
  const hands: HandDef[] = [];
  for (let row = 0; row < ROWS; row++) {
    const cells: Cell[] = [];
    for (let col = 0; col < COLS; col++)
      if (isPlayableCell(col, row)) cells.push({ grid, col, row });
    hands.push({ grid, kind: "row", index: row, cells });
  }
  for (let col = 0; col < COLS; col++) {
    const cells: Cell[] = [];
    for (let row = 0; row < ROWS; row++)
      if (isPlayableCell(col, row)) cells.push({ grid, col, row });
    hands.push({ grid, kind: "column", index: col, cells });
  }
  return hands;
}

/** All 18 hands: front nine (grid 0) then back nine (grid 1). */
export function allHands(): HandDef[] {
  return [...handsOfGrid(0), ...handsOfGrid(1)];
}

/**
 * A board is just what card (if any) occupies each cell. Cut corners are never
 * present. The engine scores any BoardState without knowing who placed cards.
 */
export type BoardState = {
  /** cards[grid][row][col] = CardId, or null while the cell is empty. Cut corners stay null. */
  cards: (CardId | null)[][][];
};

export function emptyBoard(): BoardState {
  const cards = Array.from({ length: GRIDS }, () =>
    Array.from({ length: ROWS }, () => Array<CardId | null>(COLS).fill(null)),
  );
  return { cards };
}

export function cardAt(board: BoardState, cell: Cell): CardId | null {
  return board.cards[cell.grid]![cell.row]![cell.col]!;
}

export function placeCard(board: BoardState, cell: Cell, id: CardId): void {
  if (!isPlayableCell(cell.col, cell.row))
    throw new RangeError(`cell (${cell.col},${cell.row}) is not playable`);
  if (cardAt(board, cell) !== null)
    throw new Error(`cell (${cell.grid},${cell.col},${cell.row}) is occupied`);
  board.cards[cell.grid]![cell.row]![cell.col] = id;
}
