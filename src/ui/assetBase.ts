/**
 * Prefix for runtime-probed art overrides (logo, course, poker table, card
 * PNGs) that live in `public/assets/`, which Vite copies verbatim to the
 * site root's `assets/` directory regardless of which HTML entry loaded it.
 * Pages nested under a subpath (e.g. `/play/`) must prefix probes with
 * `../` to reach site-root assets; the root portal page uses no prefix.
 * Each entry's main.ts calls setAssetBase() once, before mounting anything
 * that probes `assets/`.
 */
export let ASSET_BASE = "";
export function setAssetBase(base: string): void {
  ASSET_BASE = base;
}
