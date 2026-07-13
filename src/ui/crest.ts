/**
 * The Strategic Titans crest — a faithful inline SVG stand-in for the real
 * logo, auto-swapping to /assets/logo.png (or .jpg) the moment that file is
 * present. Shared by the portal and the in-game intro screen.
 */

import { ASSET_BASE } from "./assetBase.js";

const CREST_SVG = `
<svg viewBox="0 0 200 200" class="crest-svg" aria-hidden="true">
  <defs>
    <path id="arc-top" d="M 30,100 a70,70 0 0,1 140,0" fill="none"/>
    <path id="arc-bot" d="M 170,108 a70,70 0 0,1 -140,0" fill="none"/>
  </defs>
  <!-- outer gold ring -->
  <circle cx="100" cy="100" r="97" fill="#c8a24a"/>
  <circle cx="100" cy="100" r="93" fill="#f0eadb"/>
  <!-- cream band -->
  <circle cx="100" cy="100" r="78" fill="#c8a24a"/>
  <circle cx="100" cy="100" r="76" fill="#ece5d0"/>
  <!-- arc text: STRATEGIC TITANS (top) -->
  <text font-family="Georgia,serif" font-weight="bold" font-size="15" fill="#1c3f6e"
        letter-spacing="3.6">
    <textPath href="#arc-top" startOffset="50%" text-anchor="middle">STRATEGIC TITANS</textPath>
  </text>
  <!-- arc text: CANADIAN BOARD GAME COMPANY (bottom) -->
  <text font-family="Georgia,serif" font-weight="bold" font-size="10.2" fill="#1c3f6e"
        letter-spacing="1.8">
    <textPath href="#arc-bot" startOffset="50%" text-anchor="middle">CANADIAN BOARD GAME COMPANY</textPath>
  </text>
  <!-- gold dot separators at 3 and 9 o'clock -->
  <circle cx="22" cy="100" r="3" fill="#c8a24a"/>
  <circle cx="178" cy="100" r="3" fill="#c8a24a"/>
  <!-- Spartan helmet (facing right) -->
  <g transform="translate(100,88)">
    <!-- plume / crest -->
    <path d="M-8,-42 C-6,-50 2,-54 10,-52 C16,-50 20,-44 20,-38
            C20,-30 16,-22 12,-16 L6,-20 C10,-26 12,-32 12,-38
            C12,-42 8,-46 4,-46 C0,-46 -4,-44 -6,-40Z"
          fill="#c8a24a" stroke="#b8912f" stroke-width="0.5"/>
    <!-- helmet dome -->
    <path d="M-22,-20 C-22,-38 -10,-50 8,-50 C22,-50 30,-40 30,-24
            C30,-16 26,-8 20,-2 L16,-6 C22,-12 24,-18 24,-24
            C24,-36 18,-44 8,-44 C-4,-44 -16,-36 -16,-20Z"
          fill="#1c3f6e" stroke="#c8a24a" stroke-width="1"/>
    <!-- face guard / cheek piece -->
    <path d="M-16,-20 C-18,-12 -20,0 -16,12 C-12,24 -4,30 4,32
            L8,28 C2,26 -6,20 -10,12 C-14,2 -12,-10 -10,-18Z"
          fill="#1c3f6e" stroke="#c8a24a" stroke-width="0.8"/>
    <!-- nose guard -->
    <path d="M-10,-18 L-14,-4 L-10,2 L-6,-4Z" fill="#1c3f6e"/>
    <!-- eye slit -->
    <path d="M-6,-14 L20,-10 L20,-6 L-8,-10Z" fill="#ece5d0" opacity="0.9"/>
    <!-- gold trim line -->
    <path d="M-16,-20 C-16,-36 -4,-44 8,-44" fill="none" stroke="#c8a24a" stroke-width="2"/>
  </g>
  <!-- red maple leaf -->
  <g transform="translate(100,152)">
    <path d="M0,-10 L2,-4 L8,-6 L6,0 L12,2 L6,4 L8,10 L4,8 L2,14 L0,10
            L-2,14 L-4,8 L-8,10 L-6,4 L-12,2 L-6,0 L-8,-6 L-2,-4Z"
          fill="#d63a2f"/>
    <line x1="0" y1="10" x2="0" y2="16" stroke="#d63a2f" stroke-width="1.5"/>
  </g>
  <!-- gold scroll flourishes beside the leaf -->
  <path d="M78,152 C82,148 86,150 84,154 C82,158 76,158 74,154" fill="none" stroke="#c8a24a" stroke-width="1.2"/>
  <path d="M122,152 C118,148 114,150 116,154 C118,158 124,158 126,154" fill="none" stroke="#c8a24a" stroke-width="1.2"/>
</svg>`;

export function crest(): HTMLElement {
  const el = document.createElement("div");
  el.className = "crest";
  el.innerHTML = CREST_SVG;
  const swap = (src: string) => {
    const img = new Image();
    img.onload = () => {
      el.innerHTML = "";
      img.className = "crest-img";
      el.appendChild(img);
    };
    img.src = src;
    return img;
  };
  const first = swap(`${ASSET_BASE}assets/logo.png`);
  first.onerror = () => swap(`${ASSET_BASE}assets/logo.jpg`);
  return el;
}
