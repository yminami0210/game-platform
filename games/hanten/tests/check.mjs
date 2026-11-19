// 反転一行の確認: node games/hanten/tests/check.mjs （どこからでも可）
//  静的: 字数 400〜700 / 反転の種類が重複しない / 必須項目 / 共有物にラストの一行がない / OGP 1200x630 / 生成物が最新
//  ブラウザ: 一覧 → 各話を最後まで読む → 読了印 → 共有ボタン（Web Share・X フォールバック）→ 共有ページの転送
//            localStorage 不可でも読める / 公開日前の話は一覧に出ない / ライト・ダーク / ページエラー 0
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
const { loadStories, storyOg, ogDescription } = await import(path.join(root, "tools", "build.mjs"));

let failed = 0;
const ok = (c, m) => { if (c) console.log("  ok -", m); else { failed++; console.log("  NG -", m); } };

// ---- 静的 ----
console.log("[静的]");
const all = loadStories();
ok(all.length >= 4, `作品数 ${all.length}`);
const twists = new Set();
for (const s of all) {
  const n = (s.paras.join("") + s.last).length;
  ok(n >= 400 && n <= 700, `${s.id}「${s.title}」${n}字（400〜700）`);
  ok(["id", "title", "date", "twist", "premise", "paras", "last"].every((k) => s[k]), `${s.id} 必須項目`);
  ok(!twists.has(s.twist), `${s.id} 反転の種類「${s.twist}」は他と重複しない`);
  twists.add(s.twist);
  ok(!s.paras.includes(s.last), `${s.id} 最後の一行は本文と別`);
  const stub = fs.readFileSync(path.join(root, "w", `${s.id}.html`), "utf8");
  ok(stub.includes(`og/${s.id}.png`) && stub.includes("summary_large_image") && stub.includes(`?id=${s.id}`), `${s.id} 共有ページに OGP メタと転送`);
  ok(stub.includes(ogDescription(s).replace(/"/g, "&quot;")), `${s.id} 共有ページが最新（build 済み）`);
  ok(!stub.includes(s.last) && !storyOg(s).includes(s.last), `${s.id} 共有ページ・OGP にラストの一行なし`);
  ok(storyOg(s).includes("最後の一行で、この意味が変わる。"), `${s.id} OGP に「最後の一行で、この意味が変わる。」`);
  const png = fs.readFileSync(path.join(root, "og", `${s.id}.png`));
  ok(png.readUInt32BE(16) === 1200 && png.readUInt32BE(20) === 630, `${s.id} OGP 画像 1200x630`);
}
ok(all.filter((s) => s.special && s.monologue).length >= 1, "独白の特別回がある");
const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
ok(all.every((s) => readme.includes(`反転の種類: ${s.twist}`) && readme.includes(`読者が置く前提: ${s.premise}`)), "README に各話の反転の種類と前提");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
ok(["og:title", "og:image", "twitter:card"].every((k) => index.includes(`"${k}"`)), "一覧ページの OGP メタ");

// ---- ブラウザ ----
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json" };
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
const browser = await chromium.launch();
const LATER = new Date("2027-01-15T12:00:00+09:00");

async function newPage(scheme, { noStorage = false, noShare = false, when = LATER } = {}) {
  const ctx = await browser.newContext({ ...devices["iPhone 13"], colorScheme: scheme });
  const page = await ctx.newPage();
  page.errors = [];
  page.on("pageerror", (e) => page.errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error" && !/404/.test(m.text())) page.errors.push(m.text()); });
  await page.clock.setFixedTime(when);
  await page.addInitScript(({ noStorage, noShare }) => {
    window.__shared = []; window.__opened = [];
    if (noShare) delete Navigator.prototype.share;
    else navigator.share = async (d) => { window.__shared.push(d); };
    window.open = (u) => { window.__opened.push(u); return null; };
    if (noStorage) Object.defineProperty(window, "localStorage", { get() { throw new Error("blocked"); } });
  }, { noStorage, noShare });
  return page;
}
async function readThrough(page, s) {
  for (let i = 0; i < s.paras.length + 1; i++) await page.locator("#page").click({ position: { x: 30, y: 60 } });
  await page.locator("#end").waitFor({ state: "visible" });
}

for (const scheme of ["light", "dark"]) {
  console.log(`[ブラウザ ${scheme}]`);
  const page = await newPage(scheme);
  await page.goto(url);
  await page.locator("#works li a").first().waitFor();
  ok(await page.locator("#works li a").count() === all.length, "一覧に全話（公開日後）");
  ok(await page.locator(".badge.read").count() === 0, "最初は読了印なし");
  await page.screenshot({ path: path.join(shots, `${scheme}-01-list.png`) });

  for (const s of all) {
    await page.goto(url);
    await page.locator(`#works a[data-id="${s.id}"]`).click();
    await page.waitForURL(`**/?id=${s.id}`);
    await page.locator("#paras p").first().waitFor();
    ok((await page.locator("#paras p").first().textContent()) === s.paras[0], `${s.id} 一段落目から始まる`);
    if (s.id === "001" && scheme === "light") {
      for (let i = 0; i < 6; i++) await page.locator("#page").click({ position: { x: 30, y: 60 } });
      await page.screenshot({ path: path.join(shots, `${scheme}-02-reading-${s.id}.png`) });
      await page.reload(); await page.locator("#paras p").first().waitFor();
    }
    await readThrough(page, s);
    ok((await page.locator("#paras p.lastline").textContent()) === s.last, `${s.id} 最後の一行が最後に出る`);
    ok(await page.locator("#paras p").count() === s.paras.length + 1, `${s.id} 段落数`);
    const preview = await page.locator("#sharePreview").textContent();
    ok(preview.includes(s.paras[0]) && !preview.includes(s.last), `${s.id} 共有文: 最初の一行あり・ラストなし`);
    await page.screenshot({ path: path.join(shots, `${scheme}-03-end-${s.id}.png`), fullPage: true });
    await page.locator("#share").click();
    const shared = await page.evaluate(() => window.__shared.at(-1));
    ok(shared && shared.url.endsWith(`/w/${s.id}.html`) && shared.text.includes("最後の一行で、この意味が変わる。") && !shared.text.includes(s.last), `${s.id} 共有ボタン → Web Share（URL・本文）`);
  }
  await page.goto(url);
  await page.locator("#works li a").first().waitFor();
  ok(await page.locator(".badge.read").count() === all.length, "一覧に全話の読了印");
  await page.screenshot({ path: path.join(shots, `${scheme}-04-list-read.png`) });
  ok(page.errors.length === 0, `ページエラー 0 ${page.errors.join(" / ")}`);
  await page.context().close();
}

console.log("[ブラウザ その他]");
{ // Web Share 非対応 → X の投稿画面
  const page = await newPage("light", { noShare: true });
  await page.goto(`${url}?id=003`);
  await page.locator("#paras p").first().waitFor();
  await readThrough(page, all[2]);
  await page.locator("#share").click();
  const opened = await page.evaluate(() => window.__opened.at(-1) || "");
  const q = new URL(opened).searchParams;
  ok(opened.startsWith("https://twitter.com/intent/tweet") && q.get("url").endsWith("/w/003.html") && !q.get("text").includes(all[2].last), "非対応端末は X 投稿画面（ラストなし）");
  await page.context().close();
}
{ // localStorage 不可でも最後まで読める
  const page = await newPage("dark", { noStorage: true });
  await page.goto(url);
  await page.locator("#works li a").first().waitFor();
  await page.goto(`${url}?id=004`);
  await page.locator("#paras p").first().waitFor();
  ok(await page.locator(".monologue").count() === 1 && await page.locator("#rSpecial").isVisible(), "004 は独白の組版・特別回表示");
  await readThrough(page, all[3]);
  ok(await page.locator("#end").isVisible(), "localStorage 不可でも読了まで行ける");
  ok(page.errors.length === 0, `ページエラー 0 ${page.errors.join(" / ")}`);
  await page.context().close();
}
{ // 公開日前の話は一覧に出ず、次回予告だけ出る
  const page = await newPage("light", { when: new Date("2026-11-28T09:00:00+09:00") });
  await page.goto(url);
  await page.locator("#works li a").first().waitFor();
  const ids = await page.locator("#works li a").evaluateAll((as) => as.map((a) => a.dataset.id));
  ok(ids.join(",") === "002,001", `11/28 時点は 001・002 だけ（新しい順）: ${ids}`);
  ok((await page.locator(".soon").textContent()).includes("12月4日 公開"), "次回予告");
  await page.screenshot({ path: path.join(shots, "light-05-list-schedule.png") });
  await page.context().close();
}
{ // 共有ページ → 本編へ転送
  const page = await newPage("light");
  await page.goto(`${url}w/002.html`);
  await page.waitForURL(`**/?id=002`);
  await page.locator("#paras p").first().waitFor();
  ok(true, "w/002.html → ?id=002 に転送");
  await page.goto(`${url}?id=999`);
  await page.locator("#missing").waitFor();
  ok(true, "存在しない id は「見つかりません」");
  await page.context().close();
}

await browser.close();
server.close();
console.log(failed ? `\nFAIL (${failed})` : "\nPASS");
process.exit(failed ? 1 : 0);
