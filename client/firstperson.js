// 人の目線（1人称）。その人の目の高さから、歩いている向きの町を描く。
// WebGL を使わず Canvas 2D の簡単な透視投影で描く（iPhone のアプリ内表示でも動く）。指で左右になぞると見回せる。
import { ROAD_STEP, HALF, RAIL_Z, RIVER_Z, PORTAL_X, footprint, mulberry32, trainsAt } from './shared/world.js';
import { drawFigure, facingFromScreen, personStyle } from './portrait.js';

const INK = '#22324f';
const FONT = '"Zen Maru Gothic", "Hiragino Maru Gothic ProN", sans-serif';
const WALLS = ['#f4efe2', '#ece3cf', '#e2e6e2', '#f1e6d8', '#dfe5ea', '#efe9da'];
const ROOFS = ['#5d6e7e', '#4e5d6e', '#6c5a4c', '#3f6a78', '#7b4b3a'];
const SIGN = { super: ['#c8463a', '#fff'], conbini: ['#2f8a5a', '#fff'], mall: ['#2f5ba0', '#fff'], sento: ['#2f4f80', '#fff'], kissa: ['#5a2f1f', '#f6d9a0'], kencho: ['#2f5ba0', '#fff'], station: ['#fff', INK] };
const FLAT = new Set(['park', 'bokujo', 'tanbo', 'office']);
const VIEW = 190; // 見える距離（m）

