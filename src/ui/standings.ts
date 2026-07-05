/**
 * Live standings panel: every player's running round score, ranked, with the
 * human highlighted. Driven by Match.standings().
 */

import { GameMode } from "../engine/index.js";
import type { Standing } from "../game/match.js";

const medal = (rank: number) => (rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "");

export function renderStandings(standings: Standing[], mode: GameMode, opts: { final?: boolean } = {}): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "standings" + (opts.final ? " final" : "");

  const title = document.createElement("div");
  title.className = "standings-title";
  title.textContent = opts.final ? "Final standings" : "Standings";
  wrap.appendChild(title);

  const list = document.createElement("ol");
  list.className = "standings-list";
  for (const s of standings) {
    const li = document.createElement("li");
    li.className = "standing-row" + (s.isHuman ? " you" : "");
    const label = s.isHuman ? "You" : s.name;
    li.innerHTML = `
      <span class="rank">${medal(s.rank) || s.rank}</span>
      <span class="who">${label}</span>
      <span class="pts">${s.score}${mode === GameMode.GolfMode ? "" : ""}</span>`;
    if (!opts.final && !s.isOver) li.classList.add("playing");
    list.appendChild(li);
  }
  wrap.appendChild(list);

  if (!opts.final) {
    const note = document.createElement("div");
    note.className = "standings-note";
    note.textContent = mode === GameMode.GolfMode ? "fewest strokes wins" : "most points wins";
    wrap.appendChild(note);
  }
  return wrap;
}
