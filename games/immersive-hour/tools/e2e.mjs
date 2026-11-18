// Playwright による周回と手がかり開示の動作確認（スマホ 390×844）。
// 使い方: (games/immersive-hour で) python3 -m http.server 8765 & node tools/e2e.mjs [出力先ディレクトリ]
import { createRequire } from 'node:module';
import { mkdirSync, readdirSync, unlinkSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');

const BASE = process.env.BASE || 'http://localhost:8765/';
const OUT = process.argv[2] || 'screenshots';
mkdirSync(OUT, { recursive: true });
for (const f of readdirSync(OUT)) if (f.endsWith('.png')) unlinkSync(`${OUT}/${f}`);
const shot = (page, name) => page.screenshot({ path: `${OUT}/${name}.png` });
let n = 0;
const assert = (cond, msg) => { if (!cond) throw new Error('FAIL: ' + msg); n++; console.log('ok -', msg); };

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
const question = await page.evaluate(() => fetch('scenarios/shiomi-hotel.json').then(r => r.json()).then(j => j.question));
const sheetFirst = await page.evaluate(() => document.querySelector('#sheet').firstElementChild.textContent);
assert(question && sheetFirst === question, 'タイトルの最上部に question が出る');
assert((await page.textContent('#question')) === question, 'プレイ中ヘッダー直下に question が常時出る');
await shot(page, '01-title');

const state = () => page.evaluate(() => window.IH.state);
const waitEnd = () => page.waitForFunction(() => window.IH.state.ended, null, { timeout: 60000 });
const finish = async () => { await waitEnd(); await page.waitForSelector('#againBtn'); return state(); };
const has = (s, ...ids) => ids.every(id => s.truths.includes(id));

// 周1: ロビーに居続ける
await page.click('#startBtn');
let s = await finish();
await shot(page, '03-finale');
assert(s.loops === 1 && has(s, 'K_bag', 'K_case'), '周1: ロビーに居続けると K_bag と K_case が開く');

// 周2: もう一度ロビー → 噂
await page.click('#againBtn');
s = await finish();
assert(s.loops === 2 && s.truths.length === 3 && s.rumor, '周2: 新しい手がかりが無いので噂として1つ開く（成果ゼロにならない）');
assert((await page.textContent('#sheet')).includes('終演後、ロビーで耳にした噂'), '周2: 噂の見出しが表示される');
await shot(page, '04-finale-rumor');

// 周3: 千代を追う
await page.click('#againBtn');
s = await state();
assert(s.t < 1 && s.room === 'lobby' && !s.ended, '新しい周が 23:40 のロビーから始まる');
await page.click('[data-follow="chiyo"]');
await page.waitForFunction(() => window.IH.state.t >= 6.5);
await page.evaluate(() => window.IH.pause());
await shot(page, '02-scene');
s = await state();
assert(s.room === 'clock' && s.follow === 'chiyo', '追跡で千代と一緒に時計塔へ移動する');
await page.evaluate(() => window.IH.start());
s = await finish();
assert(has(s, 'K_song', 'K_resign', 'K_key') && ['T5', 'F'].every(id => s.seen.includes(id)), '周3: 千代を追うと K_song, K_resign, K_key が開き、T5 と F を見ている');

// 周4: ミナを追う
await page.click('#againBtn');
await page.click('[data-follow="mina"]');
s = await finish();
assert(has(s, 'K_watch'), '周4: ミナを追うと K_watch が開く');

// 周5: 移動確認 → 汐見を追う
await page.click('#againBtn');
await page.evaluate(() => window.IH.pause());
await page.click('[data-room="office"]');
assert((await state()).room === 'lobby', '隣接しない部屋はタップしても移動しない');
await page.click('[data-room="room207"]');
assert((await state()).room === 'room207', '隣の部屋へタップで移動できる');
await page.click('[data-room="lobby"]');
await page.click('[data-follow="shiomi"]');
s = await finish();
assert(has(s, 'K_photo', 'K_final'), '周5: 汐見を追うと K_photo と K_final が開く');
assert((await page.textContent('#sheet')).includes('零時に出ていく人'), '周5: 最終章が終演画面で特別に見える');
await shot(page, '07-finale-final');

// 記録帳
await page.click('text=記録帳を開く');
await page.click('.tabs [data-tab="scenes"]');
assert(s.seen.length === 13, '全13場面が記録されている');
await page.click('#bookBody .sc-btn');
await shot(page, '05-book-scenes');
const w = await page.evaluate(() => { const b = document.querySelector('#bookBody'); return [b.scrollWidth, b.clientWidth]; });
assert(w[0] <= w[1], `記録帳の場面タブが 390px で横にはみ出さない (${w.join('/')})`);
await page.click('.tabs [data-tab="truths"]');
await shot(page, '06-book-clues');

// 再読込
await page.reload();
await page.waitForSelector('#startBtn');
s = await state();
assert(s.loops === 5 && s.truths.length === 8, '再読み込み後も記録と周回数が残る');

assert(errors.length === 0, 'コンソールエラーなし ' + errors.join(' | '));
await browser.close();
console.log(`ok ${n} 件`);
