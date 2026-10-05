// あそびば（player）の通しテスト。
// 使い方: リポジトリのルートで `python3 -m http.server 8765` を動かしてから
//   node player/tests/smoke.mjs            … テストだけ
//   node player/tests/smoke.mjs --shots    … テスト＋スクショ（player/shots/）
// BASE で別のポートを指せる（例: BASE=http://localhost:3000/player/）。
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const require = createRequire(import.meta.url);
const { chromium } = require("/opt/node22/lib/node_modules/playwright");

const BASE = process.env.BASE || "http://localhost:8765/player/";
const SHOTS = process.argv.includes("--shots");
const here = path.dirname(fileURLToPath(import.meta.url));
const shotDir = path.join(here, "..", "shots");
const EXPECTED = 5;

// Google Fonts は curl（プロキシ・CA 設定済み）で取って渡す。TLS 検証は切らない
const fontCache = new Map();
async function fontRoute(route) {
  const url = route.request().url();
  try {
    if (!fontCache.has(url)) {
      fontCache.set(url, execFileSync("curl", ["-sSL", "--fail", "--cacert", "/root/.ccr/ca-bundle.crt", "-A",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36", url], { maxBuffer: 1 << 26 }));
    }
    const type = url.includes("googleapis") ? "text/css" : "font/woff2";
    await route.fulfill({ status: 200, body: fontCache.get(url), headers: { "content-type": type, "access-control-allow-origin": "*" } });
  } catch {
    await route.fulfill({ status: 200, body: "", headers: { "content-type": url.includes("googleapis") ? "text/css" : "font/woff2" } });
  }
}

let failures = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? "ok  " : "FAIL"} ${msg}`);
  if (!cond) failures++;
};

async function newPage(browser, w, h, scheme = "light", motion = "no-preference") {
  const page = await browser.newPage({ viewport: { width: w, height: h }, colorScheme: scheme, reducedMotion: motion, deviceScaleFactor: 1 });
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(`${m.text()} @ ${m.location().url || ""}`); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, fontRoute);
  return { page, errors };
}

const iframeCount = (page) => page.locator("#behind iframe").count();
const isPlaying = (page) => page.evaluate(() => document.body.classList.contains("playing"));

async function waitList(page) {
  await page.waitForSelector(".fuda .face");
  await page.evaluate(() => document.fonts.ready);
}
async function waitGameLoaded(page, id) {
  await page.waitForSelector("#behind iframe");
  await page.waitForFunction(() => document.body.classList.contains("playing"), null, { timeout: 5000 });
  const frame = page.frames().find((f) => f.url().includes(`/arcade/games/${id}/index.html`));
  if (!frame) return false;
  await frame.waitForLoadState("load");
  const title = await frame.evaluate(() => document.title);
  return !!title;
}
const shot = async (page, name) => {
  if (!SHOTS) return;
  fs.mkdirSync(shotDir, { recursive: true });
  await page.screenshot({ path: path.join(shotDir, `${name}.png`) });
};

async function run(browser, w, h) {
  const tag = `[${w}x${h}]`;
  const { page, errors } = await newPage(browser, w, h);
  await page.goto(BASE, { waitUntil: "load" });
  await waitList(page);

  // 一覧: 全演目が同じ大きさの絵札で、新しい順に5本
  const ids = await page.locator(".fuda").evaluateAll((els) => els.map((e) => e.dataset.id));
  ok(ids.length === EXPECTED && ids[0] === "005-lighthouse-keeper" && ids[4] === "001-bloom-chain", `${tag} 一覧に${EXPECTED}本（新しい順: ${ids.join(", ")}）`);
  const sizes = await page.locator(".fuda .pic").evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().width)));
  ok(new Set(sizes).size === 1, `${tag} 絵札がみな同じ大きさ（${sizes[0]}px）`);
  const perRow = await page.locator(".fuda").evaluateAll((els) => els.filter((e) => Math.abs(e.getBoundingClientRect().top - els[0].getBoundingClientRect().top) < 20).length);
  ok(w < 600 ? perRow === 2 : perRow >= 3 && perRow <= 4, `${tag} 横に${perRow}枚並ぶ`);
  // 各札に台本の全文（fuda.json の script）が見えている
  const fuda = JSON.parse(fs.readFileSync(path.join(here, "..", "data", "fuda.json"), "utf8"));
  const scripts = await page.locator(".fuda").evaluateAll((els) => els.map((e) => {
    const p = e.querySelector(".script p");
    const r = p.getBoundingClientRect();
    return { id: e.dataset.id, text: p.textContent, visible: r.height > 20 && p.scrollHeight <= p.clientHeight + 1 && getComputedStyle(p).visibility === "visible" };
  }));
  const bad = scripts.filter((s) => !s.visible || (fuda[s.id] && fuda[s.id].script && s.text !== fuda[s.id].script));
  ok(bad.length === 0, `${tag} 各札に説明文が全文見える${bad.map((b) => " ×" + b.id).join("")}`);
  ok((await page.locator(".fuda .new:not([hidden])").count()) === 2, `${tag} 新作の貼り紙は新しい2本だけ`);
  const stamps = await page.locator(".fuda .stamp").allTextContents();
  ok(stamps.length === EXPECTED && stamps.every((s) => s === "はじめて"), `${tag} 未プレイは各札に判子「はじめて」`);
  ok((await page.locator(".fuda .play").count()) === EXPECTED, `${tag} 各札に「遊ぶ」`);
  ok(!(await page.locator("#stage").isVisible()), `${tag} 一覧では舞台は出ていない`);
  ok(await page.locator(".marquee .sign").isVisible(), `${tag} 梁と看板「あそびば」が一覧の上にある`);
  await page.waitForTimeout(400);
  await shot(page, `list-${w}`);

  // 札の絵をクリック → 舞台が現れ、扉が開いて iframe でゲーム（縦長の「水みち」）
  const firstId = "004-water-lines";
  await page.locator(`.fuda[data-id="${firstId}"] .pic`).click();
  ok(await waitGameLoaded(page, firstId), `${tag} 札クリックで iframe にゲーム（${firstId}）が読み込まれる`);
  ok(page.url().endsWith(`#play-${firstId}`), `${tag} URL が #play-${firstId}`);
  ok(await page.locator("#pulled").isVisible(), `${tag} 抜いた札が窓の脇に見える`);
  ok(await page.locator(".door.l").isVisible() && await page.locator(".door.r").isVisible(), `${tag} 扉が残っている`);
  await page.waitForTimeout(1200);
  await shot(page, `play-${w}`);
  const box = await page.locator("#pulled").boundingBox();
  ok(box && box.x >= 0 && box.x + box.width <= w + 1, `${tag} 抜いた札が画面の中に収まる（左右）`);
  if (w >= 900) {
    const win = await page.locator("#window").boundingBox();
    const ratio = win.width / win.height;
    ok(Math.abs(ratio - 0.6) < 0.08, `${tag} 縦長のゲームでは窓も縦長（幅/高さ ${ratio.toFixed(2)}）`);
  }

  // 戻る木札
  await page.click("#back");
  await page.waitForFunction(() => !document.body.classList.contains("playing"));
  ok((await iframeCount(page)) === 0 && !(await isPlaying(page)), `${tag} 戻る木札で一覧へ（iframe が消える）`);
  ok(!page.url().includes("#play-"), `${tag} 戻った後の URL に #play が無い`);
  await page.waitForFunction(() => !document.body.classList.contains("staging"));
  ok((await page.locator(".fuda").count()) === EXPECTED && !(await page.locator("#stage").isVisible()), `${tag} 戻った後は一覧に${EXPECTED}本、舞台は閉じる`);

  // 「遊ぶ」→ history.back()
  await page.locator(".fuda .play").first().click();
  await page.waitForSelector("#behind iframe");
  await page.waitForFunction(() => document.body.classList.contains("playing"));
  await page.evaluate(() => history.back());
  await page.waitForFunction(() => !document.querySelector("#behind iframe"));
  ok(!(await isPlaying(page)) && !page.url().includes("#play-"), `${tag} history.back() で一覧へ`);
  await page.waitForFunction(() => !document.body.classList.contains("staging"));

  // キーボード: Tab で札（遊ぶ）を選び Enter で開く → Esc で戻る
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  let found = false;
  for (let i = 0; i < 20 && !found; i++) {
    await page.keyboard.press("Tab");
    found = await page.evaluate(() => !!document.activeElement && document.activeElement.matches(".fuda .play"));
  }
  const focusVisible = found && await page.evaluate(() => getComputedStyle(document.activeElement.closest(".fuda"), "::after").content !== "none");
  ok(found && focusVisible, `${tag} Tab で札に焦点が来て枠が見える`);
  if (found) {
    await page.keyboard.press("Enter");
    await page.waitForSelector("#behind iframe");
    await page.waitForFunction(() => document.body.classList.contains("playing"));
    await page.focus("#back");
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector("#behind iframe"));
    ok(!(await isPlaying(page)), `${tag} Enter で開き Esc で一覧へ`);
  }

  // #play-001-bloom-chain で直接開く → 戻ると一覧
  const direct = await newPage(browser, w, h);
  await direct.page.goto(BASE + "#play-001-bloom-chain", { waitUntil: "load" });
  ok(await waitGameLoaded(direct.page, "001-bloom-chain"), `${tag} #play-001-bloom-chain で直接開ける`);
  await direct.page.click("#back");
  await direct.page.waitForFunction(() => !document.querySelector("#behind iframe"));
  ok(direct.page.url().startsWith(BASE) && !direct.page.url().includes("#play"), `${tag} 直接開いた後も戻る木札で一覧へ（ページを離れない）`);
  ok((await direct.page.locator(".fuda").count()) === EXPECTED, `${tag} 直接開いた後の一覧も${EXPECTED}本`);
  await direct.page.close();

  ok(errors.length === 0 && direct.errors.length === 0, `${tag} コンソールエラーなし${errors.concat(direct.errors).map((e) => "\n     " + e).join("")}`);
  await page.close();
}

