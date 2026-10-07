// core の決定性・データの読み込み・長時間の安定・地図の進行
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseLevel } from '../src/core/level.js';
import { createStage, step, clone } from '../src/core/stage.js';
import { recordResult, moveFrom, openNodes, emptyProgress, edgeOpen, worldUnlocked } from '../src/core/world.js';

const tuning = JSON.parse(readFileSync(new URL('../src/data/tuning.json', import.meta.url)));
const world = JSON.parse(readFileSync(new URL('../src/data/world1.json', import.meta.url)));
const ids = JSON.parse(readFileSync(new URL('../src/data/stages/index.json', import.meta.url)));
const level = id => parseLevel(JSON.parse(readFileSync(new URL(`../src/data/stages/${id}.json`, import.meta.url))));

// 決定的な疑似乱数の入力列
function inputs(seed, n) {
  let s = seed; const r = () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296);
  const out = []; let cur = {};
  for (let i = 0; i < n; i++) { if (i % 8 === 0) cur = { l: r() < 0.2, r: r() < 0.7, j: r() < 0.4, b: r() < 0.4, d: r() < 0.05, u: false }; out.push(cur); }
  return out;
}

test('ステージのデータがすべて読める（金ボタン3枚・スタートとゴール）', () => {
  for (const id of ids) {
    const L = level(id);
    assert.equal(L.medalCount, 3, `${id} の金ボタン`);
    assert.ok(L.ents.some(e => e.kind === 'goal' || e.kind === 'boss'), `${id} のゴール`);
  }
});

test('同じ入力なら同じ結果（決定的）', () => {
  for (const id of ids) {
    const L = level(id), ins = inputs(7, 1500);
    const a = createStage(L, tuning), b = createStage(L, tuning);
    for (const i of ins) { step(a, i); step(b, i); }
    assert.equal(a.p.x, b.p.x); assert.equal(a.p.y, b.p.y); assert.equal(a.deaths, b.deaths); assert.equal(a.coins, b.coins);
  }
});

test('clone は元の状態に影響しない', () => {
  const L = level(ids[0]);
  const a = createStage(L, tuning);
  for (const i of inputs(3, 200)) step(a, i);
  const c = clone(a), x = a.p.x;
  for (const i of inputs(4, 200)) step(c, i);
  assert.equal(a.p.x, x);
});

test('でたらめな入力で長く回しても例外が出ない', () => {
  for (const id of ids) {
    const L = level(id);
    for (const seed of [1, 2, 3]) {
      const s = createStage(L, tuning);
      for (const i of inputs(seed, 4000)) step(s, i);
      assert.ok(Number.isFinite(s.p.x) && Number.isFinite(s.p.y));
    }
  }
});

test('ジャンプは押す長さで高さが変わる', () => {
  const L = level(ids[0]);
  const top = hold => { const s = createStage(L, tuning); step(s, {}); const y0 = s.p.y; let minY = y0; for (let f = 0; f < 60; f++) { step(s, { j: f < hold }); minY = Math.min(minY, s.p.y); } return y0 - minY; };
  const short = top(2), long = top(40);
  assert.ok(long > short * 2, `長押し ${long.toFixed(1)}px / 短押し ${short.toFixed(1)}px`);
});

test('地図: クリアで道が開き、隠し出口で別の道が開く', () => {
  const prog = emptyProgress();
  assert.deepEqual([...openNodes(world, prog)].sort(), ['1-1', 'home']);
  assert.equal(moveFrom(world, prog, 'home', { x: 1, y: 0 }), '1-1');
  let opened = recordResult(world, prog, '1-1', { exit: 'goal', medals: [true, false, false], time: 80, deaths: 2, coins: 10 });
  assert.equal(opened.length, 1);
  recordResult(world, prog, '1-2', { exit: 'goal', medals: [], time: 90 });
  opened = recordResult(world, prog, '1-3', { exit: 'secret', medals: [], time: 90 });
  assert.ok(opened.some(e => e.b === '1-S'));
  assert.ok(!edgeOpen(world.edges.find(e => e.a === '1-3' && e.b === '1-4'), prog));
  assert.equal(prog.stages['1-1'].best, 80);
});

test('ヒットストップ中に押したジャンプは捨てられない', () => {
  const L = level(ids[0]);
  const s = createStage(L, tuning);
  step(s, {}); step(s, {});
  s.hitstop = 4;
  step(s, { j: true }); // 止まっている間に押す
  for (let i = 0; i < 3; i++) step(s, { j: true });
  step(s, { j: true });
  assert.ok(s.p.vy < 0, `跳んでいない vy=${s.p.vy}`);
});

test('ワールドの解放: 3までは無料、4以降は解放の記録が要る', () => {
  const prog = emptyProgress();
  assert.ok(worldUnlocked(1, prog) && worldUnlocked(3, prog));
  assert.ok(!worldUnlocked(4, prog));
  assert.ok(worldUnlocked(4, { ...prog, unlocks: { 4: true } }));
});
