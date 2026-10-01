// トモシムレのコア。DOM / Canvas / Audio / Date / Math.random に触れない。
import { createRng } from './rng.js';

export const W = 9, H = 16; // 論理座標。群れは画面下 SWARM_Y に居て、岩壁が上から流れてくる
export const SWARM_Y = 12.5;
const GOLDEN = 2.399963229728653;

// data は balance 単体（フラット）でも { balance, layers, ... }（複数ファイル）でも受ける
export const balanceOf = data => data.balance ?? data;
export const layerNamesOf = data => (data.balance ? data.layers?.names : null) ?? ['あさせ', 'こけの道', 'しずくの間', 'ねの森', 'ねむりの底'];

export const radius = (N, B) => B.swarm.r0 + B.swarm.rK * Math.sqrt(N);
export const mult = (N, B) => 1 + B.score.mSlope * (N - 1);
export const sight = (N, B) => B.light.base + B.light.k * Math.sqrt(N);

// 群れ内の各ホタルの相対位置（黄金角配置）。描画も core の値を使う
export function swarmOffsets(N, B) {
  const r = radius(N, B), out = [];
  for (let i = 0; i < N; i++) {
    const a = i * GOLDEN, d = r * Math.sqrt((i + 0.5) / N);
    out.push({ dx: Math.cos(a) * d, dy: Math.sin(a) * d });
  }
  return out;
}

const layerIndex = (d, B) => Math.min(B.layers.count - 1, Math.floor(d / B.layers.length));

function genAhead(s) {
  const B = s.B, rng = s.rng;
  while (s.nextD < s.dist + H + 2) {
    const d = s.nextD, L = B.layers.table[layerIndex(d, B)];
    const half = L.gap / 2;
    const cx = Math.min(W - half, Math.max(half, s.lastCx + rng.range(-B.gapSpread, B.gapSpread)));
    s.lastCx = cx;
    let gap = L.gap + rng.range(-B.gapJitter, B.gapJitter) * 0.3;
    if (s.tutorial && s.wallCount < (B.tutorial?.walls ?? 3)) gap = Math.max(gap, B.tutorial?.gap ?? 3.6); // 初回だけ最初の壁は広め
    s.wallCount++;
    s.walls.push({ d, cx, gap, passed: false });
    const sp = L.spacing * (1 + rng.range(-B.spacingJitter, B.spacingJitter));
    const cl = (x, m) => Math.min(W - m, Math.max(m, x));
    if (rng.next() < B.pickup.prob)
      s.strays.push({ d: d + sp / 2, x: Math.min(W - 0.8, Math.max(0.8, cx + rng.range(-2.5, 2.5))), n: rng.int(1, B.pickup.max) });
    for (const t of L.traps) {
      if (t.t === 'wind' && rng.next() < t.p)
        s.winds.push({ d0: d + 1.5, d1: d + 1.5 + t.len, dir: rng.next() < 0.5 ? -1 : 1, f: t.f });
      // 以下の罠は壁と壁のあいだに置く。幅は W より十分狭く、隙間を塞がない（必ず通り道がある）
      else if (t.t === 'puddle' && rng.next() < t.p) {
        const w = B.traps.puddleW ?? 2.4, c = cl(cx + rng.range(-2, 2), w / 2);
        s.puddles.push({ d0: d + sp * 0.3, d1: d + sp * 0.3 + (B.traps.puddleLen ?? 2.5), x0: c - w / 2, x1: c + w / 2 });
      } else if (t.t === 'roots' && rng.next() < t.p)
        s.roots.push({ d: d + sp * 0.5, x: cl(cx + rng.range(-1.5, 1.5), B.traps.rootsHalf ?? 0.85), len: B.traps.rootsLen ?? 2.5, hit: false });
      else if (t.t === 'blackstone' && rng.next() < t.p)
        s.stones.push({ d: d + sp * 0.6, x: cl(cx + (rng.next() < 0.5 ? -1 : 1) * rng.range(1, 2.5), 0.8), r: B.traps.stoneR ?? 0.5, hit: false });
    }
    if (B.flowers && rng.next() < B.flowers.p)
      s.flowers.push({ id: s.flowerSeq++, d: d + sp * 0.35, x: rng.next() < 0.5 ? B.flowers.edge : W - B.flowers.edge, lit: false, done: false });
    s.nextD = d + sp;
  }
}