async function extraShots(browser) {
  // ダーク
  {
    const { page } = await newPage(browser, 390, 844, "dark");
    await page.goto(BASE, { waitUntil: "load" });
    await waitList(page);
    await page.waitForTimeout(400);
    await shot(page, "list-390-dark");
    await page.close();
  }
  {
    const { page } = await newPage(browser, 1280, 800, "dark");
    await page.goto(BASE, { waitUntil: "load" });
    await waitList(page);
    await page.waitForTimeout(400);
    await shot(page, "list-1280-dark");
    await page.close();
  }
  // 遊ぶ画面（PC）を横長のゲームでも（play-1280 は縦長の「水みち」）
  {
    const { page } = await newPage(browser, 1280, 800);
    await page.goto(BASE + "#play-005-lighthouse-keeper", { waitUntil: "load" });
    await waitGameLoaded(page, "005-lighthouse-keeper");
    await page.waitForTimeout(1200);
    await shot(page, "play-1280-wide");
    await page.close();
  }
  // 扉が開く途中のコマ（390）: 扉が開き切り、札が抜かれている途中
  {
    const { page } = await newPage(browser, 390, 844);
    await page.goto(BASE, { waitUntil: "load" });
    await waitList(page);
    await page.waitForTimeout(300);
    await page.locator(".fuda .play").first().click();
    await page.waitForTimeout(720);
    await shot(page, "open-390");
    await page.close();
  }
}

async function reducedMotion(browser) {
  const { page, errors } = await newPage(browser, 390, 844, "light", "reduce");
  await page.goto(BASE, { waitUntil: "load" });
  await waitList(page);
  await page.locator(".fuda .play").first().click();
  const t0 = Date.now();
  await page.waitForFunction(() => document.body.classList.contains("playing"));
  ok(Date.now() - t0 < 300, `[reduced-motion] 扉の動きを省いてすぐ遊ぶ画面（${Date.now() - t0}ms）`);
  ok(errors.length === 0, "[reduced-motion] コンソールエラーなし");
  await page.close();
}

const browser = await chromium.launch();
try {
  await run(browser, 390, 844);
  await run(browser, 1280, 800);
  await reducedMotion(browser);
  if (SHOTS) await extraShots(browser);
} catch (e) {
  failures++;
  console.log("FAIL 例外:", e.message);
} finally {
  await browser.close();
}
console.log(failures ? `\n${failures} 件失敗` : "\nすべて通過");
process.exit(failures ? 1 : 0);
