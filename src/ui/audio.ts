/**
 * Optional looping background music with a mute toggle. Probes for
 * public/assets/music.(mp3|ogg) exactly like the art loaders — if no track
 * is present, nothing plays and no button is shown. Mute preference persists
 * across pages via localStorage since each page load gets its own <audio>.
 */

import { ASSET_BASE } from "./assetBase.js";

const MUTE_KEY = "pokerst8ts.muted";

function isMuted(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

function setMuted(muted: boolean): void {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    /* ignore */
  }
}

function candidates(): string[] {
  return [`${ASSET_BASE}assets/music.mp3`, `${ASSET_BASE}assets/music.ogg`];
}

/** Mount a looping background track + mute button into `target`, if a track is present. */
export function mountBackgroundMusic(target: HTMLElement): void {
  const urls = candidates();
  const audio = new Audio();
  audio.preload = "auto";
  let i = 0;

  const tryNext = () => {
    if (i >= urls.length) return;
    audio.src = urls[i]!;
  };
  audio.addEventListener("error", () => {
    i++;
    tryNext();
  });
  audio.addEventListener("canplaythrough", () => startPlayer(audio, target), { once: true });
  tryNext();
}

function startPlayer(audio: HTMLAudioElement, target: HTMLElement): void {
  audio.loop = true;
  audio.volume = 0.35;
  audio.muted = isMuted();

  const btn = document.createElement("button");
  btn.className = "mute-btn";
  const sync = () => {
    btn.textContent = audio.muted ? "🔇" : "🔊";
    btn.setAttribute("aria-label", audio.muted ? "Unmute music" : "Mute music");
  };
  sync();
  btn.addEventListener("click", () => {
    audio.muted = !audio.muted;
    setMuted(audio.muted);
    sync();
    if (!audio.muted) void audio.play().catch(() => {});
  });
  target.appendChild(btn);

  const tryPlay = () => void audio.play().catch(() => {});
  tryPlay();
  // Browsers block autoplay-with-sound until a user gesture; retry on the first one.
  const onGesture = () => {
    tryPlay();
    document.removeEventListener("pointerdown", onGesture);
    document.removeEventListener("keydown", onGesture);
  };
  document.addEventListener("pointerdown", onGesture, { once: true });
  document.addEventListener("keydown", onGesture, { once: true });
}
