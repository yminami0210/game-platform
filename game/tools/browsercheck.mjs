// 実ブラウザ（ヘッドレス Chromium）での通し確認。
// タイトル → 物語 → 地図 → 1-1 をキー操作で進め、各ステージをクリア確認ボットの操作列で「本物のループのまま」クリアさせる。
// 起動時間・コンソールエラー・FPS・各場面のスクショを出す。
//   node game/tools/browsercheck.mjs [--out studio/.gate/browser] [--stages 1-1,1-2] [--mobile]
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import { solve, solveBoss, loadStage, stageIds, ACTIONS, MACRO_FRAMES } from './clearbot.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const out = resolve(arg('out', 'studio/.gate/browser')); mkdirSync(out, { recursive: true });
const ids = arg('stages') ? arg('stages').split(',') : stageIds();
let chromium;
try { ({ chromium } = createRequire(join(execSync('npm root -g', { encoding: 'utf8' }).trim(), 'x.js'))('playwright')); } catch {}
if (!chromium) try { ({ chromium } = createRequire(join(HERE, '../package.json'))('playwright')); } catch {}
if (!chromium) { console.error('playwright が見つかりません'); process.exit(2); }
const { serve } = await import(join(HERE, '../../.claude/game-studio/scripts/serve.mjs'));
const { server, url } = await serve(join(HERE, '..'));
const browser = await chromium.launch();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const summary = { readyMs: null, consoleErrors: [], fpsMinWorst: null, fpsAvg: null, flow: false, stages: {}, shots: [] };

async function newPage(w, h, mobile = false) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, ignoreHTTPSErrors: true, locale: 'ja-JP' });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)/.test(m.location()?.url ?? '')) summary.consoleErrors.push(m.text()); });
  page.on('pageerror', e => summary.consoleErrors.push(String(e)));
  await page.addInitScript(() => {
    window.__fps = []; let last = performance.now(), n = 0;
    const tick = now => { n++; if (now - last >= 1000) { window.__fps.push(n); n = 0; last = now; } requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  return { ctx, page };
}
const shot = async (page, name) => { await page.screenshot({ path: join(out, name) }); summary.shots.push(name); };
const key = async (page, k, n = 1, gap = 250) => { for (let i = 0; i < n; i++) { await page.keyboard.down(k); await sleep(70); await page.keyboard.up(k); await sleep(gap); } };

// 1) 起動と画面の流れ（キーボード）
{
  const { ctx, page } = await newPage(1280, 720);
  const t0 = Date.now();
  // load イベント（Web フォントの取得も含む）は待たず、遊べる状態（__GS__）までを測る
  await page.goto(url + 'index.html', { waitUntil: 'commit' });
  await page.waitForFunction(() => window.__GS__, null, { timeout: 15000 });
  summary.readyMs = Date.now() - t0;
  await sleep(600); await shot(page, 'title.png');
  await key(page, 'KeyZ');                       // はじめから
  await sleep(400); await shot(page, 'story.png');
  await key(page, 'KeyZ', 5, 350);               // 物語を読み進める
  await sleep(500);
  await key(page, 'ArrowRight'); await sleep(700); await shot(page, 'map.png');
  await key(page, 'KeyZ'); await sleep(900);
  await shot(page, 'stage-intro.png');
  summary.flow = await page.evaluate(() => window.__GS__.scene === 'stage' && window.__GS__.state.stage === '1-1');
  // 2) 各ステージを本物のループでクリア
  for (const id of ids) {
    const L = loadStage(id);
    const target = { kind: L.ents.some(e => e.kind === 'boss') ? 'boss' : 'goal' };
    const plan = target.kind === 'boss' ? solveBoss(L) : solve(L, { target, maxNodes: 250000 });
    if (!plan.ok) { summary.stages[id] = { cleared: false, reason: 'ボットが道を見つけられない' }; continue; }
    const secs = plan.frames / 60;
    await page.evaluate(([id, path, acts, M]) => { window.__GS__.enterStage(id); window.__GS__.setPlan(i => acts[path[Math.floor(i / M)]] ?? {}); }, [id, plan.path, ACTIONS, MACRO_FRAMES]);
    const tStart = Date.now();
    let took = 0;
    for (const f of [0.3, 0.7]) { await sleep(Math.max(0, secs * f * 1000 - (Date.now() - tStart))); await shot(page, `${id}-${Math.round(f * 100)}.png`); }
    const ok = await page.waitForFunction(id => window.__GS__.events.some(e => e.type === 'clear' && e.stage === id), id, { timeout: (secs + 25) * 1000 }).then(() => true).catch(() => false);
    took = (Date.now() - tStart) / 1000;
    await sleep(3200); await shot(page, `${id}-result.png`);
    await page.evaluate(() => window.__GS__.clearPlan());
    await key(page, 'KeyZ'); await sleep(1600);
    if (target.kind === 'boss') {
      await shot(page, 'ending-1.png');
      await key(page, 'KeyZ', 2, 600); await shot(page, 'ending-3.png');
      await key(page, 'KeyZ', 2, 600); await sleep(800); await shot(page, 'tsuzuku.png');
      summary.ending = await page.evaluate(() => window.__GS__.scene === 'tsuzuku' && window.__GS__.events.some(e => e.type === 'ending'));
      await sleep(1600); await key(page, 'KeyZ'); await sleep(800);
    }
    summary.stages[id] = { cleared: ok, botSeconds: +secs.toFixed(1), realSeconds: +took.toFixed(1) };
  }
  await shot(page, 'map-after.png');
  const fps = await page.evaluate(() => window.__fps.slice(2));
  summary.fpsMinWorst = fps.length ? Math.min(...fps) : null;
  summary.fpsAvg = fps.length ? +(fps.reduce((a, b) => a + b, 0) / fps.length).toFixed(1) : null;
  await ctx.close();
}
// 3) スマホ横持ち（仮想ボタンの表示）
{
  const { ctx, page } = await newPage(844, 390, true);
  await page.goto(url + 'index.html');
  await page.waitForFunction(() => window.__GS__, null, { timeout: 15000 });
  await page.evaluate(() => window.__GS__.enterStage('1-1'));
  await sleep(1200); await shot(page, 'mobile-844x390.png');
  const padVisible = await page.evaluate(() => !document.getElementById('pad').hidden);
  summary.mobilePad = padVisible;
  await ctx.close();
  const p2 = await newPage(390, 844, true);
  await p2.page.goto(url + 'index.html'); await p2.page.waitForFunction(() => window.__GS__);
  await sleep(500); await shot(p2.page, 'mobile-portrait.png');
  summary.portraitNotice = await p2.page.evaluate(() => !document.getElementById('rotate').hidden);
  await p2.ctx.close();
}
await browser.close(); server.close();
summary.consoleErrors = [...new Set(summary.consoleErrors)];
writeFileSync(join(out, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary));
