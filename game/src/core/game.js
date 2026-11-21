// サンプルのコアロジック（落ちてくる障害物をよける）。実際のゲームに置き換える。
// 規約: DOM / Canvas / Audio / Date / Math.random に触れない。
import { createRng } from './rng.js';

export const W = 9, H = 16; // 論理座標（描画側で画面に合わせて拡大）

export function createGame({ seed = 1, data }) {
  return {
    seed, rng: createRng(seed), data,
    t: 0, alive: true, score: 0,
    player: { x: W / 2, w: 1 },
    blocks: [], spawnIn: data.spawnInterval,
  };
}

// 先読み用の複製（simulate.mjs の lookahead 方策が使う。無ければ再生で代替される）
export function clone(s) {
  return { ...s, rng: s.rng.fork(), player: { ...s.player }, blocks: s.blocks.map(b => ({ ...b })) };
}

export function actions(state) {
  return state.alive ? ['left', 'right', 'none'] : ['retry'];
}

export function step(state, action, dt) {
  const ev = [];
  const d = state.data;
  if (!state.alive) return ev;
  state.t += dt;
  const p = state.player;
  if (action === 'left') p.x = Math.max(p.w / 2, p.x - d.moveStep);
  if (action === 'right') p.x = Math.min(W - p.w / 2, p.x + d.moveStep);

  const speed = d.fallSpeed + d.speedGrowth * state.t;
  state.spawnIn -= dt;
  if (state.spawnIn <= 0) {
    const w = state.rng.range(d.blockMinW, d.blockMaxW);
    state.blocks.push({ x: state.rng.range(w / 2, W - w / 2), y: -1, w, h: 0.6 });
    state.spawnIn = Math.max(d.minSpawnInterval, d.spawnInterval - d.spawnGrowth * state.t);
  }
  for (const b of state.blocks) b.y += speed * dt;
  const before = state.blocks.length;
  state.blocks = state.blocks.filter(b => b.y < H + 1);
  const dodged = before - state.blocks.length;
  if (dodged) { state.score += dodged; ev.push({ type: 'score', value: state.score }); }

  const py = H - 1.5;
  for (const b of state.blocks) {
    if (Math.abs(b.y - py) < (b.h + 0.8) / 2 && Math.abs(b.x - p.x) < (b.w + p.w) / 2) {
      state.alive = false;
      ev.push({ type: 'fail', score: state.score, t: state.t });
      break;
    }
  }
  return ev;
}
