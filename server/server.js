/**
 * Zero-dependency local server for the Windows build.
 *
 * Serves the built site (./dist, copied in alongside this file at package
 * time) and backs the leaderboard with a local JSON file instead of browser
 * localStorage, so it works from a plain double-click launcher with no
 * install step. Every completed round ticks a games-played counter; on the
 * 10th round the board wipes itself clean and the counter resets, per the
 * house rule that a round is always shown, whether or not it makes the board.
 *
 * CommonJS (not ESM) on purpose: this same file is also the entry point for
 * the standalone `.exe` build (Node's Single Executable Application feature),
 * where there is no real on-disk path for the running code, so
 * import.meta.url-based path resolution doesn't work. __dirname/require
 * sidestep that entirely, and `node:sea` is used below to detect the packaged
 * case and resolve paths relative to the .exe itself instead.
 */
const { createServer } = require("node:http");
const { exec } = require("node:child_process");
const { readFile, writeFile, rename } = require("node:fs/promises");
const path = require("node:path");
const sea = require("node:sea");

// Packaged as a standalone .exe: resolve next to the executable itself.
// Run as a plain script (dev, tests, the lite Node-required build): resolve
// next to this file, same as before.
const baseDir = sea.isSea() ? path.dirname(process.execPath) : __dirname;
// Overridable for tests; the packaged build always uses the defaults.
const DIST_DIR = process.env.POKERST8TS_DIST_DIR || path.join(baseDir, "dist");
const DATA_FILE = process.env.POKERST8TS_DATA_FILE || path.join(baseDir, "leaderboard.json");
const PORT = process.env.PORT !== undefined ? Number(process.env.PORT) : 5330;
const ROUNDS_BEFORE_WIPE = 10;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp3": "audio/mpeg",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".md": "text/markdown; charset=utf-8",
};

function defaultData() {
  return { gamesPlayed: 0, entries: [] };
}

async function readData() {
  try {
    const parsed = JSON.parse(await readFile(DATA_FILE, "utf8"));
    if (parsed && typeof parsed.gamesPlayed === "number" && Array.isArray(parsed.entries)) {
      return parsed;
    }
  } catch {
    /* missing or corrupt file — start fresh rather than crash the server */
  }
  return defaultData();
}

async function writeData(data) {
  const tmp = `${DATA_FILE}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await rename(tmp, DATA_FILE); // atomic on the same volume — no half-written file on a crash
}

function sendJson(res, status, body) {
  const buf = Buffer.from(JSON.stringify(body));
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Content-Length": buf.length });
  res.end(buf);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function serveStatic(res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel.endsWith("/")) rel += "index.html";
  const filePath = path.normalize(path.join(DIST_DIR, rel));
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  try {
    const data = await readFile(filePath);
    res.writeHead(200, { "Content-Type": MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream" });
    res.end(data);
  } catch {
    // Both pages are plain (non-router) documents, so an unknown path under
    // /play/ falls back to its index instead of a dead 404 mid-game.
    const fallback = rel.startsWith("/play") ? "play/index.html" : "index.html";
    try {
      const data = await readFile(path.join(DIST_DIR, fallback));
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/api/leaderboard" && req.method === "GET") {
    const data = await readData();
    sendJson(res, 200, { entries: data.entries });
    return;
  }

  if (url.pathname === "/api/leaderboard" && req.method === "POST") {
    try {
      const body = JSON.parse(await readBody(req));
      if (!Array.isArray(body.entries)) throw new Error("entries must be an array");
      const data = await readData();
      data.entries = body.entries;
      await writeData(data);
      sendJson(res, 200, { ok: true });
    } catch {
      sendJson(res, 400, { error: "invalid leaderboard payload" });
    }
    return;
  }

  if (url.pathname === "/api/round-complete" && req.method === "POST") {
    const data = await readData();
    data.gamesPlayed += 1;
    if (data.gamesPlayed >= ROUNDS_BEFORE_WIPE) {
      data.gamesPlayed = 0;
      data.entries = [];
    }
    await writeData(data);
    sendJson(res, 200, { gamesPlayed: data.gamesPlayed });
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405);
    res.end("Method not allowed");
    return;
  }

  await serveStatic(res, url.pathname);
});

server.listen(PORT, "127.0.0.1", () => {
  const actualPort = server.address().port;
  const url = `http://localhost:${actualPort}/`;
  console.log(`PokerSt8ts running at ${url}`);
  console.log("Close this window to stop the server.");
  if (process.env.POKERST8TS_NO_OPEN === "1") return;
  const openCommand =
    process.platform === "win32" ? `start "" "${url}"` : process.platform === "darwin" ? `open "${url}"` : `xdg-open "${url}"`;
  exec(openCommand, () => {
    /* best-effort — if it fails, the URL above still works when opened by hand */
  });
});
