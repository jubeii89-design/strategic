/**
 * Hand-authored top-down golf-course illustration used as the game background
 * (Golf mode, and dimmed behind the intro). Pure inline SVG — self-contained,
 * scalable, no external assets. A raster override dropped into
 * public/assets/course.(jpg|png|webp) is picked up automatically, mirroring
 * the card/logo art loader; a missing file simply leaves the SVG in place.
 *
 * Muted tones keep the white cards and the scorecard readable on top.
 */

/** One stylized aerial course as an SVG string (viewBox 1600×900, cover-scaled). */
export function courseBackgroundSVG(): string {
  return `
<svg class="course-svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <radialGradient id="rough" cx="50%" cy="38%" r="75%">
      <stop offset="0%" stop-color="#3a7d4c"/>
      <stop offset="55%" stop-color="#2f6b41"/>
      <stop offset="100%" stop-color="#245234"/>
    </radialGradient>
    <linearGradient id="water" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#2f7fb8"/>
      <stop offset="100%" stop-color="#1f5f90"/>
    </linearGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="4"/>
    </filter>
    <filter id="treeShadow" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="6" stdDeviation="5" flood-color="#12331f" flood-opacity="0.5"/>
    </filter>
  </defs>

  <!-- rough / base grass -->
  <rect width="1600" height="900" fill="url(#rough)"/>

  <!-- mowing stripes -->
  <g opacity="0.06" fill="#ffffff">
    ${Array.from({ length: 16 }, (_, i) => `<rect x="${i * 100}" y="0" width="50" height="900"/>`).join("")}
  </g>

  <!-- water: a coastline lake sweeping down the middle-left, as in the original -->
  <path d="M-40 250 C 260 200 380 360 520 470 C 640 560 560 720 700 820 C 470 900 120 900 -40 900 Z"
        fill="url(#water)" opacity="0.92"/>
  <path d="M-40 250 C 260 200 380 360 520 470 C 640 560 560 720 700 820"
        fill="none" stroke="#eae2c8" stroke-width="8" opacity="0.55"/>
  <!-- sandy shore -->
  <path d="M-40 250 C 260 200 380 360 520 470 C 640 560 560 720 700 820"
        fill="none" stroke="#d9c48c" stroke-width="20" opacity="0.35" filter="url(#soft)"/>

  <!-- fairways: winding light-green ribbons -->
  <g stroke-linecap="round" fill="none" opacity="0.92">
    <path d="M300 120 C 520 160 700 120 900 200 C 1080 270 1120 430 1000 520" stroke="#5aa363" stroke-width="88"/>
    <path d="M1360 140 C 1180 240 1240 430 1420 520 C 1520 570 1520 720 1360 780" stroke="#5aa363" stroke-width="80"/>
    <path d="M820 640 C 980 700 1160 660 1300 760" stroke="#5aa363" stroke-width="72"/>
    <path d="M540 300 C 640 420 620 560 760 620" stroke="#5aa363" stroke-width="64"/>
  </g>
  <!-- fairway highlight -->
  <g stroke-linecap="round" fill="none" opacity="0.5">
    <path d="M300 120 C 520 160 700 120 900 200 C 1080 270 1120 430 1000 520" stroke="#6fb977" stroke-width="34"/>
    <path d="M1360 140 C 1180 240 1240 430 1420 520 C 1520 570 1520 720 1360 780" stroke="#6fb977" stroke-width="30"/>
  </g>

  <!-- putting greens with flags -->
  ${green(1000, 520, 62, 44)}
  ${green(1360, 780, 54, 40)}
  ${green(1300, 760, 50, 36)}
  ${green(760, 620, 52, 38)}
  ${green(900, 200, 56, 40)}

  <!-- bunkers -->
  <g fill="#e6d199">
    <ellipse cx="940" cy="470" rx="46" ry="28" transform="rotate(-18 940 470)"/>
    <ellipse cx="1300" cy="470" rx="40" ry="24" transform="rotate(24 1300 470)"/>
    <ellipse cx="700" cy="560" rx="34" ry="22"/>
    <ellipse cx="1240" cy="720" rx="30" ry="20" transform="rotate(-12 1240 720)"/>
    <ellipse cx="860" cy="250" rx="30" ry="18"/>
  </g>
  <g fill="none" stroke="#cbb478" stroke-width="3" opacity="0.7">
    <ellipse cx="940" cy="470" rx="46" ry="28" transform="rotate(-18 940 470)"/>
    <ellipse cx="1300" cy="470" rx="40" ry="24" transform="rotate(24 1300 470)"/>
  </g>

  <!-- cart paths -->
  <g stroke="#d8cba6" stroke-width="5" fill="none" opacity="0.6" stroke-dasharray="1 0">
    <path d="M180 820 C 420 760 520 600 700 560 C 900 512 980 470 1000 520"/>
    <path d="M1000 520 C 1120 560 1240 640 1300 760"/>
    <path d="M1360 200 C 1300 360 1360 520 1420 520"/>
  </g>

  <!-- tree clusters -->
  <g filter="url(#treeShadow)">
    ${trees(190, 180, 5)}
    ${trees(1480, 340, 4)}
    ${trees(1120, 820, 5)}
    ${trees(430, 560, 4)}
    ${trees(1250, 120, 3)}
    ${trees(640, 760, 4)}
  </g>
</svg>`;
}

function green(cx: number, cy: number, rx: number, ry: number): string {
  return `
  <g>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#7cc36f"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="#5c9e52" stroke-width="3"/>
    <line x1="${cx + rx * 0.3}" y1="${cy}" x2="${cx + rx * 0.3}" y2="${cy - ry - 18}" stroke="#f4efe2" stroke-width="2"/>
    <path d="M${cx + rx * 0.3} ${cy - ry - 18} l 14 5 l -14 5 z" fill="#d33a2c"/>
    <circle cx="${cx - rx * 0.2}" cy="${cy + ry * 0.1}" r="3" fill="#2c2c2c"/>
  </g>`;
}

function trees(cx: number, cy: number, n: number): string {
  let out = "";
  for (let i = 0; i < n; i++) {
    const dx = (i - n / 2) * 26 + (i % 2) * 10;
    const dy = (i % 3) * 14 - 12;
    const r = 20 + (i % 3) * 6;
    out += `<circle cx="${cx + dx}" cy="${cy + dy}" r="${r}" fill="#2c6b3c"/>` +
      `<circle cx="${cx + dx - r * 0.3}" cy="${cy + dy - r * 0.3}" r="${r * 0.55}" fill="#3f8a4f"/>`;
  }
  return out;
}

const RASTER_CANDIDATES = ["assets/course.jpg", "assets/course.png", "assets/course.webp"];

/** Mount the course once into `target`; probe for a raster override. */
export function mountCourseBackground(target: HTMLElement): void {
  target.innerHTML = courseBackgroundSVG();
  for (const url of RASTER_CANDIDATES) {
    const img = new Image();
    img.onload = () => {
      target.style.backgroundImage = `url("${url}")`;
      target.classList.add("has-course-img");
    };
    img.src = url;
  }
}
