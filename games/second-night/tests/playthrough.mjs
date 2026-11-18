// 自動ゲート（novel 版 gate_check）: 通しプレイ＋数値基準
// 実行: node games/second-night/tests/playthrough.mjs  （どこからでも可）
//  - 冒頭3タップ以内に引き（「おかえり」）が出る
//  - 一度目の本文量から読了時間を見積もり、答え合わせ込みで 5〜9 分に収まる
//  - 途中保存→リロード→「つづきから」で同じ段落に戻る
//  - 一度目→結末→答え合わせ7問（正誤を混ぜる）→終章→結果（n/7）→共有文にネタバレなし
//  - OGP 画像が 1200x630、og/twitter メタが揃っている
//  - ライト／ダーク両方、ページエラー 0
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

const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".webmanifest": "application/manifest+json" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p.endsWith("/")) p += "index.html";
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": types[path.extname(f)] || "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const url = `http://127.0.0.1:${server.address().port}/`;

let failed = 0;
const assert = (c, m) => { if (c) console.log("  ok -", m); else { failed++; console.log("  NG -", m); } };

// ---- 静的チェック ----
globalThis.window = {};
await import(path.join(root, "story.js"));
const S = globalThis.window.STORY;
const plain = (p) => (typeof p === "string" ? p : p.text);
const readChars = S.scenes.flatMap((s) => s.paras).map(plain).join("").length;
const quizChars = S.quiz.reduce((a, q) => a + q.lines.join("").length + q.note.length, 0) + S.epilogue.paras.map(plain).join("").length;
const CPM = 450; // スマホで物語を読む速さ（字/分）の控えめな見積もり
const minutes = (readChars + quizChars) / CPM + S.quiz.length * 0.15 + S.scenes.length * 0.1;
console.log(`[静的] 一度目 ${readChars}字 / 答え合わせ+終章 ${quizChars}字 → 見積り ${minutes.toFixed(1)}分`);
assert(minutes >= 5 && minutes <= 9, "全体が7分前後（5〜9分）");
assert(S.quiz.length === 7, "答え合わせは7問");
const allText = S.scenes.flatMap((s) => s.paras).map(plain).join("\n");
assert(S.quiz.every((q) => q.lines.every((l) => allText.includes(l))), "答え合わせの各行は本文と一字一句同じ");
assert(S.scenes[0].paras.slice(0, 4).map(plain).join("").includes("おかえり"), "冒頭3タップ以内に引き");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
assert(["og:title", "og:description", "og:image", "og:image:width", "twitter:card", "twitter:image"].every((k) => html.includes(`"${k}"`)), "og/twitter メタ");
const png = fs.readFileSync(path.join(root, "og.png"));
assert(png.readUInt32BE(16) === 1200 && png.readUInt32BE(20) === 630, "OGP 画像 1200x630");

// ---- ブラウザ ----
const browser = await chromium.launch();
const errors = [];
const tapRead = async (page) => page.locator("#page").click({ position: { x: 24, y: 120 } });

async function readAll(page, label) {
  for (let guard = 0; guard < 400; guard++) {
    if (await page.locator("#screen-end1").isVisible()) return;
    if (await page.locator("#btn-next").isVisible()) {
      if (label && (await page.locator("#bar-progress").textContent()).startsWith("6 /")) {
        await page.waitForTimeout(2600);
        await page.screenshot({ path: path.join(shots, `${label}-03-first-ending.png`) });
        label = null;
      }
      await page.locator("#btn-next").click();
    } else await tapRead(page);
  }
  throw new Error("一度目が終わらない");
}

for (const [label, scheme] of [["light", "light"], ["dark", "dark"]]) {
  console.log(`[${label}]`);
  const ctx = await browser.newContext({ ...devices["iPhone 13"], colorScheme: scheme });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(url);
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(shots, `${label}-01-title.png`) });
  assert((await page.locator("#btn-start").textContent()) === "はじめる", "タイトル（初回）");

  await page.locator("#btn-start").click();
  for (let i = 0; i < 3; i++) await tapRead(page);
  assert((await page.locator("#paras").innerText()).includes("おかえり"), "3タップで「おかえり」が出る");
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(shots, `${label}-02-hook.png`) });

  // 途中保存→再開
  await page.locator("#btn-next").waitFor({ state: "hidden" });
  for (let i = 0; i < 3; i++) await tapRead(page);
  const before = await page.locator("#paras > p:not(.is-hidden)").count();
  await page.reload();
  assert((await page.locator("#btn-start").textContent()) === "つづきから", "再訪時に「つづきから」");
  await page.locator("#btn-start").click();
  const after = await page.locator("#paras > p:not(.is-hidden)").count();
  assert(before === after && before === 7, `同じ段落から再開（${before}→${after}）`);

  await readAll(page, label);
  assert(await page.locator("#screen-end1").isVisible(), "一度目の結末");
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(shots, `${label}-04-end1.png`) });

  // 答え合わせ：偶数問は正解、奇数問は外す → 4/7
  await page.locator("#btn-second").click();
  for (let q = 0; q < 7; q++) {
    const ans = S.quiz[q].answer;
    const pick = q % 2 === 0 ? ans : (ans + 1) % 3;
    if (q === 0) { await page.waitForTimeout(900); await page.screenshot({ path: path.join(shots, `${label}-05-quiz.png`) }); }
    await page.locator(".qline").nth(pick).click();
    if (q === 2) {
      // 答えた直後にリロードしても状態が残る
      await page.reload(); await page.locator("#btn-start").click();
      assert(await page.locator(".qnote").isVisible(), "答え合わせの途中から再開");
    }
    if (q === 1) { await page.waitForTimeout(1500); await page.screenshot({ path: path.join(shots, `${label}-06-quiz-answer.png`) }); }
    await page.locator("#quiz-next").click();
  }
  // 終章
  for (let g = 0; g < 30 && !(await page.locator("#btn-next").isVisible()); g++) await tapRead(page);
  await page.waitForTimeout(2600);
  await page.screenshot({ path: path.join(shots, `${label}-07-epilogue.png`) });
  await page.locator("#btn-next").click();
  const res = await page.locator("#end2-found").innerText();
  assert(/気づけたのは\s*4\s*つ/.test(res), "結果 4/7: " + res.split("\n")[0]);
  const href = decodeURIComponent(await page.locator("#link-x").getAttribute("href"));
  assert(href.includes("7つ中 4つ") && !/お父さん|老人|認知|娘|父/.test(href), "共有文に数・ネタバレなし");
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(shots, `${label}-08-result.png`) });

  await page.reload();
  assert((await page.locator("#btn-start").textContent()) === "答え合わせをする", "クリア後のタイトル");
  await ctx.close();
}

// localStorage が使えない環境でも最後まで動く
{
  const ctx = await browser.newContext({ ...devices["iPhone 13"] });
  await ctx.addInitScript(() => { Object.defineProperty(window, "localStorage", { get() { throw new Error("blocked"); } }); });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push("[no-storage] " + e.message));
  await page.goto(url);
  await page.locator("#btn-start").click();
  await readAll(page);
  assert(await page.locator("#screen-end1").isVisible(), "localStorage 不可でも一度目を読了");
  await ctx.close();
}

await browser.close();
server.close();
assert(errors.length === 0, "ページエラー 0" + (errors.length ? ": " + errors.slice(0, 3).join(" / ") : ""));
console.log(failed ? `FAIL (${failed})` : "PASS");
process.exit(failed ? 1 : 0);
