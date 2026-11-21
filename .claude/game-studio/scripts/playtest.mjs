// 実ブラウザ（ヘッドレス Chromium、スマホ画面）でボットに遊ばせ、指標を集める。
// node playtest.mjs [--url game/index.html] [--runs 10] [--seconds 60] [--bot file.mjs] [--shots] [--out studio/playtests/<日付>]
// --bot のファイルは export function choose(state, actions, ctx) を持つ（state は __GS__.state の JSON）。
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, basename, join, relative } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { serve } from './serve.mjs';
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const flag = k => process.argv.includes(`--${k}`);
const target = resolve(arg('url', existsSync('game/index.html') ? 'game/index.html' : 'index.html'));
const runs = Number(arg('runs', 8)), seconds = Number(arg('seconds', 60));
const out = resolve(arg('out', `studio/playtests/${new Date().toISOString().slice(0, 10)}`));
mkdirSync(out, { recursive: true });
const custom = arg('bot') ? await import(pathToFileURL(resolve(arg('bot')))) : null;

let chromium;
import { execSync } from 'node:child_process';
const globalRoot = (() => { try { return execSync('npm root -g', { encoding: 'utf8' }).trim(); } catch { return null; } })();
const bases = [join(dirname(target), 'package.json'), join(process.cwd(), 'package.json'), fileURLToPath(import.meta.url)];
if (globalRoot) bases.push(join(globalRoot, 'noop.js'));
for (const base of bases) {
  try { ({ chromium } = createRequire(base)('playwright')); break; } catch {}
}
if (!chromium) { console.error('playwright が見つかりません: cd game && npm install && npx playwright install chromium'); process.exit(2); }

const { server, url } = await serve(dirname(target));
const pageUrl = url + basename(target);
const browser = await chromium.launch();
const VIEWPORTS = [[390, 844], [360, 640], [430, 932]];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const pick = a => a[Math.floor(Math.random() * a.length)];
const runsOut = [];

async function newPage([w, h]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ja-JP' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(() => {
    window.__fps = []; let last = performance.now(), n = 0;
    const tick = now => { n++; if (now - last >= 1000) { window.__fps.push(n); n = 0; last = now; } requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  return { ctx, page, errors };
}

for (let r = 0; r < runs; r++) {
  const vp = VIEWPORTS[0];
  const { ctx, page, errors } = await newPage(vp);
  const t0 = Date.now();
  await page.goto(pageUrl);
  const ready = await page.waitForFunction(() => !!window.__GS__, null, { timeout: 15000 }).then(() => true).catch(() => false);
  const readyMs = Date.now() - t0;
  if (!ready) { runsOut.push({ run: r, error: '__GS__ が15秒以内に現れない', errors }); await ctx.close(); continue; }
  if (flag('shots') && r === 0) await page.screenshot({ path: join(out, 'title.png') });
  let action = 'none', shotMid = false;
  const end = Date.now() + seconds * 1000;
  while (Date.now() < end) {
    const snap = await page.evaluate(() => ({ acts: window.__GS__.bot.actions(), running: window.__GS__.running, state: JSON.parse(JSON.stringify(window.__GS__.state ?? {})) }));
    if (!snap.running && flag('shots') && r === 0 && shotMid) { await page.screenshot({ path: join(out, 'result.png') }); }
    let next;
    if (custom) next = custom.choose(snap.state, snap.acts, { running: snap.running });
    else next = snap.acts.includes('start') ? 'start' : (Math.random() < 0.3 || !snap.acts.includes(action) ? pick(snap.acts) : action);
    action = next;
    await page.evaluate(a => window.__GS__.bot.press(a), action);
    if (flag('shots') && r === 0 && !shotMid && Date.now() - t0 > 8000 && snap.running) { await page.screenshot({ path: join(out, 'play.png') }); shotMid = true; }
    await sleep(100);
  }
  const m = await page.evaluate(() => ({ events: window.__GS__.events, fps: window.__fps, heap: performance.memory?.usedJSHeapSize ?? null }));
  const ev = m.events;
  const firstStart = ev.find(e => e.type === 'start');
  const fails = ev.filter(e => e.type === 'fail');
  const starts = ev.filter(e => e.type === 'start' || e.type === 'retry');
  const lens = fails.map(f => { const s = [...starts].reverse().find(s => s.t <= f.t); return s ? +(f.t - s.t).toFixed(2) : null; }).filter(x => x != null);
  const retryGaps = fails.map(f => { const n = starts.find(s => s.t > f.t); return n ? +(n.t - f.t).toFixed(2) : null; }).filter(x => x != null);
  runsOut.push({
    run: r, readyMs, firstStartSec: firstStart?.t ?? null, runs: starts.length, fails: fails.length,
    runLengths: lens, retryGapsSec: retryGaps, scores: fails.map(f => f.score ?? null),
    fpsAvg: m.fps.length ? +(m.fps.reduce((a, b) => a + b, 0) / m.fps.length).toFixed(1) : null, fpsMin: m.fps.length ? Math.min(...m.fps) : null,
    heap: m.heap, errors,
  });
  await ctx.close();
}

if (flag('shots')) {
  for (const vp of VIEWPORTS) {
    const { ctx, page } = await newPage(vp);
    await page.goto(pageUrl); await page.waitForFunction(() => !!window.__GS__).catch(() => {});
    await page.evaluate(() => window.__GS__?.bot.press('start')); await sleep(3000);
    await page.screenshot({ path: join(out, `viewport-${vp[0]}x${vp[1]}.png`) });
    await ctx.close();
  }
}
await browser.close(); server.close();

const all = k => runsOut.flatMap(r => r[k] ?? []);
const med = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const summary = {
  url: relative(process.cwd(), target), runs, secondsPerRun: seconds, bot: custom ? arg('bot') : 'sticky-random',
  readyMsMedian: med(runsOut.map(r => r.readyMs).filter(Boolean)),
  runLengthSecMedian: med(all('runLengths')), retryGapSecMedian: med(all('retryGapsSec')),
  scoreMedian: med(all('scores').filter(x => x != null)),
  fpsAvgMedian: med(runsOut.map(r => r.fpsAvg).filter(Boolean)), fpsMinWorst: Math.min(...runsOut.map(r => r.fpsMin ?? 999)),
  consoleErrors: [...new Set(all('errors'))],
  note: 'retryGap にはボットの反応時間（約0.1秒）が含まれる。fps はヘッドレス計測の参考値。',
};
writeFileSync(join(out, 'summary.json'), JSON.stringify({ summary, runs: runsOut }, null, 2));
const { note, ...short } = summary;
console.log(JSON.stringify(short)); // 1行（トークン節約）。ラン別の詳細は summary.json
console.log(`出力: ${out}`);
