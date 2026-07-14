/**
 * Leaderboard UI: the board screen (Poker/Golf toggle) and the name-entry
 * modal. Player-entered names are rendered as textContent (never innerHTML)
 * since they are untrusted display text.
 */

import { GameMode } from "../engine/index.js";
import { type Leaderboard, type LeaderboardEntry } from "../game/leaderboard.js";
import { leaderboardSignSVG } from "./leaderboardSign.js";

const NAME_KEY = "pokerst8ts.playerName";

function lastName(): string {
  try {
    return (typeof localStorage !== "undefined" && localStorage.getItem(NAME_KEY)) || "";
  } catch {
    return "";
  }
}
function rememberName(name: string): void {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(NAME_KEY, name);
  } catch {
    /* ignore */
  }
}

const medal = (rank: number) => (rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : String(rank));

/** Render the board for one mode into a container element. */
function renderBoard(
  container: HTMLElement,
  entries: LeaderboardEntry[],
  mode: GameMode,
  highlight?: LeaderboardEntry,
): void {
  container.replaceChildren();
  if (entries.length === 0) {
    const empty = document.createElement("p");
    empty.className = "lb-empty";
    empty.textContent = "No scores yet — be the first.";
    container.appendChild(empty);
    return;
  }
  const table = document.createElement("table");
  table.className = "lb-table";
  const head = document.createElement("tr");
  head.innerHTML = `<th>#</th><th>Name</th><th>${mode === GameMode.GolfMode ? "Strokes" : "Points"}</th><th>Date</th>`;
  table.appendChild(head);
  entries.forEach((e, i) => {
    const tr = document.createElement("tr");
    const isHi =
      highlight && e.name === highlight.name && e.score === highlight.score && e.date === highlight.date;
    if (isHi) tr.className = "lb-hi";
    const rankTd = document.createElement("td");
    rankTd.className = "lb-rank";
    rankTd.textContent = medal(i + 1);
    const nameTd = document.createElement("td");
    nameTd.className = "lb-name";
    nameTd.textContent = e.name; // untrusted → textContent
    const scoreTd = document.createElement("td");
    scoreTd.className = "lb-score";
    scoreTd.textContent = String(e.score);
    const dateTd = document.createElement("td");
    dateTd.className = "lb-date";
    dateTd.textContent = e.date;
    tr.append(rankTd, nameTd, scoreTd, dateTd);
    table.appendChild(tr);
  });
  container.appendChild(table);
}

export interface LeaderboardScreenOpts {
  leaderboard: Leaderboard;
  mode: GameMode;
  highlight?: LeaderboardEntry;
  onBack: () => void;
}

/** Full leaderboard screen with a Poker/Golf toggle, shown as a wooden signpost. */
export function renderLeaderboardScreen(opts: LeaderboardScreenOpts): HTMLElement {
  const screen = document.createElement("div");
  screen.className = "screen leaderboard-screen";

  const signboard = document.createElement("div");
  signboard.className = "lb-signboard";

  const signSvg = document.createElement("div");
  signSvg.className = "lb-sign-svg";
  signSvg.innerHTML = leaderboardSignSVG();
  signboard.appendChild(signSvg);

  const panel = document.createElement("div");
  panel.className = "lb-panel";

  const title = document.createElement("h2");
  title.className = "lb-title";
  title.textContent = "Leaderboard";
  panel.appendChild(title);

  let mode = opts.mode;
  const toggle = document.createElement("div");
  toggle.className = "lb-toggle";
  const pokerBtn = document.createElement("button");
  const golfBtn = document.createElement("button");
  pokerBtn.textContent = "PokerStr8ts";
  golfBtn.textContent = "Golf";
  toggle.append(pokerBtn, golfBtn);
  panel.appendChild(toggle);

  const boardBox = document.createElement("div");
  boardBox.className = "lb-board";
  panel.appendChild(boardBox);

  const refresh = async () => {
    pokerBtn.classList.toggle("active", mode === GameMode.PokerStraightsMode);
    golfBtn.classList.toggle("active", mode === GameMode.GolfMode);
    const entries = await opts.leaderboard.top(mode);
    renderBoard(boardBox, entries, mode, mode === opts.mode ? opts.highlight : undefined);
  };
  pokerBtn.addEventListener("click", () => {
    mode = GameMode.PokerStraightsMode;
    void refresh();
  });
  golfBtn.addEventListener("click", () => {
    mode = GameMode.GolfMode;
    void refresh();
  });

  const back = document.createElement("button");
  back.className = "mode-btn primary lb-back";
  back.innerHTML = `<span class="mode-label">Back</span>`;
  back.addEventListener("click", opts.onBack);
  panel.appendChild(back);

  signboard.appendChild(panel);
  screen.appendChild(signboard);
  void refresh();
  return screen;
}

/**
 * Modal asking for the player's name after a qualifying finish. Resolves with
 * the entered name, or null if skipped. Remembers the last name used.
 */
export function promptForName(rank: number): Promise<string | null> {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "overlay";
    const panel = document.createElement("div");
    panel.className = "end-panel name-prompt";

    const h = document.createElement("h2");
    h.textContent = rank === 1 ? "New high score! 🏆" : `Top ${rank <= 3 ? rank : 20} finish!`;
    const p = document.createElement("p");
    p.textContent = "Enter your name for the leaderboard:";

    const input = document.createElement("input");
    input.className = "name-input";
    input.maxLength = 12;
    input.value = lastName();
    input.placeholder = "Your name";

    const row = document.createElement("div");
    row.className = "name-actions";
    const save = document.createElement("button");
    save.className = "mode-btn primary";
    save.innerHTML = `<span class="mode-label">Save</span>`;
    const skip = document.createElement("button");
    skip.className = "mode-btn";
    skip.innerHTML = `<span class="mode-label">Skip</span>`;
    row.append(save, skip);

    const finish = (value: string | null) => {
      overlay.remove();
      resolve(value);
    };
    save.addEventListener("click", () => {
      const v = input.value.trim();
      if (v) rememberName(v);
      finish(v || null);
    });
    skip.addEventListener("click", () => finish(null));
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") save.click();
    });

    panel.append(h, p, input, row);
    overlay.appendChild(panel);
    document.getElementById("app")!.appendChild(overlay);
    input.focus();
    input.select();
  });
}

/** Modal asking whether to play again. Resolves true (Yes) or false (No). */
export function promptPlayAgain(): Promise<boolean> {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "overlay";
    const panel = document.createElement("div");
    panel.className = "end-panel play-again-prompt";

    const h = document.createElement("h2");
    h.textContent = "Play again?";

    const row = document.createElement("div");
    row.className = "name-actions";
    const yes = document.createElement("button");
    yes.className = "mode-btn primary";
    yes.innerHTML = `<span class="mode-label">Yes</span>`;
    const no = document.createElement("button");
    no.className = "mode-btn";
    no.innerHTML = `<span class="mode-label">No</span>`;
    row.append(yes, no);

    const finish = (value: boolean) => {
      overlay.remove();
      resolve(value);
    };
    yes.addEventListener("click", () => finish(true));
    no.addEventListener("click", () => finish(false));

    panel.append(h, row);
    overlay.appendChild(panel);
    document.getElementById("app")!.appendChild(overlay);
  });
}
