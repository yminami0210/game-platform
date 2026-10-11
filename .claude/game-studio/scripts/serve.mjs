// 依存なしの静的サーバー。 node serve.mjs <dir> [port]
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, resolve, normalize } from 'node:path';
const TYPES = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.mjs':'text/javascript', '.json':'application/json',
  '.webmanifest':'application/manifest+json', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.webp':'image/webp',
  '.css':'text/css', '.woff2':'font/woff2', '.ogg':'audio/ogg', '.mp3':'audio/mpeg', '.wav':'audio/wav' };
export function serve(dir, port = 0) {
  const root = resolve(dir);
  const server = createServer(async (req, res) => {
    try {
      let p = normalize(join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
      if (!p.startsWith(root)) { res.writeHead(403).end(); return; }
      if ((await stat(p)).isDirectory()) p = join(p, 'index.html');
      res.writeHead(200, { 'content-type': TYPES[extname(p)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(await readFile(p));
    } catch { res.writeHead(404).end('not found'); }
  });
  return new Promise(r => server.listen(port, '127.0.0.1', () => r({ server, url: `http://127.0.0.1:${server.address().port}/` })));
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const { url } = await serve(process.argv[2] ?? '.', Number(process.argv[3] ?? 8080));
  console.log(`serving ${process.argv[2] ?? '.'} at ${url}`);
}
