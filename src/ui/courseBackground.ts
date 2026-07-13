/**
 * Photorealistic top-down golf-course illustration used as the game background
 * (Golf mode, and dimmed behind the intro). Pure inline SVG — self-contained,
 * scalable, no external assets. Uses SVG filters (feTurbulence, feDisplacement,
 * feDiffuseLighting) for organic grass/water/sand textures.
 *
 * A raster override dropped into public/assets/course.(jpg|png|webp) is picked
 * up automatically, mirroring the card/logo art loader; a missing file simply
 * leaves the SVG in place.
 */

import { ASSET_BASE } from "./assetBase.js";

function roughStripes(): string {
  let s = "";
  for (let i = 0; i < 18; i++) {
    const w = 44 + (i % 3) * 8;
    const op = 0.03 + (i % 5) * 0.01;
    s += `<rect x="${i * 90 - 10}" y="0" width="${w}" height="900" fill="#fff" opacity="${op}"/>`;
  }
  return s;
}

function fairway(d: string, w: number): string {
  return `<path d="${d}" stroke="#3d6e40" stroke-width="${w + 4}" fill="none" stroke-linecap="round" opacity="0.6"/>
    <path d="${d}" stroke="url(#fairwayFill)" stroke-width="${w}" fill="none" stroke-linecap="round" filter="url(#fairwayStripe)"/>
    <path d="${d}" stroke="#6cc47a" stroke-width="${Math.round(w * 0.3)}" fill="none" stroke-linecap="round" opacity="0.35"/>`;
}

function greenBlob(cx: number, cy: number, rx: number, ry: number): string {
  const wobbles = [0.02, -0.03, 0.04, -0.02, 0.03, -0.04, 0.02, -0.01];
  const pts = 8;
  const points = Array.from({ length: pts }, (_, i) => {
    const a = (i / pts) * Math.PI * 2;
    const w = 1 + (wobbles[i] ?? 0);
    return { x: cx + rx * w * Math.cos(a), y: cy + ry * w * Math.sin(a) };
  });
  let d = `M${points[0]!.x.toFixed(1)} ${points[0]!.y.toFixed(1)}`;
  for (let i = 0; i < pts; i++) {
    const p0 = points[i]!;
    const p1 = points[(i + 1) % pts]!;
    const p2 = points[(i + 2) % pts]!;
    const prev = points[(i - 1 + pts) % pts]!;
    const cpx1 = p0.x + (p1.x - prev.x) / 4;
    const cpy1 = p0.y + (p1.y - prev.y) / 4;
    const cpx2 = p1.x - (p2.x - p0.x) / 4;
    const cpy2 = p1.y - (p2.y - p0.y) / 4;
    d += ` C${cpx1.toFixed(1)} ${cpy1.toFixed(1)} ${cpx2.toFixed(1)} ${cpy2.toFixed(1)} ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  }
  d += "Z";
  return d;
}

function green(cx: number, cy: number, rx: number, ry: number): string {
  const blob = greenBlob(cx, cy, rx, ry);
  const fx = cx + rx * 0.3;
  return `<g>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx + 6}" ry="${ry + 6}" fill="#5c9e52" opacity="0.7"/>
    <path d="${blob}" fill="url(#greenSurface)"/>
    <path d="${blob}" fill="none" stroke="#5c9e52" stroke-width="2" opacity="0.6"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx * 0.7}" ry="${ry * 0.7}" fill="none" stroke="#5eb85a" stroke-width="1.5" opacity="0.1"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx * 0.4}" ry="${ry * 0.4}" fill="none" stroke="#5eb85a" stroke-width="1.5" opacity="0.08"/>
    <ellipse cx="${cx - rx * 0.2}" cy="${cy - ry * 0.2}" rx="${rx * 0.35}" ry="${ry * 0.35}" fill="#fff" opacity="0.05"/>
    <line x1="${fx + 2}" y1="${cy}" x2="${fx + 2}" y2="${cy - ry - 18}" stroke="#1a3a22" stroke-width="2" opacity="0.3"/>
    <line x1="${fx}" y1="${cy}" x2="${fx}" y2="${cy - ry - 18}" stroke="#f4efe2" stroke-width="2"/>
    <path d="M${fx} ${cy - ry - 18} l14 5 l-14 5z" fill="#d33a2c"/>
    <circle cx="${cx - rx * 0.2}" cy="${cy + ry * 0.1}" r="3" fill="#1a1a1a"/>
  </g>`;
}

function bunkerBlob(cx: number, cy: number, rx: number, ry: number, rot: number): string {
  const wobbles = [0.05, -0.06, 0.08, -0.04, 0.06, -0.07, 0.03, -0.05];
  const pts = 8;
  const points = Array.from({ length: pts }, (_, i) => {
    const a = (i / pts) * Math.PI * 2;
    const w = 1 + (wobbles[i] ?? 0);
    return { x: cx + rx * w * Math.cos(a), y: cy + ry * w * Math.sin(a) };
  });
  let d = `M${points[0]!.x.toFixed(1)} ${points[0]!.y.toFixed(1)}`;
  for (let i = 0; i < pts; i++) {
    const p0 = points[i]!;
    const p1 = points[(i + 1) % pts]!;
    const p2 = points[(i + 2) % pts]!;
    const prev = points[(i - 1 + pts) % pts]!;
    const cpx1 = p0.x + (p1.x - prev.x) / 4;
    const cpy1 = p0.y + (p1.y - prev.y) / 4;
    const cpx2 = p1.x - (p2.x - p0.x) / 4;
    const cpy2 = p1.y - (p2.y - p0.y) / 4;
    d += ` C${cpx1.toFixed(1)} ${cpy1.toFixed(1)} ${cpx2.toFixed(1)} ${cpy2.toFixed(1)} ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  }
  d += "Z";
  const t = rot ? ` transform="rotate(${rot} ${cx} ${cy})"` : "";
  return `<ellipse cx="${cx + 3}" cy="${cy + 3}" rx="${rx}" ry="${ry}" fill="#8a7a4a" opacity="0.25"${t}/>
    <path d="${d}" fill="url(#sandFill)" filter="url(#sandNoise)"${t}/>
    <path d="${d}" fill="none" stroke="#b8a060" stroke-width="2" opacity="0.5"${t}/>`;
}

