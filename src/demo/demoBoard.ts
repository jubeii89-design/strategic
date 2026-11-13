/**
 * Renders the demo's single 3x3 grid (no cut corners) and wires empty cells
 * to an onPlace callback when a card is in hand. Reuses the real game's card
 * rendering (`cardFace`/`emptySlot`) and CSS classes (`.board`/`.grid`/
 * `.cell`/`.chip`), which are plain, size-agnostic layouts.
 */

import { type Cell, cardAt } from "../engine/index.js";
import { DEMO_COLS, DEMO_ROWS, type DemoGameState } from "./demoGameState.js";
import { cardFace, emptySlot } from "../ui/cards.js";

export interface DemoBoardCallbacks {
  onPlace(cell: Cell): void;
}

export function renderDemoBoard(state: DemoGameState, cbs: DemoBoardCallbacks): HTMLElement {
  const snap = state.snapshot();
  const wrap = document.createElement("div");
  wrap.className = "board";
  const g = document.createElement("div");
  g.className = "grid";

  const colRow = document.createElement("div");
  colRow.className = "grid-row chip-row";
  for (let col = 0; col < DEMO_COLS; col++) {
    const chip = document.createElement("div");
    chip.className = "chip col-chip";
    chip.textContent = String(DEMO_ROWS + col + 1); // holes 4-6
    colRow.appendChild(chip);
  }
  g.appendChild(colRow);

  for (let row = 0; row < DEMO_ROWS; row++) {
    const r = document.createElement("div");
    r.className = "grid-row";
    const chip = document.createElement("div");
    chip.className = "chip row-chip";
    chip.textContent = String(row + 1); // holes 1-3
    r.appendChild(chip);

    for (let col = 0; col < DEMO_COLS; col++) {
      const cell: Cell = { grid: 0, col, row };
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

  wrap.appendChild(g);
  return wrap;
}