// 図鑑: creatures.json の cond を判定。同じランで1回だけ creature イベント
function checkCreatures(s, ev) {
  const list = s.data.creatures?.list;
  if (!list) return;
  for (const c of list) {
    if (s.found.includes(c.id)) continue;
    const v = c.cond.value;
    const ok = { reach: s.maxLayer, swarm: s.maxN, score: s.score, flowers: s.flowersBase + s.flowersLit }[c.cond.type] >= v;
    if (ok) { s.found.push(c.id); ev.push({ type: 'creature', id: c.id }); }
  }
}

export function createGame({ seed = 1, data, tutorial = false, meta = {} }) {
  const B = balanceOf(data);
  const s = {
    seed, rng: createRng(seed), data, B,
    t: 0, alive: true, score: 0, hikari: 0,
    x: W / 2, N: B.start.N, dist: 0, layer: 0,
    walls: [], strays: [], winds: [], puddles: [], roots: [], stones: [], flowers: [],
    nextD: B.start.firstWall, lastCx: W / 2,
    tutorial: !!tutorial, wallCount: 0, passed: 0, flowerSeq: 0,
    dimT: 0, flowersLit: 0, flowersBase: meta.flowersTotal ?? 0, maxN: B.start.N, maxLayer: 1, found: [],
  };
  genAhead(s);
  return s;
}

// 先読み用の複製（rng は fork）
export function clone(s) {
  return {
    ...s, rng: s.rng.fork(),
    walls: s.walls.map(w => ({ ...w })), strays: s.strays.map(w => ({ ...w })), winds: s.winds.map(w => ({ ...w })),
    puddles: s.puddles.map(w => ({ ...w })), roots: s.roots.map(w => ({ ...w })), stones: s.stones.map(w => ({ ...w })),
    flowers: s.flowers.map(w => ({ ...w })), found: [...s.found],
  };
}

export function actions(s) {
  return s.alive ? ['none', 'left', 'right'] : ['retry'];
}

export function speedAt(s) {
  const B = s.B, li = layerIndex(s.dist, B), L = B.layers.table[li];
  const over = Math.max(0, s.dist - B.layers.length * (B.layers.count - 1)); // 層5以降はじわじわ加速
  return L.speed + (li >= B.layers.count - 1 ? B.speedGrow * over : 0);
}

