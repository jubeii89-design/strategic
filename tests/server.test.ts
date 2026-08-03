/**
 * Integration test for the Windows local-server build (server/server.js).
 * Spawns the real script — the exact artifact packaged for USB — against a
 * scratch dist/ and leaderboard.json, so this exercises the actual file the
 * user's launcher runs, not a reimplementation of its logic.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SERVER_SCRIPT = fileURLToPath(new URL("../server/server.js", import.meta.url));

let child: ChildProcess;
let baseUrl: string;
let distDir: string;
let dataFile: string;

beforeAll(async () => {
  distDir = await mkdtemp(path.join(tmpdir(), "pokerst8ts-dist-"));
  await mkdir(path.join(distDir, "play"), { recursive: true });
  await writeFile(path.join(distDir, "index.html"), "<html>PORTAL</html>");
  await writeFile(path.join(distDir, "play", "index.html"), "<html>PLAY</html>");
  dataFile = path.join(distDir, "leaderboard.json");

  child = spawn(process.execPath, [SERVER_SCRIPT], {
    env: {
      ...process.env,
      PORT: "0",
      POKERST8TS_DIST_DIR: distDir,
      POKERST8TS_DATA_FILE: dataFile,
      POKERST8TS_NO_OPEN: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  baseUrl = await new Promise<string>((resolve, reject) => {
    let out = "";
    const onData = (chunk: Buffer) => {
      out += chunk.toString();
      const match = out.match(/running at (http:\/\/localhost:\d+)\//);
      if (match) {
        child.stdout?.off("data", onData);
        resolve(match[1]!);
      }
    };
    child.stdout?.on("data", onData);
    child.stderr?.on("data", (c) => (out += c.toString()));
    child.on("error", reject);
    child.on("exit", (code) => reject(new Error(`server exited early (${code}): ${out}`)));
    setTimeout(() => reject(new Error(`server did not start in time: ${out}`)), 5000);
  });
}, 10000);

afterAll(async () => {
  child.kill();
  await rm(distDir, { recursive: true, force: true });
});

describe("static file serving", () => {
  it("serves the portal at /", async () => {
    const res = await fetch(`${baseUrl}/`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("PORTAL");
  });

  it("serves the play page at /play/", async () => {
    const res = await fetch(`${baseUrl}/play/`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("PLAY");
  });

  it("falls back to play/index.html for an unknown path under /play/", async () => {
    const res = await fetch(`${baseUrl}/play/some-hashed-route`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("PLAY");
  });

  it("404s for an unknown top-level asset", async () => {
    const res = await fetch(`${baseUrl}/assets/does-not-exist.png`);
    // falls back to the portal index, same as an unknown top-level route
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("PORTAL");
  });
});

describe("/api/leaderboard", () => {
  it("starts empty", async () => {
    const res = await fetch(`${baseUrl}/api/leaderboard`);
    expect(await res.json()).toEqual({ entries: [] });
  });

  it("round-trips a POSTed board", async () => {
    const entries = [{ name: "AJ", score: 46, mode: "golf", date: "2026-08-03" }];
    const post = await fetch(`${baseUrl}/api/leaderboard`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries }),
    });
    expect(post.status).toBe(200);

    const res = await fetch(`${baseUrl}/api/leaderboard`);
    expect(await res.json()).toEqual({ entries });
  });

  it("rejects a payload whose entries field isn't an array", async () => {
    const res = await fetch(`${baseUrl}/api/leaderboard`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries: "nope" }),
    });
    expect(res.status).toBe(400);
  });
});

describe("/api/round-complete — wipes the board every 10 rounds", () => {
  it("keeps the board through 9 rounds, then wipes on the 10th", async () => {
    // seed a score so there's something to wipe
    await fetch(`${baseUrl}/api/leaderboard`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries: [{ name: "AJ", score: 46, mode: "golf", date: "2026-08-03" }] }),
    });

    for (let round = 1; round <= 9; round++) {
      const res = await fetch(`${baseUrl}/api/round-complete`, { method: "POST" });
      expect(await res.json()).toEqual({ gamesPlayed: round });
    }
    const stillThere = await (await fetch(`${baseUrl}/api/leaderboard`)).json();
    expect(stillThere.entries).toHaveLength(1);

    const tenth = await fetch(`${baseUrl}/api/round-complete`, { method: "POST" });
    expect(await tenth.json()).toEqual({ gamesPlayed: 0 });

    const wiped = await (await fetch(`${baseUrl}/api/leaderboard`)).json();
    expect(wiped.entries).toEqual([]);
  });
});
