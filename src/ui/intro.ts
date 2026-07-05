/**
 * The branded intro screen:
 *   "www.strategictitans.ca Presents"  →  PokerSt8ts wordmark  →  mode select.
 * The crest auto-swaps to /assets/logo.png when that file is present.
 */

import { GameMode } from "../engine/index.js";

const CREST_SVG = `
<svg viewBox="0 0 200 200" class="crest-svg" aria-hidden="true">
  <circle cx="100" cy="100" r="96" fill="#f4efe2" stroke="#c8a24a" stroke-width="4"/>
  <circle cx="100" cy="100" r="70" fill="none" stroke="#c8a24a" stroke-width="2"/>
  <path d="M100 46c-20 0-38 14-38 40 0 20 14 34 30 40l-4 12h24l-4-12c16-6 30-20 30-40 0-26-18-40-38-40z"
        fill="#1c3f6e"/>
  <path d="M120 66c8 6 12 16 12 28l-14-4z" fill="#c8a24a"/>
  <path d="M100 150l6 12 8-6-4 12h-20l-4-12 8 6z" fill="#d33a2c"/>
</svg>`;

function crest(): HTMLElement {
  const el = document.createElement("div");
  el.className = "crest";
  el.innerHTML = CREST_SVG;
  const img = new Image();
  img.onload = () => {
    el.innerHTML = "";
    img.className = "crest-img";
    el.appendChild(img);
  };
  img.src = "assets/logo.png";
  return el;
}

export function renderIntro(onStart: (mode: GameMode) => void): HTMLElement {
  const screen = document.createElement("div");
  screen.className = "screen intro";

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

  const modes = document.createElement("div");
  modes.className = "mode-select";
  const makeBtn = (label: string, sub: string, mode: GameMode, primary = false) => {
    const b = document.createElement("button");
    b.className = "mode-btn" + (primary ? " primary" : "");
    b.innerHTML = `<span class="mode-label">${label}</span><span class="mode-sub">${sub}</span>`;
    b.addEventListener("click", () => onStart(mode));
    return b;
  };
  modes.appendChild(makeBtn("Poker Points", "Score points per hand — chase a high round.", GameMode.PokerStraightsMode, true));
  modes.appendChild(makeBtn("Golf", "Par & strokes — chase a low round.", GameMode.GolfMode));

  screen.append(presents, crest(), wordmark, tagline, modes);
  return screen;
}
