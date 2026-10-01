#!/usr/bin/env node
// ミニゲームの自動QA。スマホ画面のヘッドレス Chromium で開き、数秒間でたらめに遊んで確かめる。
//   node arcade/bin/qa.mjs arcade/games/<id>        → 要約を数行表示。失敗で exit 1
// 確かめること: 読み込みエラー・実行時エラーが無い / 画面に何か描かれている /
//               入力（タップ・キー）で画面が変わる / 外部への通信をしていない
// スクリーンショットを <game>/qa/ に保存する（start.png・play.png）。
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require("playwright");
} catch {
  playwright = require("/opt/node22/lib/node_modules/playwright");
}

const dir = resolve(process.argv[2] || "");
const html = join(dir, "index.html");
if (!existsSync(html)) {
  console.log(`NG\n- ${html} がありません`);
  process.exit(1);
}

const errors = [];
const warnings = [];
const sizeKB = statSync(html).size / 1024;
if (sizeKB > 300) errors.push(`index.html が ${sizeKB.toFixed(0)}KB です（300KB 以下）`);
const src = readFileSync(html, "utf8");
if (/<(script|link|img|audio|iframe)[^>]+(src|href)=["']https?:/i.test(src)) {
  errors.push("外部のファイルを読み込んでいます（1ファイルで完結させる）");
}
if (!/name=["']viewport["']/i.test(src)) errors.push("viewport の meta タグがありません（スマホ対応）");

const browser = await playwright.chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
page.on("pageerror", (e) => errors.push(`実行時エラー: ${String(e.message).slice(0, 160)}`));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`console.error: ${m.text().slice(0, 160)}`);
});
page.on("request", (r) => {
  const u = r.url();
  if (!u.startsWith("file:") && !u.startsWith("data:") && !u.startsWith("blob:")) {
    errors.push(`外部への通信: ${u.slice(0, 120)}`);
  }
});

mkdirSync(join(dir, "qa"), { recursive: true });
await page.goto(pathToFileURL(html).href);
await page.waitForTimeout(800);
const shot0 = await page.screenshot({ path: join(dir, "qa", "start.png") });

// 画面が真っ白・真っ黒でないか（スクリーンショットのバイト数で粗く判定）
if (shot0.length < 6000) warnings.push("開始画面がほぼ無地です（何も描かれていない可能性）");

// でたらめに遊ぶ: タップ・スワイプ・キー入力を 6 秒
const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space", "Enter", "KeyZ", "KeyX"];
const t0 = Date.now();
let i = 0;
while (Date.now() - t0 < 6000) {
  const x = 40 + ((i * 97) % 310);
  const y = 120 + ((i * 151) % 640);
  if (i % 3 === 0) await page.touchscreen.tap(x, y).catch(() => {});
  else if (i % 3 === 1) await page.mouse.click(x, y).catch(() => {});
  else await page.keyboard.press(keys[i % keys.length]).catch(() => {});
  if (i % 5 === 0) {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(390 - x, 844 - y, { steps: 4 });
    await page.mouse.up();
  }
  i++;
  await page.waitForTimeout(120);
}
const shot1 = await page.screenshot({ path: join(dir, "qa", "play.png") });
if (Buffer.compare(shot0, shot1) === 0) errors.push("入力しても画面が変わりません");

// 横スクロールが出ていないか（スマホではみ出し）
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
if (overflow) warnings.push("横にはみ出しています（スマホで横スクロールが出る）");

await browser.close();

const result = { ok: errors.length === 0, errors, warnings, inputs: i, sizeKB: Math.round(sizeKB) };
writeFileSync(join(dir, "qa", "result.json"), JSON.stringify(result, null, 2) + "\n");
console.log(result.ok ? "OK" : "NG");
for (const e of errors.slice(0, 8)) console.log(`- ${e}`);
for (const w of warnings) console.log(`! ${w}`);
console.log(`(入力 ${i} 回 / ${result.sizeKB}KB / スクショ: ${join(dir, "qa")})`);
process.exit(result.ok ? 0 : 1);
