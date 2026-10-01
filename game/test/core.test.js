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