function trees(cx: number, cy: number, n: number): string {
  let shadows = "";
  let canopy = "";
  for (let i = 0; i < n; i++) {
    const dx = (i - n / 2) * 28 + (i % 2) * 12;
    const dy = (i % 3) * 16 - 14;
    const r = 22 + (i % 3) * 7;
    const scale = 0.85 + ((i * 7) % 5) * 0.1;
    const R = r * scale;
    const tx = cx + dx;
    const ty = cy + dy;
    shadows += `<ellipse cx="${tx + 5}" cy="${ty + 10}" rx="${R * 1.1}" ry="${R * 0.6}" fill="#0a1f12" opacity="0.25"/>`;
    canopy += `<circle cx="${tx + 2}" cy="${ty + 2}" r="${R}" fill="#1e5a2e"/>`;
    canopy += `<circle cx="${tx}" cy="${ty}" r="${R * 0.92}" fill="#2c6b3c"/>`;
    canopy += `<circle cx="${tx - R * 0.2}" cy="${ty - R * 0.2}" r="${R * 0.65}" fill="#3f8a4f"/>`;
    canopy += `<circle cx="${tx - R * 0.35}" cy="${ty - R * 0.35}" r="${R * 0.35}" fill="#4f9a5a" opacity="0.7"/>`;
  }
  return shadows + canopy;
}

const WATER_PATH = "M-40 240 C200 210 320 280 420 380 C480 440 520 480 560 500 C620 530 580 660 640 740 C680 800 530 870 -40 900Z";
const WATER_SHORE = "M-40 240 C200 210 320 280 420 380 C480 440 520 480 560 500 C620 530 580 660 640 740 C680 800 530 870 -40 900";

const FW_A = "M300 120 C520 160 700 120 900 200 C1080 270 1120 430 1000 520";
const FW_B = "M1360 140 C1180 240 1240 430 1420 520 C1520 570 1520 720 1360 780";
const FW_C = "M820 640 C980 700 1160 660 1300 760";
const FW_D = "M540 300 C640 420 620 560 760 620";

