// ワールドマップと物語の場面の描画。藍染めの海（青海波の刺し子）に、継ぎはぎの島。
// 開いた道は茜の糸で縫われ、まだの道は仕立て屋のチャコの点線。
import { PAL } from './sprites.js';
import { edgeOpen, openNodes } from '../core/world.js';

const hash = (x, y, k = 0) => { let h = (x * 374761393 + y * 668265263 + k * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

export function createMapView(renderer, world) {
  const g = renderer.bigCtx, spr = renderer.spr;
  const W = 384, H = 216;
  const sea = makeSea(W, H);
  const island = makeIsland(world, W, H);
  const node = id => world.nodes.find(n => n.id === id);
  const curve = e => {
    const a = node(e.a), b = node(e.b);
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, k = (hash(a.x, b.y) - 0.5) * 30;
    const nx = -(b.y - a.y), ny = b.x - a.x, d = Math.hypot(nx, ny) || 1;
    return { a, b, c: { x: mx + nx / d * k, y: my + ny / d * k } };
  };
  const at = (q, t) => ({ x: (1 - t) ** 2 * q.a.x + 2 * (1 - t) * t * q.c.x + t * t * q.b.x, y: (1 - t) ** 2 * q.a.y + 2 * (1 - t) * t * q.c.y + t * t * q.b.y });

  function drawEdge(e, mode, prog = 1) {
    const q = curve(e);
    const n = 40;
    for (let i = 0; i < n * prog; i++) {
      const p0 = at(q, i / n), p1 = at(q, Math.min(1, (i + 0.55) / n));
      if (mode === 'sewn') {
        g.strokeStyle = PAL.K; g.lineWidth = 3; line(p0, p1);
        g.strokeStyle = PAL.R; g.lineWidth = 2; line(p0, p1);
      } else if (i % 2 === 0) { g.fillStyle = 'rgba(240,230,207,0.55)'; g.fillRect(Math.round(p0.x), Math.round(p0.y), 1, 1); }
    }
    if (mode === 'sewn' && prog < 1) {
      // 縫っている針
      const p = at(q, prog);
      g.fillStyle = PAL.s; g.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 9, 2, 10);
      g.fillStyle = PAL.K; g.fillRect(Math.round(p.x), Math.round(p.y) - 8, 1, 2);
    }
  }
  function line(a, b) { g.beginPath(); g.moveTo(Math.round(a.x) + 0.5, Math.round(a.y) + 0.5); g.lineTo(Math.round(b.x) + 0.5, Math.round(b.y) + 0.5); g.stroke(); }

  function drawNode(n, prog, open, t) {
    const st = prog.stages[n.stage];
    const cleared = st && Object.keys(st.exits).length > 0;
    const x = n.x, y = n.y;
    if (!open) {
      if (n.secret) return;
      g.fillStyle = 'rgba(240,230,207,0.5)';
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.fillRect(Math.round(x + Math.cos(a) * 6), Math.round(y + Math.sin(a) * 5), 1, 1); }
      return;
    }
    if (n.kind === 'home') {
      // 針箱
      g.fillStyle = PAL.K; g.fillRect(x - 11, y - 9, 22, 15);
      g.fillStyle = PAL.W; g.fillRect(x - 10, y - 8, 20, 13);
      g.fillStyle = PAL.w; g.fillRect(x - 10, y - 8, 20, 3);
      g.fillStyle = PAL.Y; g.fillRect(x - 2, y - 3, 4, 3);
      return;
    }
    if (n.kind === 'fort') {
      // 針山の砦
      g.fillStyle = PAL.K; disc(g, x, y, 13);
      g.fillStyle = PAL.P; disc(g, x, y, 12);
      g.fillStyle = '#9a3e5c'; for (let i = -10; i <= 10; i += 5) g.fillRect(x + i, y - 9 + Math.abs(i) / 3, 1, 18 - Math.abs(i) / 1.5);
      g.fillStyle = PAL.K; g.fillRect(x - 13, y + 4, 26, 6); g.fillStyle = PAL.W; g.fillRect(x - 12, y + 5, 24, 4);
      const pins = [[-6, -14, PAL.R], [3, -16, PAL.Y], [8, -11, PAL.B], [-1, -12, PAL.n]];
      for (const [px, py, c] of pins) { g.fillStyle = PAL.S; g.fillRect(x + px, y + py + 2, 1, 7); g.fillStyle = PAL.K; g.fillRect(x + px - 1, y + py - 1, 4, 4); g.fillStyle = c; g.fillRect(x + px, y + py, 2, 2); }
      if (cleared) { g.fillStyle = PAL.y; g.fillRect(x - 3, y - 26, 6, 6); }
      return;
    }
    // ステージ: 縫い付けたボタン。クリアすると糸が×に通る
    const col = n.secret ? PAL.Y : PAL.n;
    g.fillStyle = PAL.K; disc(g, x, y, 7);
    g.fillStyle = col; disc(g, x, y, 6);
    g.fillStyle = n.secret ? PAL.y : '#ffffff22'; g.fillRect(x - 4, y - 5, 4, 2);
    g.fillStyle = PAL.K; for (const [dx, dy] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) g.fillRect(x + dx - (dx < 0 ? 1 : 0), y + dy - (dy < 0 ? 1 : 0), 1, 1);
    if (cleared) {
      g.strokeStyle = PAL.R; g.lineWidth = 1;
      line({ x: x - 3, y: y - 3 }, { x: x + 2, y: y + 2 }); line({ x: x + 2, y: y - 3 }, { x: x - 3, y: y + 2 });
    }
    const medals = st ? st.medals.filter(Boolean).length : 0;
    for (let i = 0; i < 3; i++) { g.fillStyle = PAL.K; g.fillRect(x - 6 + i * 5, y + 9, 4, 4); g.fillStyle = i < medals ? PAL.y : '#00000044'; g.fillRect(x - 5 + i * 5, y + 10, 2, 2); }
  }

  // 島（地図）を描く。opts: { sewing: {edge, t}, hidden: Set, unravel: 0..1, extra: fn }
  function drawWorld(prog, t, opts = {}) {
    g.drawImage(sea, 0, 0);
    // 遠くの島々（物語用）
    if (opts.others) for (const o of OTHER_ISLANDS) {
      const ox = o.x + (o.drift ? opts.drift ?? 0 : 0);
      g.fillStyle = PAL.K; blob(g, ox, o.y + 1, o.r + 1, o.k);
      g.fillStyle = o.c; blob(g, ox, o.y, o.r, o.k);
      g.fillStyle = 'rgba(240,230,207,0.6)'; for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; g.fillRect(Math.round(ox + Math.cos(a) * o.r * 0.7), Math.round(o.y + Math.sin(a) * o.r * 0.5), 1, 1); }
    }
    g.drawImage(island, 0, 0);
    const open = openNodes(world, prog);
    for (const e of world.edges) {
      const isOpen = edgeOpen(e, prog) && !(opts.sewing && opts.sewing.edge === e);
      const nb = world.nodes.find(n => n.id === e.b);
      if (!isOpen && nb.secret && !(opts.sewing?.edge === e)) continue;
      if (opts.unravel != null) { drawEdge(e, opts.unravel > hash(e.a.length, e.b.length) ? 'chalk' : 'sewn'); continue; }
      drawEdge(e, isOpen ? 'sewn' : 'chalk');
    }
    if (opts.sewing) drawEdge(opts.sewing.edge, 'sewn', opts.sewing.t);
    for (const n of world.nodes) drawNode(n, prog, open.has(n.id) || opts.allOpen, t);
  }

  function drawToken(x, y, t, face = 1, hop = 0) {
    const sp = spr[hop > 0 ? 'tsugi_jump' : 'tsugi_stand'];
    const by = Math.round(y - 16 - Math.sin(hop * Math.PI) * 8 + (hop ? 0 : Math.sin(t * 3) * 0.6));
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(Math.round(x) - 5, Math.round(y) - 2, 10, 2);
    g.drawImage(face > 0 ? sp.r : sp.l, Math.round(x) - 8, by);
  }

  // 物語の場面
  function drawScene(scene, prog, t, k) {
    switch (scene) {
      case 'island': drawWorld(fullProgress(world), t, { others: true, allOpen: true }); break;
      case 'moths': {
        drawWorld(fullProgress(world), t, { others: true, allOpen: true });
        for (let i = 0; i < 9; i++) {
          const x = (i * 53 + t * (20 + i * 3)) % (W + 40) - 20, y = 30 + (i * 37) % 120 + Math.sin(t * 3 + i) * 6;
          const sp = spr[Math.floor(t * 8 + i) % 2 ? 'kona1' : 'kona2'];
          g.drawImage(sp.r, Math.round(x), Math.round(y), 24, 24);
        }
        break;
      }
      case 'unravel': drawWorld(fullProgress(world), t, { others: true, allOpen: true, unravel: Math.min(1, k / 2.5) }); break;
      case 'tsugi': case 'knot': {
        g.fillStyle = '#6e4632'; g.fillRect(0, 0, W, H);
        // 針箱の中の木目
        g.fillStyle = '#7c5039'; for (let y = 0; y < H; y += 6) g.fillRect(0, y + Math.round(Math.sin(y) * 2), W, 2);
        g.fillStyle = '#5a3828'; g.fillRect(0, 150, W, 66);
        g.fillStyle = PAL.K; g.fillRect(0, 150, W, 2);
        const wake = scene === 'tsugi' ? Math.min(1, k / 1.2) : 1;
        const sp = spr[wake < 1 ? 'tsugi_dead' : 'tsugi_stand'];
        // 縫い針
        g.fillStyle = PAL.K; g.fillRect(150, 70, 4, 82); g.fillStyle = PAL.s; g.fillRect(151, 71, 2, 80);
        g.fillStyle = PAL.K; g.fillRect(151, 76, 2, 6);
        g.strokeStyle = PAL.R; g.lineWidth = 1; g.beginPath(); g.moveTo(152.5, 79); g.bezierCurveTo(130, 100, 170, 120, 120, 148); g.stroke();
        g.drawImage(sp.r, 176, 150 - 64 + (wake < 1 ? 8 : 0), 64, 64);
        if (scene === 'knot') g.drawImage(spr.knot.r, 236, 92 + Math.round(Math.sin(t * 3) * 2), 42, 42);
        break;
      }
      case 'sew': {
        const done = Math.min(1, k / 2.4);
        drawWorld(fullProgress(world), t, { allOpen: true, unravel: 1 - done });
        drawToken(node('1-F').x, node('1-F').y - 14, t);
        break;
      }
      case 'drift': drawWorld(fullProgress(world), t, { others: true, allOpen: true, drift: k * 14 }); drawToken(node('1-F').x, node('1-F').y - 14, t); break;
    }
  }

  return { drawWorld, drawToken, drawScene, curve, at, node };
}

