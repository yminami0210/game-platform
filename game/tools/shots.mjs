// 開発用: 画面を撮る。 node game/tools/shots.mjs <outDir> [stageId] [seconds...]
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
const HERE = dirname(fileURLToPath(import.meta.url));
const { serve } = await import(join(HERE, '../../.claude/game-studio/scripts/serve.mjs'));
const req = createRequire(join(execSync('npm root -g', { encoding: 'utf8' }).trim(), 'x.js'));
const { chromium } = req('playwright');
const out = process.argv[2] ?? 'shots'; mkdirSync(out, { recursive: true });
const id = process.argv[3] ?? '1-1';
const times = process.argv.slice(4).map(Number);
const { server, url } = await serve(join(HERE, '..'));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => m.type() === 'error' && errs.push(m.text()));
await page.goto(url + 'index.html');
await page.waitForFunction(() => window.__GS__, null, { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(800);
await page.screenshot({ path: join(out, 'title.png') });
const { solve, loadStage, ACTIONS, MACRO_FRAMES } = await import(join(HERE, 'clearbot.mjs'));
const r = solve(loadStage(id), { target: { kind: id === '1-F' ? 'boss' : 'goal' } });
await page.evaluate(([id, path, acts, M]) => { window.__GS__.enterStage(id); window.__GS__.setPlan(i => acts[path[Math.floor(i / M)]] ?? {}); }, [id, r.path, ACTIONS, MACRO_FRAMES]);
let tPrev = 0;
for (const t of times.length ? times : [1, 4, 8, 12, 16, 20, 24]) { await page.waitForTimeout((t - tPrev) * 1000); tPrev = t; await page.screenshot({ path: join(out, `${id}-${t}s.png`) }); }
console.log(JSON.stringify({ errs, state: await page.evaluate(() => window.__GS__.state), botOk: r.ok }));
await browser.close(); server.close();
