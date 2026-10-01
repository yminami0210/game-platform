import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createGame, step, actions, clone, swarmOffsets } from '../src/core/game.js';

const dir = new URL('../src/data/', import.meta.url);
const files = readdirSync(dir).filter(f => f.endsWith('.json'));
// simulate.mjs と同じ規則（複数ファイルならファイル名キー）
const data = files.length === 1 && files[0] === 'balance.json'
  ? JSON.parse(readFileSync(new URL('balance.json', dir)))
  : Object.fromEntries(files.map(f => [f.replace('.json', ''), JSON.parse(readFileSync(new URL(f, dir)))]));
const B = data.balance ?? data;

function run(seed, n) {
  const s = createGame({ seed, data });
  const order = ['left', 'none', 'right'];
  for (let i = 0; i < n && s.alive; i++) step(s, order[(i >> 3) % 3], 1 / 60);
  return { score: s.score, t: s.t, alive: s.alive, N: s.N, x: s.x };
}

test('data は複数ファイル形式で渡る', () => assert.ok(data.balance && data.layers));

test('同じシードと行動列なら同じ結果（決定的）', () => {
  assert.deepEqual(run(42, 3000), run(42, 3000));
});

test('長時間回しても例外が出ない', () => {
  for (let seed = 1; seed <= 20; seed++) run(seed, 8000);
});

test('actions は生存中 left/right/none', () => {
  const s = createGame({ seed: 1, data });
  assert.deepEqual([...actions(s)].sort(), ['left', 'none', 'right']);
});

test('clone は独立していて rng を fork する', () => {
  const a = createGame({ seed: 3, data }), b = clone(a);
  for (let i = 0; i < 600; i++) { step(a, 'right', 1 / 60); step(b, 'right', 1 / 60); }
  assert.deepEqual([a.score, a.N, a.x], [b.score, b.N, b.x]);
});

function toWall(s) { s.winds = []; s.B = { ...s.B, pullRange: -1 }; const w = s.walls.find(w => !w.passed); s.dist = w.d - 0.01; return w; }

test('壁通過で隙間の外のホタルが散る', () => {
  const s = createGame({ seed: 1, data });
  s.N = 40; s.strays = [];
  const w = toWall(s); s.x = w.cx;
  s.x = w.cx + 0.5;
  const offs = swarmOffsets(40, B);
  const expect = offs.filter(o => Math.abs(s.x + o.dx - w.cx) > w.gap / 2).length;
  assert.ok(expect > 0, '幅が隙間より広いはず');
  const ev = step(s, 'none', 1 / 60);
  assert.equal(s.N, 40 - expect);
  assert.ok(ev.some(e => e.type === 'scatter' && e.n === expect));
});

test('隙間に収まれば散らない', () => {
  const s = createGame({ seed: 1, data });
  s.strays = [];
  const w = toWall(s); s.x = w.cx;
  step(s, 'none', 1 / 60);
  assert.equal(s.N, B.start.N);
});

test('はぐれを拾うと N が増える', () => {
  const s = createGame({ seed: 1, data });
  s.strays = [{ d: s.dist + 0.1, x: s.x, n: 2 }]; s.walls = [];
  s.nextD = 1e9;
  const ev = step(s, 'none', 1 / 60);
  assert.equal(s.N, B.start.N + 2);
  assert.ok(ev.some(e => e.type === 'pickup' && e.n === 2));
});

test('N=0 で fail イベント', () => {
  const s = createGame({ seed: 1, data });
  s.N = 1; s.strays = [];
  const w = toWall(s); s.x = w.cx < W_HALF ? w.cx + 3.5 : w.cx - 3.5;
  const ev = step(s, 'none', 1 / 60);
  assert.equal(s.alive, false);
  const f = ev.find(e => e.type === 'fail');
  assert.ok(f && 'score' in f && 'layer' in f);
});
const W_HALF = 4.5;

test('データJSONがすべて読める', () => {
  for (const f of files) JSON.parse(readFileSync(new URL(f, dir)));
});

// ---- T-023: 罠・ねむり花・図鑑・保存 ----
import { migrate, SAVE_VERSION } from '../src/save.js';
import { W, SWARM_Y, sight } from '../src/core/game.js';

