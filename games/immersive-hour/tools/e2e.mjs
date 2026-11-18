// Playwright による周回と真相解放の動作確認。
// 使い方: (games/immersive-hour で) python3 -m http.server 8765 & node tools/e2e.mjs [出力先ディレクトリ]
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright'); // グローバル導入の playwright も解決できるよう require 経由

const BASE = process.env.BASE || 'http://localhost:8765/';
const OUT = process.argv[2] || 'screenshots';
const shot = (page, name) => page.screenshot({ path: `${OUT}/${name}.png` });
const assert = (cond, msg) => { if (!cond) { throw new Error('FAIL: ' + msg); } console.log('ok -', msg); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(BASE + '?fast=60');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForSelector('#startBtn');
await shot(page, '01-title');

const state = () => page.evaluate(() => window.IH.state);
const waitEnd = () => page.waitForFunction(() => window.IH.state.ended, null, { timeout: 60000 });

// 周 1: 千代を追う。途中で場面の様子を撮る
await page.click('#startBtn');
await page.click('[data-follow="chiyo"]');
await page.waitForFunction(() => window.IH.state.t >= 8.6);
await page.evaluate(() => window.IH.pause());
await shot(page, '02-following-chiyo-clocktower');
let s = await state();
assert(s.room === 'clock' && s.follow === 'chiyo', '追跡で千代と一緒に時計塔へ移動する');
await page.evaluate(() => window.IH.start());
await waitEnd();
await page.waitForSelector('#againBtn');
await shot(page, '03-finale-loop1');
s = await state();
assert(s.loops === 1, '1周目が終演する');
assert(s.truths.includes('T_chiyo'), '1周目で「千代」の真相が解放される');
assert(['C1', 'C3', 'C4', 'C5', 'M2', 'M5'].every(id => s.seen.includes(id)), '千代の場面がすべて記録される');

// 周 2〜4: 手動移動を混ぜつつ、別の人物を追う
for (const who of ['mina', 'haijima', 'iwaki']) {
  await page.click('#againBtn');
  s = await state();
  assert(s.t < 1 && s.room === 'lobby' && !s.ended, `新しい周が 23:00 のロビーから始まる（${who}）`);
  await page.click(`[data-follow="${who}"]`);
  await waitEnd();
  await page.waitForSelector('#againBtn');
  s = await state();
  assert(s.truths.includes(`T_${who}`), `「${who}」の真相が解放される`);
}
assert(!s.truths.includes('T_final'), '支配人室の場面を見るまで最終章は閉じたまま');

// 周 5: 手動移動の確認（隣接していない部屋へは行けない）→ 支配人を追う
await page.click('#againBtn');
await page.evaluate(() => window.IH.pause());
await page.click('[data-room="office"]');
assert((await state()).room === 'lobby', '隣接しない部屋はタップしても移動しない');
await page.click('[data-room="room207"]');
assert((await state()).room === 'room207', '隣の部屋へタップで移動できる');
await page.click('[data-room="lobby"]');
await page.click('[data-follow="shiomi"]');
await waitEnd();
await page.waitForSelector('#againBtn');
s = await state();
assert(s.truths.includes('T_final'), '5周目で最終章「閉じない一時間」が解放される');
assert(s.loops === 5, '周回数が 5 になる');
await shot(page, '04-finale-all-truths');

// 記録帳
await page.click('text=記録帳を開く');
await page.click('.tabs [data-tab="truths"]');
await shot(page, '05-book-truths');
await page.click('.tabs [data-tab="people"]');
await shot(page, '06-book-people');
await page.click('.tabs [data-tab="scenes"]');
await shot(page, '07-book-scenes');

// 記録は再読み込み後も残る
await page.reload();
await page.waitForSelector('#startBtn');
s = await state();
assert(s.loops === 5 && s.truths.length === 5, '再読み込み後も記録と周回数が残る');
assert((await page.textContent('#startBtn')).includes('第6周'), 'タイトルに次の周回数が出る');

assert(errors.length === 0, 'コンソールエラーなし ' + errors.join(' | '));
await browser.close();
console.log(`見た場面: ${s.seen.length}`);
