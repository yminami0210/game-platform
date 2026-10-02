// sw.js のキャッシュ一覧と版を、いまのファイル構成に合わせて書き直す。 node game/tools/sync_sw.mjs
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const files = ['index.html', 'manifest.webmanifest', ...walk(join(root, 'icons')), ...walk(join(root, 'fonts')).filter(f => f.endsWith('.woff2')), ...walk(join(root, 'src'))].map(f => f.startsWith(root) ? relative(root, f) : f).map(f => f.replace(/\\/g, '/'));
const hash = createHash('sha1'); for (const f of files) hash.update(readFileSync(join(root, f)));
const sw = join(root, 'sw.js');
let src = readFileSync(sw, 'utf8');
src = src.replace(/const CACHE_VERSION = '[^']*';/, `const CACHE_VERSION = 'tsugi-${hash.digest('hex').slice(0, 8)}';`)
  .replace(/const ASSETS = \[[\s\S]*?\];/, `const ASSETS = [\n  './',\n${files.map(f => `  '${f}',`).join('\n')}\n];`);
writeFileSync(sw, src);
console.log(`sw.js: ${files.length} files`);
