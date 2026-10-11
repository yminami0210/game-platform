// 規約チェック。 node check_build.mjs [gameDir]  （既定: ./game か カレント）
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
const dir = process.argv.slice(2).find(a => !a.startsWith('--')) ?? (existsSync('game/index.html') ? 'game' : '.');
const errors = [], warns = [];
const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); if (f === 'node_modules' || f === 'test' || f.startsWith('.')) return []; return statSync(p).isDirectory() ? walk(p) : [p]; });
const files = walk(dir);
const rel = p => relative(dir, p);

const total = files.reduce((s, f) => s + statSync(f).size, 0);
if (total > 1.5 * 1024 * 1024) warns.push(`公開物の合計が ${(total / 1048576).toFixed(2)}MB（目安 1.5MB）`);

for (const f of files.filter(f => /\.(m?js|html)$/.test(f))) {
  const src = readFileSync(f, 'utf8');
  const r = rel(f);
  if (/\beval\s*\(|new\s+Function\s*\(/.test(src)) errors.push(`${r}: eval / new Function`);
  if (/document\.write\s*\(/.test(src)) errors.push(`${r}: document.write`);
  if (/<script[^>]+src=["']https?:/i.test(src) || /import\s+[^;]*from\s+["']https?:/.test(src)) errors.push(`${r}: 外部スクリプトの読み込み`);
  if (/https?:\/\/(?!www\.w3\.org)[^\s"'`)]+/.test(src) && !r.endsWith('README.md')) warns.push(`${r}: 外部URLを含む（通信なら legal の確認が必要）`);
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1'); // コメント除去
  if (r.split(/[\\/]/).includes('core') && /Math\.random|Date\.now|performance\.now|\bdocument\.|\bwindow\./.test(code)) errors.push(`${r}: core 内で禁止API（Math.random/Date/DOM）`);
}
const main = join(dir, 'src/main.js');
if (!existsSync(main) || !/__GS__/.test(readFileSync(main, 'utf8'))) errors.push('src/main.js に window.__GS__ が無い');

const mf = join(dir, 'manifest.webmanifest');
if (!existsSync(mf)) errors.push('manifest.webmanifest が無い');
else {
  const m = JSON.parse(readFileSync(mf, 'utf8'));
  for (const k of ['name', 'start_url', 'display', 'icons']) if (!m[k]) errors.push(`manifest に ${k} が無い`);
  if (/GAME_TITLE/.test(m.name ?? '')) warns.push('manifest の name が仮のまま');
  for (const i of m.icons ?? []) if (!existsSync(join(dir, i.src))) warns.push(`アイコンが無い: ${i.src}（make_icons.mjs で生成）`);
}
const sw = join(dir, 'sw.js');
if (existsSync(sw)) {
  const list = [...readFileSync(sw, 'utf8').matchAll(/'([^']+\.(?:html|js|json|svg|png|webmanifest))'/g)].map(x => x[1]);
  for (const a of list) if (!existsSync(join(dir, a))) errors.push(`sw.js のキャッシュ対象が存在しない: ${a}`);
  const srcs = files.filter(f => /\.(js|json)$/.test(f) && !/(sw\.js|package(-lock)?\.json)$/.test(f)).map(rel).map(p => p.replace(/\\/g, '/'));
  for (const s of srcs) if (!list.includes(s)) warns.push(`sw.js のキャッシュ一覧に無い（オフラインで欠ける）: ${s}`);
} else errors.push('sw.js が無い');
if (!existsSync(join(dir, 'LICENSES.md'))) errors.push('LICENSES.md が無い');
if (/GAME_TITLE/.test(readFileSync(join(dir, 'index.html'), 'utf8'))) warns.push('index.html のタイトルが仮のまま');

const verbose = process.argv.includes('--verbose');
if (verbose) for (const w of warns) console.log(`WARN  ${w}`);
else if (warns.length) console.log(`WARN  ${warns.length}件（先頭3件）: ${warns.slice(0, 3).join(' / ')}${warns.length > 3 ? ' …（--verbose で全件）' : ''}`);
for (const e of errors) console.log(`ERROR ${e}`);
console.log(errors.length ? `\nFAIL (${errors.length} errors, ${warns.length} warnings)` : `\nOK (${warns.length} warnings)`);
process.exit(errors.length ? 1 : 0);
