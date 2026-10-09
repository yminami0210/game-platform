// ナナシ県サーバー: シミュレーションを回し、SSE で 3D クライアントへ配信する。依存パッケージなし。
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { loadConfig, ROOT, DATA } from './config.js';
import { Chronicle } from './chronicle.js';
import { Executor } from './executor.js';
import { Simulation } from './sim.js';
import { createApi } from './api.js';

const cfg = loadConfig();
const chronicle = new Chronicle();
const executor = new Executor(cfg);
const STATE_FILE = path.join(DATA, 'state.json');
const saved = fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) : null;
const sim = new Simulation({ seed: cfg.seed, population: cfg.population, chronicle, executor, saved });

// ---- SSE ----
const clients = new Set();
function send(res, type, data) {
  res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
}
function broadcast(type, data) {
  for (const res of clients) send(res, type, data);
}
chronicle.listeners.add((type, payload) => broadcast(type, payload));

// ---- ループ ----
let last = Date.now();
setInterval(() => {
  const now = Date.now();
  sim.tick(Math.min(0.5, (now - last) / 1000), cfg.gameMinutesPerRealSecond);
  last = now;
}, 100);
setInterval(() => {
  if (!clients.size) return;
  broadcast('frame', sim.frame());
  broadcast('clock', api.clock());
}, 500);
function save() {
  fs.writeFileSync(STATE_FILE, JSON.stringify(sim.serialize()));
}
setInterval(save, 60000);
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { save(); process.exit(0); });

// ---- HTTP ----
const MIME = { '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.json': 'application/json', '.md': 'text/markdown; charset=utf-8' };

function serveFile(res, file) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return json(res, 404, { error: 'not found' });
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' });
  fs.createReadStream(file).pipe(res);
}

function json(res, code, obj) {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

function readBody(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new Error('too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

// 安全なファイルパス（ディレクトリ外への脱出を防ぐ）
function safeJoin(base, rel) {
  const p = path.resolve(base, '.' + path.sep + rel);
  return p.startsWith(base + path.sep) ? p : null;
}

// ブラウザでもそのまま動くモジュール（client/ から ./shared/ として読み込む）
const SHARED = ['world.js', 'lore.js', 'sim.js', 'templates.js', 'chronicle-core.js', 'api.js'];

const api = createApi({ sim, chronicle, executor, seed: cfg.seed });
const routes = {
  'GET /api/init': () => api.init(),
  'GET /api/digest': () => api.digest(),
  'GET /api/tasks': () => api.tasks(),
  'GET /api/news/latest': () => api.latestNews(),
  'POST /api/residents': (b) => api.residents(b),
  'POST /api/avatars': (b) => api.avatars(b),
  'POST /api/tasks': (b) => api.createTask(b),
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  try {
    if (req.method === 'GET' && p === '/events') {
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
      res.write('retry: 2000\n\n');
      clients.add(res);
      send(res, 'frame', sim.frame());
      req.on('close', () => clients.delete(res));
      return;
    }
    const key = `${req.method} ${p}`;
    if (routes[key]) {
      const body = req.method === 'POST' ? JSON.parse((await readBody(req)) || '{}') : null;
      return json(res, 200, routes[key](body));
    }
    let m;
    const json1 = async () => JSON.parse((await readBody(req)) || '{}');
    if (req.method === 'GET' && (m = p.match(/^\/api\/cp\/(\d+)$/))) {
      const d = api.cp(m[1]);
      return d ? json(res, 200, d) : json(res, 404, { error: 'not found' });
    }
    if (req.method === 'POST' && (m = p.match(/^\/api\/tasks\/(\d+)\/complete$/))) {
      const r = api.complete(m[1], await json1());
      return json(res, r.ok ? 200 : 404, r);
    }
    if (req.method === 'POST' && (m = p.match(/^\/api\/avatars\/(\d+)\/goto$/))) {
      const r = api.goto(m[1], await json1());
      return json(res, r.ok ? 200 : 403, r);
    }
    if (req.method === 'POST' && (m = p.match(/^\/api\/photos\/([\w-]+)$/))) {
      const r = api.photo(m[1], await readBody(req, 3 * 1024 * 1024));
      return json(res, r.ok ? 200 : 409, r);
    }
    if (req.method === 'GET' && p.startsWith('/data/photos/')) {
      const f = safeJoin(path.join(DATA, 'photos'), p.slice('/data/photos/'.length));
      return f ? serveFile(res, f) : json(res, 400, { error: 'bad path' });
    }
    if (req.method === 'GET' && p.startsWith('/vendor/three/')) {
      const f = safeJoin(path.join(ROOT, 'node_modules', 'three'), p.slice('/vendor/three/'.length));
      return f ? serveFile(res, f) : json(res, 400, { error: 'bad path' });
    }
    if (req.method === 'GET' && p.startsWith('/shared/')) {
      const name = p.slice('/shared/'.length);
      if (!SHARED.includes(name)) return json(res, 404, { error: 'not found' });
      return serveFile(res, path.join(ROOT, 'server', name));
    }
    if (req.method === 'GET') {
      const f = safeJoin(path.join(ROOT, 'client'), p === '/' ? 'index.html' : p.slice(1));
      return f ? serveFile(res, f) : json(res, 400, { error: 'bad path' });
    }
    json(res, 404, { error: 'not found' });
  } catch (err) {
    json(res, err.code === 400 ? 400 : 500, { error: String(err.message || err) });
  }
});

server.listen(cfg.port, () => {
  console.log(`ナナシ県 開庁: http://localhost:${cfg.port}  (LLM モード: ${cfg.llm.mode}, 人口 ${sim.cps.length})`);
  // 同じ Wi-Fi のスマホから開くための URL
  for (const list of Object.values(os.networkInterfaces())) {
    for (const a of list || []) if (a.family === 'IPv4' && !a.internal) console.log(`  スマホから: http://${a.address}:${cfg.port}`);
  }
});
