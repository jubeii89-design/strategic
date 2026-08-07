/**
 * Full-screen mandatory intro video: plays public/assets/intro_video.mp4
 * once, start to finish, before the branded start page appears. No skip —
 * `onDone` fires only on the video's `ended` event.
 *
 * Browsers block autoplay-with-sound until the user has interacted with the
 * page, so playback is gated behind a "Click to begin" tile: the click
 * itself is the user gesture, and calling video.play() synchronously inside
 * that click handler is what lets it play unmuted, in full, with sound.
 */
import { ASSET_BASE } from "./assetBase.js";
import { crest } from "./crest.js";

export function renderIntroGate(onDone: () => void): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "intro-video";

  const gate = document.createElement("button");
  gate.className = "intro-gate";
  gate.append(crest());
  const prompt = document.createElement("p");
  prompt.className = "intro-gate-prompt";
  prompt.textContent = "Click to begin";
  gate.appendChild(prompt);

  const video = document.createElement("video");
  video.className = "intro-video-el";
  video.src = `${ASSET_BASE}assets/intro_video.mp4`;
  video.playsInline = true;
  video.hidden = true;
  video.addEventListener("ended", onDone, { once: true });

  const muteBtn = document.createElement("button");
  muteBtn.className = "mute-btn intro-video-mute";
  muteBtn.hidden = true;
  const syncMute = () => {
    muteBtn.textContent = video.muted ? "🔇" : "🔊";
    muteBtn.setAttribute("aria-label", video.muted ? "Unmute video" : "Mute video");
  };
  muteBtn.addEventListener("click", () => {
    video.muted = !video.muted;
    syncMute();
  });

  gate.addEventListener(
    "click",
    () => {
      gate.remove();
      video.hidden = false;
      muteBtn.hidden = false;
      syncMute();
      // Must be called synchronously within this handler to inherit the
      // click's user-activation — an unmuted play() here is not blocked.
      video.play().catch(() => {
        // Extremely rare (e.g. media error, not an autoplay block); let the
        // user retry with a tap directly on the video.
        video.addEventListener("click", () => void video.play(), { once: true });
      });
    },
    { once: true },
  );

  wrap.append(gate, video, muteBtn);
  return wrap;
}
