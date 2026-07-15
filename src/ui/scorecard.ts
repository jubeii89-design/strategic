/**
 * The 18-hole scorecard: HOLE / PAR / SCORE / HAND ID rows plus FIRST NINE,
 * BACK NINE and ROUND totals — driven entirely by scoreBoard().
 */

import { type BoardScore, GameMode } from "../engine/index.js";
import { designOverride } from "./designOverrides.js";

const PARS = [3, 4, 4, 4, 3, 4, 5, 5, 4]; // per nine (rows then columns)

function totalPar(): number {
  return PARS.reduce((a, b) => a + b, 0); // 36 per nine
}

export function renderScorecard(score: BoardScore, mode: GameMode): HTMLElement {
  const golf = mode === GameMode.GolfMode;
  const wrap = document.createElement("div");
  wrap.className = "scorecard-wrap";
  const bg = designOverride("scoreboard");
  if (bg) {
    wrap.classList.add("has-bg");
    wrap.style.backgroundImage = `url("${bg}")`;
  }

  const table = document.createElement("table");
  table.className = "scorecard";

  const holes = Array.from({ length: 18 }, (_, i) => i + 1);
  const cell = (text: string | number, cls = "") => `<td class="${cls}">${text}</td>`;

  const scoreOf = (h: number) => {
    const r = score.hands[h - 1];
    return r && r.complete ? r.points : "";
  };
  const idOf = (h: number) => {
    const r = score.hands[h - 1];
    return r && r.complete ? r.handID : "";
  };

  const nineHeader = (label: string, total: number | string) =>
    `<th class="nine">${label}</th>` + `<td class="nine-total">${total}</td>`;

  table.innerHTML = `
    <tr class="row-hole">
      <th>${golf ? "HOLE" : "HAND"}</th>
      ${holes.slice(0, 9).map((h) => cell(h)).join("")}
      ${nineHeader("FIRST NINE", "")}
      ${holes.slice(9).map((h) => cell(h)).join("")}
      ${nineHeader("BACK NINE", "")}
      <th class="nine">ROUND</th>
    </tr>
    <tr class="row-par">
      <th>PAR</th>
      ${PARS.map((p) => cell(p)).join("")}
      <td class="nine-total">${totalPar()}</td>
      ${PARS.map((p) => cell(p)).join("")}
      <td class="nine-total">${totalPar()}</td>
      <td class="nine-total">${totalPar() * 2}</td>
    </tr>
    <tr class="row-score">
      <th>SCORE</th>
      ${holes.slice(0, 9).map((h) => cell(scoreOf(h), "score")).join("")}
      <td class="nine-total strong">${score.frontNine}</td>
      ${holes.slice(9).map((h) => cell(scoreOf(h), "score")).join("")}
      <td class="nine-total strong">${score.backNine}</td>
      <td class="nine-total strong round">${score.round}</td>
    </tr>
    <tr class="row-id">
      <th>HAND ID</th>
      ${holes.slice(0, 9).map((h) => cell(idOf(h), "hid")).join("")}
      <td class="nine-total"></td>
      ${holes.slice(9).map((h) => cell(idOf(h), "hid")).join("")}
      <td class="nine-total"></td>
      <td class="nine-total"></td>
    </tr>`;
  wrap.appendChild(table);
  return wrap;
}