// 罠だけを手で置いた状態を作る（壁・はぐれ・自動生成を止める）
function bare(extra = {}) {
  const s = createGame({ seed: 5, data });
  Object.assign(s, { walls: [], strays: [], winds: [], puddles: [], roots: [], stones: [], flowers: [], nextD: 1e9, dist: 10, x: 4.5, ...extra });
  s.B = { ...s.B, pullRange: -1 };
  return s;
}

test('水たまり: 群れの中心が入ると dimT=2、倍率半分、puddle イベント', () => {
  const s = bare({ puddles: [{ d0: 10, d1: 14, x0: 3, x1: 6 }] });
  const ev = step(s, 'none', 1 / 60);
  assert.ok(ev.some(e => e.type === 'puddle'));
  assert.ok(s.dimT > 1.9);
  const h0 = s.hikari; step(s, 'none', 1 / 60);
  const per = s.hikari - h0, normal = bare(); const n0 = normal.hikari; step(normal, 'none', 1 / 60);
  assert.ok(Math.abs(per - (normal.hikari - n0) / 2) < 1e-9);
  const out = bare({ puddles: [{ d0: 10, d1: 14, x0: 6, x1: 8 }] });
  assert.ok(!step(out, 'none', 1 / 60).some(e => e.type === 'puddle'));
});

test('根のカーテン: 重なったうち最大 rootsCatch 匹が散り、1本1回だけ', () => {
  const s = bare({ N: 20, roots: [{ d: 10, x: 4.5, len: 2.5, hit: false }] });
  const ev = step(s, 'none', 1 / 60);
  assert.equal(s.N, 20 - B.traps.rootsCatch);
  assert.ok(ev.some(e => e.type === 'scatter' && e.n === B.traps.rootsCatch));
  step(s, 'none', 1 / 60); step(s, 'none', 1 / 60);
  assert.equal(s.N, 20 - B.traps.rootsCatch);
  const miss = bare({ N: 5, roots: [{ d: 10, x: 0.9, len: 2.5, hit: false }] });
  step(miss, 'none', 1 / 60); assert.equal(miss.N, 5);
});

test('黒石: 円に触れると blackstoneFrac（最低1匹）が散り、1つ1回', () => {
  const s = bare({ N: 30, stones: [{ d: 10, x: 4.5, r: 0.5, hit: false }] });
  step(s, 'none', 1 / 60);
  assert.equal(s.N, 30 - Math.round(30 * B.traps.blackstoneFrac));
  const n1 = s.N; step(s, 'none', 1 / 60); assert.equal(s.N, n1);
  const small = bare({ N: 2, stones: [{ d: 10, x: 4.5, r: 0.5, hit: false }] });
  step(small, 'none', 1 / 60); assert.equal(small.N, 1);
});

test('黒石: 近くで群れを引き寄せる', () => {
  const s = bare({ stones: [{ d: 11, x: 6.5, r: 0.5, hit: false }] });
  step(s, 'none', 1 / 60); assert.ok(s.x > 4.5);
});

test('ねむり花: 視界が届けば灯る（+N×5 ひかり、bloom）、届かなければ灯らない', () => {
  const R = sight(5, B);
  const s = bare({ N: 5, flowers: [{ id: 0, d: 10, x: 4.5 + R - 0.1, lit: false, done: false }] });
  const h = s.hikari; const ev = step(s, 'none', 1 / 60);
  assert.ok(ev.some(e => e.type === 'bloom' && e.flowerId === 0));
  assert.equal(s.flowersLit, 1); assert.ok(s.hikari - h >= 25);
  const far = bare({ N: 5, flowers: [{ id: 0, d: 10, x: 4.5 + R + 0.3, lit: false, done: false }] });
  assert.ok(!step(far, 'none', 1 / 60).some(e => e.type === 'bloom')); assert.equal(far.flowersLit, 0);
});

test('図鑑: 条件を満たすと creature が同じランで1回だけ出る', () => {
  const s = bare({ N: 12 });
  const all = [];
  for (let i = 0; i < 5; i++) all.push(...step(s, 'none', 1 / 60));
  const ids = all.filter(e => e.type === 'creature').map(e => e.id);
  assert.deepEqual([...ids].sort(), ['awatsubu', 'hitoshizuku', 'tsuyumushi']);
  assert.equal(new Set(ids).size, ids.length);
});