export function courseBackgroundSVG(): string {
  return `
<svg class="course-svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <!-- gradients -->
    <radialGradient id="rough" cx="50%" cy="38%" r="78%">
      <stop offset="0%" stop-color="#4a8c58"/>
      <stop offset="25%" stop-color="#3a7d4c"/>
      <stop offset="50%" stop-color="#326e43"/>
      <stop offset="78%" stop-color="#28593a"/>
      <stop offset="100%" stop-color="#1e4530"/>
    </radialGradient>
    <radialGradient id="roughPatchA" cx="25%" cy="60%" r="30%">
      <stop offset="0%" stop-color="#3d7a3a" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#3d7a3a" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="roughPatchB" cx="75%" cy="30%" r="25%">
      <stop offset="0%" stop-color="#4e8848" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#4e8848" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="fairwayFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#5fb86c"/>
      <stop offset="40%" stop-color="#4da55a"/>
      <stop offset="60%" stop-color="#4da55a"/>
      <stop offset="100%" stop-color="#408d4c"/>
    </linearGradient>
    <radialGradient id="waterDeep" cx="30%" cy="60%" r="70%">
      <stop offset="0%" stop-color="#164a6e"/>
      <stop offset="40%" stop-color="#1f5f90"/>
      <stop offset="70%" stop-color="#2f7fb8"/>
      <stop offset="95%" stop-color="#5da4c8"/>
      <stop offset="100%" stop-color="#7bbad0" stop-opacity="0.7"/>
    </radialGradient>
    <radialGradient id="greenSurface" cx="45%" cy="45%" r="60%">
      <stop offset="0%" stop-color="#8ed47e"/>
      <stop offset="60%" stop-color="#6fb966"/>
      <stop offset="100%" stop-color="#5aa856"/>
    </radialGradient>
    <radialGradient id="sandFill" cx="40%" cy="40%" r="65%">
      <stop offset="0%" stop-color="#f0e4c0"/>
      <stop offset="70%" stop-color="#e0cc96"/>
      <stop offset="100%" stop-color="#c9b478"/>
    </radialGradient>

    <!-- filters -->
    <filter id="grassNoise" x="0%" y="0%" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="4" seed="2" result="noise"/>
      <feColorMatrix type="saturate" values="0" in="noise" result="grey"/>
      <feBlend in="SourceGraphic" in2="grey" mode="soft-light"/>
    </filter>
    <filter id="fairwayStripe" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="turbulence" baseFrequency="0.005 0.12" numOctaves="1" seed="7" result="stripe"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 6 -2.5" in="stripe" result="mask"/>
      <feFlood flood-color="#ffffff" flood-opacity="0.06" result="white"/>
      <feComposite in="white" in2="mask" operator="in" result="bands"/>
      <feComposite in="SourceGraphic" in2="bands" operator="over"/>
    </filter>
    <filter id="waterRipple" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="turbulence" baseFrequency="0.015 0.04" numOctaves="3" seed="42" result="ripple"/>
      <feDisplacementMap in="SourceGraphic" in2="ripple" scale="6" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <filter id="waterHighlight" x="0%" y="0%" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="11" result="n"/>
      <feDiffuseLighting in="n" lighting-color="#ffffff" surfaceScale="1.5" result="light">
        <feDistantLight azimuth="225" elevation="55"/>
      </feDiffuseLighting>
      <feComposite in="light" in2="SourceGraphic" operator="in" result="masked"/>
      <feBlend in="SourceGraphic" in2="masked" mode="screen"/>
    </filter>
    <filter id="sandNoise" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="3" seed="99" result="grain"/>
      <feColorMatrix type="saturate" values="0" in="grain" result="grey"/>
      <feBlend in="SourceGraphic" in2="grey" mode="overlay"/>
    </filter>
    <filter id="canopyNoise" x="-15%" y="-15%" width="130%" height="130%">
      <feTurbulence type="fractalNoise" baseFrequency="0.08" numOctaves="4" seed="33" result="t"/>
      <feDisplacementMap in="SourceGraphic" in2="t" scale="4" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <filter id="treeShadowDeep" x="-50%" y="-40%" width="200%" height="200%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="8" result="blurA"/>
      <feOffset dx="5" dy="10" in="blurA" result="offA"/>
      <feFlood flood-color="#0a1f12" flood-opacity="0.5" result="darkFlood"/>
      <feComposite in="darkFlood" in2="offA" operator="in" result="shadow"/>
      <feMerge><feMergeNode in="shadow"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="shoreSoft" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="8"/>
    </filter>
  </defs>

  <!-- base rough with grass texture -->
  <rect width="1600" height="900" fill="url(#rough)" filter="url(#grassNoise)"/>
  <rect width="1600" height="900" fill="url(#roughPatchA)"/>
  <rect width="1600" height="900" fill="url(#roughPatchB)"/>

  <!-- mowing stripes with variation -->
  <g>${roughStripes()}</g>

  <!-- water: coastline lake with shore, ripples, and specular highlights -->
  <path d="${WATER_SHORE}" fill="none" stroke="#c9b478" stroke-width="40" opacity="0.35" filter="url(#shoreSoft)"/>
  <path d="${WATER_PATH}" fill="url(#waterDeep)" opacity="0.92" filter="url(#waterRipple)"/>
  <path d="${WATER_PATH}" fill="url(#waterDeep)" opacity="0.25" filter="url(#waterHighlight)"/>
  <path d="${WATER_SHORE}" fill="none" stroke="#c9b478" stroke-width="12" opacity="0.35"/>
  <path d="${WATER_SHORE}" fill="none" stroke="#8cba5e" stroke-width="4" opacity="0.4"/>

  <!-- fairways: three-layer rendering (shadow, textured fill, highlight) -->
  <g stroke-linecap="round">
    ${fairway(FW_A, 88)}
    ${fairway(FW_B, 80)}
    ${fairway(FW_C, 72)}
    ${fairway(FW_D, 64)}
  </g>

  <!-- putting greens with flags -->
  ${green(1000, 520, 62, 44)}
  ${green(1360, 780, 54, 40)}
  ${green(1300, 760, 50, 36)}
  ${green(760, 620, 52, 38)}
  ${green(900, 200, 56, 40)}

  <!-- bunkers with sand texture -->
  <g>
    ${bunkerBlob(940, 470, 46, 28, -18)}
    ${bunkerBlob(1300, 470, 40, 24, 24)}
    ${bunkerBlob(700, 560, 34, 22, 0)}
    ${bunkerBlob(1240, 720, 30, 20, -12)}
    ${bunkerBlob(860, 250, 30, 18, 0)}
  </g>

  <!-- cart paths: double-stroke for depth -->
  <g fill="none" stroke-linecap="round">
    <path d="M180 820 C420 760 520 600 700 560 C900 512 980 470 1000 520" stroke="#a89870" stroke-width="8" opacity="0.4"/>
    <path d="M180 820 C420 760 520 600 700 560 C900 512 980 470 1000 520" stroke="#d8cba6" stroke-width="5" opacity="0.7"/>
    <path d="M1000 520 C1120 560 1240 640 1300 760" stroke="#a89870" stroke-width="8" opacity="0.4"/>
    <path d="M1000 520 C1120 560 1240 640 1300 760" stroke="#d8cba6" stroke-width="5" opacity="0.7"/>
    <path d="M1360 200 C1300 360 1360 520 1420 520" stroke="#a89870" stroke-width="8" opacity="0.4"/>
    <path d="M1360 200 C1300 360 1360 520 1420 520" stroke="#d8cba6" stroke-width="5" opacity="0.7"/>
  </g>

  <!-- tree clusters with ground shadows and canopy displacement -->
  <g filter="url(#shoreSoft)">
    ${trees(190, 180, 5).split("</ellipse>").filter(s => s.includes("shadow")).join("</ellipse>")}
  </g>
  <g filter="url(#treeShadowDeep)">
    <g filter="url(#canopyNoise)">
      ${trees(190, 180, 5)}
      ${trees(1480, 340, 4)}
      ${trees(1120, 820, 5)}
      ${trees(430, 560, 4)}
      ${trees(1250, 120, 3)}
      ${trees(640, 760, 4)}
    </g>
  </g>
</svg>`;
}

function rasterCandidates(): string[] {
  return [`${ASSET_BASE}assets/course.jpg`, `${ASSET_BASE}assets/course.png`, `${ASSET_BASE}assets/course.webp`];
}

/** Mount the course once into `target`; probe for a raster override. */
export function mountCourseBackground(target: HTMLElement): void {
  target.innerHTML = courseBackgroundSVG();
  for (const url of rasterCandidates()) {
    const img = new Image();
    img.onload = () => {
      target.style.backgroundImage = `url("${url}")`;
      target.classList.add("has-course-img");
    };
    img.src = url;
  }
}
