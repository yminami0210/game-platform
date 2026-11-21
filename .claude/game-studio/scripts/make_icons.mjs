// icons/icon.svg から 192/512 の PNG を作る。 node make_icons.mjs [gameDir]
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
const dir = resolve(process.argv[2] ?? (existsSync('game/icons') ? 'game' : '.'));
import { execSync } from 'node:child_process';
let chromium;
for (const base of [join(dir, 'package.json'), join(execSync('npm root -g', { encoding: 'utf8' }).trim(), 'noop.js')]) {
  try { ({ chromium } = createRequire(base)('playwright')); break; } catch {}
}
if (!chromium) { console.error('playwright が見つかりません: cd game && npm install && npx playwright install chromium'); process.exit(2); }
const svg = readFileSync(join(dir, 'icons/icon.svg'), 'utf8');
const browser = await chromium.launch();
for (const size of [192, 512]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<html><body style="margin:0">${svg.replace('<svg', `<svg width="${size}" height="${size}"`)}</body></html>`);
  await page.screenshot({ path: join(dir, `icons/icon-${size}.png`), omitBackground: true });
  await page.close();
}
await browser.close();
console.log('icons/icon-192.png, icon-512.png を作成');
