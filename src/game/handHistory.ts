/**
 * Per-hand scoring history: the 2 highest-ranked cards of every hand the
 * human completes, recorded once a hand's last cell fills (see
 * GameState.handCompletions) and persisted here once the round ends.
 *
 * Mirrors leaderboard.ts's storage seam: a localStorage-backed store today,
 * with the same shape of interface a future shared/hosted database would
 * implement, so callers never change.
 */

import { GameMode, type CardId } from "../engine/index.js";
import type { StorageLike } from "./leaderboard.js";
export type { StorageLike } from "./leaderboard.js";

export const MAX_ENTRIES = 2000; // cap growth across many rounds

export interface HandHistoryEntry {
  playerName: string;
  mode: GameMode;
  /** ISO date (YYYY-MM-DD) the round was played. */
  date: string;
  /** Hole number 1-18, scorecard order. */
  hole: number;
  /** The 2 highest-ranked cards in that hand (Ace treated as high). */
  topCards: CardId[];
}

export interface HandHistoryStore {
  load(): Promise<HandHistoryEntry[]>;
  save(entries: HandHistoryEntry[]): Promise<void>;
}

const STORAGE_KEY = "pokerst8ts.handHistory.v1";

/** localStorage-backed store. Never throws — degrades to in-memory on failure. */
export class LocalHandHistoryStore implements HandHistoryStore {
  private mem: HandHistoryEntry[] | null = null;
  constructor(private readonly storage?: StorageLike) {}

  private get backend(): StorageLike | null {
    if (this.storage) return this.storage;
    try {
      return typeof localStorage !== "undefined" ? localStorage : null;
    } catch {
      return null;
    }
  }

  async load(): Promise<HandHistoryEntry[]> {
    const b = this.backend;
    if (!b) return this.mem ?? [];
    try {
      const raw = b.getItem(STORAGE_KEY);
      if (!raw) return [];
      return sanitize(JSON.parse(raw));
    } catch {
      return this.mem ?? [];
    }
  }

  async save(entries: HandHistoryEntry[]): Promise<void> {
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
export class MemoryHandHistoryStore implements HandHistoryStore {
  constructor(private entries: HandHistoryEntry[] = []) {}
  async load(): Promise<HandHistoryEntry[]> {
    return this.entries.slice();
  }
  async save(entries: HandHistoryEntry[]): Promise<void> {
    this.entries = entries.slice();
  }
}

/**
 * Domain logic over a store: append a completed round's per-hand records,
 * keeping only the most recent MAX_ENTRIES overall (oldest dropped first).
 */
export class HandHistory {
  constructor(private readonly store: HandHistoryStore) {}

  async appendMany(entries: readonly HandHistoryEntry[]): Promise<void> {
    if (entries.length === 0) return;
    const all = await this.store.load();
    all.push(...entries);
    await this.store.save(all.slice(-MAX_ENTRIES));
  }

  async all(): Promise<HandHistoryEntry[]> {
    return this.store.load();
  }
}

/** Drop malformed rows so corrupt storage can never crash the app. */
function sanitize(parsed: unknown): HandHistoryEntry[] {
  if (!Array.isArray(parsed)) return [];
  const out: HandHistoryEntry[] = [];
  for (const e of parsed) {
    if (
      e &&
      typeof e.playerName === "string" &&
      (e.mode === GameMode.GolfMode || e.mode === GameMode.PokerStraightsMode) &&
      typeof e.date === "string" &&
      typeof e.hole === "number" &&
      Array.isArray(e.topCards) &&
      e.topCards.every((c: unknown) => typeof c === "number")
    ) {
      out.push({ playerName: e.playerName, mode: e.mode, date: e.date, hole: e.hole, topCards: e.topCards });
    }
  }
  return out;
}
