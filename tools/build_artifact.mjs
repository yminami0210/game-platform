// ナナシ県を claude.ai の Artifact（HTML のページ）として組み立てる。
//   node tools/build_artifact.mjs [出力フォルダ]   （既定: dist/artifact）
// Artifact ではサーバーを置けないので「この端末で動かす」モード（LLM 不使用・トークン 0）で動く。
// three.js は許可された CDN（jsDelivr）から読み、ほかのファイルはページと一緒に載せる。
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, 'dist/artifact'));
const THREE_VERSION = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).dependencies.three;
const SHARED = ['world.js', 'lore.js', 'sim.js', 'templates.js', 'chronicle-core.js', 'api.js', 'looks.js', 'personas.js'];
const CLIENT = ['main.js', 'town.js', 'backend.js', 'admin.js', 'view3d.js', 'map2d.js', 'portrait.js', 'interior.js', 'firstperson.js', 'minigames.js', 'style.css'];

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'shared'), { recursive: true });
for (const f of CLIENT) fs.copyFileSync(path.join(ROOT, 'client', f), path.join(OUT, f));
for (const f of SHARED) fs.copyFileSync(path.join(ROOT, 'server', f), path.join(OUT, 'shared', f));

// ページ本体: Artifact は <!doctype>・<html>・<head>・<body> を自分で付けるので、中身だけにする
let html = fs.readFileSync(path.join(ROOT, 'client/index.html'), 'utf8');
const head = html.match(/<head>([\s\S]*?)<\/head>/)[1];
const body = html.match(/<body>([\s\S]*?)<\/body>/)[1];
const cdn = `https://cdn.jsdelivr.net/npm/three@${THREE_VERSION}`;
const keepHead = head
  .split('\n')
  .filter((l) => !/<meta charset|name="viewport"|rel="manifest"|rel="icon"|apple-touch-icon|apple-mobile|mobile-web-app|theme-color/.test(l))
  .join('\n')
  .replace('"three": "./vendor/three/build/three.module.js", "three/addons/": "./vendor/three/examples/jsm/"', `"three": "${cdn}/build/three.module.js", "three/addons/": "${cdn}/examples/jsm/"`);
const title = keepHead.match(/<title>.*<\/title>/)[0];
html = [
  title,
  keepHead.replace(title, '').trim(),
  '<script>window.NANASHI_STANDALONE = true;</script>',
  body.trim(),
].join('\n');
fs.writeFileSync(path.join(OUT, 'index.html'), html + '\n');

const files = fs.readdirSync(OUT, { recursive: true }).filter((f) => fs.statSync(path.join(OUT, f)).isFile());
const size = files.reduce((s, f) => s + fs.statSync(path.join(OUT, f)).size, 0);
console.log(`${OUT}: ${files.length} ファイル、${(size / 1024).toFixed(0)}KB（three.js ${THREE_VERSION} は CDN）`);
console.log(files.join('\n'));
