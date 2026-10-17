// 開発用: キャラ候補のドット絵（sprite.json）を実際のステージに置いて撮る。
//   node game/tools/mockchar.mjs <sprite.json> <out.png> [stageId] [seconds]
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { solve, loadStage, ACTIONS, MACRO_FRAMES } from './clearbot.mjs';
const HERE = dirname(fileURLToPath(import.meta.url));
const [spritePath, out, id = '1-1', secs = '6'] = process.argv.slice(2);
const sprite = JSON.parse(readFileSync(resolve(spritePath), 'utf8'));
const { chromium } = createRequire(join(execSync('npm root -g', { encoding: 'utf8' }).trim(), 'x.js'))('playwright');
const { serve } = await import(join(HERE, '../../.claude/game-studio/scripts/serve.mjs'));
const { server, url } = await serve(join(HERE, '..'));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(url + 'index.html', { waitUntil: 'commit' });
await page.waitForFunction(() => window.__GS__);
const plan = solve(loadStage(id), { target: { kind: 'goal' }, maxNodes: 200000 });
await page.evaluate(([sp, path, acts, M, id]) => { window.__GS__.setPlayerSprite(sp); window.__GS__.enterStage(id); window.__GS__.setPlan(i => acts[path[Math.floor(i / M)]] ?? {}); }, [sprite, plan.path, ACTIONS, MACRO_FRAMES, id]);
page.on('pageerror', e => console.log('ERR', String(e))); await page.waitForTimeout(Number(secs) * 1000); console.log(await page.evaluate(() => JSON.stringify(window.__GS__.state)));
await page.screenshot({ path: out });
await browser.close(); server.close();
