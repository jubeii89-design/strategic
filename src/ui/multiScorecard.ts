/**
 * "Everyone's scoring" grid at the end of a round: every player as a row,
 * their 18 per-hole scores as columns, plus a total — a multiplayer version
 * of the in-game scorecard, styled like a tournament leaderboard.
 */

import { GameMode, scoreBoard, type BoardState } from "../engine/index.js";

export interface ScoreRow {
  name: string;
  isHuman: boolean;
  board: BoardState;
}

export function renderMultiScorecard(rows: ScoreRow[], mode: GameMode): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "multi-scorecard";

  const ball = () => `<span class="ms-ball" aria-hidden="true"></span>`;

  const banner = document.createElement("div");
  banner.className = "ms-banner";
  banner.innerHTML = `${ball()}<span class="ms-banner-text">${mode === GameMode.GolfMode ? "GOLF" : "POKERSTR8TS"}</span>${ball()}`;
  wrap.appendChild(banner);

  const panel = document.createElement("div");
  panel.className = "ms-panel";

  const tableWrap = document.createElement("div");
  tableWrap.className = "ms-table-wrap";
  const table = document.createElement("table");
  table.className = "ms-table";

  const holes = Array.from({ length: 18 }, (_, i) => i + 1);
  table.innerHTML = `
    <tr>
      <th class="ms-name">PARTICIPANTS</th>
      ${holes.map((h) => `<th>${h}</th>`).join("")}
      <th class="ms-total">TOTAL</th>
    </tr>
    ${rows
      .map((r) => {
        const score = scoreBoard(r.board, mode);
        const cells = score.hands
          .map((h) => `<td>${h.complete ? h.points : ""}</td>`)
          .join("");
        return `<tr class="${r.isHuman ? "ms-you" : ""}">
          <td class="ms-name">${r.isHuman ? "You" : r.name}</td>
          ${cells}
          <td class="ms-total">${score.round}</td>
        </tr>`;
      })
      .join("")}`;
  tableWrap.appendChild(table);
  panel.appendChild(tableWrap);
  wrap.appendChild(panel);

  return wrap;
}
