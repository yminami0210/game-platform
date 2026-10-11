// 地図の表示（2D）。WebGL が使えない端末（アプリ内の表示など）でも町が見えるように、
// 昭和の観光鳥瞰図のように斜め上から見下ろした絵を Canvas 2D で描く。view3d.js と同じ形で使える。
import { ROAD_STEP, HALF, RAIL_Z, PORTAL_X, buildDesks, footprint, mulberry32, trainsAt } from './shared/world.js';
import { DEPARTMENTS } from './shared/lore.js';
import { drawFigure } from './portrait.js';

const C = {
  sky: '#8fc8d8', skyLow: '#eef6f4', moegi: '#a9c25a', lot: '#b9cf72', paved: '#dcd9cc', road: '#c9c6bb', walk: '#e9e6dc',
  gunjo: '#2f5ba0', shallow: '#5f9ccc', beach: '#efe3c4', sumi: '#22324f', gofun: '#fbfaf4', sakura: '#f2b8c6', tree: '#5e9a62',
  rail: '#a59d90', window: '#7c95a8', lit: '#ffd27a',
};
const WALLS = ['#f4efe2', '#ece3cf', '#e2e6e2', '#f1e6d8', '#dfe5ea', '#efe9da'];
const ROOFS = ['#5d6e7e', '#4e5d6e', '#6c5a4c', '#3f6a78', '#7b4b3a'];
const ROOF_BY_KIND = { shop: '#5d6e7e', kissa: '#7b4b3a', shokudo: '#4e5d6e', sento: '#3f4f60', station: '#3f6a78', school: '#7b4b3a', kencho: '#bdb6a6' };
const SIGN = { super: ['#c8463a', '#fff'], conbini: ['#2f8a5a', '#fff'], mall: [C.gunjo, '#fff'], sento: ['#2f4f80', '#fff'], kissa: ['#5a2f1f', '#f6d9a0'], kencho: [C.gunjo, '#fff'], station: ['#fff', C.sumi] };
const FONT = '"Zen Maru Gothic", "Hiragino Maru Gothic ProN", "Hiragino Sans", sans-serif';
const TILT = 0.62; // 奥行きの縮み（斜め上から見下ろす）
const HK = 0.85;   // 高さの見え方

