/**
 * Renders the two 4×5 grids (cut corners omitted) with hole-number chips, and
 * wires empty cells to an onPlace callback when a card is in hand.
 */

import { type Cell, COLS, GRIDS, ROWS, cardAt, isPlayableCell } from "../engine/index.js";
import type { GameState } from "../game/gameState.js";
import { cardFace, emptySlot } from "./cards.js";

export interface BoardCallbacks {
  onPlace(cell: Cell): void;
}

/**
 * Hole number for a hand: per grid, holes 1-5 are rows 0-4, holes 6-9 are
 * columns 0-3; grid 1 adds 9. Cells belong to a row-hand and a column-hand;
 * the chip layout mirrors the original (row chips left, column chips top).
 */
function rowHole(grid: number, row: number): number {
  return grid * 9 + row + 1;
}
function colHole(grid: number, col: number): number {
  return grid * 9 + 5 + col + 1;
}

function renderGrid(state: GameState, grid: 0 | 1, cbs: BoardCallbacks): HTMLElement {
  const snap = state.snapshot();
  const g = document.createElement("div");
  g.className = "grid";

  // column hole chips (top)
  const colRow = document.createElement("div");
  colRow.className = "grid-row chip-row";
  for (let col = 0; col < COLS; col++) {
    const chip = document.createElement("div");
    chip.className = "chip col-chip";
    chip.textContent = String(colHole(grid, col));
    colRow.appendChild(chip);
  }
  g.appendChild(colRow);

  for (let row = 0; row < ROWS; row++) {
    const r = document.createElement("div");
    r.className = "grid-row";
    // row hole chip (left)
    const chip = document.createElement("div");
    chip.className = "chip row-chip";
    chip.textContent = String(rowHole(grid, row));
    r.appendChild(chip);

    for (let col = 0; col < COLS; col++) {
      if (!isPlayableCell(col, row)) {
        const gap = document.createElement("div");
        gap.className = "cell cut";
        r.appendChild(gap);
        continue;
      }
      const cell: Cell = { grid, col, row };
      const slot = document.createElement("div");
      slot.className = "cell";
      const card = cardAt(snap.board, cell);
      if (card !== null) {
        slot.appendChild(cardFace(card));
      } else {
        const empty = emptySlot();
        if (state.canPlace(cell)) {
          empty.classList.add("placeable");
          empty.addEventListener("click", () => cbs.onPlace(cell));
        }
        slot.appendChild(empty);
      }
      r.appendChild(slot);
    }
    g.appendChild(r);
  }
  return g;
}

export function renderBoard(state: GameState, cbs: BoardCallbacks): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "board";
  for (let grid = 0; grid < GRIDS; grid++) {
    wrap.appendChild(renderGrid(state, grid as 0 | 1, cbs));
  }
  return wrap;
}