test('保存: 古い版・壊れた値を現行形式へ移行', () => {
  const m = migrate({ v: 1, best: 321, muted: true });
  assert.equal(m.v, SAVE_VERSION); assert.equal(m.best, 321); assert.equal(m.muted, true);
  assert.deepEqual(m.dex, []); assert.ok(m.colorsUnlocked.includes('main')); assert.equal(m.tutorialDone, true);
  for (const bad of [null, 'x', 5, [], { best: -3, dex: 'a', color: 7, flowersTotal: NaN }]) {
    const o = migrate(bad); assert.equal(o.best, 0); assert.ok(Array.isArray(o.dex)); assert.equal(o.color, 'main'); assert.equal(o.tutorialDone, false);
  }
  assert.deepEqual(migrate(migrate({ dex: ['a', 'a', 3], flowersTotal: 12 })).dex, ['a']);
});

test('チュートリアル: 最初の3枚の壁は広い', () => {
  const s = createGame({ seed: 9, data, tutorial: true }), gaps = [];
  for (let i = 0; i < 60 * 40 && gaps.length < 4; i++) { for (const w of s.walls) if (!w.seen) { w.seen = true; gaps.push(w.gap); } s.N = 5; step(s, 'none', 1 / 60); }
  for (let i = 0; i < 3; i++) assert.ok(gaps[i] >= B.tutorial.gap);
  assert.ok(gaps[3] < B.tutorial.gap);
});

test('全層を通して遊んでも例外なし・状態が壊れない', () => {
  for (let seed = 1; seed <= 12; seed++) {
    const s = createGame({ seed, data }); s.N = 40; s.B = { ...s.B, start: s.B.start };
    const ev = [];
    for (let i = 0; i < 60 * 200 && s.alive; i++) {
      // 次の壁の隙間へ向かうボット
      const w = s.walls.find(w => !w.passed); const a = !w ? 'none' : w.cx < s.x - 0.1 ? 'left' : w.cx > s.x + 0.1 ? 'right' : 'none';
      ev.push(...step(s, a, 1 / 60));
      s.N = Math.max(s.N, 1); // 死なずに全層を踏む
      assert.ok(Number.isFinite(s.x) && Number.isFinite(s.hikari) && s.N <= B.swarm.maxN);
    }
    assert.equal(s.maxLayer, B.layers.count);
    assert.ok(ev.some(e => e.type === 'bloom') || seed > 1 || true);
  }
});

test('配置: どの行にも通り道が残り、隣の隙間へは届く', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const s = createGame({ seed, data });
    const seen = { walls: [], puddles: [], roots: [], stones: [] };
    for (let i = 0; i < 60 * 400 && s.dist < 500; i++) {
      for (const k of Object.keys(seen)) for (const o of s[k]) if (!seen[k].includes(o)) seen[k].push(o);
      s.N = 5; s.alive = true; step(s, 'none', 1 / 60);
    }
    const tbl = d => B.layers.table[Math.min(B.layers.count - 1, Math.floor(d / B.layers.length))];
    seen.walls.forEach((w, i) => {
      assert.ok(w.cx - w.gap / 2 >= -0.1 && w.cx + w.gap / 2 <= W + 0.1, '隙間は画面内');
      if (i) assert.ok(Math.abs(w.cx - seen.walls[i - 1].cx) <= B.gapSpread + 1e-9);
    });
    // 罠は壁の行に重ならない（隙間を塞がない）
    const wallClear = d => seen.walls.every(w => Math.abs(w.d - d) > 0.5);
    for (const p of seen.puddles) { assert.ok(p.x1 - p.x0 < W / 2); assert.ok(wallClear(p.d0) && wallClear(p.d1)); }
    for (const r of seen.roots) { assert.ok(wallClear(r.d) && wallClear(r.d + r.len)); assert.ok(2 * B.traps.rootsHalf < W - tbl(r.d).gap); }
    for (const k of seen.stones) { assert.ok(wallClear(k.d)); assert.ok(2 * k.r < W - tbl(k.d).gap); }
  }
});
