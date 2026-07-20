import { describe, expect, it } from "vitest";
import { GameMode } from "../src/engine/index.js";
import {
  type HandHistoryEntry,
  type StorageLike,
  HandHistory,
  LocalHandHistoryStore,
  MAX_ENTRIES,
  MemoryHandHistoryStore,
} from "../src/game/handHistory.js";

const poker = GameMode.PokerStraightsMode;
const rec = (hole: number, topCards: number[]): HandHistoryEntry => ({
  playerName: "You",
  mode: poker,
  date: "2026-07-14",
  hole,
  topCards,
});

describe("HandHistory", () => {
  it("appends and reads back records via the domain layer", async () => {
    const hh = new HandHistory(new MemoryHandHistoryStore());
    await hh.appendMany([rec(1, [113, 112]), rec(2, [201, 105])]);
    const all = await hh.all();
    expect(all).toHaveLength(2);
    expect(all[0]).toMatchObject({ hole: 1, topCards: [113, 112] });
  });

  it("no-ops on an empty batch", async () => {
    const hh = new HandHistory(new MemoryHandHistoryStore());
    await hh.appendMany([]);
    expect(await hh.all()).toEqual([]);
  });

  it("caps total stored entries at MAX_ENTRIES, dropping the oldest first", async () => {
    const hh = new HandHistory(new MemoryHandHistoryStore());
    const batch = Array.from({ length: MAX_ENTRIES + 5 }, (_, i) => rec((i % 18) + 1, [i, i + 1]));
    await hh.appendMany(batch);
    const all = await hh.all();
    expect(all).toHaveLength(MAX_ENTRIES);
    // the first 5 (oldest) were dropped
    expect(all[0]).toMatchObject({ topCards: [5, 6] });
  });
});

describe("LocalHandHistoryStore persistence", () => {
  function fakeStorage(): StorageLike & { data: Map<string, string> } {
    const data = new Map<string, string>();
    return {
      data,
      getItem: (k) => data.get(k) ?? null,
      setItem: (k, v) => void data.set(k, v),
    };
  }

  it("round-trips through an injected Storage and survives a fresh store instance", async () => {
    const storage = fakeStorage();
    const hh1 = new HandHistory(new LocalHandHistoryStore(storage));
    await hh1.appendMany([rec(3, [112, 111])]);
    const hh2 = new HandHistory(new LocalHandHistoryStore(storage));
    const all = await hh2.all();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ hole: 3, topCards: [112, 111] });
  });

  it("never throws on corrupt or absent data", async () => {
    const storage = fakeStorage();
    storage.data.set("pokerst8ts.handHistory.v1", "{not valid json");
    const hh = new HandHistory(new LocalHandHistoryStore(storage));
    expect(await hh.all()).toEqual([]);
    await hh.appendMany([rec(1, [1, 2])]);
    expect(await hh.all()).toHaveLength(1);
  });

  it("drops malformed rows on load", async () => {
    const storage = fakeStorage();
    storage.data.set(
      "pokerst8ts.handHistory.v1",
      JSON.stringify([
        rec(1, [1, 2]),
        { playerName: "bad", mode: poker, date: "x", hole: "not-a-number", topCards: [1, 2] },
        { playerName: "bad2", mode: "nope", date: "x", hole: 1, topCards: [1, 2] },
      ]),
    );
    const hh = new HandHistory(new LocalHandHistoryStore(storage));
    expect(await hh.all()).toEqual([rec(1, [1, 2])]);
  });
});
