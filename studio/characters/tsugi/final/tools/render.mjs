import { createRequire } from 'module'; import { execSync } from 'child_process'; import fs from 'fs';
const require = createRequire(execSync('npm root -g').toString().trim() + '/x.js');
const { chromium } = require('playwright');
export async function png(svgPath, outPath, w, h, transparent=false){
  const b = await chromium.launch({executablePath: process.env.CHROME||undefined});
  const p = await b.newPage({viewport:{width:w,height:h}});
  const svg = fs.readFileSync(svgPath,'utf8');
  await p.setContent(`<html><body style="margin:0;background:${transparent?'transparent':'#fff'}">${svg}</body></html>`);
  await p.screenshot({path: outPath, omitBackground: transparent, clip:{x:0,y:0,width:w,height:h}});
  await b.close();
}
