/**
 * Persistent, HUMAN-ONLY leaderboard.
 *
 * The original spec: the leaderboard stores human scores only; AI scores are
 * session-only and never written. That invariant is structural here — this
 * module has no concept of an AI. The UI only ever submits the human player's
 * round, so nothing else can reach storage.
 *
 * Storage sits behind an async `LeaderboardStore` so a shared hosted database
 * can replace the local one later without touching callers. Ships today with a
 * `localStorage` implementation (per-browser persistence, no backend).
 */

import { GameMode } from "../engine/index.js";

export const MAX_ENTRIES = 20; // per mode

export interface LeaderboardEntry {
  name: string;
  score: number;
  mode: GameMode;
  /** ISO date (YYYY-MM-DD) the score was recorded. */
  date: string;
}

export interface LeaderboardStore {
  load(): Promise<LeaderboardEntry[]>;
  save(entries: LeaderboardEntry[]): Promise<void>;
}

/** The subset of the Web Storage API we use (injectable for tests). */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const STORAGE_KEY = "pokerst8ts.leaderboard.v1";

/** localStorage-backed store. Never throws — degrades to in-memory on failure. */
export class LocalLeaderboardStore implements LeaderboardStore {
  private mem: LeaderboardEntry[] | null = null;
  constructor(private readonly storage?: StorageLike) {}

  private get backend(): StorageLike | null {
    if (this.storage) return this.storage;
    try {
      return typeof localStorage !== "undefined" ? localStorage : null;
    } catch {
      return null; // access can throw in some privacy modes
    }
  }

  async load(): Promise<LeaderboardEntry[]> {
    const b = this.backend;
    if (!b) return this.mem ?? [];
    try {
      const raw = b.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return sanitize(parsed);
    } catch {
      return this.mem ?? [];
    }
  }

  async save(entries: LeaderboardEntry[]): Promise<void> {
    this.mem = entries;
    const b = this.backend;
    if (!b) return;
    try {
      b.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
      /* quota / privacy mode — keep the in-memory copy for this session */
    }
  }
}

/** In-memory store for tests and non-browser environments. */
export class MemoryLeaderboardStore implements LeaderboardStore {
  constructor(private entries: LeaderboardEntry[] = []) {}
  async load(): Promise<LeaderboardEntry[]> {
    return this.entries.slice();
  }
  async save(entries: LeaderboardEntry[]): Promise<void> {
    this.entries = entries.slice();
  }
}

/**
 * Stub for a future shared online board. Kept to document the seam — wire a
 * real endpoint (GET/POST /api/leaderboard) and this drops in unchanged.
 */
export class RemoteLeaderboardStore implements LeaderboardStore {
  constructor(private readonly endpoint = "/api/leaderboard") {
    void this.endpoint;
  }
  async load(): Promise<LeaderboardEntry[]> {
    throw new Error("NOT_CONFIGURED: RemoteLeaderboardStore has no backend yet");
  }
  async save(): Promise<void> {
    throw new Error("NOT_CONFIGURED: RemoteLeaderboardStore has no backend yet");
  }
}

/** Drop malformed rows so corrupt storage can never crash the app. */
function sanitize(parsed: unknown): LeaderboardEntry[] {
  if (!Array.isArray(parsed)) return [];
  const out: LeaderboardEntry[] = [];
  for (const e of parsed) {
    if (
      e &&
      typeof e.name === "string" &&
      typeof e.score === "number" &&
      Number.isFinite(e.score) &&
      (e.mode === GameMode.GolfMode || e.mode === GameMode.PokerStraightsMode) &&
      typeof e.date === "string"
    ) {
      out.push({ name: e.name, score: e.score, mode: e.mode, date: e.date });
    }
  }
  return out;
}

/** Golf: fewer strokes is better. Poker: more points is better. */
function isBetter(a: number, b: number, mode: GameMode): boolean {
  return mode === GameMode.GolfMode ? a < b : a > b;
}
function compare(a: LeaderboardEntry, b: LeaderboardEntry, mode: GameMode): number {
  return mode === GameMode.GolfMode ? a.score - b.score : b.score - a.score;
}

export interface SubmitResult {
  /** True if the entry earned a place on the (capped) board. */
  qualified: boolean;
  /** 1-based rank if it qualified, else null. */
  rank: number | null;
}

/** Domain logic over a store. No UI, no AI awareness. */
export class Leaderboard {
  constructor(private readonly store: LeaderboardStore) {}

  /** Top `n` entries for a mode, best first. */
  async top(mode: GameMode, n = MAX_ENTRIES): Promise<LeaderboardEntry[]> {
    const all = await this.store.load();
    return all
      .filter((e) => e.mode === mode)
      .sort((a, b) => compare(a, b, mode))
      .slice(0, n);
  }

  /**
   * Would this score make the board without writing it? Lets the UI decide
   * whether to prompt for a name before committing.
   */
  async wouldQualify(score: number, mode: GameMode): Promise<boolean> {
    const board = await this.top(mode);
    if (board.length < MAX_ENTRIES) return true;
    const worst = board[board.length - 1]!;
    return isBetter(score, worst.score, mode);
  }

  /** Insert an entry, keep the per-mode top `MAX_ENTRIES`, return its rank. */
  async submit(entry: LeaderboardEntry): Promise<SubmitResult> {
    const all = await this.store.load();
    all.push(entry);

    // Re-cap each mode independently so submitting one mode can't evict the other.
    const kept: LeaderboardEntry[] = [];
    for (const mode of [GameMode.PokerStraightsMode, GameMode.GolfMode]) {
      const forMode = all
        .filter((e) => e.mode === mode)
        .sort((a, b) => compare(a, b, mode))
        .slice(0, MAX_ENTRIES);
      kept.push(...forMode);
    }
    await this.store.save(kept);

    const board = kept
      .filter((e) => e.mode === entry.mode)
      .sort((a, b) => compare(a, b, entry.mode));
    const idx = board.indexOf(entry);
    return idx === -1 ? { qualified: false, rank: null } : { qualified: true, rank: idx + 1 };
  }
}

/** Today's date as YYYY-MM-DD (local). */
export function todayISO(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Clamp/clean a player-entered name for storage. */
export function cleanName(raw: string): string {
  return raw.trim().slice(0, 12) || "PLAYER";
}