const OTHER_ISLANDS = [
  { x: 22, y: 26, r: 14, c: '#3c6fae', k: 1, drift: true },
  { x: 96, y: 14, r: 10, c: '#e8eee6', k: 2 },
  { x: 300, y: 18, r: 12, c: '#8a5536', k: 3 },
  { x: 360, y: 40, r: 9, c: '#c9577a', k: 4 },
  { x: 366, y: 196, r: 13, c: '#d39a22', k: 5 },
  { x: 14, y: 200, r: 10, c: '#6f5f7d', k: 6 },
  { x: 200, y: 206, r: 8, c: '#b8372b', k: 7 },
];

function fullProgress(world) {
  const stages = {};
  for (const n of world.nodes) if (n.stage) stages[n.stage] = { exits: { goal: true, secret: true }, medals: [false, false, false] };
  return { stages };
}

function disc(g, cx, cy, r) { for (let y = -r; y <= r; y++) { const w = Math.round(Math.sqrt(r * r - y * y)); g.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2, 1); } }
function blob(g, cx, cy, r, k) {
  for (let y = -r; y <= r; y++) { const w = Math.round(Math.sqrt(Math.max(0, r * r - y * y)) * (1.4 + 0.2 * Math.sin(y * 0.5 + k))); g.fillRect(Math.round(cx - w), Math.round(cy + y * 0.7), w * 2, 1); }
}

