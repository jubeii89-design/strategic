/**
 * App entry: intro → game → end panel. Framework-free; re-renders the game
 * screen from the GameState snapshot after each action.
 */

import { type Cell, GameMode, scoreBoard } from "./engine/index.js";
import { GameState } from "./game/gameState.js";
import { renderIntro } from "./ui/intro.js";
import { renderBoard } from "./ui/board.js";
import { renderScorecard } from "./ui/scorecard.js";
import { cardFace } from "./ui/cards.js";
import "./ui/styles.css";

const app = document.getElementById("app")!;

function clear(): void {
  app.replaceChildren();
}

function start(mode: GameMode): void {
  const game = new GameState(mode);
  renderGame(game);
}

function renderGame(game: GameState): void {
  clear();
  const snap = game.snapshot();
  const score = scoreBoard(snap.board, game.mode);

  const screen = document.createElement("div");
  screen.className = "screen game";

  screen.appendChild(renderScorecard(score, game.mode));

  const main = document.createElement("div");
  main.className = "play-area";

  // left rail: next card, PASS, cards remaining
  const rail = document.createElement("aside");
  rail.className = "rail";
  const scoreBox = document.createElement("div");
  scoreBox.className = "score-box";
  scoreBox.innerHTML = `<span class="score-box-label">${game.mode === GameMode.GolfMode ? "STROKES" : "SCORE"}</span><span class="score-box-value">${score.round}</span>`;
  rail.appendChild(scoreBox);

  const nextWrap = document.createElement("div");
  nextWrap.className = "next-card";
  const nextLabel = document.createElement("span");
  nextLabel.className = "rail-label";
  nextLabel.textContent = "NEXT CARD";
  nextWrap.appendChild(nextLabel);
  if (snap.currentCard !== null) {
    nextWrap.appendChild(cardFace(snap.currentCard));
  }
  rail.appendChild(nextWrap);

  const passBtn = document.createElement("button");
  passBtn.className = "pass-btn";
  passBtn.textContent = "PASS";
  passBtn.disabled = snap.isOver;
  passBtn.addEventListener("click", () => {
    if (!game.isOver) {
      game.pass();
      renderGame(game);
    }
  });
  rail.appendChild(passBtn);

  const remain = document.createElement("div");
  remain.className = "cards-remaining";
  remain.innerHTML = `<span class="rail-label">CARDS REMAINING</span><span class="remain-value">${snap.cardsLeft}</span>`;
  rail.appendChild(remain);

  const board = renderBoard(game, {
    onPlace: (cell: Cell) => {
      game.place(cell);
      renderGame(game);
    },
  });

  main.append(rail, board);
  screen.appendChild(main);
  app.appendChild(screen);

  if (snap.isOver) showEndPanel(game, score.round);
}

function showEndPanel(game: GameState, roundTotal: number): void {
  const overlay = document.createElement("div");
  overlay.className = "overlay";
  const panel = document.createElement("div");
  panel.className = "end-panel";
  const label = game.mode === GameMode.GolfMode ? "Final strokes" : "Final score";
  panel.innerHTML = `
    <h2>Round complete</h2>
    <p class="final">${label}: <strong>${roundTotal}</strong></p>`;
  const again = document.createElement("button");
  again.className = "mode-btn primary";
  again.innerHTML = `<span class="mode-label">Play Again</span>`;
  again.addEventListener("click", showIntro);
  const menu = document.createElement("button");
  menu.className = "mode-btn";
  menu.innerHTML = `<span class="mode-label">Main Menu</span>`;
  menu.addEventListener("click", showIntro);
  panel.append(again, menu);
  overlay.appendChild(panel);
  app.appendChild(overlay);
}

// keyboard: P = pass
document.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "p") {
    const btn = document.querySelector<HTMLButtonElement>(".pass-btn");
    if (btn && !btn.disabled) btn.click();
  }
});

function showIntro(): void {
  clear();
  app.appendChild(renderIntro(start));
}

showIntro();