export function createMap2D({ canvas, init, layout, mobile }) {
  const ctx = canvas.getContext('2d');
  const stat = document.createElement('canvas'); // 動かないもの（地面・建物）はここに描いておく
  const sctx = stat.getContext('2d');
  const view = { cx: 0, cz: 40, s: 1 };
  let W = 0, H = 0, dpr = 1;
  let world = null;        // 描くための建物・木の一覧（レイアウトから作る）
  let staticKey = '';
  let people = [];
  let night = 0, nightBucket = 0, busy = new Set();
  let ghost = null, frame = null, follow = null;
  let desks = buildDesks(layout.places.find((p) => p.id === 'office'));

  // ---- 投影（世界 → 画面） ----
  const sx = (x, v = view, w = W) => w / 2 + (x - v.cx) * v.s;
  const sy = (z, y = 0, v = view, h = H) => h / 2 + (z - v.cz) * v.s * TILT - y * v.s * HK;

  // ---- レイアウトから描く物を作る（木の配置は決定的な乱数） ----
  function rebuild(l) {
    layout = l;
    desks = buildDesks(l.places.find((p) => p.id === 'office'));
    const rnd = mulberry32(init.seed * 31 + (l.version || 1));
    const items = [];
    for (const p of l.places) {
      const flat = ['park', 'bokujo', 'tanbo', 'office'].includes(p.kind);
      items.push({ kind: 'place', b: p, f: footprint(p), flat, h: flat ? 0 : p.h, wall: p.color, roof: ROOF_BY_KIND[p.kind] || '#d9d6cc' });
    }
    for (const h of l.houses) {
      items.push({ kind: 'house', b: h, f: footprint(h), h: h.h, roofH: h.roofH, wall: WALLS[Math.floor(rnd() * WALLS.length)], roof: ROOFS[Math.floor(rnd() * ROOFS.length)], lit: rnd() < 0.6 });
    }
    // 木: 道・建物・線路を避けて置く。県庁前の桜並木
    const nearRoad = (v) => Math.abs(v - Math.round(v / ROAD_STEP) * ROAD_STEP) < 9;
    const blocked = (x, z) => items.some((it) => it.f && !it.flat && Math.abs(x - it.f.x) < it.f.hx + 3 && Math.abs(z - it.f.z) < it.f.hz + 3);
    for (let i = 0, n = 0; i < 400 && n < 170; i++) {
      const x = (rnd() - 0.5) * HALF * 2, z = (rnd() - 0.5) * HALF * 2;
      if (nearRoad(x) || nearRoad(z) || Math.abs(z - RAIL_Z) < 7 || blocked(x, z)) continue;
      items.push({ kind: 'tree', x, z, r: 2 + rnd() * 1.2, color: rnd() < 0.5 ? C.tree : '#6fa865' }); n++;
    }
    for (let x = -HALF + 10; x < HALF; x += 9) {
      if (nearRoad(x)) continue;
      for (const z of [-7.5, 7.5]) if (!blocked(x, z)) items.push({ kind: 'tree', x, z, r: 2.8, color: C.sakura });
    }
    items.sort((a, b) => (a.f ? a.f.z + a.f.hz : a.z) - (b.f ? b.f.z + b.f.hz : b.z));
    world = items;
    staticKey = '';
  }

  // ---- 動かないもの ----
  function drawStatic(g, v, w, h, withNight = night) {
    const X = (x) => sx(x, v, w), Y = (z, y = 0) => sy(z, y, v, h);
    // 空と地面
    const horizon = Y(-460);
    const grad = g.createLinearGradient(0, 0, 0, Math.max(1, horizon));
    grad.addColorStop(0, C.sky); grad.addColorStop(1, C.skyLow);
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    g.fillStyle = C.moegi; g.fillRect(0, Math.max(0, horizon), w, h);
    // 遠くの山（重なる稜線）
    for (const [z, hh, col] of [[-440, 120, '#9fc0c9'], [-370, 85, '#6f9f86'], [-300, 50, '#4f8a55']]) { // 地図では山を近めに描く
      g.fillStyle = col; g.beginPath(); g.moveTo(X(-1200), Y(z));
      for (let x = -1200; x <= 1200; x += 60) g.lineTo(X(x), Y(z, hh * (0.55 + 0.45 * Math.abs(Math.sin(x * 0.011 + z)))));
      g.lineTo(X(1200), Y(z)); g.closePath(); g.fill();
    }
    g.fillStyle = C.moegi; g.fillRect(0, Y(-300), w, h);
    // 海
    g.fillStyle = C.beach; g.fillRect(0, Y(251), w, h);
    g.fillStyle = C.shallow; g.fillRect(0, Y(272), w, h);
    g.fillStyle = C.gunjo; g.fillRect(0, Y(306), w, h);
    // 区画
    for (let bx = -HALF; bx < HALF; bx += ROAD_STEP) for (let bz = -HALF; bz < HALF; bz += ROAD_STEP) {
      g.fillStyle = (bx + bz) % 120 === 0 ? C.lot : '#b2c96c';
      g.fillRect(X(bx + 5.5), Y(bz + 5.5), (ROAD_STEP - 11) * v.s, (ROAD_STEP - 11) * v.s * TILT);
    }
    // 道（白っぽく）
    g.fillStyle = C.walk;
    for (let k = -HALF; k <= HALF; k += ROAD_STEP) {
      g.fillRect(X(-HALF - 5), Y(k - 5.5), (HALF * 2 + 10) * v.s, 11 * v.s * TILT);
      g.fillRect(X(k - 5.5), Y(-HALF - 5), 11 * v.s, (HALF * 2 + 10) * v.s * TILT);
    }
    g.fillStyle = C.road;
    for (let k = -HALF; k <= HALF; k += ROAD_STEP) {
      g.fillRect(X(-HALF - 5), Y(k - 3.5), (HALF * 2 + 10) * v.s, 7 * v.s * TILT);
      g.fillRect(X(k - 3.5), Y(-HALF - 5), 7 * v.s, (HALF * 2 + 10) * v.s * TILT);
    }
    // 線路
    g.fillStyle = C.rail; g.fillRect(X(-PORTAL_X), Y(RAIL_Z - 2.5), PORTAL_X * 2 * v.s, 5 * v.s * TILT);
    g.strokeStyle = '#7d756a'; g.lineWidth = Math.max(1, v.s * 0.2);
    for (const dz of [-0.75, 0.75]) { g.beginPath(); g.moveTo(X(-PORTAL_X), Y(RAIL_Z + dz)); g.lineTo(X(PORTAL_X), Y(RAIL_Z + dz)); g.stroke(); }
    // 建物と木（奥から順に）
    const ink = Math.max(1, v.s * 0.12);
    g.lineJoin = 'round';
    for (const it of world) {
      if (it.kind === 'tree') {
        const r = it.r * v.s;
        g.fillStyle = '#7a5a40'; g.fillRect(X(it.x) - r * 0.12, Y(it.z, 3) , r * 0.24, 3 * v.s * HK);
        g.fillStyle = it.color; g.strokeStyle = C.sumi; g.lineWidth = ink;
        g.beginPath(); g.ellipse(X(it.x), Y(it.z, 4.2), r, r * 0.85, 0, 0, Math.PI * 2); g.fill(); g.stroke();
        continue;
      }
      const f = it.f, b = it.b;
      const x0 = X(f.x - f.hx), x1 = X(f.x + f.hx);
      if (it.flat) {
        g.fillStyle = b.kind === 'office' ? '#d9cfb9' : b.kind === 'tanbo' ? '#8fb84a' : '#9cc767';
        g.fillRect(x0, Y(f.z - f.hz), x1 - x0, f.hz * 2 * v.s * TILT);
        g.strokeStyle = C.sumi; g.lineWidth = ink; g.strokeRect(x0, Y(f.z - f.hz), x1 - x0, f.hz * 2 * v.s * TILT);
        if (b.kind === 'office') drawOffice(g, X, Y, v);
        if (b.kind === 'park') { g.fillStyle = '#6aa6c8'; g.beginPath(); g.ellipse(X(f.x - 6), Y(f.z - 4), 6 * v.s, 6 * v.s * TILT, 0, 0, 7); g.fill(); }
        continue;
      }
      const h = it.h;
      const top0 = Y(f.z - f.hz, h), top1 = Y(f.z + f.hz, h), base = Y(f.z + f.hz, 0);
      // 正面の壁
      g.fillStyle = it.wall; g.fillRect(x0, top1, x1 - x0, base - top1);
      // 窓（夜は灯る）
      const rows = Math.max(1, Math.round(h / 3.2)), cols = Math.max(2, Math.round((f.hx * 2) / 3.2));
      if (v.s > 1.4) {
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
          const wx = x0 + ((c + 0.5) / cols) * (x1 - x0), wy = top1 + ((r + 0.5) / rows) * (base - top1);
          g.fillStyle = withNight > 0.45 && (it.lit !== false) && ((r + c + Math.round(f.x)) % 3 !== 0) ? C.lit : C.window;
          g.fillRect(wx - v.s * 0.6, wy - v.s * 0.55, v.s * 1.2, v.s * 1.1);
        }
      }
      // 屋根（上の面）。切妻は棟の線と、手前の斜面を少し暗く
      g.fillStyle = it.roof; g.fillRect(x0 - v.s * 0.5, top0 - (it.roofH || 0) * v.s * HK * 0.5, x1 - x0 + v.s, top1 - top0 + (it.roofH || 0) * v.s * HK * 0.5);
      if (it.roofH) {
        const mid = (top0 + top1) / 2 - it.roofH * v.s * HK * 0.5;
        g.fillStyle = 'rgba(0,0,0,.14)'; g.fillRect(x0 - v.s * 0.5, mid, x1 - x0 + v.s, top1 - mid);
      }
      g.strokeStyle = C.sumi; g.lineWidth = ink;
      g.strokeRect(x0 - v.s * 0.5, top0 - (it.roofH || 0) * v.s * HK * 0.5, x1 - x0 + v.s, base - top0 + (it.roofH || 0) * v.s * HK * 0.5);
      // 看板
      if (it.kind === 'place' && b.sign && v.s > 0.9) {
        const [bg, fg] = SIGN[b.kind] || [C.gofun, C.sumi];
        const fs = Math.max(9, Math.min(28, v.s * 2.4));
        g.font = `700 ${fs}px ${FONT}`;
        const tw = g.measureText(b.sign).width + fs * 0.6;
        const cx = (x0 + x1) / 2, cy = top1 + Math.min(fs * 0.9, (base - top1) / 2);
        g.fillStyle = bg; g.fillRect(cx - tw / 2, cy - fs * 0.65, tw, fs * 1.3);
        g.strokeStyle = C.sumi; g.lineWidth = 1; g.strokeRect(cx - tw / 2, cy - fs * 0.65, tw, fs * 1.3);
        g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(b.sign, cx, cy + 1);
      }
    }
    if (withNight > 0.05) { g.fillStyle = `rgba(20,32,74,${withNight * 0.5})`; g.fillRect(0, 0, w, h); }
  }

  function drawOffice(g, X, Y, v) {
    for (const d of desks) {
      g.fillStyle = '#9a7a5a';
      g.fillRect(X(d.x - 1.1), Y(d.z + 0.3, 0.8), 2.2 * v.s, 1.2 * v.s * TILT + 0.8 * v.s * HK);
    }
    if (v.s < 3) return;
    for (const dept of DEPARTMENTS) {
      const mine = desks.filter((d) => d.dept === dept.id);
      const cx = mine.reduce((s, d) => s + d.x, 0) / mine.length, z = Math.min(...mine.map((d) => d.z)) - 1.6;
      const fs = Math.max(9, v.s * 1.1);
      g.font = `700 ${fs}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      const tw = g.measureText(dept.name).width + fs * 0.6;
      g.fillStyle = dept.color; g.fillRect(X(cx) - tw / 2, Y(z, 2.6) - fs * 0.6, tw, fs * 1.2);
      g.fillStyle = '#fff'; g.fillText(dept.name, X(cx), Y(z, 2.6));
      if (busy.has(dept.id)) { g.fillStyle = '#ffb43a'; g.beginPath(); g.arc(X(cx) + tw / 2 + fs * 0.6, Y(z, 2.6), fs * 0.4, 0, 7); g.fill(); }
    }
  }

  // ---- 動くもの（人・電車・札） ----
  function drawPeople(g, v, w, h, withBadges = true) {
    const X = (x) => sx(x, v, w), Y = (z, y = 0) => sy(z, y, v, h);
    const r = Math.max(1.6, v.s * 0.55);
    const list = people.filter((c) => !(c.state === 4 || c.state === 6 || c.gone)).sort((a, b) => a.z - b.z);
    for (const c of list) {
      const px = X(c.x), py = Y(c.z);
      if (px < -20 || px > w + 20 || py < -20 || py > h + 20) continue;
      const s = c.info.role === 'student' ? 0.8 : c.info.role === 'human' ? 1.3 : 1;
      if (r > 2.6) { drawFigure(g, c.look, px, py, r * 4 * s, { seated: c.state === 2 || c.state === 3, outline: r > 4 }); continue; } // 近づくと台帳の見た目で描く
      g.fillStyle = c.color; g.fillRect(px - r * 0.7 * s, py - r * 2.2 * s, r * 1.4 * s, r * 1.6 * s);
      g.fillStyle = c.skin; g.beginPath(); g.arc(px, py - r * 2.8 * s, r * 0.85 * s, 0, 7); g.fill();
      g.fillStyle = c.hair; g.beginPath(); g.arc(px, py - r * 3.0 * s, r * 0.85 * s, Math.PI, 0); g.fill();
      if (r > 3) { g.strokeStyle = C.sumi; g.lineWidth = 1; g.strokeRect(px - r * 0.7 * s, py - r * 2.2 * s, r * 1.4 * s, r * 1.6 * s); }
    }
    if (!withBadges) return;
    for (const c of list) {
      const text = c.badgeText2d || c.tagText2d;
      if (!text) continue;
      const fs = mobile ? 12 : 13;
      g.font = `700 ${fs}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      const tw = g.measureText(text).width + 12, px = X(c.x), py = Y(c.z) - r * 4.5 - 10;
      g.fillStyle = c.badgeWorking ? 'rgba(47,91,160,.96)' : 'rgba(251,250,244,.96)';
      g.fillRect(px - tw / 2, py - fs * 0.8, tw, fs * 1.6);
      g.strokeStyle = C.gunjo; g.lineWidth = 1.5; g.strokeRect(px - tw / 2, py - fs * 0.8, tw, fs * 1.6);
      g.fillStyle = c.badgeWorking ? '#fff' : C.sumi; g.fillText(text, px, py + 1);
    }
  }

  function drawTrains(g, v, w, h, minute) {
    const X = (x) => sx(x, v, w), Y = (z, y = 0) => sy(z, y, v, h);
    const st = layout.places.find((p) => p.id === 'station');
    for (const t of trainsAt(minute, st?.x ?? 30)) {
      for (let i = -1; i <= 1; i++) {
        const cx = t.x + i * 17.6;
        const x0 = X(cx - 8.5), x1 = X(cx + 8.5), top = Y(RAIL_Z - 1.5, 3.8), front = Y(RAIL_Z + 1.5, 3.8), base = Y(RAIL_Z + 1.5, 0.5);
        g.fillStyle = '#7b8590'; g.fillRect(x0, top, x1 - x0, front - top);
        g.fillStyle = '#f2e6c8'; g.fillRect(x0, front, x1 - x0, base - front);
        g.fillStyle = '#d8503e'; g.fillRect(x0, base - (base - front) * 0.3, x1 - x0, (base - front) * 0.3);
        g.strokeStyle = C.sumi; g.lineWidth = Math.max(1, v.s * 0.12); g.strokeRect(x0, top, x1 - x0, base - top);
      }
    }
  }

  function drawOverlay(g) {
    const box = (b, color, fill) => {
      const f = footprint(b), hh = Math.max(2, b.h || 3);
      const x0 = sx(f.x - f.hx), x1 = sx(f.x + f.hx), y0 = sy(f.z - f.hz, hh), y1 = sy(f.z + f.hz, 0);
      if (fill) { g.fillStyle = fill; g.fillRect(x0, y0, x1 - x0, y1 - y0); }
      g.strokeStyle = color; g.lineWidth = 3; g.strokeRect(x0, y0, x1 - x0, y1 - y0);
    };
    if (frame) box(frame, '#f2c230');
    if (ghost) box(ghost.b, ghost.ok ? '#3fae5a' : '#d8503e', ghost.ok ? 'rgba(63,174,90,.4)' : 'rgba(216,80,62,.4)');
  }

  function fit() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    if (!w || !h) return false;
    dpr = Math.min(devicePixelRatio || 1, 2);
    if (w !== W || h !== H || canvas.width !== Math.round(w * dpr)) {
      W = w; H = h;
      canvas.width = stat.width = Math.round(w * dpr); canvas.height = stat.height = Math.round(h * dpr);
      staticKey = '';
    }
    return true;
  }

  // ---- 操作（指1本で動かす、2本でつまんで拡大、ホイールで拡大） ----
  const pts = new Map();
  let pinch = null;
  canvas.addEventListener('pointerdown', (e) => { pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); canvas.setPointerCapture?.(e.pointerId); follow = null; });
  canvas.addEventListener('pointermove', (e) => {
    const p = pts.get(e.pointerId);
    if (!p) return;
    if (pts.size === 1) {
      view.cx -= (e.clientX - p.x) / view.s; view.cz -= (e.clientY - p.y) / (view.s * TILT);
      clampView();
    } else if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      const d0 = Math.hypot(a.x - b.x, a.y - b.y);
      p.x = e.clientX; p.y = e.clientY;
      const [c, d] = [...pts.values()];
      const d1 = Math.hypot(c.x - d.x, c.y - d.y);
      if (d0 > 0) zoom(d1 / d0, (c.x + d.x) / 2, (c.y + d.y) / 2);
      return;
    }
    p.x = e.clientX; p.y = e.clientY;
  });
  const up = (e) => { pts.delete(e.pointerId); pinch = null; };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); zoom(Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY); }, { passive: false });

  function zoom(k, px, py) {
    const r = canvas.getBoundingClientRect();
    const gx = view.cx + (px - r.left - W / 2) / view.s, gz = view.cz + (py - r.top - H / 2) / (view.s * TILT);
    view.s = Math.max(Math.min(W, H) / 900, Math.min(40, view.s * k));
    view.cx = gx - (px - r.left - W / 2) / view.s; view.cz = gz - (py - r.top - H / 2) / (view.s * TILT);
    clampView();
  }
  function clampView() {
    view.cx = Math.max(-HALF - 120, Math.min(HALF + 120, view.cx));
    view.cz = Math.max(-HALF - 200, Math.min(HALF + 200, view.cz));
  }

  const toGround = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: view.cx + (e.clientX - r.left - W / 2) / view.s, z: view.cz + (e.clientY - r.top - H / 2) / (view.s * TILT) };
  };

  rebuild(layout);

  return {
    mode: '2d',
    setCam(name, followCp = null) {
      fit();
      follow = null;
      const m = Math.min(W, H);
      const presets = {
        all: [0, H > W ? 0 : 30, Math.max(W / 560, H / (560 * TILT * 1.6))], office: [30, -26, m / 70], shotengai: [0, 104, m / 120], station: [30, 18, m / 110],
      };
      if (name === 'avatar') { follow = followCp; if (follow) view.s = m / 60; return; }
      if (name === 'koho') {
        const d = desks.filter((x) => x.dept === 'koho');
        Object.assign(view, { cx: d.reduce((s, x) => s + x.x, 0) / d.length, cz: d.reduce((s, x) => s + x.z, 0) / d.length - 2, s: m / 30 });
        return;
      }
      const [cx, cz, s] = presets[name] || presets.all;
      Object.assign(view, { cx, cz, s });
    },
    rebuild,
    officeDesks: () => desks,
    setBusyDepts(b) { const key = [...b].sort().join(); if (key !== [...busy].sort().join()) { busy = b; staticKey = ''; } },
    addPeople(list) { people = [...people, ...list]; },
    setBadge(c, text, working) { c.badgeText2d = text; c.badgeWorking = working; },
    setTag(c, text) { c.tagText2d = text; },
    setDaylight(day) { night = 1 - day; },
    flyTo(x, z) { Object.assign(view, { cx: x, cz: z, s: Math.max(view.s, Math.min(W, H) / 60) }); },
    pickCp(e) {
      const r = canvas.getBoundingClientRect();
      const px = e.clientX - r.left, py = e.clientY - r.top;
      let best = null, bd = 18;
      for (const c of people) {
        if (c.state === 4 || c.state === 6 || c.gone) continue;
        const d = Math.hypot(sx(c.x) - px, sy(c.z, 1.5) - py);
        if (d < bd) { bd = d; best = c; }
      }
      return best;
    },
    groundAt: toGround,
    pickBuilding(e) {
      const r = canvas.getBoundingClientRect();
      const px = e.clientX - r.left, py = e.clientY - r.top;
      for (let i = world.length - 1; i >= 0; i--) {
        const it = world[i];
        if (!it.f) continue;
        const f = it.f;
        if (px >= sx(f.x - f.hx) && px <= sx(f.x + f.hx) && py >= sy(f.z - f.hz, it.h || 0) && py <= sy(f.z + f.hz, 0)) return it.b.id;
      }
      return null;
    },
    setGhost(b, ok) { ghost = b ? { b, ok } : null; },
    setFrame(b) { frame = b || null; },
    photo(req) {
      const out = document.createElement('canvas');
      out.width = 640; out.height = 480;
      const g = out.getContext('2d');
      const v = { cx: req.x, cz: req.z + 6, s: 640 / 90 };
      drawStatic(g, v, 640, 480);
      drawPeople(g, v, 640, 480, false);
      return out;
    },
    draw(dt, minute) {
      if (!fit()) return;
      if (follow && !follow.gone) { view.cx += (follow.x - view.cx) * 0.1; view.cz += (follow.z - view.cz) * 0.1; }
      const nb = night > 0.45 ? 2 : night > 0.05 ? 1 : 0;
      const key = [W, H, view.cx.toFixed(1), view.cz.toFixed(1), view.s.toFixed(3), layout.version, nb, [...busy].join()].join('|');
      if (key !== staticKey || nb !== nightBucket) {
        nightBucket = nb;
        staticKey = key;
        sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawStatic(sctx, view, W, H);
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(stat, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawTrains(ctx, view, W, H, minute);
      drawPeople(ctx, view, W, H);
      drawOverlay(ctx);
    },
    onLost() {},
    debug: { view },
  };
}
