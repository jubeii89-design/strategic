/**
 * App entry: intro → match → end panel. Framework-free; re-renders the game
 * screen from the human player's GameState after each action, with AI
 * opponents advancing in lockstep and a live standings panel.
 */

import { type Cell, GameMode, scoreBoard } from "./engine/index.js";
import { Match } from "./game/match.js";
import { Leaderboard, LocalLeaderboardStore, cleanName, todayISO } from "./game/leaderboard.js";
import { HandHistory, LocalHandHistoryStore, type HandHistoryEntry } from "./game/handHistory.js";
import { renderIntro } from "./ui/intro.js";
import { renderBoard } from "./ui/board.js";
import { renderScorecard } from "./ui/scorecard.js";
import { renderStandings } from "./ui/standings.js";
import { renderLeaderboardScreen, promptForName, promptPlayAgain } from "./ui/leaderboard.js";
import { cardFace, cardLabel } from "./ui/cards.js";
import { mountCourseBackground } from "./ui/courseBackground.js";
import { mountPokerTableBackground } from "./ui/pokerTableBackground.js";
import { mountBackgroundMusic } from "./ui/audio.js";
import { setAssetBase } from "./ui/assetBase.js";
import "./ui/styles.css";

setAssetBase("../"); // this entry lives one level under the site root, at /play/

const app = document.getElementById("app")!;
const bg = document.getElementById("bg");
const bgPoker = document.getElementById("bg-poker");
if (bg) mountCourseBackground(bg);
if (bgPoker) mountPokerTableBackground(bgPoker);
mountBackgroundMusic(document.body);

const leaderboard = new Leaderboard(new LocalLeaderboardStore());
const handHistory = new HandHistory(new LocalHandHistoryStore());

function clear(): void {
  app.replaceChildren();
}

function start(mode: GameMode, opponents: number): void {
  const match = new Match(mode, opponents);
  renderGame(match);
}

function renderGame(match: Match): void {
  clear();
  const game = match.human.state;
  document.body.dataset.bg = match.mode === GameMode.GolfMode ? "golf" : "poker";
  const snap = game.snapshot();
  const score = scoreBoard(snap.board, match.mode);

  const screen = document.createElement("div");
  screen.className = "screen game";

  screen.appendChild(renderScorecard(score, match.mode));

  const main = document.createElement("div");
  main.className = "play-area";

  // left rail: standings, next card, PASS, cards remaining
  const rail = document.createElement("aside");
  rail.className = "rail";

  rail.appendChild(renderStandings(match.standings(), match.mode));

  const nextWrap = document.createElement("div");
  nextWrap.className = "next-card";
  const nextLabel = document.createElement("span");
  nextLabel.className = "rail-label";
  nextLabel.textContent = "NEXT CARD";
  nextWrap.appendChild(nextLabel);
  if (snap.currentCard !== null) {
    nextWrap.appendChild(cardFace(snap.currentCard));
  }
  rail.appendChild(nextWrap);

  const passBtn = document.createElement("button");
  passBtn.className = "pass-btn";
  passBtn.textContent = "PASS";
  passBtn.disabled = snap.isOver;
  passBtn.addEventListener("click", () => {
    if (!game.isOver) {
      match.humanPass();
      renderGame(match);
    }
  });
  rail.appendChild(passBtn);

  const remain = document.createElement("div");
  remain.className = "cards-remaining";
  remain.innerHTML = `<span class="rail-label">CARDS REMAINING</span><span class="remain-value">${snap.cardsLeft}</span>`;
  rail.appendChild(remain);

  const board = renderBoard(game, {
    onPlace: (cell: Cell) => {
      match.humanPlace(cell);
      renderGame(match);
    },
  });

  main.append(rail, board);
  screen.appendChild(main);
  app.appendChild(screen);

  if (match.isOver) showEndPanel(match);
}

/** Show an overlay panel; call `next()` on the first keypress or click. */
function showOverlay(build: (panel: HTMLElement) => void, next: () => void): void {
  const overlay = document.createElement("div");
  overlay.className = "overlay";
  const panel = document.createElement("div");
  panel.className = "end-panel";
  build(panel);
  overlay.appendChild(panel);
  app.appendChild(overlay);

  const advance = () => {
    document.removeEventListener("keydown", advance);
    overlay.removeEventListener("click", advance);
    overlay.remove();
    next();
  };
  document.addEventListener("keydown", advance);
  overlay.addEventListener("click", advance);
}

