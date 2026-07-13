/**
 * Top-down casino poker table background for Poker Points mode.
 * Pure inline SVG — self-contained, no external assets.
 * A raster override at public/assets/poker-table.(jpg|png|webp) replaces
 * the SVG automatically, mirroring the golf course art loader.
 */

import { ASSET_BASE } from "./assetBase.js";

function seatMarkers(): string {
  const seats = [
    { x: 800, y: 180 },
    { x: 380, y: 220 },
    { x: 220, y: 450 },
    { x: 380, y: 680 },
    { x: 800, y: 720 },
    { x: 1220, y: 680 },
    { x: 1380, y: 450 },
    { x: 1220, y: 220 },
  ];
  return seats
    .map(
      (s) =>
        `<ellipse cx="${s.x}" cy="${s.y}" rx="48" ry="22" fill="#1e5a30" opacity="0.12"/>`,
    )
    .join("\n    ");
}

function chipStacks(): string {
  const chips = [
    { x: 800, y: 260 },
    { x: 440, y: 300 },
    { x: 310, y: 450 },
    { x: 440, y: 600 },
    { x: 800, y: 640 },
    { x: 1160, y: 600 },
    { x: 1290, y: 450 },
    { x: 1160, y: 300 },
  ];
  return chips
    .map((c) => {
      const colors = ["#cc3333", "#3366cc", "#228833", "#ccaa22"];
      const color = colors[Math.abs(c.x * 7 + c.y * 13) % colors.length]!;
      return `<g opacity="0.08">
      <ellipse cx="${c.x}" cy="${c.y + 2}" rx="14" ry="7" fill="#111"/>
      <ellipse cx="${c.x}" cy="${c.y}" rx="14" ry="7" fill="${color}"/>
      <ellipse cx="${c.x}" cy="${c.y - 3}" rx="14" ry="7" fill="${color}" opacity="0.7"/>
      <ellipse cx="${c.x}" cy="${c.y - 3}" rx="10" ry="5" fill="#fff" opacity="0.3"/>
    </g>`;
    })
    .join("\n    ");
}

