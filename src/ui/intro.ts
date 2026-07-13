/**
 * The branded intro screen:
 *   "www.strategictitans.ca Presents"  →  PokerSt8ts wordmark  →  mode select.
 * The crest auto-swaps to /assets/logo.png when that file is present.
 */

import { GameMode } from "../engine/index.js";
import { crest } from "./crest.js";

export function renderIntro(
  onStart: (mode: GameMode, opponents: number) => void,
  onLeaderboard?: () => void,
): HTMLElement {
  const screen = document.createElement("div");
  screen.className = "screen intro";

  let opponents = 3;

  const home = document.createElement("a");
  home.className = "home-link";
  home.href = "../";
  home.textContent = "⌂ Home";
  home.setAttribute("aria-label", "Back to PokerSt8ts home");

  const presents = document.createElement("a");
  presents.className = "presents";
  presents.href = "https://www.strategictitans.ca";
  presents.target = "_blank";
  presents.rel = "noopener";
  presents.innerHTML = `<span class="site">www.strategictitans.ca</span> <span class="presents-word">Presents</span>`;

  const wordmark = document.createElement("h1");
  wordmark.className = "wordmark";
  wordmark.innerHTML = `Poker<span class="st8">St8ts</span>`;

  const tagline = document.createElement("p");
  tagline.className = "tagline";
  tagline.textContent = "Build 18 poker hands across two grids. One card at a time.";

  // opponent chooser (1–8 greedy AI)
  const oppWrap = document.createElement("div");
  oppWrap.className = "opp-select";
  const oppLabel = document.createElement("span");
  oppLabel.className = "opp-label";
  const valueSpan = () => `<b>${opponents}</b> AI opponent${opponents === 1 ? "" : "s"}`;
  oppLabel.innerHTML = valueSpan();
  const stepper = document.createElement("div");
  stepper.className = "stepper";
  const minus = document.createElement("button");
  minus.className = "step-btn";
  minus.textContent = "−";
  minus.setAttribute("aria-label", "fewer opponents");
  const plus = document.createElement("button");
  plus.className = "step-btn";
  plus.textContent = "+";
  plus.setAttribute("aria-label", "more opponents");
  const sync = () => {
    oppLabel.innerHTML = valueSpan();
    minus.disabled = opponents <= 1;
    plus.disabled = opponents >= 8;
  };
  minus.addEventListener("click", () => { opponents = Math.max(1, opponents - 1); sync(); });
  plus.addEventListener("click", () => { opponents = Math.min(8, opponents + 1); sync(); });
  stepper.append(minus, oppLabel, plus);
  oppWrap.appendChild(stepper);
  sync();

  const modes = document.createElement("div");
  modes.className = "mode-select";
  const makeBtn = (label: string, sub: string, mode: GameMode, primary = false) => {
    const b = document.createElement("button");
    b.className = "mode-btn" + (primary ? " primary" : "");
    b.innerHTML = `<span class="mode-label">${label}</span><span class="mode-sub">${sub}</span>`;
    b.addEventListener("click", () => onStart(mode, opponents));
    return b;
  };
  modes.appendChild(makeBtn("Poker Points", "Score points per hand — chase a high round.", GameMode.PokerStraightsMode, true));
  modes.appendChild(makeBtn("Golf", "Par & strokes — chase a low round.", GameMode.GolfMode));

  screen.append(home, presents, crest(), wordmark, tagline, oppWrap, modes);

  if (onLeaderboard) {
    const lbBtn = document.createElement("button");
    lbBtn.className = "lb-link";
    lbBtn.innerHTML = "🏆 Leaderboard";
    lbBtn.addEventListener("click", () => onLeaderboard());
    screen.appendChild(lbBtn);
  }
  return screen;
}
