// 通しプレイ確認: 1周目 → 結末 → 2周目（伏線タップ）→ 終章 → 共有画面
// 実行: node games/second-night/tests/playthrough.mjs  （リポジトリ直下から）
import { createRequire } from "node:module";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium, devices } = require("playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const shots = path.join(root, "tests", "screenshots");
fs.mkdirSync(shots, { recursive: true });

const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p.endsWith("/")) p += "index.html";
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": (types[path.extname(f)] || "application/octet-stream") + "; charset=utf-8" });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const url = `http://127.0.0.1:${server.address().port}/`;

const assert = (c, m) => { if (!c) throw new Error("ASSERT: " + m); console.log("  ok -", m); };
const browser = await chromium.launch();
const errors = [];

async function playRun(page, run, shotAt) {
  const total = await page.evaluate(() => document.getElementById("bar-progress").textContent.split("/")[1].trim());
  for (let s = 1; s <= Number(total); s++) {
    if (run === 1) {
      // 本文をタップで進める
      while (await page.locator("#btn-next").isHidden()) await page.locator("#page").click({ position: { x: 20, y: 40 } });
    } else {
      // 2周目は伏線をすべてタップ
      const hints = page.locator(".hint");
      const n = await hints.count();
      for (let i = 0; i < n; i++) {
        await hints.nth(i).click();
        await page.locator("#sheet").waitFor({ state: "visible" });
        if (shotAt && shotAt.scene === s && i === 0) await page.waitForTimeout(600);
        if (shotAt && shotAt.scene === s && i === 0) await page.screenshot({ path: path.join(shots, shotAt.name) });
        await page.locator("#sheet-close").click();
      }
    }
    if (shotAt && shotAt.end === s) await page.waitForTimeout(2600);
    if (shotAt && shotAt.end === s) await page.screenshot({ path: path.join(shots, shotAt.endName), fullPage: false });
    await page.locator("#btn-next").click();
  }
}

for (const [label, opts] of [["light", { colorScheme: "light" }], ["dark", { colorScheme: "dark" }]]) {
  console.log(`[${label}]`);
  const ctx = await browser.newContext({ ...devices["iPhone 13"], ...opts });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(url);
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(shots, `${label}-01-title.png`) });
  assert(await page.locator("#btn-start").textContent() === "はじめる", "タイトル: 1周目表示");

  await page.locator("#btn-start").click();
  assert(await page.locator(".hint").count() === 0, "1周目はハイライトなし");
  await page.locator("#page").click({ position: { x: 20, y: 40 } });
  await page.locator("#page").click({ position: { x: 20, y: 40 } });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(shots, `${label}-02-first-run.png`) });
  await playRun(page, 1, { end: 10, endName: `${label}-03-first-ending.png` });
  assert(await page.locator("#screen-end1").isVisible(), "1周目の結末画面");
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(shots, `${label}-04-end1.png`) });

  await page.locator("#btn-second").click();
  assert(await page.locator("#bar-run").textContent() === "二度目の夜", "2周目に入る");
  assert(await page.locator(".hint").count() > 0, "2周目は伏線がハイライト");
  const firstText = await page.locator("#paras").innerText();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(shots, `${label}-05-second-run.png`) });
  await playRun(page, 2, { scene: 2, name: `${label}-06-truth-sheet.png`, end: 11, endName: `${label}-07-epilogue.png` });
  assert(await page.locator("#screen-end2").isVisible(), "2周目の結末画面");
  const foundText = await page.locator("#end2-found").innerText();
  assert(/38 \/ 38/.test(foundText), "伏線を全部発見: " + foundText.split("\n")[0]);
  const href = await page.locator("#link-x").getAttribute("href");
  assert(href.startsWith("https://x.com/intent/post?text=") && !/お父さん|老人/.test(decodeURIComponent(href)), "X共有URL（ネタバレなし）");
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(shots, `${label}-08-end2.png`) });

  // リロード後もタイトルが2周目表示になる
  await page.reload();
  assert((await page.locator("#btn-start").textContent()).includes("二度目"), "再訪時タイトルは2周目");
  assert(firstText.length > 50, "本文表示");
  await ctx.close();
}

await browser.close();
server.close();
if (errors.length) { console.error("ページエラー:", errors); process.exit(1); }
console.log("PASS: 通しプレイ完了");
