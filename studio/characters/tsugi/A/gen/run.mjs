import { build } from './sheet.mjs';
import { figure, defs, C } from './fig.mjs';
import fs from 'fs'; import { createRequire } from 'module'; import { execSync } from 'child_process';
const out = new URL('../', import.meta.url).pathname;
fs.writeFileSync(out + 'sheet.svg', build());
const require = createRequire(execSync('npm root -g').toString().trim() + '/x.js');
const { chromium } = require('playwright');
// 黒塗り: 正面 + 決めポーズ(はしる, 針)
const blk = (s) => s.replace(/ transform="translate\(1\.[0-9] 1\.[0-9]\)"| transform="translate\(2 1\.5\)"/g, '').replace(/#[0-9a-fA-F]{6}/g, '#111').replace(/url\(#kas\)/g, 'none').replace(/opacity="[^"]+"/g, '');
const sil = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="700" viewBox="0 0 1600 700">${defs}<rect width="1600" height="700" fill="#fff"/>` +
  blk(`<g transform="translate(260 620) scale(2.3)">${figure('front', 'normal', {})}</g><g transform="translate(790 620) scale(2.3)"><g transform="rotate(6)">${figure('side', 'smile', { arm: 62, leg: [[17, -1], [-19, -8]] })}</g></g><g transform="translate(1320 600) scale(2.3)">${figure('front', 'smile', { arm: [-40, 120], leg: [[-8, -12], [14, -4]], needle: 'held' })}</g>`) + '</svg>';
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined });
const shot = async (svg, w, h, file) => { const p = await b.newPage({ viewport: { width: w, height: h } }); await p.setContent(`<body style="margin:0">${svg}</body>`); await p.screenshot({ path: out + file }); await p.close(); };
await shot(fs.readFileSync(out + 'sheet.svg', 'utf8'), 1600, 1640, 'sheet.png');
await shot(sil, 1600, 700, 'silhouette.png');
await b.close();