export function step(s, action, dt) {
  const ev = [];
  if (!s.alive) return ev;
  const B = s.B;
  s.t += dt;
  const sp = speedAt(s);
  s.dist += sp * dt;

  if (action === 'left') s.x -= B.moveSpeed * dt;
  else if (action === 'right') s.x += B.moveSpeed * dt;
  // 浅い層ほど、洞窟のゆるい流れが次の隙間へ群れをそっと寄せる（層が深いほど弱く、4層からは無し）
  const pull = B.layers.table[layerIndex(s.dist, B)].pull ?? 0;
  if (pull > 0) {
    const nw = s.walls.find(w => !w.passed);
    if (nw && nw.d - s.dist < B.pullRange) { const dx = nw.cx - s.x; s.x += Math.sign(dx) * Math.min(Math.abs(dx), pull * dt); }
  }
  for (const w of s.winds) if (s.dist >= w.d0 && s.dist <= w.d1) s.x += w.dir * w.f * dt;
  for (const k of s.stones) { // 黒石は近くの群れをそっと引き寄せる
    if (k.hit || Math.abs(k.d - s.dist) > (B.traps.stoneRange ?? 3) || Math.abs(k.x - s.x) > (B.traps.stoneRange ?? 3)) continue;
    const dx = k.x - s.x; s.x += Math.sign(dx) * Math.min(Math.abs(dx), (B.traps.stonePull ?? 1.0) * dt);
  }
  s.x = Math.min(W - 0.3, Math.max(0.3, s.x));

  // 得点
  if (s.dimT > 0) s.dimT = Math.max(0, s.dimT - dt);
  s.hikari += sp * dt * mult(s.N, B) * (s.dimT > 0 ? 0.5 : 1);
  const sc = Math.floor(s.hikari);
  if (sc !== s.score) { s.score = sc; ev.push({ type: 'score', value: sc }); }

  // 壁通過
  for (const w of s.walls) {
    if (w.passed || s.dist < w.d) continue;
    w.passed = true;
    const offs = swarmOffsets(s.N, B);
    let out = 0, ox = 0;
    for (const o of offs) if (Math.abs(s.x + o.dx - w.cx) > w.gap / 2) { out++; ox += s.x + o.dx; }
    s.passed++;
    ev.push({ type: 'gate' });
    if (out > 0) {
      s.N -= out;
      ev.push({ type: 'scatter', n: out, x: ox / out, y: SWARM_Y });
    }
  }

  // 水たまり: 群れの中心が入ると 2 秒間 倍率半分・視界が弱まる（散らない）
  for (const p of s.puddles) if (s.dist >= p.d0 && s.dist <= p.d1 && s.x >= p.x0 && s.x <= p.x1) {
    if (s.dimT <= 0) ev.push({ type: 'puddle' });
    s.dimT = B.traps.dimSec ?? 2;
  }
  // 根のカーテン: 重なったホタルのうち最大 rootsCatch 匹が散る（1本1回）
  for (const r of s.roots) {
    if (r.hit || s.dist < r.d || s.dist > r.d + r.len) continue;
    const hw = B.traps.rootsHalf ?? 0.85;
    const xs = swarmOffsets(s.N, B).map(o => s.x + o.dx).filter(x => Math.abs(x - r.x) <= hw);
    if (!xs.length) continue;
    r.hit = true;
    const n = Math.min(B.traps.rootsCatch, xs.length);
    s.N -= n; ev.push({ type: 'scatter', n, x: xs[0], y: SWARM_Y, cause: 'roots' });
  }
  // 黒石: 円に触れると blackstoneFrac の割合（最低1匹）が散る（1つ1回）
  for (const k of s.stones) {
    if (k.hit || Math.hypot(k.d - s.dist, k.x - s.x) >= radius(s.N, B) + k.r) continue;
    k.hit = true;
    const n = Math.min(s.N, Math.max(1, Math.round(s.N * B.traps.blackstoneFrac)));
    s.N -= n; ev.push({ type: 'scatter', n, x: k.x, y: SWARM_Y, cause: 'stone' });
  }
  // ねむり花: 視界が届く距離で通過すると灯る
  for (const f of s.flowers) {
    if (f.done || s.dist < f.d) continue;
    f.done = true;
    if (Math.abs(f.x - s.x) <= sight(Math.max(1, s.N), B) * (s.dimT > 0 ? 0.55 : 1)) {
      f.lit = true; s.flowersLit++; s.hikari += s.N * 5;
      ev.push({ type: 'bloom', flowerId: f.id, bonus: s.N * 5 });
    }
  }

  // はぐれホタル
  const rr = radius(s.N, B) + B.pickup.radius;
  s.strays = s.strays.filter(st => {
    const dy = st.d - s.dist; // 正: まだ先
    if (Math.abs(dy) < rr && Math.abs(st.x - s.x) < rr && Math.hypot(dy, st.x - s.x) < rr) {
      const n = Math.min(st.n, B.swarm.maxN - s.N);
      if (n > 0) { s.N += n; ev.push({ type: 'pickup', n }); }
      return false;
    }
    return dy > -3;
  });
  s.walls = s.walls.filter(w => w.d > s.dist - 3);
  s.winds = s.winds.filter(w => w.d1 > s.dist - 3);
  s.puddles = s.puddles.filter(w => w.d1 > s.dist - 3);
  s.roots = s.roots.filter(w => w.d + w.len > s.dist - 3);
  s.stones = s.stones.filter(w => w.d > s.dist - 3);
  s.flowers = s.flowers.filter(w => w.d > s.dist - 3);

  const li = layerIndex(s.dist, B);
  if (li !== s.layer) { s.layer = li; ev.push({ type: 'layer', index: li + 1 }); }

  genAhead(s);
  if (s.N > s.maxN) s.maxN = s.N;
  if (s.layer + 1 > s.maxLayer) s.maxLayer = s.layer + 1;
  checkCreatures(s, ev);
  if (s.N <= 0) {
    s.N = 0; s.alive = false;
    ev.push({ type: 'fail', score: s.score, layer: s.layer + 1, t: s.t });
  }
  return ev;
}
