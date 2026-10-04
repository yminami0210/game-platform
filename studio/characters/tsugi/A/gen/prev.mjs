import fs from 'fs'; import { createRequire } from 'module'; import { execSync } from 'child_process';
const require = createRequire(execSync('npm root -g').toString().trim() + '/x.js'); const { chromium } = require('playwright');
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1780, height: 300 } });
await p.setContent('<body style="margin:0">' + fs.readFileSync(new URL('../sprite-preview.svg', import.meta.url), 'utf8') + '</body>');
await p.screenshot({ path: process.argv[2] }); await b.close();
