// 初心者ボット: 上手な操作列を「ときどき押し間違える」ように崩して遊ばせ、
// ミスしたら中間地点から考え直して、クリアまでの死亡回数・時間・ミスの集中する場所を測る。
//   node game/tools/novice.mjs [ステージID...] [--runs 6] [--noise 0.12]
import { fileURLToPath } from 'node:url';
import { solve, loadStage, stageIds, ACTIONS, MACRO_FRAMES } from './clearbot.mjs';
import { createStage, step, clone } from '../src/core/stage.js';
import { tuning } from './clearbot.mjs';

export function noviceRun(L, { seed = 1, noise = 0.12, maxDeaths = 25, target } = {}) {
  let r = seed >>> 0; const rnd = () => ((r = (r * 1664525 + 1013904223) >>> 0) / 4294967296);
  const tgt = target ?? { kind: L.ents.some(e => e.kind === 'boss') ? 'boss' : 'goal' };
  let s = createStage(L, tuning);
  const deathsAt = [];
  let plans = 0;
  while (s.deaths < maxDeaths && plans < 400) {
    const plan = solve(L, { target: tgt, start: s, maxNodes: tgt.kind === 'boss' ? 80000 : 30000 });
    plans++;
    if (!plan.ok) {
      // もう助からない空中などでは、そのまま落ちて中間地点からやり直す
      let n = 0, d = false;
      while (n++ < 180 && !d) d = step(s, {}).some(e => e.type === 'die');
      if (!d) return { cleared: false, deaths: s.deaths, time: s.time, deathsAt, stuck: true, plans };
      deathsAt.push(Math.round(s.p.x / 16));
      n = 0; while (s.status !== 'play' && n++ < 600) step(s, {});
      continue;
    }
    // 計画どおりに進んだときの位置（ずれたら考え直す。人が目で見て直すのと同じ）
    const expect = []; { const c = clone(s); for (const ai of plan.path) { for (let k = 0; k < MACRO_FRAMES; k++) step(c, ACTIONS[ai]); expect.push([c.p.x, c.p.y]); } }
    let died = false, prev = ACTIONS[plan.path[0]];
    for (let pi = 0; pi < plan.path.length; pi++) {
      const ai = plan.path[pi];
      // 押し間違い: たいていは「反応が遅れて前の操作のまま」、ときどき「手が止まる」
      const u = rnd();
      const a = u < noise ? prev : u < noise * 1.3 ? {} : ACTIONS[ai];
      prev = ACTIONS[ai];
      for (let k = 0; k < MACRO_FRAMES; k++) {
        const ev = step(s, a);
        if (ev.some(e => e.type === 'die')) { died = true; deathsAt.push(Math.round(s.p.x / 16)); break; }
        if (s.status === 'clear') {
          while (!s.finished) step(s, {});
          return { cleared: true, deaths: s.deaths, time: +s.time.toFixed(1), deathsAt, plans };
        }
      }
      if (died) break;
      const [ex, ey] = expect[pi];
      if (Math.abs(ex - s.p.x) > 3 || Math.abs(ey - s.p.y) > 3) break; // ずれた → 考え直す
    }
    if (died) { let n = 0; while (s.status !== 'play' && n++ < 600) step(s, {}); }
    // 計画どおり進めたのにまだ着かないときも、そのまま考え直す
  }
  return { cleared: false, deaths: s.deaths, time: +s.time.toFixed(1), deathsAt, plans };
}

export function noviceStage(id, { runs = 6, noise = 0.12 } = {}) {
  const L = loadStage(id);
  const res = [];
  for (let i = 0; i < runs; i++) res.push(noviceRun(L, { seed: 1000 + i * 77, noise }));
  const med = a => { const b = [...a].sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : null; };
  const all = res.flatMap(r => r.deathsAt);
  const bands = {};
  for (const x of all) { const b = Math.floor(x / 10) * 10; bands[b] = (bands[b] ?? 0) + 1; }
  const top = Object.entries(bands).sort((a, b) => b[1] - a[1])[0];
  return {
    id, runs, clearRate: res.filter(r => r.cleared).length / runs,
    deathsMedian: med(res.map(r => r.deaths)), timeMedian: med(res.filter(r => r.cleared).map(r => r.time)),
    stuckShare: all.length ? +(top[1] / all.length).toFixed(2) : 0, stuckBand: top ? `x=${top[0]}〜${+top[0] + 9}` : null,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
  const ids = process.argv.slice(2).filter((a, i, all) => !a.startsWith('--') && !all[i - 1]?.startsWith('--'));
  for (const id of ids.length ? ids : stageIds()) {
    const t0 = Date.now();
    const r = noviceStage(id, { runs: Number(arg('runs', 6)), noise: Number(arg('noise', 0.12)) });
    console.log(JSON.stringify({ ...r, ms: Date.now() - t0 }));
  }
}
