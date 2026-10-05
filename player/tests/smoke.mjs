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

  // 一覧に5本（舞台の新作1＋束4）
  const stageTitle = await page.textContent("#stage-title");
  const stack = await page.locator(".fuda").count();
  ok(stageTitle === "霧笛の灯" && stack + 1 === EXPECTED, `${tag} 一覧に${EXPECTED}本（舞台「${stageTitle}」＋束${stack}）`);
  ok(await page.locator("#stage-new").isVisible(), `${tag} 舞台に新作の貼り紙`);
  ok((await page.locator(".fuda .new").count()) === 0, `${tag} 束には新作の印が無い`);
  ok(await page.locator("#stage-stamp").textContent() === "はじめて", `${tag} 未プレイは判子「はじめて」`);
  await page.waitForTimeout(400);
  await shot(page, `list-${w}`);

  // 束の札をクリック → 舞台へ入り、扉が開いて iframe でゲーム
  const firstId = await page.locator(".fuda").first().getAttribute("data-id");
  await page.locator(".fuda .face").first().click();
  ok(await waitGameLoaded(page, firstId), `${tag} 札クリックで iframe にゲーム（${firstId}）が読み込まれる`);
  ok(page.url().endsWith(`#play/${firstId}`), `${tag} URL が #play/${firstId}`);
  ok(await page.locator("#pulled").isVisible(), `${tag} 抜いた札が窓の脇に見える`);
  ok(await page.locator(".door.l").isVisible() && await page.locator(".door.r").isVisible(), `${tag} 扉が残っている`);
  await page.waitForTimeout(1200);
  await shot(page, `play-${w}`);

  // 戻る木札
  await page.click("#back");
  await page.waitForFunction(() => !document.body.classList.contains("playing"));
  ok((await iframeCount(page)) === 0 && !(await isPlaying(page)), `${tag} 戻る木札で一覧へ（iframe が消える）`);
  ok(!page.url().includes("#play/"), `${tag} 戻った後の URL に #play が無い`);
  ok((await page.locator(".fuda").count()) + 1 === EXPECTED, `${tag} 戻った後も${EXPECTED}本`);

  // 「遊ぶ」→ history.back()
  await page.waitForTimeout(700);
  const sid = await page.evaluate(() => location.hash || "") || "";
  await page.click("#play");
  await page.waitForSelector("#behind iframe");
  await page.waitForFunction(() => document.body.classList.contains("playing"));
  await page.evaluate(() => history.back());
  await page.waitForFunction(() => !document.querySelector("#behind iframe"));
  ok(!(await isPlaying(page)) && sid === "", `${tag} history.back() で一覧へ`);

  // キーボード: Tab で札を選び Enter で開く → Esc で戻る
  await page.waitForTimeout(700);
  let found = false;
  for (let i = 0; i < 20 && !found; i++) {
    await page.keyboard.press("Tab");
    found = await page.evaluate(() => !!document.activeElement && document.activeElement.matches(".fuda .face"));
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

  // #play/001-bloom-chain で直接開く → 戻ると一覧
  const direct = await newPage(browser, w, h);
  await direct.page.goto(BASE + "#play/001-bloom-chain", { waitUntil: "load" });
  ok(await waitGameLoaded(direct.page, "001-bloom-chain"), `${tag} #play/001-bloom-chain で直接開ける`);
  await direct.page.click("#back");
  await direct.page.waitForFunction(() => !document.querySelector("#behind iframe"));
  ok(direct.page.url().startsWith(BASE) && !direct.page.url().includes("#play"), `${tag} 直接開いた後も戻る木札で一覧へ（ページを離れない）`);
  ok((await direct.page.locator(".fuda").count()) + 1 === EXPECTED, `${tag} 直接開いた後の一覧も${EXPECTED}本`);
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
  // 扉が開く途中のコマ（390）: 扉が開き切り、札が抜かれている途中
  {
    const { page } = await newPage(browser, 390, 844);
    await page.goto(BASE, { waitUntil: "load" });
    await waitList(page);
    await page.waitForTimeout(300);
    await page.click("#play");
    await page.waitForTimeout(380);
    await shot(page, "open-390");
    await page.close();
  }
}

async function reducedMotion(browser) {
  const { page, errors } = await newPage(browser, 390, 844, "light", "reduce");
  await page.goto(BASE, { waitUntil: "load" });
  await waitList(page);
  await page.click("#play");
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
