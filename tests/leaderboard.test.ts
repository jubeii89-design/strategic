import { describe, expect, it, vi } from "vitest";
import { GameMode } from "../src/engine/index.js";
import {
  type LeaderboardEntry,
  type LeaderboardStore,
  type StorageLike,
  Leaderboard,
  LocalLeaderboardStore,
  MAX_ENTRIES,
  MemoryLeaderboardStore,
  RemoteLeaderboardStore,
  cleanName,
  detectLeaderboardStore,
  todayISO,
} from "../src/game/leaderboard.js";

const poker = GameMode.PokerStraightsMode;
const golf = GameMode.GolfMode;
const entry = (name: string, score: number, mode: GameMode): LeaderboardEntry => ({
  name,
  score,
  mode,
  date: "2026-07-06",
});

describe("Leaderboard ordering", () => {
  it("ranks poker high-to-low and golf low-to-high", async () => {
    const lb = new Leaderboard(new MemoryLeaderboardStore());
    await lb.submit(entry("A", 100, poker));
    await lb.submit(entry("B", 250, poker));
    await lb.submit(entry("C", 175, poker));
    expect((await lb.top(poker)).map((e) => e.name)).toEqual(["B", "C", "A"]);

    const golfLb = new Leaderboard(new MemoryLeaderboardStore());
    await golfLb.submit(entry("A", 84, golf));
    await golfLb.submit(entry("B", 72, golf));
    await golfLb.submit(entry("C", 90, golf));
    expect((await golfLb.top(golf)).map((e) => e.name)).toEqual(["B", "A", "C"]);
  });

  it("keeps poker and golf boards independent", async () => {
    const lb = new Leaderboard(new MemoryLeaderboardStore());
    await lb.submit(entry("P", 300, poker));
    await lb.submit(entry("G", 60, golf));
    expect(await lb.top(poker)).toHaveLength(1);
    expect(await lb.top(golf)).toHaveLength(1);
    expect((await lb.top(poker))[0]!.name).toBe("P");
    expect((await lb.top(golf))[0]!.name).toBe("G");
  });
});

describe("Leaderboard capping and qualification", () => {
  it("caps at MAX_ENTRIES; a worse 21st entry is rejected, a better one is inserted", async () => {
    const lb = new Leaderboard(new MemoryLeaderboardStore());
    // fill 20 poker scores 100..119
    for (let i = 0; i < MAX_ENTRIES; i++) await lb.submit(entry(`p${i}`, 100 + i, poker));
    expect(await lb.top(poker)).toHaveLength(MAX_ENTRIES);

    // a score below the current worst (100) does not qualify
    expect(await lb.wouldQualify(50, poker)).toBe(false);
    const low = await lb.submit(entry("low", 50, poker));
    expect(low.qualified).toBe(false);
    expect(low.rank).toBeNull();
    expect(await lb.top(poker)).toHaveLength(MAX_ENTRIES);

    // a high score qualifies at rank 1 and evicts the previous worst
    expect(await lb.wouldQualify(999, poker)).toBe(true);
    const hi = await lb.submit(entry("hi", 999, poker));
    expect(hi).toEqual({ qualified: true, rank: 1 });
    const board = await lb.top(poker);
    expect(board).toHaveLength(MAX_ENTRIES);
    expect(board[0]!.name).toBe("hi");
    expect(board.some((e) => e.score === 100)).toBe(false); // worst evicted
  });

  it("an empty board qualifies any score", async () => {
    const lb = new Leaderboard(new MemoryLeaderboardStore());
    expect(await lb.wouldQualify(-5, poker)).toBe(true);
    expect(await lb.wouldQualify(999, golf)).toBe(true);
  });

  it("reports the correct rank for a mid-table entry", async () => {
    const lb = new Leaderboard(new MemoryLeaderboardStore());
    await lb.submit(entry("A", 300, poker));
    await lb.submit(entry("B", 100, poker));
    const mid = await lb.submit(entry("M", 200, poker));
    expect(mid).toEqual({ qualified: true, rank: 2 });
  });
});

describe("LocalLeaderboardStore persistence", () => {
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
    const lb1 = new Leaderboard(new LocalLeaderboardStore(storage));
    await lb1.submit(entry("Nyx", 210, poker));
    // a brand-new store over the same backing storage (simulates a page reload)
    const lb2 = new Leaderboard(new LocalLeaderboardStore(storage));
    const board = await lb2.top(poker);
    expect(board).toHaveLength(1);
    expect(board[0]).toMatchObject({ name: "Nyx", score: 210, mode: poker });
  });

  it("never throws on corrupt or absent data", async () => {
    const storage = fakeStorage();
    storage.data.set("pokerst8ts.leaderboard.v1", "{not valid json");
    const lb = new Leaderboard(new LocalLeaderboardStore(storage));
    expect(await lb.top(poker)).toEqual([]);
    // a subsequent submit still works
    await lb.submit(entry("ok", 5, poker));
    expect(await lb.top(poker)).toHaveLength(1);
  });

  it("stores exactly what is submitted (human-only: no hidden entries appear)", async () => {
    const storage = fakeStorage();
    const lb = new Leaderboard(new LocalLeaderboardStore(storage));
    await lb.submit(entry("You", 133, poker));
    const raw = JSON.parse(storage.data.get("pokerst8ts.leaderboard.v1")!);
    expect(raw).toHaveLength(1);
    expect(raw[0].name).toBe("You");
  });
});