export function pokerTableSVG(): string {
  return `
<svg class="table-svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <!-- gradients -->
    <radialGradient id="ptFloor" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="#2a1810"/>
      <stop offset="40%" stop-color="#1e120c"/>
      <stop offset="100%" stop-color="#0e0a07"/>
    </radialGradient>
    <radialGradient id="ptRail" cx="50%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#5c3d20"/>
      <stop offset="30%" stop-color="#4a3018"/>
      <stop offset="60%" stop-color="#3a2515"/>
      <stop offset="100%" stop-color="#2a1a0e"/>
    </radialGradient>
    <linearGradient id="ptRailHighlight" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#7a5530" stop-opacity="0.6"/>
      <stop offset="50%" stop-color="#5c3d20" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="#7a5530" stop-opacity="0.4"/>
    </linearGradient>
    <radialGradient id="ptFelt" cx="50%" cy="42%" r="62%">
      <stop offset="0%" stop-color="#2d8245"/>
      <stop offset="35%" stop-color="#267038"/>
      <stop offset="65%" stop-color="#22683f"/>
      <stop offset="100%" stop-color="#1a4f30"/>
    </radialGradient>
    <radialGradient id="ptFeltVignette" cx="50%" cy="42%" r="55%">
      <stop offset="0%" stop-color="#000" stop-opacity="0"/>
      <stop offset="70%" stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.25"/>
    </radialGradient>
    <radialGradient id="ptCasinoLight" cx="50%" cy="30%" r="50%">
      <stop offset="0%" stop-color="#fff" stop-opacity="0.06"/>
      <stop offset="60%" stop-color="#fff" stop-opacity="0.02"/>
      <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>

    <!-- filters -->
    <filter id="ptFloorTex" x="0%" y="0%" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.03 0.08" numOctaves="3" seed="5" result="grain"/>
      <feColorMatrix type="saturate" values="0" in="grain" result="grey"/>
      <feBlend in="SourceGraphic" in2="grey" mode="soft-light"/>
    </filter>
    <filter id="ptLeatherTex" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.4" numOctaves="3" seed="17" result="grain"/>
      <feColorMatrix type="saturate" values="0" in="grain" result="grey"/>
      <feBlend in="SourceGraphic" in2="grey" mode="overlay"/>
    </filter>
    <filter id="ptFeltTex" x="-2%" y="-2%" width="104%" height="104%">
      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" seed="42" result="weave"/>
      <feColorMatrix type="saturate" values="0" in="weave" result="grey"/>
      <feBlend in="SourceGraphic" in2="grey" mode="soft-light"/>
    </filter>
    <filter id="ptFeltLight" x="0%" y="0%" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="7" result="n"/>
      <feDiffuseLighting in="n" lighting-color="#ffffff" surfaceScale="0.8" result="light">
        <feDistantLight azimuth="200" elevation="65"/>
      </feDiffuseLighting>
      <feComposite in="light" in2="SourceGraphic" operator="in" result="masked"/>
      <feBlend in="SourceGraphic" in2="masked" mode="screen"/>
    </filter>
    <filter id="ptTableShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="30"/>
    </filter>
    <filter id="ptRailShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6"/>
    </filter>
  </defs>

  <!-- casino floor with wood/carpet texture -->
  <rect width="1600" height="900" fill="url(#ptFloor)" filter="url(#ptFloorTex)"/>

  <!-- table drop shadow -->
  <ellipse cx="800" cy="460" rx="690" ry="350" fill="#000" opacity="0.55" filter="url(#ptTableShadow)"/>

  <!-- padded rail (leather bolster) -->
  <rect x="110" y="110" width="1380" height="680" rx="340" ry="340"
        fill="url(#ptRail)" filter="url(#ptLeatherTex)"/>
  <!-- rail inner shadow edge -->
  <rect x="115" y="115" width="1370" height="670" rx="335" ry="335"
        fill="none" stroke="#1a0e08" stroke-width="3" opacity="0.4"/>
  <!-- rail top highlight (light catching the padded edge) -->
  <rect x="112" y="112" width="1376" height="676" rx="338" ry="338"
        fill="none" stroke="url(#ptRailHighlight)" stroke-width="4"/>
  <!-- rail stitching detail -->
  <rect x="120" y="120" width="1360" height="660" rx="330" ry="330"
        fill="none" stroke="#4a3018" stroke-width="1" stroke-dasharray="8 6" opacity="0.3"/>

  <!-- inner shadow where felt meets rail -->
  <rect x="144" y="144" width="1312" height="612" rx="306" ry="306"
        fill="none" stroke="#0a2010" stroke-width="8" opacity="0.3" filter="url(#ptRailShadow)"/>

  <!-- felt playing surface -->
  <rect x="148" y="148" width="1304" height="604" rx="302" ry="302"
        fill="url(#ptFelt)" filter="url(#ptFeltTex)"/>

  <!-- felt specular highlight from overhead casino lights -->
  <rect x="148" y="148" width="1304" height="604" rx="302" ry="302"
        fill="url(#ptFelt)" opacity="0.3" filter="url(#ptFeltLight)"/>

  <!-- overhead light glow on felt -->
  <rect x="148" y="148" width="1304" height="604" rx="302" ry="302"
        fill="url(#ptCasinoLight)"/>

  <!-- felt surface vignette -->
  <rect x="148" y="148" width="1304" height="604" rx="302" ry="302"
        fill="url(#ptFeltVignette)"/>

  <!-- table markings (very subtle) -->
  <g>
    <!-- betting line -->
    <rect x="220" y="218" width="1160" height="464" rx="232" ry="232"
          fill="none" stroke="#2d8245" stroke-width="2.5" opacity="0.15"/>

    <!-- dealer area: semicircle at top-center -->
    <path d="M720 168 A80 40 0 0 1 880 168" fill="none" stroke="#2d8245" stroke-width="2" opacity="0.12"/>
    <!-- dealer chip tray -->
    <rect x="755" y="158" width="90" height="22" rx="6" fill="#163d24" opacity="0.2"/>
    <rect x="757" y="160" width="86" height="18" rx="5" fill="none" stroke="#1e5a30" stroke-width="1" opacity="0.15"/>

    <!-- center logo area (subtle circle) -->
    <circle cx="800" cy="450" r="55" fill="none" stroke="#2d8245" stroke-width="1.5" opacity="0.08"/>
    <circle cx="800" cy="450" r="35" fill="#1e5a30" opacity="0.06"/>

    <!-- player seat markers around the perimeter -->
    ${seatMarkers()}

    <!-- decorative chip stacks near seats -->
    ${chipStacks()}
  </g>

  <!-- subtle gold trim line on the inner rail edge -->
  <rect x="146" y="146" width="1308" height="608" rx="304" ry="304"
        fill="none" stroke="#8a6a3a" stroke-width="1.5" opacity="0.15"/>
</svg>`;
}

function rasterCandidates(): string[] {
  return [
    `${ASSET_BASE}assets/poker-table.jpg`,
    `${ASSET_BASE}assets/poker-table.png`,
    `${ASSET_BASE}assets/poker-table.webp`,
  ];
}

export function mountPokerTableBackground(target: HTMLElement): void {
  target.innerHTML = pokerTableSVG();
  for (const url of rasterCandidates()) {
    const img = new Image();
    img.onload = () => {
      target.style.backgroundImage = `url("${url}")`;
      target.classList.add("has-poker-img");
    };
    img.src = url;
  }
}
