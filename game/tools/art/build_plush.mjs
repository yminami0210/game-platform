// ぬいぐるみ層のアトラスを生成する。 node game/tools/art/build_plush.mjs
// 出力: game/assets/plush/atlas.png, atlas.json、コンタクトシート studio/characters/plush-atlas.png
// 描画は Chromium の Canvas 2D（他の tools/*.mjs と同じく playwright をグローバルから読む）。
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../../..');
const req = createRequire(join(execSync('npm root -g', { encoding: 'utf8' }).trim(), 'x.js'));
const { chromium } = req('playwright');
const src = ['plush_lib.js', 'plush_tsugi.js', 'plush_enemies.js', 'plush_items.js', 'plush_frames.js'].map(f => readFileSync(join(HERE, f), 'utf8')).join('\n');
const FONT = 'file://' + join(ROOT, 'game/fonts/DotGothic16-subset.woff2');
const html = `<!doctype html><meta charset=utf-8><style>@font-face{font-family:DG;src:url(${FONT})}body{margin:0}</style><canvas id=a></canvas><canvas id=s></canvas><script>${src}
window.build=function(){const a=document.getElementById('a');const r=packAndDraw(a,2048,2048);
 const frames={};r.items.forEach(it=>{frames[it.name]={x:it.x,y:it.y,w:it.w,h:it.h,ax:it.ax,ay:it.ay};});
 window.__items=r.items;return {used:r.used,frames,png:a.toDataURL('image/png')};};
window.sheet=async function(){await document.fonts.load('14px DG');const a=document.getElementById('a'),s=document.getElementById('s');const items=window.__items;
 const cols=6,cw=330,ch=330,rows=Math.ceil(items.length/cols);s.width=cols*cw;s.height=rows*ch+40;const c=s.getContext('2d');c.fillStyle='#2a4263';c.fillRect(0,0,s.width,s.height);
 c.fillStyle='#ebdfc3';c.font='20px DG';c.fillText('plush atlas '+a.width+'x'+a.height+'  '+items.length+' frames  (scale 4, anchor = feet centre)',16,28);
 items.forEach((it,i)=>{const cx=(i%cols)*cw,cy=40+Math.floor(i/cols)*ch;const k=Math.min(1,(cw-16)/it.w,(ch-34)/it.h);const w=it.w*k,h=it.h*k;
  c.fillStyle='#34517a';c.fillRect(cx+4,cy+4,cw-8,ch-8);c.drawImage(a,it.x,it.y,it.w,it.h,cx+(cw-w)/2,cy+8+(ch-34-h)/2,w,h);
  c.strokeStyle='rgba(255,246,223,.5)';c.lineWidth=1;const ax=cx+(cw-w)/2+it.ax*k,ay=cy+8+(ch-34-h)/2+it.ay*k;c.beginPath();c.moveTo(ax-6,ay);c.lineTo(ax+6,ay);c.moveTo(ax,ay-6);c.lineTo(ax,ay+6);c.stroke();
  c.fillStyle='#ebdfc3';c.font='16px DG';c.fillText(it.name,cx+10,cy+ch-14);});
 return s.toDataURL('image/png');};
</script>`;
const dir = join(HERE, '.tmp'); mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'page.html'), html);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
const errs = []; page.on('pageerror', e => errs.push(String(e)));
await page.goto('file://' + join(dir, 'page.html'));
const r = await page.evaluate(() => window.build());
if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
const out = join(ROOT, 'game/assets/plush'); mkdirSync(out, { recursive: true });
const png = d => Buffer.from(d.split(',')[1], 'base64');
writeFileSync(join(out, 'atlas.png'), png(r.png));
writeFileSync(join(out, 'atlas.json'), JSON.stringify({ scale: 4, anchor: 'ax,ay are pixel offsets from the frame top-left; draw at (logicalX*4-ax, logicalY*4-ay)', frames: r.frames }, null, 1));
const sh = await page.evaluate(() => window.sheet());
mkdirSync(join(ROOT, 'studio/characters'), { recursive: true });
writeFileSync(join(ROOT, 'studio/characters/plush-atlas.png'), png(sh));
await browser.close();
console.log(`atlas 2048x${r.used} used / ${Object.keys(r.frames).length} frames`);