/** The single completed hand with the most points, plus its top 2 cards. */
function bestHand(
  score: ReturnType<typeof scoreBoard>,
  completions: Match["human"]["state"]["handCompletions"],
): { handName: string; points: number; topCards: number[] } | null {
  const complete = score.hands.filter((h) => h.complete);
  if (complete.length === 0) return null;
  const top = complete.reduce((a, b) => (b.points > a.points ? b : a));
  const rec = completions.find((c) => c.hole === top.hole);
  return { handName: top.handName, points: top.points, topCards: rec?.topCards ?? [] };
}

// Stage 1: your own score and a standout stat, centered on screen.
function showEndPanel(match: Match): void {
  const rank = match.humanRank();
  const total = match.ais.length + 1;
  const heading = rank === 1 ? "You win! 🏆" : `You placed ${ordinal(rank)} of ${total}`;
  const score = scoreBoard(match.human.state.snapshot().board, match.mode);
  const best = bestHand(score, match.human.state.handCompletions);

  showOverlay((panel) => {
    const h2 = document.createElement("h2");
    h2.textContent = heading;
    panel.appendChild(h2);

    const yourScore = document.createElement("p");
    yourScore.className = "final-score";
    yourScore.innerHTML = `<span class="final-score-label">Your Score</span><span class="final-score-value">${score.round}</span>`;
    panel.appendChild(yourScore);

    if (best) {
      const stat = document.createElement("p");
      stat.className = "final-stat";
      const sign = best.points >= 0 ? "+" : "";
      stat.innerHTML = `Best hand: <strong>${best.handName}</strong>${
        best.topCards.length ? ` — ${best.topCards.map(cardLabel).join(" ")}` : ""
      } (${sign}${best.points})`;
      panel.appendChild(stat);
    }

    const hint = document.createElement("p");
    hint.className = "end-hint";
    hint.textContent = "Press any key to continue";
    panel.appendChild(hint);
  }, () => showFinalStandings(match));
}

// Stage 2: everyone's scores, centered on screen.
function showFinalStandings(match: Match): void {
  showOverlay((panel) => {
    const h2 = document.createElement("h2");
    h2.textContent = "Final Standings";
    panel.appendChild(h2);
    panel.appendChild(renderStandings(match.standings(), match.mode, { final: true }));
    const hint = document.createElement("p");
    hint.className = "end-hint";
    hint.textContent = "Press any key to continue";
    panel.appendChild(hint);
  }, () => void continueAfterRound(match));
}

// Persist the human's top-2-cards-per-hand history, submit their score to the
// persistent leaderboard, then show the leaderboard and ask to play again.
async function continueAfterRound(match: Match): Promise<void> {
  const humanScore = scoreBoard(match.human.state.snapshot().board, match.mode).round;
  let highlight: Parameters<typeof renderLeaderboardScreen>[0]["highlight"];
  let playerName = "You";
  if (await leaderboard.wouldQualify(humanScore, match.mode)) {
    const name = await promptForName(match.humanRank());
    if (name !== null) {
      playerName = cleanName(name);
      const entry = { name: playerName, score: humanScore, mode: match.mode, date: todayISO() };
      const result = await leaderboard.submit(entry);
      if (result.qualified) highlight = entry;
    }
  }

  const date = todayISO();
  const records: HandHistoryEntry[] = match.human.state.handCompletions.map((h) => ({
    playerName,
    mode: match.mode,
    date,
    hole: h.hole,
    topCards: h.topCards,
  }));
  void handHistory.appendMany(records);

  showLeaderboardWith(match.mode, highlight);
  if (await promptPlayAgain()) showIntro();
}

function showLeaderboardWith(mode: GameMode, highlight: Parameters<typeof renderLeaderboardScreen>[0]["highlight"]): void {
  clear();
  document.body.dataset.bg = "intro";
  app.appendChild(renderLeaderboardScreen({ leaderboard, mode, highlight, onBack: showIntro }));
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]!);
}

// keyboard: P = pass
document.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "p") {
    const btn = document.querySelector<HTMLButtonElement>(".pass-btn");
    if (btn && !btn.disabled) btn.click();
  }
});

function showIntro(): void {
  clear();
  document.body.dataset.bg = "intro";
  app.appendChild(renderIntro(start, showLeaderboard));
}

function showLeaderboard(mode: GameMode = GameMode.PokerStraightsMode): void {
  clear();
  document.body.dataset.bg = "intro";
  app.appendChild(renderLeaderboardScreen({ leaderboard, mode, onBack: showIntro }));
}

showIntro();
