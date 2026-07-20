/**
 * Optional raster overrides for the scoreboard/leaderboard look — probed
 * once at startup and cached, so swapping the design later is just dropping
 * a .jpg/.jpeg/.png into public/assets/ (no code changes, no repeated
 * network probes on re-render, since the game screen re-renders often).
 */

import { ASSET_BASE } from "./assetBase.js";

type Name = "scoreboard" | "leaderboard";
const EXTS = ["jpg", "jpeg", "png"];
const found: Record<Name, string | null> = { scoreboard: null, leaderboard: null };

function probe(name: Name, i = 0): void {
  if (i >= EXTS.length) return;
  const img = new Image();
  const url = `${ASSET_BASE}assets/${name}.${EXTS[i]}`;
  img.onload = () => {
    found[name] = url;
  };
  img.onerror = () => probe(name, i + 1);
  img.src = url;
}

export function initDesignOverrides(): void {
  probe("scoreboard");
  probe("leaderboard");
}

/** Cached result of the probe; null until (or unless) a matching file is found. */
export function designOverride(name: Name): string | null {
  return found[name];
}
