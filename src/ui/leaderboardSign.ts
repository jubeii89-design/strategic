/**
 * Decorative single wooden post behind the leaderboard screen, evoking a
 * golf-course "LEADERS" signpost. The board itself (title, toggle, table) is
 * plain HTML on top (see leaderboard.ts) styled with a matching cream/olive
 * arched-top frame — this SVG only draws the post and its ground shadow.
 */

export function leaderboardSignSVG(): string {
  return `
<svg class="lb-sign-svg-el" viewBox="0 0 700 800" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="lbPostWood" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#4a5a2e"/>
      <stop offset="45%" stop-color="#333f1e"/>
      <stop offset="100%" stop-color="#232c14"/>
    </linearGradient>
    <radialGradient id="lbPostShadow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#000" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
    <filter id="lbPostGrain" x="-10%" y="-5%" width="120%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.015 0.2" numOctaves="3" seed="6" result="grain"/>
      <feColorMatrix type="saturate" values="0" in="grain" result="grey"/>
      <feBlend in="SourceGraphic" in2="grey" mode="soft-light"/>
    </filter>
  </defs>

  <ellipse cx="350" cy="766" rx="90" ry="18" fill="url(#lbPostShadow)"/>

  <g filter="url(#lbPostGrain)">
    <path d="M310,560 L390,560 L400,760 L300,760 Z" fill="url(#lbPostWood)"/>
  </g>
  <rect x="296" y="546" width="108" height="26" rx="6" fill="#333f1e" stroke="#1a2010" stroke-width="2"/>
</svg>`;
}
