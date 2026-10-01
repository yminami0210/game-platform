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
    s.walls.push({ d, cx, gap: L.gap + rng.range(-B.gapJitter, B.gapJitter) * 0.3, passed: false });
    const sp = L.spacing * (1 + rng.range(-B.spacingJitter, B.spacingJitter));
    if (rng.next() < B.pickup.prob)
      s.strays.push({ d: d + sp / 2, x: Math.min(W - 0.8, Math.max(0.8, cx + rng.range(-2.5, 2.5))), n: rng.int(1, B.pickup.max) });
    for (const t of L.traps) {
      if (t.t === 'wind' && rng.next() < t.p)
        s.winds.push({ d0: d + 1.5, d1: d + 1.5 + t.len, dir: rng.next() < 0.5 ? -1 : 1, f: t.f });
    }
    s.nextD = d + sp;
  }
}

export function createGame({ seed = 1, data }) {
  const B = balanceOf(data);
  const s = {
    seed, rng: createRng(seed), data, B,
    t: 0, alive: true, score: 0, hikari: 0,
    x: W / 2, N: B.start.N, dist: 0, layer: 0,
    walls: [], strays: [], winds: [],
    nextD: B.start.firstWall, lastCx: W / 2,
  };
  genAhead(s);
  return s;
}

// 先読み用の複製（rng は fork）
export function clone(s) {
  return {
    ...s, rng: s.rng.fork(),
    walls: s.walls.map(w => ({ ...w })), strays: s.strays.map(w => ({ ...w })), winds: s.winds.map(w => ({ ...w })),
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
  s.x = Math.min(W - 0.3, Math.max(0.3, s.x));

  // 得点
  s.hikari += sp * dt * mult(s.N, B);
  const sc = Math.floor(s.hikari);
  if (sc !== s.score) { s.score = sc; ev.push({ type: 'score', value: sc }); }

  // 壁通過
  for (const w of s.walls) {
    if (w.passed || s.dist < w.d) continue;
    w.passed = true;
    const offs = swarmOffsets(s.N, B);
    let out = 0, ox = 0;
    for (const o of offs) if (Math.abs(s.x + o.dx - w.cx) > w.gap / 2) { out++; ox += s.x + o.dx; }
    ev.push({ type: 'gate' });
    if (out > 0) {
      s.N -= out;
      ev.push({ type: 'scatter', n: out, x: ox / out, y: SWARM_Y });
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

  const li = layerIndex(s.dist, B) + (s.dist >= B.layers.length * B.layers.count ? 0 : 0);
  if (li !== s.layer) { s.layer = li; ev.push({ type: 'layer', index: li + 1 }); }

  genAhead(s);
  if (s.N <= 0) {
    s.N = 0; s.alive = false;
    ev.push({ type: 'fail', score: s.score, layer: s.layer + 1, t: s.t });
  }
  return ev;
}
