// core を Node で大量に回して分布を見る（描画なし）。
// node simulate.mjs [--game game] [--runs 2000] [--policy random|sticky|lookahead] [--bot file.mjs] [--max-seconds 600] [--out file.json]
// --bot のファイルは export function choose(state, actions, ctx) を持つ（ctx: { rng, core, t }）。
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const gameDir = resolve(arg('game', existsSync('game/src/core/game.js') ? 'game' : '.'));
const runs = Number(arg('runs', 2000)), maxSec = Number(arg('max-seconds', 600)), policy = arg('policy', 'sticky');
const DT = 1 / 60, DECIDE = 6; // 0.1秒ごとに判断
const core = await import(pathToFileURL(join(gameDir, 'src/core/game.js')));
const dataDir = join(gameDir, 'src/data');
const files = readdirSync(dataDir).filter(f => f.endsWith('.json'));
const data = files.length === 1 && files[0] === 'balance.json'
  ? JSON.parse(readFileSync(join(dataDir, 'balance.json')))
  : Object.fromEntries(files.map(f => [f.replace('.json', ''), JSON.parse(readFileSync(join(dataDir, f)))]));
const custom = arg('bot') ? await import(pathToFileURL(resolve(arg('bot')))) : null;

let s0 = 123456789; const rnd = () => ((s0 = (s0 * 1664525 + 1013904223) >>> 0) / 4294967296);
const pick = a => a[Math.floor(rnd() * a.length)];
const alive = s => s.alive !== false && !s.over && !s.done;
const score = s => s.score ?? 0;

function lookahead(state, acts, horizon = 45) {
  let best = acts[0], bestV = -Infinity;
  for (const a of acts) {
    let v = 0;
    for (let k = 0; k < 2; k++) {
      const c = core.clone(state);
      let steps = 0;
      for (; steps < horizon && alive(c); steps++) core.step(c, steps < DECIDE * 2 ? a : pick(core.actions(c)), DT);
      v += (alive(c) ? 1000 : steps) + score(c);
    }
    if (v > bestV) { bestV = v; best = a; }
  }
  return best;
}

const results = [], evCount = {};
for (let r = 0; r < runs; r++) {
  const state = core.createGame({ seed: r + 1, data });
  let a = 'none', steps = 0;
  const failAt = [];
  while (alive(state) && steps * DT < maxSec) {
    if (steps % DECIDE === 0) {
      const acts = core.actions(state);
      if (custom) a = custom.choose(state, acts, { rng: rnd, core, t: steps * DT });
      else if (policy === 'random') a = pick(acts);
      else if (policy === 'lookahead' && core.clone) a = lookahead(state, acts);
      else a = rnd() < 0.3 ? pick(acts) : (acts.includes(a) ? a : pick(acts)); // sticky: 人間っぽく同じ入力を続ける
    }
    for (const e of core.step(state, a, DT) ?? []) { evCount[e.type] = (evCount[e.type] ?? 0) + 1; if (e.type === 'fail') failAt.push(Math.round(state.t ?? steps * DT)); }
    steps++;
  }
  results.push({ seed: r + 1, score: score(state), seconds: +(steps * DT).toFixed(2), timeout: alive(state), failAt });
}
const q = (arr, p) => { const s = [...arr].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const sc = results.map(r => r.score), len = results.map(r => r.seconds);
const hist = {}; for (const r of results) for (const t of r.failAt) { const b = Math.floor(t / 10) * 10; hist[b] = (hist[b] ?? 0) + 1; }
const summary = {
  policy: custom ? arg('bot') : policy, runs,
  score: { p10: q(sc, 0.1), median: q(sc, 0.5), p90: q(sc, 0.9), max: Math.max(...sc) },
  runSeconds: { p10: q(len, 0.1), median: q(len, 0.5), p90: q(len, 0.9) },
  timeoutRate: results.filter(r => r.timeout).length / runs,
  failTimeHistogram10s: hist,
  eventCounts: evCount,
};
console.log(JSON.stringify(summary)); // 1行（トークン節約）。詳細は --out のファイルへ
if (arg('out')) writeFileSync(arg('out'), JSON.stringify({ summary, results }, null, 2));