export function createFirstPerson({ canvas, seed = 7 }) {
  const g = canvas.getContext('2d');
  let W = 0, H = 0, layout = null, boxes = [], people = [], who = null, yaw = 0, look = 0, night = 0, hits = [], stationX = 30;
  let cam = { x: 0, z: 0, y: 1.55 };
  // 電柱（昭和の町らしさ）。道の脇に 30m ごと
  const poles = [];
  for (let k = -HALF; k <= HALF; k += ROAD_STEP) for (let t = -HALF; t <= HALF; t += 30) { poles.push([t, k + 6.2]); poles.push([k - 6.2, t + 15]); }

  function setLayout(l) {
    layout = l;
    stationX = l.places.find((p) => p.id === 'station')?.x ?? 30;
    const rnd = mulberry32(seed * 17 + (l.version || 1));
    boxes = [...l.places, ...l.houses].map((b) => ({
      b, f: footprint(b), flat: FLAT.has(b.kind), h: b.h || 3, roofH: b.roofH || 0,
      wall: b.type ? WALLS[Math.floor(rnd() * WALLS.length)] : b.color || '#e9e6dc', roof: ROOFS[Math.floor(rnd() * ROOFS.length)], lit: rnd() < 0.6,
    }));
  }

  // ---- 投影 ----
  let F = 1, fx = 0, fz = 1, rx = -1, rz = 0;
  const toCam = (x, y, z) => { const dx = x - cam.x, dz = z - cam.z; return [dx * rx + dz * rz, y - cam.y, dx * fx + dz * fz]; };
  const NEAR = 0.25;
  function clip(poly) { // 手前の面（d < NEAR）で切る
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const ina = a[2] >= NEAR, inb = b[2] >= NEAR;
      if (ina) out.push(a);
      if (ina !== inb) { const t = (NEAR - a[2]) / (b[2] - a[2]); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, NEAR]); }
    }
    return out;
  }
  const scr = (p) => [W / 2 + (p[0] / p[2]) * F, H * 0.5 - (p[1] / p[2]) * F];
  function poly(points, fill, stroke = false) { // points: 世界座標 [x, y, z]
    const c = clip(points.map(([x, y, z]) => toCam(x, y, z)));
    if (c.length < 3) return false;
    g.beginPath();
    c.forEach((p, i) => { const [sx, sy] = scr(p); i ? g.lineTo(sx, sy) : g.moveTo(sx, sy); });
    g.closePath(); g.fillStyle = fill; g.fill();
    if (stroke) { g.strokeStyle = INK; g.lineWidth = 1; g.stroke(); }
    return true;
  }

  // ---- 建物 ----
  function drawBox(it, d) {
    const { f, h } = it;
    const x0 = f.x - f.hx, x1 = f.x + f.hx, z0 = f.z - f.hz, z1 = f.z + f.hz;
    if (it.flat) return; // 地面に描く
    const walls = [
      { a: [x0, z1], b: [x1, z1], n: [0, 1] }, { a: [x1, z0], b: [x0, z0], n: [0, -1] },
      { a: [x1, z1], b: [x1, z0], n: [1, 0] }, { a: [x0, z0], b: [x0, z1], n: [-1, 0] },
    ];
    const shade = (n) => (n[0] ? 0.9 : 1);
    for (const w of walls) {
      const mx = (w.a[0] + w.b[0]) / 2, mz = (w.a[1] + w.b[1]) / 2;
      if ((cam.x - mx) * w.n[0] + (cam.z - mz) * w.n[1] <= 0) continue; // 裏の壁は描かない
      const ok = poly([[w.a[0], 0, w.a[1]], [w.b[0], 0, w.b[1]], [w.b[0], h, w.b[1]], [w.a[0], h, w.a[1]]], it.wall, true);
      if (!ok) continue;
      if (shade(w.n) < 1) poly([[w.a[0], 0, w.a[1]], [w.b[0], 0, w.b[1]], [w.b[0], h, w.b[1]], [w.a[0], h, w.a[1]]], 'rgba(34,50,79,.08)');
      // 窓（近い建物だけ）
      if (d < 90) {
        const len = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]);
        const rows = Math.max(1, Math.floor(h / 3.2)), cols = Math.max(1, Math.floor(len / 3.6));
        const ux = (w.b[0] - w.a[0]) / len, uz = (w.b[1] - w.a[1]) / len, ox = w.n[0] * 0.05, oz = w.n[1] * 0.05;
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
          const s0 = ((c + 0.3) / cols) * len, s1 = ((c + 0.7) / cols) * len, y0 = r * 3.2 + 1.1, y1 = Math.min(h - 0.3, y0 + 1.3);
          if (y1 <= y0) continue;
          const lit = night > 0.45 && it.lit && (r + c) % 3 !== 0;
          poly([[w.a[0] + ux * s0 + ox, y0, w.a[1] + uz * s0 + oz], [w.a[0] + ux * s1 + ox, y0, w.a[1] + uz * s1 + oz], [w.a[0] + ux * s1 + ox, y1, w.a[1] + uz * s1 + oz], [w.a[0] + ux * s0 + ox, y1, w.a[1] + uz * s0 + oz]], lit ? '#ffd27a' : '#7c95a8');
        }
      }
      // 看板
      const sign = it.b.sign;
      if (sign && d < 120) {
        const p = toCam(mx + w.n[0] * 0.3, Math.min(h - 0.8, 4), mz + w.n[1] * 0.3);
        if (p[2] > NEAR) {
          const [sx, sy] = scr(p), fs = Math.min(40, (1.6 / p[2]) * F);
          if (fs > 6) {
            const [bg, fg] = SIGN[it.b.kind] || ['#fbfaf4', INK];
            g.font = `700 ${fs}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
            const tw = g.measureText(sign).width + fs * 0.6;
            g.fillStyle = bg; g.fillRect(sx - tw / 2, sy - fs * 0.65, tw, fs * 1.3); g.strokeStyle = INK; g.lineWidth = 1; g.strokeRect(sx - tw / 2, sy - fs * 0.65, tw, fs * 1.3);
            g.fillStyle = fg; g.fillText(sign, sx, sy + 1);
          }
        }
      }
    }
    // 屋根: 切妻（棟は長い辺に沿う）か、平らな屋根のふち
    if (it.roofH) {
      const alongX = f.hx >= f.hz, rh = h + it.roofH, o = 0.5;
      if (alongX) {
        const s1 = cam.z > f.z ? [[x0 - o, h, z1 + o], [x1 + o, h, z1 + o], [x1 + o, rh, f.z], [x0 - o, rh, f.z]] : [[x0 - o, h, z0 - o], [x1 + o, h, z0 - o], [x1 + o, rh, f.z], [x0 - o, rh, f.z]];
        const side = cam.x > f.x ? x1 : x0;
        poly([[side, h, z0], [side, h, z1], [side, rh, f.z]], it.wall, true);
        poly(s1, it.roof, true);
      } else {
        const s1 = cam.x > f.x ? [[x1 + o, h, z0 - o], [x1 + o, h, z1 + o], [f.x, rh, z1 + o], [f.x, rh, z0 - o]] : [[x0 - o, h, z0 - o], [x0 - o, h, z1 + o], [f.x, rh, z1 + o], [f.x, rh, z0 - o]];
        const side = cam.z > f.z ? z1 : z0;
        poly([[x0, h, side], [x1, h, side], [f.x, rh, side]], it.wall, true);
        poly(s1, it.roof, true);
      }
    } else {
      poly([[x0 - 0.3, h, z1 + 0.3], [x1 + 0.3, h, z1 + 0.3], [x1 + 0.3, h + 0.6, z1 + 0.3], [x0 - 0.3, h + 0.6, z1 + 0.3]], '#bdb6a6', true);
    }
  }

  function drawPole(x, z) {
    const a = toCam(x, 0, z), b = toCam(x, 8, z);
    if (a[2] < NEAR) return;
    const [sx, sy] = scr(a), [, ty] = scr(b), w = Math.max(1, (0.25 / a[2]) * F);
    g.fillStyle = '#6b5a4c'; g.fillRect(sx - w / 2, ty, w, sy - ty);
    g.fillRect(sx - w * 4, ty + (sy - ty) * 0.06, w * 8, Math.max(1, w * 0.6));
  }

  function drawPerson(c, d) {
    const p = toCam(c.x, 0, c.z);
    if (p[2] < 0.6) return;
    const [sx, sy] = scr(p);
    const tall = (c.info.age < 13 ? 1.15 : 1.6) * F / p[2];
    if (tall < 2) return;
    // こちらから見たその人の向き（近づいてくる人は正面、離れていく人は背中、横切る人は横顔）
    const hd = c.heading ?? 0, hx = Math.cos(hd), hz = Math.sin(hd);
    const facing = facingFromScreen(hx * rx + hz * rz, -(hx * fx + hz * fz));
    drawFigure(g, c.look, sx, sy, tall, { seated: c.state === 2 || c.state === 3, outline: tall > 14, facing, walk: c.moving ? performance.now() / 110 + c.idx : null, ...personStyle(c.info) });
    hits.push({ id: c.info.id, x0: sx - tall * 0.3, x1: sx + tall * 0.3, y0: sy - tall * 1.1, y1: sy, d });
    if (c.badgeText2d && tall > 30) {
      const fs = 12; g.font = `700 ${fs}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      const tw = g.measureText(c.badgeText2d).width + 10;
      g.fillStyle = 'rgba(47,91,160,.95)'; g.fillRect(sx - tw / 2, sy - tall * 1.25 - fs, tw, fs * 1.6); g.fillStyle = '#fff'; g.fillText(c.badgeText2d, sx, sy - tall * 1.25 - fs * 0.2);
    }
  }

  function fit() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return false;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    if (w !== W || h !== H) { W = w; H = h; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    F = (W / 2) / Math.tan((Math.min(W, H) === W ? 62 : 70) * Math.PI / 360);
    return true;
  }

  // 指で左右になぞると見回す
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => (drag = { x: e.clientX, look }));
  canvas.addEventListener('pointermove', (e) => { if (drag) look = drag.look - ((e.clientX - drag.x) / Math.max(1, W)) * Math.PI * 1.2; });
  const end = () => (drag = null);
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);

  // ---- 自分で歩く（ストリートビューのように、前後・左右に動く） ----
  let free = null; // { x, z, bob }
  const input = { f: 0, s: 0, t: 0 }; // 前後（+前）・左右（+右）・向き（+右回り）
  const WALK = 4.5, TURN = 1.6; // m/秒、ラジアン/秒
  const blocked = (x, z) => {
    if (Math.abs(x) > HALF + 30 || z < -HALF - 30 || z > RIVER_Z[1] + 40) return true;
    if (z > RIVER_Z[0] - 1 && z < RIVER_Z[1] + 1 && !(Math.abs(x) < 4 || Math.abs(x + 180) < 4)) return true; // 川は橋だけ渡れる
    return boxes.some((it) => !it.flat && Math.abs(x - it.f.x) < it.f.hx + 0.6 && Math.abs(z - it.f.z) < it.f.hz + 0.6);
  };
  function stepFree(dt) {
    yaw += input.t * TURN * dt;
    const a = yaw + look, cx = Math.cos(a), cz = Math.sin(a);
    const dx = (cx * input.f - cz * input.s) * WALK * dt, dz = (cz * input.f + cx * input.s) * WALK * dt;
    if (!dx && !dz) return;
    // 壁にぶつかったら、壁に沿ってすべる
    if (!blocked(free.x + dx, free.z + dz)) { free.x += dx; free.z += dz; }
    else if (!blocked(free.x + dx, free.z)) free.x += dx;
    else if (!blocked(free.x, free.z + dz)) free.z += dz;
    free.bob += Math.hypot(dx, dz) * 2.2;
  }

  function draw(dt, minute) {
    if ((!who && !free) || !layout || !fit()) return;
    let a;
    if (free) {
      stepFree(dt);
      a = yaw + look;
      fx = Math.cos(a); fz = Math.sin(a); rx = -fz; rz = fx;
      cam = { x: free.x, z: free.z, y: 1.55 + Math.sin(free.bob) * 0.03 };
    } else {
      // その人の位置と向き（歩いている向き。止まっているときは前の向きのまま）
      const mx = who.tx - who.x, mz = who.tz - who.z;
      if (Math.hypot(mx, mz) > 0.02) { const want = Math.atan2(mz, mx); let dd = want - yaw; while (dd > Math.PI) dd -= Math.PI * 2; while (dd < -Math.PI) dd += Math.PI * 2; yaw += dd * Math.min(1, dt * 3); }
      a = yaw + look;
      fx = Math.cos(a); fz = Math.sin(a); rx = -fz; rz = fx;
      cam = { x: who.x - fx * 0.4, z: who.z - fz * 0.4, y: who.info.age < 13 ? 1.1 : 1.55 };
    }
    hits = [];
    // 空（時刻で色を変える）
    const sky = g.createLinearGradient(0, 0, 0, H * 0.5);
    sky.addColorStop(0, night > 0.5 ? '#1c2c5a' : '#8fc8d8'); sky.addColorStop(1, night > 0.5 ? '#3a4a7a' : '#eef6f4');
    g.fillStyle = sky; g.fillRect(0, 0, W, H * 0.5 + 1);
    // 遠くの山（向きに合わせて流れる）
    g.fillStyle = night > 0.5 ? '#2c3d5c' : '#7fa89a';
    g.beginPath(); g.moveTo(0, H * 0.5);
    for (let i = 0; i <= 40; i++) { const ang = a - 0.9 + (i / 40) * 1.8; g.lineTo((i / 40) * W, H * 0.5 - (12 + 26 * Math.abs(Math.sin(ang * 3.1) * Math.cos(ang * 1.7))) * (H / 600)); }
    g.lineTo(W, H * 0.5); g.fill();
    // 地面
    g.fillStyle = night > 0.5 ? '#4d6a3c' : '#a9c25a'; g.fillRect(0, H * 0.5, W, H * 0.5);
    const near = (x, z, r = VIEW) => Math.abs(x - cam.x) < r && Math.abs(z - cam.z) < r;
    // ヨコネ川と河川敷（海のない内陸県）
    poly([[cam.x - 400, 0.01, RIVER_Z[0] - 12], [cam.x + 400, 0.01, RIVER_Z[0] - 12], [cam.x + 400, 0.01, RIVER_Z[1] + 10], [cam.x - 400, 0.01, RIVER_Z[1] + 10]], '#b9cf72');
    poly([[cam.x - 400, 0.02, RIVER_Z[0]], [cam.x + 400, 0.02, RIVER_Z[0]], [cam.x + 400, 0.02, RIVER_Z[1]], [cam.x - 400, 0.02, RIVER_Z[1]]], '#6aa6c8');
    // 公園・田んぼなど平らな場所
    for (const it of boxes) if (it.flat && near(it.f.x, it.f.z)) {
      const { f } = it; poly([[f.x - f.hx, 0.02, f.z - f.hz], [f.x + f.hx, 0.02, f.z - f.hz], [f.x + f.hx, 0.02, f.z + f.hz], [f.x - f.hx, 0.02, f.z + f.hz]], it.b.kind === 'tanbo' ? '#8fb84a' : it.b.kind === 'office' ? '#d9cfb9' : '#9cc767');
    }
    // 道（歩道 → 車道 → 白線）
    for (const [wd, col] of [[11, '#e9e6dc'], [7, '#bdb9ae']]) for (let k = -HALF; k <= HALF; k += ROAD_STEP) {
      if (Math.abs(k - cam.z) < VIEW) poly([[cam.x - VIEW, 0.03, k - wd / 2], [cam.x + VIEW, 0.03, k - wd / 2], [cam.x + VIEW, 0.03, k + wd / 2], [cam.x - VIEW, 0.03, k + wd / 2]], col);
      if (Math.abs(k - cam.x) < VIEW) poly([[k - wd / 2, 0.03, cam.z - VIEW], [k + wd / 2, 0.03, cam.z - VIEW], [k + wd / 2, 0.03, cam.z + VIEW], [k - wd / 2, 0.03, cam.z + VIEW]], col);
    }
    // 線路
    if (Math.abs(RAIL_Z - cam.z) < VIEW) poly([[Math.max(-PORTAL_X, cam.x - VIEW), 0.04, RAIL_Z - 2.5], [Math.min(PORTAL_X, cam.x + VIEW), 0.04, RAIL_Z - 2.5], [Math.min(PORTAL_X, cam.x + VIEW), 0.04, RAIL_Z + 2.5], [Math.max(-PORTAL_X, cam.x - VIEW), 0.04, RAIL_Z + 2.5]], '#a59d90');
    // 立っている物を遠い順に
    const list = [];
    const dist = (x, z) => (x - cam.x) * fx + (z - cam.z) * fz;
    for (const it of boxes) {
      if (it.flat || !near(it.f.x, it.f.z)) continue;
      const { f } = it;
      if (Math.abs(cam.x - f.x) < f.hx && Math.abs(cam.z - f.z) < f.hz) continue; // 中にいるときは、その建物を描かない
      const dd = dist(f.x, f.z);
      if (dd < -Math.max(f.hx, f.hz)) continue;
      // 一番近い点までの距離で並べる（大きな建物の手前の人が隠れないように）
      const cx = Math.max(f.x - f.hx, Math.min(cam.x, f.x + f.hx)), cz = Math.max(f.z - f.hz, Math.min(cam.z, f.z + f.hz));
      list.push({ d: Math.hypot(cx - cam.x, cz - cam.z) + 0.5, draw: () => drawBox(it, dd) });
    }
    for (const [x, z] of poles) if (near(x, z, 120) && dist(x, z) > 0.5) list.push({ d: Math.hypot(x - cam.x, z - cam.z), draw: () => drawPole(x, z) });
    for (const t of trainsAt(minute, stationX)) for (let i = 0; i < 2; i++) { // ヨコデンは2両
      const tx = t.x + (i - 0.5) * 17.6, tz = t.z ?? RAIL_Z;
      if (!near(tx, tz)) continue;
      const it = { b: {}, f: { x: tx, z: tz, hx: 8.5, hz: 1.5 }, h: 3.8, roofH: 0, wall: '#f2e6c8' };
      list.push({ d: Math.hypot(tx - cam.x, tz - cam.z), draw: () => drawBox(it, 50) });
    }
    for (const c of people) {
      if (c === who || c.gone || c.state === 4 || c.state === 6 || !near(c.x, c.z, 120)) continue;
      const dd = dist(c.x, c.z);
      if (dd < 1.6) continue; // 目の前すぎる人は描かない（画面をふさぐので）
      list.push({ d: Math.hypot(c.x - cam.x, c.z - cam.z), draw: () => drawPerson(c, dd) });
    }
    list.sort((p, q) => q.d - p.d).forEach((o) => o.draw());
    if (night > 0.05) { g.fillStyle = `rgba(20,32,74,${night * 0.35})`; g.fillRect(0, 0, W, H); }
  }

  return {
    setLayout,
    setPeople(list) { people = list; },
    follow(c) { free = null; if (c !== who) { who = c; look = 0; if (c) yaw = Math.atan2(c.tz - c.z || 1, c.tx - c.x || 0); } },
    // 自分で歩く。x, z から、向き dir（ラジアン。-π/2 が北）で始める
    walk(x, z, dir = -Math.PI / 2) {
      who = null; look = 0; yaw = dir;
      if (blocked(x, z)) for (let r = 1; r < 40 && blocked(x, z); r++) { if (!blocked(x, z - r)) { z -= r; break; } if (!blocked(x, z + r)) { z += r; break; } }
      free = { x, z, bob: 0 };
    },
    // いまの位置と向き（「この人の目線から歩く」で引き継ぐ）
    get pose() { return { x: cam.x, z: cam.z, dir: yaw + look }; },
    get walking() { return !!free; },
    input,
    // 目の前の建物（タップした方向にまっすぐ見て、最初に当たる建物）
    pickBuilding(e) {
      const r = canvas.getBoundingClientRect();
      const ang = yaw + look + Math.atan((e.clientX - r.left - W / 2) / F);
      const cx = Math.cos(ang), cz = Math.sin(ang);
      for (let t = 1; t < 150; t += 0.5) {
        const x = cam.x + cx * t, z = cam.z + cz * t;
        const hit = boxes.find((it) => Math.abs(x - it.f.x) < it.f.hx && Math.abs(z - it.f.z) < it.f.hz);
        if (hit) return hit.flat && t > 30 ? null : hit.b.id;
      }
      return null;
    },
    // いちばん近い施設（「〇〇の前」と画面に出す）
    nearPlace() {
      let best = null, bd = 40;
      for (const it of boxes) {
        if (!it.b.name) continue;
        const d = Math.hypot(Math.max(0, Math.abs(cam.x - it.f.x) - it.f.hx), Math.max(0, Math.abs(cam.z - it.f.z) - it.f.hz));
        if (d < bd) { bd = d; best = it.b.name; }
      }
      return best;
    },
    get who() { return who; },
    setNight(n) { night = n; },
    draw,
    pick(e) {
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      let best = null;
      for (const h of hits) if (x >= h.x0 && x <= h.x1 && y >= h.y0 && y <= h.y1 && (!best || h.d < best.d)) best = h;
      return best?.id ?? null;
    },
  };
}
