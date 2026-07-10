/**
 * Headless UI smoke test: drives the built game through a full round and
 * asserts the intro branding, deck mechanics, and scorecard all behave.
 *
 * Usage:
 *   npm run build && npm run preview -- --port 4317 &
 *   CHROMIUM_PATH=/path/to/chrome BASE_URL=http://localhost:4317 node scripts/smoke.mjs
 *
 * CHROMIUM_PATH defaults to the Playwright-managed Chromium; override for CI.
 */
import { chromium } from "playwright-core";
import { existsSync } from "node:fs";
import { globSync } from "node:fs";

function findChromium() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH || "/opt/pw-browsers";
  const hits = globSync(`${root}/chromium-*/chrome-linux/chrome`);
  if (hits[0] && existsSync(hits[0])) return hits[0];
  throw new Error("Chromium not found; set CHROMIUM_PATH");
}

const EXE = findChromium();
const BASE = process.env.BASE_URL || "http://localhost:4317";
const OUT = process.env.OUT_DIR || ".";

function assert(cond, msg) {
  if (!cond) { console.error("FAIL:", msg); process.exitCode = 1; throw new Error(msg); }
  console.log("ok:", msg);
}

const browser = await chromium.launch({ executablePath: EXE, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

// Real JS errors only. 404s from the art-probe loader (logo/card PNGs not
// present yet) are the intended CSS/SVG fallback, so they are ignored.
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => {
  if (m.type() !== "error") return;
  const t = m.text();
  if (/Failed to load resource/i.test(t) || /assets\//.test(t)) return;
  errors.push(t);
});

await page.goto(BASE, { waitUntil: "networkidle" });

// --- Intro screen ---
const presents = await page.locator(".presents").innerText();
assert(/strategictitans\.ca/i.test(presents), `intro shows the site: "${presents.replace(/\n/g, " ")}"`);
assert(/presents/i.test(presents), "intro says Presents");
const wordmark = await page.locator(".wordmark").innerText();
assert(/PokerSt8ts/i.test(wordmark.replace(/\s/g, "")), `wordmark is PokerSt8ts: "${wordmark}"`);
const link = await page.locator(".presents").getAttribute("href");
assert(link === "https://www.strategictitans.ca", `site link is real: ${link}`);

// --- Course background ---
assert(await page.locator("#bg .course-svg").count() === 1, "course background SVG mounted");
assert(await page.getAttribute("body", "data-bg") === "intro", "intro sets body[data-bg=intro]");
const bgOpacityIntro = await page.locator("#bg").evaluate((el) => getComputedStyle(el).opacity);
assert(Number(bgOpacityIntro) > 0 && Number(bgOpacityIntro) < 1, `course dimmed on intro (opacity ${bgOpacityIntro})`);
await page.screenshot({ path: `${OUT}/bg-intro.png` });

// --- Opponent chooser (defaults to 3) ---
assert(await page.locator(".opp-select .stepper").count() === 1, "opponent chooser present");
assert(/3 AI opponents/.test(await page.locator(".opp-label").innerText()), "defaults to 3 opponents");
await page.locator(".step-btn", { hasText: "+" }).click();
assert(/4 AI opponents/.test(await page.locator(".opp-label").innerText()), "opponent count increments to 4");

// --- Golf mode shows the course full-strength (with 4 opponents) ---
await page.locator(".mode-btn:not(.primary)").click(); // Golf
await page.waitForSelector(".board");
assert(await page.getAttribute("body", "data-bg") === "golf", "golf sets body[data-bg=golf]");
assert(await page.locator(".standings-list .standing-row").count() === 5, "golf standings shows you + 4 AI");
await page.waitForTimeout(650); // let the opacity transition settle
const golfOpacity = Number(await page.locator("#bg").evaluate((el) => getComputedStyle(el).opacity));
assert(golfOpacity > 0.9, `course visible in golf mode (opacity ${golfOpacity})`);
await page.screenshot({ path: `${OUT}/bg-golf.png` });

// back to intro, then start a Poker Points game (course hidden, felt shows)
await page.reload({ waitUntil: "networkidle" });
await page.locator(".mode-btn.primary").click();
await page.waitForSelector(".board");
assert(await page.getAttribute("body", "data-bg") === "poker", "poker sets body[data-bg=poker]");
await page.waitForTimeout(850);
const pokerOpacity = Number(await page.locator("#bg").evaluate((el) => getComputedStyle(el).opacity));
assert(pokerOpacity < 0.05, `course hidden in poker mode / felt shows (opacity ${pokerOpacity})`);
assert(await page.locator(".grid").count() === 2, "two grids render");
assert(await page.locator(".standings-list .standing-row").count() === 4, "poker standings shows you + 3 AI");
assert(await page.locator(".standing-row.you").count() === 1, "human row highlighted in standings");
const preplaced = await page.locator(".board .card:not(.card-empty)").count();
assert(preplaced === 6, `6 cards auto-placed at start (got ${preplaced})`);
assert(await page.locator(".pass-btn").isVisible(), "PASS button visible");
const remainStart = await page.locator(".remain-value").innerText();
assert(remainStart === "41", `cards remaining starts at 41 (got ${remainStart})`);

// --- Place one card; the human's counter ticks and AIs advance in lockstep ---
const aiScoresBefore = await page.locator(".standings-list .standing-row:not(.you) .pts").allInnerTexts();
await page.locator(".card-empty.placeable").first().click();
await page.waitForTimeout(50);
assert(await page.locator(".board .card:not(.card-empty)").count() === 7, "placing adds a card to the board");
assert(await page.locator(".remain-value").innerText() === "40", "counter ticks down on place");

// --- Pass one card ---
await page.locator(".pass-btn").click();
await page.waitForTimeout(50);
assert(await page.locator(".remain-value").innerText() === "39", "counter ticks down on pass");

// --- Fast-play to completion ---
let guard = 0;
while (guard++ < 60) {
  if (await page.locator(".overlay").count() > 0) break;
  const placeable = page.locator(".card-empty.placeable").first();
  if (await placeable.count() > 0) await placeable.click();
  else await page.locator(".pass-btn").click();
  await page.waitForTimeout(15);
}
assert(await page.locator(".overlay").count() > 0, "end panel appears when the round completes");
assert(await page.locator(".board .card:not(.card-empty)").count() === 36, "all 36 cells filled at completion");

// --- Final standings rank all 4 players ---
const finalRows = await page.locator(".standings.final .standing-row").count();
assert(finalRows === 4, `final standings rank all players (got ${finalRows})`);
const roundCell = await page.locator(".scorecard .round").innerText();
const youPts = await page.locator(".standings.final .standing-row.you .pts").innerText();
assert(youPts === roundCell, `human final score (${youPts}) matches scorecard ROUND (${roundCell})`);
await page.screenshot({ path: `${OUT}/smoke-complete.png`, fullPage: true });

// --- Leaderboard: first finish always qualifies → name prompt → submit ---
await page.waitForSelector(".name-prompt");
assert(await page.locator(".name-prompt .name-input").count() === 1, "name prompt appears on a qualifying finish");
await page.locator(".name-prompt .name-input").fill("TESTER");
await page.locator(".name-prompt .mode-btn.primary").click();
await page.waitForSelector(".leaderboard-screen");
const lbNames = await page.locator(".lb-table .lb-name").allInnerTexts();
assert(lbNames.includes("TESTER"), `submitted score shows on the leaderboard: ${JSON.stringify(lbNames)}`);
assert(await page.locator(".lb-table tr.lb-hi").count() === 1, "the new entry is highlighted");
assert(youPts === (await page.locator(".lb-table tr.lb-hi .lb-score").innerText()), "leaderboard score matches the round");
// AI names never appear as leaderboard entries (human-only)
for (const ai of ["Leonidas", "Ajax", "Helena", "Cyrus"]) {
  assert(!lbNames.includes(ai), `AI '${ai}' is NOT on the leaderboard`);
}
await page.screenshot({ path: `${OUT}/smoke-leaderboard.png` });

// --- Persistence across a full page reload (localStorage) ---
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(950);
await page.locator(".lb-link").click();
await page.waitForSelector(".leaderboard-screen");
const afterReload = await page.locator(".lb-table .lb-name").allInnerTexts();
assert(afterReload.includes("TESTER"), `score persists across reload: ${JSON.stringify(afterReload)}`);

assert(errors.length === 0, `no page/console errors (${errors.length}): ${errors.slice(0, 3).join(" | ")}`);

await browser.close();
console.log("\nSMOKE TEST PASSED");
