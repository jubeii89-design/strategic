/**
 * Demo entry: intro → 6-hole round → promo end panel. A deliberately
 * separate, smaller sibling of `src/main.ts` — never touches the real
 * persistent leaderboard or hand-history store (no imports of either), and
 * never reuses `src/main.ts`'s `showOverlay` (its click-anywhere-to-dismiss
 * behavior would misfire if the promo link, which opens in a new tab, were
 * clicked).
 */

import { type Cell, GameMode } from "../engine/index.js";
import { DemoGameState, scoreDemoBoard, type DemoHandCompletion } from "./demoGameState.js";
import { renderDemoIntro } from "./demoIntro.js";
import { renderDemoBoard } from "./demoBoard.js";
import { renderDemoScorecard } from "./demoScorecard.js";
import { cardFace, cardLabel } from "../ui/cards.js";
import { mountCourseBackground } from "../ui/courseBackground.js";
import { mountPokerTableBackground } from "../ui/pokerTableBackground.js";
import { mountBackgroundMusic } from "../ui/audio.js";
import { setAssetBase } from "../ui/assetBase.js";
import { initDesignOverrides } from "../ui/designOverrides.js";
import "../ui/styles.css";
import "./demo.css";

setAssetBase("../"); // this entry lives one level under the site root, at /demo/

const app = document.getElementById("app")!;
const bg = document.getElementById("bg");
const bgPoker = document.getElementById("bg-poker");
if (bg) mountCourseBackground(bg);
if (bgPoker) mountPokerTableBackground(bgPoker);
mountBackgroundMusic(document.body);
initDesignOverrides();

function clear(): void {
  app.replaceChildren();
}

function start(mode: GameMode): void {
  renderGame(new DemoGameState(mode));
}

function renderGame(game: DemoGameState): void {
  clear();
  document.body.dataset.bg = game.mode === GameMode.GolfMode ? "golf" : "poker";
  const snap = game.snapshot();

  const screen = document.createElement("div");
  screen.className = "screen game";

  screen.appendChild(renderDemoScorecard(scoreDemoBoard(snap.board, game.mode), game.mode));

  const main = document.createElement("div");
  main.className = "play-area";

  const rail = document.createElement("aside");
  rail.className = "rail";

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

  const board = renderDemoBoard(game, {
    onPlace: (cell: Cell) => {
      game.place(cell);
      renderGame(game);
    },
  });

  main.append(rail, board);
  screen.appendChild(main);
  app.appendChild(screen);

  if (game.isOver) showEndPanel(game);
}

/** The single completed hand with the best result, plus its top 2 cards. */
function bestHand(
  score: ReturnType<typeof scoreDemoBoard>,
  completions: readonly DemoHandCompletion[],
  mode: GameMode,
): { handName: string; points: number; topCards: number[] } | null {
  const complete = score.hands.filter((h) => h.complete);
  if (complete.length === 0) return null;
  const golf = mode === GameMode.GolfMode;
  const top = complete.reduce((a, b) => ((golf ? b.points < a.points : b.points > a.points) ? b : a));
  const rec = completions.find((c) => c.hole === top.hole);
  return { handName: top.handName, points: top.points, topCards: rec?.topCards ?? [] };
}

// A static panel with two explicit buttons — not `main.ts`'s click-or-key
// dismiss overlay, since the promo link opens in a new tab and shouldn't
// also silently restart the demo in this one.
function showEndPanel(game: DemoGameState): void {
  const score = scoreDemoBoard(game.snapshot().board, game.mode);
  const best = bestHand(score, game.handCompletions, game.mode);

  const overlay = document.createElement("div");
  overlay.className = "overlay";
  const panel = document.createElement("div");
  panel.className = "end-panel wide";

  const h2 = document.createElement("h2");
  h2.textContent = "Demo Complete";
  panel.appendChild(h2);

  panel.appendChild(renderDemoScorecard(score, game.mode));

  if (best) {
    const stat = document.createElement("p");
    stat.className = "final-stat";
    const sign = best.points >= 0 ? "+" : "";
    stat.innerHTML = `Best hand: <strong>${best.handName}</strong>${
      best.topCards.length ? ` — ${best.topCards.map(cardLabel).join(" ")}` : ""
    } (${sign}${best.points})`;
    panel.appendChild(stat);
  }

  const promo = document.createElement("div");
  promo.className = "promo-cta";
  const promoText = document.createElement("p");
  promoText.textContent = "Liked this taste? The full game has two grids, 18 hands, and a live leaderboard.";
  const promoLink = document.createElement("a");
  promoLink.className = "promo-btn";
  promoLink.href = "https://www.strategictitans.ca";
  promoLink.target = "_blank";
  promoLink.rel = "noopener";
  promoLink.textContent = "Get the Full Game →";
  promo.append(promoText, promoLink);
  panel.appendChild(promo);

  const actions = document.createElement("div");
  actions.className = "demo-end-actions";
  const again = document.createElement("button");
  again.className = "mode-btn primary";
  again.innerHTML = `<span class="mode-label">Play Demo Again</span>`;
  again.addEventListener("click", () => {
    overlay.remove();
    showIntro();
  });
  actions.appendChild(again);
  panel.appendChild(actions);

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
  document.body.dataset.bg = "intro";
  app.appendChild(renderDemoIntro(start));
}

showIntro();
