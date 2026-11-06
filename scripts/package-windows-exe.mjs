/**
 * Builds the fully standalone Windows distributable: a single .exe with the
 * Node runtime baked in (Node's Single Executable Application feature), so
 * it runs on a bare PC/laptop with nothing pre-installed — unlike
 * `npm run package:windows` (the lite build), which still requires Node.js
 * to already be on the machine.
 *
 * Usage: node scripts/package-windows-exe.mjs
 *
 * Pipeline: vite build -> SEA blob from server/server.js -> inject that blob
 * into an official win-x64 node.exe (postject) -> zip with dist/ alongside.
 * The win-x64 node.exe is cached under .cache/ after the first run since
 * it's an ~83MB download.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, writeFile, copyFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const NODE_VERSION = process.version; // pin to the version this repo is built/tested with
const CACHE_DIR = path.join(ROOT, ".cache");
const CACHED_NODE_EXE = path.join(CACHE_DIR, `node-${NODE_VERSION}-win-x64.exe`);
const OUT_DIR = path.join(ROOT, "pokerst8ts-windows-standalone-v1.0.0");
const ZIP_NAME = "pokerst8ts-windows-standalone-v1.0.0.zip";

function run(cmd, args, opts = {}) {
  console.log("+", cmd, args.join(" "));
  execFileSync(cmd, args, { stdio: "inherit", cwd: ROOT, ...opts });
}

async function ensureWindowsNodeBinary() {
  if (existsSync(CACHED_NODE_EXE)) {
    console.log(`Using cached ${CACHED_NODE_EXE}`);
    return;
  }
  await mkdir(CACHE_DIR, { recursive: true });
  const url = `https://nodejs.org/dist/${NODE_VERSION}/win-x64/node.exe`;
  console.log(`Downloading ${url} ...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(CACHED_NODE_EXE, buf);
  console.log(`Cached ${(buf.length / 1024 / 1024).toFixed(1)}MB to ${CACHED_NODE_EXE}`);
}

async function main() {
  run("npx", ["vite", "build"]);

  await ensureWindowsNodeBinary();

  await rm(OUT_DIR, { recursive: true, force: true });
  await rm(path.join(ROOT, ZIP_NAME), { force: true });
  await mkdir(OUT_DIR, { recursive: true });

  // 1. SEA blob from the (CommonJS) server entry point.
  const seaConfigPath = path.join(ROOT, "server", "sea-config.json");
  const blobPath = path.join(ROOT, "server", "sea-prep.blob");
  await writeFile(
    seaConfigPath,
    JSON.stringify({ main: "server.js", output: "sea-prep.blob", disableExperimentalSEAWarning: true }, null, 2),
  );
  run("node", ["--experimental-sea-config", "sea-config.json"], { cwd: path.join(ROOT, "server") });

  // 2. Copy the official Windows node.exe, then inject the blob into it.
  const exePath = path.join(OUT_DIR, "pokerst8ts.exe");
  await copyFile(CACHED_NODE_EXE, exePath);
  run("npx", [
    "postject",
    exePath,
    "NODE_SEA_BLOB",
    blobPath,
    "--sentinel-fuse",
    "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2",
  ]);
  await rm(seaConfigPath, { force: true });
  await rm(blobPath, { force: true });

  // 3. dist/ ships alongside the exe — no server.js/.bat needed anymore.
  run("cp", ["-r", path.join(ROOT, "dist"), path.join(OUT_DIR, "dist")]);

  run("zip", ["-r", ZIP_NAME, path.basename(OUT_DIR)], { cwd: ROOT });
  console.log(`\nPackaged: ${ZIP_NAME}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
