/**
 * Decorative two-post wooden signpost frame for the leaderboard screen. Pure
 * inline SVG, self-contained. The actual score rows are rendered as regular
 * HTML on top (see leaderboard.ts) — this only draws the posts, crossbeam,
 * hanging chains, and a small carved emblem behind/around that panel.
 */

function woodGrain(seed: number): string {
  return `
    <filter id="postGrain${seed}" x="-10%" y="-5%" width="120%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.015 0.25" numOctaves="3" seed="${seed}" result="grain"/>
      <feColorMatrix type="saturate" values="0" in="grain" result="grey"/>
      <feBlend in="SourceGraphic" in2="grey" mode="soft-light"/>
    </filter>`;
}

export function leaderboardSignSVG(): string {
  return `
<svg class="lb-sign-svg-el" viewBox="0 0 900 760" preserveAspectRatio="xMidYMax meet" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="postWood" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#6b4726"/>
      <stop offset="45%" stop-color="#4a3018"/>
      <stop offset="100%" stop-color="#3a2515"/>
    </linearGradient>
    <linearGradient id="beamWood" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#5c3d20"/>
      <stop offset="100%" stop-color="#3a2515"/>
    </linearGradient>
    <radialGradient id="postShadow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#000" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
    ${woodGrain(3)}
    ${woodGrain(9)}
  </defs>

  <!-- ground shadows under each post -->
  <ellipse cx="150" cy="726" rx="70" ry="16" fill="url(#postShadow)"/>
  <ellipse cx="750" cy="726" rx="70" ry="16" fill="url(#postShadow)"/>

  <!-- left post -->
  <g filter="url(#postGrain3)">
    <path d="M120,60 Q150,36 180,60 L184,720 L116,720 Z" fill="url(#postWood)"/>
  </g>
  <ellipse cx="150" cy="58" rx="32" ry="14" fill="#5c3d20" stroke="#2a1810" stroke-width="2"/>

  <!-- right post -->
  <g filter="url(#postGrain9)">
    <path d="M720,60 Q750,36 780,60 L784,720 L716,720 Z" fill="url(#postWood)"/>
  </g>
  <ellipse cx="750" cy="58" rx="32" ry="14" fill="#5c3d20" stroke="#2a1810" stroke-width="2"/>

  <!-- crossbeam joining the posts above the hanging board -->
  <rect x="96" y="118" width="708" height="34" rx="6" fill="url(#beamWood)" stroke="#2a1810" stroke-width="2"/>
  <circle cx="150" cy="135" r="5" fill="#1a0e08"/>
  <circle cx="750" cy="135" r="5" fill="#1a0e08"/>

  <!-- carved emblem at center of the beam -->
  <g transform="translate(450,135)">
    <circle r="20" fill="#c8a24a" opacity="0.15"/>
    <path d="M0,-11 L3,-3 L11,-3 L4.5,2 L7,10 L0,5 L-7,10 L-4.5,2 L-11,-3 L-3,-3Z" fill="#c8a24a" opacity="0.85"/>
  </g>

  <!-- chains from the beam down to the board's hanging points -->
  <g stroke="#8a7550" stroke-width="3" fill="none" opacity="0.8">
    <path d="M190,152 L235,232 M190,168 L235,248"/>
    <path d="M710,152 L665,232 M710,168 L665,248"/>
  </g>
  <circle cx="235" cy="240" r="6" fill="#3a2515" stroke="#8a7550" stroke-width="2"/>
  <circle cx="665" cy="240" r="6" fill="#3a2515" stroke="#8a7550" stroke-width="2"/>
</svg>`;
}
