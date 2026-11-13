/**
 * The demo's 6-hole scorecard: HOLE / PAR / SCORE / HAND ID rows plus a
 * single ROUND total — the same shape as the real scorecard, just sized
 * down to 6 holes instead of 18, with no front/back-nine split.
 */

import { GameMode } from "../engine/index.js";
import type { DemoBoardScore } from "./demoGameState.js";

const PARS = [3, 3, 3, 3, 3, 3]; // every demo hand is 3 cards, par = hand length

export function renderDemoScorecard(score: DemoBoardScore, mode: GameMode): HTMLElement {
  const golf = mode === GameMode.GolfMode;
  const wrap = document.createElement("div");
  wrap.className = "scorecard-wrap";

  const table = document.createElement("table");
  table.className = "scorecard";

  const holes = [1, 2, 3, 4, 5, 6];
  const cell = (text: string | number, cls = "") => `<td class="${cls}">${text}</td>`;

  const scoreOf = (h: number) => {
    const r = score.hands[h - 1];
    return r && r.complete ? r.points : "";
  };
  const idOf = (h: number) => {
    const r = score.hands[h - 1];
    return r && r.complete ? r.handID : "";
  };

  table.innerHTML = `
    <tr class="row-hole">
      <th>${golf ? "HOLE" : "HAND"}</th>
      ${holes.map((h) => cell(h)).join("")}
      <th class="nine">ROUND</th>
    </tr>
    <tr class="row-par">
      <th>PAR</th>
      ${PARS.map((p) => cell(p)).join("")}
      <td class="nine-total">${PARS.reduce((a, b) => a + b, 0)}</td>
    </tr>
    <tr class="row-score">
      <th>SCORE</th>
      ${holes.map((h) => cell(scoreOf(h), "score")).join("")}
      <td class="nine-total strong round">${score.round}</td>
    </tr>
    <tr class="row-id">
      <th>HAND ID</th>
      ${holes.map((h) => cell(idOf(h), "hid")).join("")}
      <td class="nine-total"></td>
    </tr>`;
  wrap.appendChild(table);
  return wrap;
}
