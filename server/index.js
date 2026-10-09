// ナナシ県サーバー: シミュレーションを回し、SSE で 3D クライアントへ配信する。依存パッケージなし。
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { loadConfig, ROOT, DATA } from './config.js';
import { Chronicle } from './chronicle.js';
import { Executor } from './executor.js';
import { Simulation } from './sim.js';
import { DEPARTMENTS } from './lore.js';
import { PLACES } from './world.js';

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
  broadcast('clock', { ...sim.clock(), llm: executor.status(), tasks: sim.tasks.map((t) => sim.taskView(t)) });
}, 500);
function save() {
  fs.writeFileSync(STATE_FILE, JSON.stringify(sim.serialize()));
}
setInterval(save, 60000);
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { save(); process.exit(0); });

// ---- HTTP ----
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.json': 'application/json', '.md': 'text/markdown; charset=utf-8' };

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

const cleanName = (s) => String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 20);
const SPAWNABLE_ROLES = new Set(['resident', 'worker', 'student']);

const routes = {
  'GET /api/init': () => ({
    places: PLACES, departments: DEPARTMENTS, seed: cfg.seed, roster: sim.roster(), clock: sim.clock(),
    tasks: sim.tasks.map((t) => sim.taskView(t)), sns: chronicle.sns, logs: chronicle.recent, news: chronicle.latestNews(), llm: executor.status(),
  }),
  'GET /api/digest': () => sim.digestNow(),
  'GET /api/tasks': () => sim.tasks.map((t) => sim.taskView(t)),
  'GET /api/news/latest': () => chronicle.latestNews(),
  // 住民課: 新規 CP の追加（人事機能）
  'POST /api/residents': (b) => {
    const role = SPAWNABLE_ROLES.has(b.role) ? b.role : 'resident';
    const t = sim.requestTask('resident_register', { name: cleanName(b.name) || undefined, role, work: role === 'worker' ? b.work : role === 'student' ? 'school' : undefined });
    return sim.taskView(t);
  },
  // 住民課: 人間アバターの登録。token を持つブラウザだけがそのアバターを動かせる
  'POST /api/avatars': (b) => {
    const name = cleanName(b.name);
    if (!name) throw Object.assign(new Error('名前が必要です'), { code: 400 });
    const color = /^#[0-9a-f]{6}$/i.test(b.color) ? b.color : '#ffcc00';
    const token = crypto.randomBytes(16).toString('hex');
    const t = sim.requestTask('resident_register', { human: true, name, color, token });
    return { task: sim.taskView(t), token };
  },
  // Claude Code スキル用: 外部実行タスクの作成と完了報告（作業中の CP が 3D に表示される）
  'POST /api/tasks': (b) => {
    if (!['sns_post', 'newspaper'].includes(b.type)) throw Object.assign(new Error('type は sns_post か newspaper'), { code: 400 });
    const event = b.topic ? { text: String(b.topic).slice(0, 120), placeName: '県内' } : undefined;
    return sim.taskView(sim.requestTask(b.type, { external: !!b.external, event }));
  },
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
    if (req.method === 'GET' && (m = p.match(/^\/api\/cp\/(\d+)$/))) {
      const d = sim.cpDetail(Number(m[1]));
      return d ? json(res, 200, d) : json(res, 404, { error: 'not found' });
    }
    if (req.method === 'POST' && (m = p.match(/^\/api\/tasks\/(\d+)\/complete$/))) {
      const b = JSON.parse((await readBody(req)) || '{}');
      return json(res, sim.completeExternal(Number(m[1]), b.text || '') ? 200 : 404, { ok: true });
    }
    if (req.method === 'POST' && (m = p.match(/^\/api\/avatars\/(\d+)\/goto$/))) {
      const b = JSON.parse((await readBody(req)) || '{}');
      const ok = sim.moveHuman(Number(m[1]), String(b.token || ''), Number(b.x) || 0, Number(b.z) || 0);
      return json(res, ok ? 200 : 403, { ok });
    }
    // 3D クライアントからの断面キャプチャ（写真）
    if (req.method === 'POST' && (m = p.match(/^\/api\/photos\/([\w-]+)$/))) {
      const photoId = m[1];
      const dataUrl = await readBody(req, 3 * 1024 * 1024);
      const b64 = dataUrl.replace(/^data:image\/jpeg;base64,/, '');
      if (!sim.photoSaved(photoId)) return json(res, 409, { error: 'already taken or unknown' });
      chronicle.savePhoto(photoId, Buffer.from(b64, 'base64'));
      broadcast('photo', { photoId, url: `/data/photos/${photoId}.jpg` });
      return json(res, 200, { ok: true });
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
      if (!['world.js', 'lore.js'].includes(name)) return json(res, 404, { error: 'not found' });
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
});
