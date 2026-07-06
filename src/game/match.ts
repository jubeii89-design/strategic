/**
 * A single-session match: the human plus 1–8 greedy AI opponents, each playing
 * their OWN independently-shuffled deck on their OWN board. The engine scores
 * every board the same way, without knowing who placed the cards.
 *
 * AI turns run in lockstep with the human (one action each per turn) so the
 * standings update live. When the human's game ends, the remaining AI turns are
 * played out to completion for the final ranking.
 *
 * AI scores are session-only — nothing here is persisted. (A leaderboard, when
 * it exists, stores human scores only.)
 */

import { type BoardScore, GameMode, scoreBoard } from "../engine/index.js";
import { GameState } from "./gameState.js";
import { greedyStep } from "./ai.js";

export const MAX_OPPONENTS = 8;

/** Spartan-flavoured opponent names (Strategic Titans). */
const AI_NAMES = ["Leonidas", "Ajax", "Helena", "Cyrus", "Atlas", "Xena", "Odin", "Nyx"];

export interface Player {
  name: string;
  isHuman: boolean;
  state: GameState;
}

export interface Standing {
  name: string;
  isHuman: boolean;
  score: number;
  placed: number;
  isOver: boolean;
  rank: number;
}

export class Match {
  readonly mode: GameMode;
  readonly human: Player;
  readonly ais: Player[];

  constructor(mode: GameMode, opponents: number, rng: () => number = Math.random) {
    this.mode = mode;
    const n = Math.max(1, Math.min(MAX_OPPONENTS, Math.floor(opponents)));
    this.human = { name: "You", isHuman: true, state: new GameState(mode, rng) };
    this.ais = Array.from({ length: n }, (_, i) => ({
      name: AI_NAMES[i] ?? `AI ${i + 1}`,
      isHuman: false,
      state: new GameState(mode, rng),
    }));
  }

  private get players(): Player[] {
    return [this.human, ...this.ais];
  }

  /** Every AI that isn't finished takes one greedy action. */
  private stepAIs(): void {
    for (const ai of this.ais) if (!ai.state.isOver) greedyStep(ai.state);
  }

  /** Play out any AI whose game is still running (used once the human finishes). */
  private finishAIs(): void {
    for (const ai of this.ais) {
      let guard = 0;
      while (!ai.state.isOver && guard++ < 200) greedyStep(ai.state);
    }
  }

  humanPlace(cell: Parameters<GameState["place"]>[0]): void {
    if (this.human.state.isOver) return;
    this.human.state.place(cell);
    this.stepAIs();
    if (this.human.state.isOver) this.finishAIs();
  }

  humanPass(): void {
    if (this.human.state.isOver) return;
    this.human.state.pass();
    this.stepAIs();
    if (this.human.state.isOver) this.finishAIs();
  }

  get isOver(): boolean {
    return this.players.every((p) => p.state.isOver);
  }

  /** Score a player's current board. */
  private score(p: Player): BoardScore {
    return scoreBoard(p.state.snapshot().board, this.mode);
  }

  /** Live standings, ranked (poker: high first; golf: low first). */
  standings(): Standing[] {
    const rows = this.players.map((p) => {
      const s = this.score(p);
      return {
        name: p.name,
        isHuman: p.isHuman,
        score: s.round,
        placed: p.state.snapshot().placedCount,
        isOver: p.state.isOver,
      };
    });
    const golf = this.mode === GameMode.GolfMode;
    rows.sort((a, b) => (golf ? a.score - b.score : b.score - a.score));
    let rank = 0;
    let prev: number | null = null;
    return rows.map((r, i) => {
      if (prev === null || r.score !== prev) rank = i + 1;
      prev = r.score;
      return { ...r, rank };
    });
  }

  /** The human's final placement (1 = winner). Valid once the match is over. */
  humanRank(): number {
    return this.standings().find((s) => s.isHuman)!.rank;
  }
}