function makeSea(W, H) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#21385c'; g.fillRect(0, 0, W, H);
  // 青海波（重なる半円）を刺し子の点で
  g.fillStyle = 'rgba(207,224,236,0.35)';
  for (let row = 0; row < H / 8 + 2; row++) for (let col = -1; col < W / 16 + 1; col++) {
    const cx = col * 16 + (row % 2) * 8, cy = row * 8;
    for (const r of [7, 4]) for (let a = Math.PI; a <= Math.PI * 2; a += 0.45) g.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1, 1);
  }
  return c;
}

function makeIsland(world, W, H) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  // 島の輪郭（ノードを全部含むように）
  const pts = [];
  const cx = 190, cy = 112;
  for (let i = 0; i < 48; i++) {
    const a = i / 48 * Math.PI * 2;
    const r = 1 + 0.08 * Math.sin(a * 3 + 1) + 0.05 * Math.sin(a * 7) + (hash(i, 3) - 0.5) * 0.04;
    pts.push({ x: cx + Math.cos(a) * 170 * r, y: cy + Math.sin(a) * 82 * r });
  }
  const path = () => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.closePath(); };
  // 影と縁
  g.save(); g.translate(3, 4); path(); g.fillStyle = 'rgba(10,20,40,0.45)'; g.fill(); g.restore();
  path(); g.fillStyle = PAL.K; g.fill();
  g.save(); g.translate(0, 0); g.scale(1, 1);
  g.beginPath(); pts.forEach((p, i) => { const q = { x: cx + (p.x - cx) * 0.985, y: cy + (p.y - cy) * 0.97 }; i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y); }); g.closePath(); g.clip();
  // 継ぎはぎ
  const cols = ['#7c9a4a', '#86a457', '#6d8c42', '#9bb070', '#7c9a4a', '#4b6e98', '#d8cfb3', '#93a95f'];
  for (let y = 0; y < H; y += 22) for (let x = -(y / 22 % 2) * 14; x < W; x += 30) {
    const k = Math.floor(hash(x, y, 2) * cols.length);
    g.fillStyle = cols[k]; g.fillRect(x, y, 30, 22);
    if (cols[k] === '#d8cfb3') { g.fillStyle = '#c4b896'; for (let i = 0; i < 30; i += 4) g.fillRect(x + i, y, 2, 22); }
    if (cols[k] === '#4b6e98') { g.fillStyle = '#5b7ea8'; for (let i = 2; i < 22; i += 5) for (let j = 2; j < 30; j += 6) g.fillRect(x + j, y + i, 2, 1); }
    g.fillStyle = 'rgba(240,230,207,0.75)';
    for (let i = 1; i < 30; i += 4) g.fillRect(x + i, y + 21, 2, 1);
    for (let i = 1; i < 22; i += 4) g.fillRect(x + 29, y + i, 1, 2);
  }
  // 木（ぽんぽん）
  for (let i = 0; i < 26; i++) {
    const x = 40 + hash(i, 1) * 300, y = 50 + hash(i, 2) * 120;
    if (world.nodes.some(n => Math.hypot(n.x - x, n.y - y) < 22)) continue;
    g.fillStyle = PAL.K; disc(g, x, y + 1, 5); g.fillStyle = i % 3 ? '#56703a' : '#3f5a2c'; disc(g, x, y, 4);
    g.fillStyle = '#ffffff30'; g.fillRect(Math.round(x) - 2, Math.round(y) - 3, 2, 1);
  }
  g.restore();
  // 縁の運針
  g.fillStyle = PAL.n;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    for (let t = 0; t < 1; t += 0.34) {
      const x = cx + (a.x + (b.x - a.x) * t - cx) * 0.94, y = cy + (a.y + (b.y - a.y) * t - cy) * 0.9;
      g.fillRect(Math.round(x), Math.round(y), 2, 1);
    }
  }
  return c;
}