describe("RemoteLeaderboardStore (Windows local-server backend)", () => {
  function stubFetch(impl: typeof fetch): () => void {
    const original = globalThis.fetch;
    globalThis.fetch = impl;
    return () => {
      globalThis.fetch = original;
    };
  }

  it("loads sanitized entries from GET /api/leaderboard", async () => {
    const fetchMock = vi.fn(async () => Response.json({ entries: [entry("A", 210, poker)] }));
    const restore = stubFetch(fetchMock as unknown as typeof fetch);
    try {
      const store = new RemoteLeaderboardStore();
      const entries = await store.load();
      expect(entries).toEqual([entry("A", 210, poker)]);
      expect(fetchMock).toHaveBeenCalledWith("/api/leaderboard");
    } finally {
      restore();
    }
  });

  it("throws on a non-OK load response", async () => {
    const restore = stubFetch(vi.fn(async () => new Response("", { status: 500 })) as unknown as typeof fetch);
    try {
      await expect(new RemoteLeaderboardStore().load()).rejects.toThrow("LEADERBOARD_LOAD_FAILED");
    } finally {
      restore();
    }
  });

  it("POSTs entries to save()", async () => {
    const fetchMock = vi.fn(async () => new Response("", { status: 200 }));
    const restore = stubFetch(fetchMock as unknown as typeof fetch);
    try {
      await new RemoteLeaderboardStore().save([entry("A", 1, poker)]);
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/leaderboard",
        expect.objectContaining({ method: "POST", body: JSON.stringify({ entries: [entry("A", 1, poker)] }) }),
      );
    } finally {
      restore();
    }
  });

  it("POSTs to /api/round-complete on recordRoundPlayed()", async () => {
    const fetchMock = vi.fn(async () => new Response("", { status: 200 }));
    const restore = stubFetch(fetchMock as unknown as typeof fetch);
    try {
      await new RemoteLeaderboardStore().recordRoundPlayed();
      expect(fetchMock).toHaveBeenCalledWith("/api/round-complete", { method: "POST" });
    } finally {
      restore();
    }
  });
});

describe("detectLeaderboardStore", () => {
  it("picks RemoteLeaderboardStore when /api/leaderboard answers with an entries array", async () => {
    const fetchMock = vi.fn(async () => Response.json({ entries: [] }));
    const store = await detectLeaderboardStore(fetchMock as unknown as typeof fetch);
    expect(store).toBeInstanceOf(RemoteLeaderboardStore);
  });

  it("falls back to LocalLeaderboardStore on a network error (no local-server backend)", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("network error");
    });
    const store = await detectLeaderboardStore(fetchMock as unknown as typeof fetch);
    expect(store).toBeInstanceOf(LocalLeaderboardStore);
  });

  it("falls back to LocalLeaderboardStore on a non-OK response (e.g. static GitHub Pages 404)", async () => {
    const fetchMock = vi.fn(async () => new Response("not found", { status: 404 }));
    const store = await detectLeaderboardStore(fetchMock as unknown as typeof fetch);
    expect(store).toBeInstanceOf(LocalLeaderboardStore);
  });

  it("falls back to LocalLeaderboardStore when the body has no entries array", async () => {
    const fetchMock = vi.fn(async () => Response.json({ unexpected: true }));
    const store = await detectLeaderboardStore(fetchMock as unknown as typeof fetch);
    expect(store).toBeInstanceOf(LocalLeaderboardStore);
  });
});

describe("Leaderboard.recordRoundPlayed", () => {
  it("calls through to a store that implements recordRoundPlayed", async () => {
    const recordRoundPlayed = vi.fn(async () => {});
    const store: LeaderboardStore = {
      load: async () => [],
      save: async () => {},
      recordRoundPlayed,
    };
    await new Leaderboard(store).recordRoundPlayed();
    expect(recordRoundPlayed).toHaveBeenCalledOnce();
  });

  it("is a no-op on a store without recordRoundPlayed (e.g. MemoryLeaderboardStore)", async () => {
    await expect(new Leaderboard(new MemoryLeaderboardStore()).recordRoundPlayed()).resolves.toBeUndefined();
  });
});

describe("helpers", () => {
  it("cleanName trims, caps at 12, and falls back to PLAYER", () => {
    expect(cleanName("  Leonidas the Great ")).toBe("Leonidas the");
    expect(cleanName("   ")).toBe("PLAYER");
    expect(cleanName("Ajax")).toBe("Ajax");
  });
  it("todayISO formats YYYY-MM-DD", () => {
    expect(todayISO(new Date(2026, 6, 6))).toBe("2026-07-06");
  });
});
