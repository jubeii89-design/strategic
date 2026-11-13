/**
 * The demo's branded intro screen — adapted from `src/ui/intro.ts` with a
 * shortened tagline and a DEMO badge, no leaderboard link.
 */

import { GameMode } from "../engine/index.js";
import { crest } from "../ui/crest.js";

export function renderDemoIntro(onStart: (mode: GameMode) => void): HTMLElement {
  const screen = document.createElement("div");
  screen.className = "screen intro";

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
  wordmark.innerHTML = `Poker<span class="st8">St8ts</span> <span class="demo-badge">DEMO</span>`;

  const tagline = document.createElement("p");
  tagline.className = "tagline";
  tagline.textContent = "A 6-hole taste of PokerSt8ts — build 6 poker hands on a mini grid, one card at a time.";

  const modes = document.createElement("div");
  modes.className = "mode-select";
  const makeBtn = (label: string, sub: string, mode: GameMode, primary = false) => {
    const b = document.createElement("button");
    b.className = "mode-btn" + (primary ? " primary" : "");
    b.innerHTML = `<span class="mode-label">${label}</span><span class="mode-sub">${sub}</span>`;
    b.addEventListener("click", () => onStart(mode));
    return b;
  };
  modes.appendChild(makeBtn("PokerStr8ts", "Score points per hand — chase a high round.", GameMode.PokerStraightsMode, true));
  modes.appendChild(makeBtn("Golf", "Par & strokes — chase a low round.", GameMode.GolfMode));

  screen.append(home, presents, crest(), wordmark, tagline, modes);
  return screen;
}
