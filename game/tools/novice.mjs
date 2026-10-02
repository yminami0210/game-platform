// 初心者ボット: 上手な操作列を「ときどき押し間違える」ように崩して遊ばせ、
// ミスしたら中間地点から考え直して、クリアまでの死亡回数・時間・ミスの集中する場所を測る。
//   node game/tools/novice.mjs [ステージID...] [--runs 6] [--noise 0.12]
import { fileURLToPath } from 'node:url';
import { solve, loadStage, stageIds, ACTIONS, MACRO_FRAMES, bossChoose, arenaPoint } from './clearbot.mjs';
import { createStage, step, clone } from '../src/core/stage.js';
import { tuning } from './clearbot.mjs';

export function noviceRun(L, { seed = 1, noise = 0.12, maxDeaths = 25, target } = {}) {
  let r = seed >>> 0; const rnd = () => ((r = (r * 1664525 + 1013904223) >>> 0) / 4294967296);
  const isBoss = L.ents.some(e => e.kind === 'boss');
  const tgt = target ?? (isBoss ? arenaPoint(L) : { kind: 'goal' });
  let s = createStage(L, tuning);
  const deathsAt = [];
  let plans = 0;
  const cache = new Map(); // 中間地点から始めるときの道筋（毎回同じなので使い回す）
  let fresh = true;
  const t0 = Date.now();
  while (s.deaths < maxDeaths && plans < 400) {
    if (Date.now() - t0 > 150000) return { cleared: false, deaths: s.deaths, time: +s.time.toFixed(1), deathsAt, plans, timeout: true };
    let plan;
    if (fresh && cache.has(s.checkpoint)) plan = cache.get(s.checkpoint);
    else {
      plan = solve(L, { target: tgt, start: s, maxNodes: fresh ? 200000 : (tgt.kind === 'boss' ? 80000 : 40000) });
      if (fresh) cache.set(s.checkpoint, plan);
    }
    fresh = false;
    plans++;
    if (!plan.ok) {
      // もう助からない空中などでは、そのまま落ちて中間地点からやり直す
      let n = 0, d = false;
      while (n++ < 180 && !d) d = step(s, {}).some(e => e.type === 'die');
      if (!d) {
        // 落ちてはいない → 時間をかけて考え直す
        const full = solve(L, { target: tgt, start: s, maxNodes: 200000 }); plans++;
        if (!full.ok) return { cleared: false, deaths: s.deaths, time: s.time, deathsAt, stuck: true, plans };
        let died2 = false;
        for (const ai of full.path) { for (let k = 0; k < MACRO_FRAMES; k++) { const ev = step(s, ACTIONS[ai]); if (ev.some(e => e.type === 'die')) { died2 = true; break; } if (s.status === 'clear') { while (!s.finished) step(s, {}); return { cleared: true, deaths: s.deaths, time: +s.time.toFixed(1), deathsAt, plans }; } } if (died2) break; }
        if (died2) { deathsAt.push(Math.round(s.p.x / 16)); let m = 0; while (s.status !== 'play' && m++ < 600) step(s, {}); fresh = true; }
        continue;
      }
      deathsAt.push(Math.round(s.p.x / 16));
      n = 0; while (s.status !== 'play' && n++ < 600) step(s, {});
      fresh = true;
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
        if (isBoss && s.lock) break;
      }
      if (died) break;
      if (isBoss && s.lock) {
        const fight = bossFight(s, rnd, noise);
        if (fight === 'clear') return { cleared: true, deaths: s.deaths, time: +s.time.toFixed(1), deathsAt, plans };
        deathsAt.push(Math.round(s.p.x / 16)); died = true; break;
      }
      const [ex, ey] = expect[pi];
      if (Math.abs(ex - s.p.x) > 3 || Math.abs(ey - s.p.y) > 3) break; // ずれた → 考え直す
    }
    if (died) { let n = 0; while (s.status !== 'play' && n++ < 600) step(s, {}); fresh = true; }
    // 計画どおり進めたのにまだ着かないときも、そのまま考え直す
  }
  return { cleared: false, deaths: s.deaths, time: +s.time.toFixed(1), deathsAt, plans };
}

function bossFight(s, rnd, noise) {
  let prev = 0;
  for (let i = 0; i < 2400; i++) {
    const best = bossChoose(s);
    const ai = rnd() < noise ? prev : best;
    prev = best;
    for (let k = 0; k < MACRO_FRAMES; k++) {
      const ev = step(s, ACTIONS[ai]);
      if (s.status === 'clear') { while (!s.finished) step(s, {}); return 'clear'; }
      if (ev.some(e => e.type === 'die')) return 'die';
    }
  }
  return 'die';
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
