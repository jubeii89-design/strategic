/**
 * Full-screen mandatory intro video: plays public/assets/intro_video.mp4
 * once, start to finish, before the branded start page appears. No skip —
 * `onDone` fires only on the video's `ended` event.
 *
 * Autoplay-with-sound is blocked by browsers without a prior user gesture,
 * so playback starts muted (guaranteeing it actually plays end to end) with
 * an unmute toggle; if even muted autoplay is blocked, a "tap to play"
 * prompt appears instead.
 */
import { ASSET_BASE } from "./assetBase.js";

export function renderIntroVideo(onDone: () => void): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "intro-video";

  const video = document.createElement("video");
  video.className = "intro-video-el";
  video.src = `${ASSET_BASE}assets/intro_video.mp4`;
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;
  video.addEventListener("ended", onDone, { once: true });

  const muteBtn = document.createElement("button");
  muteBtn.className = "mute-btn intro-video-mute";
  const syncMute = () => {
    muteBtn.textContent = video.muted ? "🔇" : "🔊";
    muteBtn.setAttribute("aria-label", video.muted ? "Unmute video" : "Mute video");
  };
  syncMute();
  muteBtn.addEventListener("click", () => {
    video.muted = !video.muted;
    syncMute();
  });

  const tapPrompt = document.createElement("button");
  tapPrompt.className = "intro-video-tap";
  tapPrompt.textContent = "Tap to play";
  tapPrompt.hidden = true;
  const startOnGesture = () => {
    tapPrompt.hidden = true;
    void video.play();
  };
  tapPrompt.addEventListener("click", startOnGesture, { once: true });

  video.play().catch(() => {
    tapPrompt.hidden = false;
  });

  wrap.append(video, muteBtn, tapPrompt);
  return wrap;
}
