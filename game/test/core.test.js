import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createGame, step, actions } from '../src/core/game.js';

const data = JSON.parse(readFileSync(new URL('../src/data/balance.json', import.meta.url)));

function run(seed, n) {
  const s = createGame({ seed, data });
  const order = ['left', 'none', 'right'];
  for (let i = 0; i < n && s.alive; i++) step(s, order[i % 3], 1 / 60);
  return { score: s.score, t: s.t, alive: s.alive };
}

test('同じシードと行動列なら同じ結果（決定的）', () => {
  assert.deepEqual(run(42, 3000), run(42, 3000));
});

test('長時間回しても例外が出ない', () => {
  for (let seed = 1; seed <= 20; seed++) run(seed, 5000);
});

test('actions は配列を返す', () => {
  assert.ok(Array.isArray(actions(createGame({ seed: 1, data }))));
});

test('データJSONがすべて読める', () => {
  const dir = new URL('../src/data/', import.meta.url);
  for (const f of readdirSync(dir)) if (f.endsWith('.json')) JSON.parse(readFileSync(new URL(f, dir)));
});
