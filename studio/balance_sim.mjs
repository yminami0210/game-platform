import { createRng } from '../game/src/core/rng.js';
import { ZONES, TYPES, B, makeScenario, makeReports, applySpy, resolveBattle, value, allowedZones } from './balance_prototype.mjs';

const placements = []; for (const a of ZONES) for (const b of ZONES) for (const c of ZONES) placements.push({ inf: a, arc: b, cav: c });
const N_SAMPLES = 10;
function posterior(rep) {
  if (rep.subject === 'wind') { const p = B.srcTrue[rep.source]; return { E: rep.claim === 'E' ? p : 1 - p, W: rep.claim === 'W' ? p : 1 - p }; }
  const zs = allowedZones(rep.subject), p = B.srcTrue[rep.source], post = {}; let s = 0;
  for (const z of zs) { post[z] = B.enemyZoneWeight[z] * (z === rep.claim ? p : (1 - p) / 3); s += post[z]; }
  for (const z of zs) post[z] /= s; return post;
}
const draw = (rng, post) => { let r = rng.next(); for (const k of Object.keys(post)) { r -= post[k]; if (r <= 0) return k; } return Object.keys(post).pop(); };
function sampleScenarios(reps, rng, n) {
  const out = []; const posts = Object.fromEntries(reps.map((r) => [r.subject, posterior(r)]));
  for (let i = 0; i < n; i++) out.push({ enemy: TYPES.map((t) => ({ type: t, count: B.enemyCount[t], zone: draw(rng, posts[t]) })), wind: draw(rng, posts.wind) });
  return out;
}
function bestPlan(scs, pool, fixed, seed) {
  let best = null;
  for (const pl of placements) for (const extra of pool) {
    const principles = [...fixed, ...extra]; let v = 0;
    for (let i = 0; i < scs.length; i++) v += value(resolveBattle(scs[i], { place: pl, principles }, seed + i));
    if (!best || v > best.v) best = { v, place: pl, principles };
  }
  return best;
}
const uncertainty = (rep) => { const p = posterior(rep); const m = Math.max(...Object.values(p)); return (1 - m) * (rep.subject === 'wind' ? 0.9 : B[ 'enemyCount'][rep.subject] / 40); };
const NOW = ['high', 'choke', 'trap', 'fire'];

const bots = {
  random(sc, reps, seed) {
    const rng = createRng(seed + 99); const pool = [...ZONES.concat()];
    const place = {}; for (const t of TYPES) place[t] = ZONES[rng.int(0, 3)];
    const ps = [...['high', 'choke', 'trap', 'fire', 'spy']].sort(() => rng.next() - 0.5).slice(0, 2);
    return { place, principles: ps };
  },
  novice(sc, reps, seed) { // 報告を鵜呑み・相性を考えない・介入しない
    const rng = createRng(seed + 55);
    const claimed = reps.filter((r) => r.subject !== 'wind').map((r) => r.claim);
    const place = {}; const ts = [...TYPES].sort(() => rng.next() - 0.5);
    ts.forEach((t, i) => { place[t] = claimed[i]; });
    const windClaim = reps.find((r) => r.subject === 'wind').claim;
    const ps = ['high', 'choke', 'trap', 'fire', 'spy'].sort(() => rng.next() - 0.5).slice(0, 2);
    return { place, principles: ps, windClaim };
  },
  expert(sc, reps, seed, info = false) {
    const rng = createRng(seed + 77);
    let reps2 = reps; let fixed = [];
    if (info) reps2 = reps.map((r) => ({ ...r, claim: r.subject === 'wind' ? sc.wind : sc.enemy.find((e) => e.type === r.subject).zone, source: 'high' , confirmed: true}));
    const cand = reps2.map((r) => ({ r, u: r.confirmed ? 0 : uncertainty(r) })).sort((a, b) => b.u - a.u)[0];
    let plan;
    if (!info && cand.u > 0.3) { // 間者を使う
      const rv = applySpy(reps2, sc, cand.r.subject);
      const post = sampleScenarios(rv.map((r) => (r.confirmed ? { ...r, source: 'high' } : r)), rng, N_SAMPLES);
      // 確認済みは真値で固定
      post.forEach((s) => { for (const r of rv) if (r.confirmed) { if (r.subject === 'wind') s.wind = r.claim; else s.enemy.find((e) => e.type === r.subject).zone = r.claim; } });
      plan = bestPlan(post, NOW.map((p) => [p]), ['spy'], seed);
    } else {
      const post = sampleScenarios(reps2, rng, N_SAMPLES);
      const pairs = []; for (let i = 0; i < NOW.length; i++) for (let j = i + 1; j < NOW.length; j++) pairs.push([NOW[i], NOW[j]]);
      plan = bestPlan(post, pairs, [], seed);
    }
    return plan;
  },
};
// 介入: 6戦中の配置後、ダイジェストで実際の敵位置が見えた時点で最良の1手
function intervene(sc, plan, seed) {
  let best = { v: value(resolveBattle(sc, plan, seed + 1000)), iv: null };
  for (const t of TYPES) for (const z of ZONES) {
    if (plan.place[t] === z) continue;
    const iv = { unit: t, zone: z }; const v = value(resolveBattle(sc, { ...plan, intervention: iv }, seed + 1000)) - 0.02;
    if (v > best.v) best = { v, iv };
  }
  return best.iv;
}

const args = Object.fromEntries(process.argv.slice(2).map((a, i, arr) => (a.startsWith('--') ? [a.slice(2), arr[i + 1]] : [])).filter((x) => x.length));
const runs = +(args.runs || 2000);
const stats = {};
for (const name of ['random', 'novice', 'expert', 'oracle']) {
  const sc_scores = [], wins = []; let sumPLeft = 0, reach = 0, uses = { spy: 0 }, ivs = 0, backfire = 0;
  for (let s = 1; s <= runs; s++) {
    const sc = makeScenario(s); let reps = makeReports(sc, s);
    const bot = name === 'oracle' ? (a, b, c) => bots.expert(a, b, c, true) : bots[name];
    let plan = bot(sc, reps, s);
    if (plan.principles.includes('spy') && name !== 'expert') { /* 初心者は使い道が分からない: 効果なし(無駄) */ }
    if (name === 'expert' || name === 'oracle') { const iv = intervene(sc, plan, s); if (iv) { plan.intervention = iv; ivs++; } }
    if (plan.principles.includes('spy')) uses.spy++;
    const r = resolveBattle(sc, plan, s);
    if (r.reasons.includes('fire_backfire')) backfire++;
    sc_scores.push(r.score); wins.push(r.win ? 1 : 0); sumPLeft += r.pLeft; if (r.score >= 1) reach++;
  }
  const sorted = [...sc_scores].sort((a, b) => a - b);
  const dist = [0, 1, 2, 3].map((k) => +(sc_scores.filter((x) => x === k).length / runs).toFixed(3));
  stats[name] = { winRate: +(wins.reduce((a, b) => a + b, 0) / runs).toFixed(3), meanScore: +(sc_scores.reduce((a, b) => a + b, 0) / runs).toFixed(3), medianScore: sorted[Math.floor(runs / 2)], reachScore1: +(reach / runs).toFixed(3), dist, spyUse: +(uses.spy / runs).toFixed(2), interveneRate: +(ivs / runs).toFixed(2), backfireRate: +(backfire / runs).toFixed(3) };
}
stats.ratio = { winExpertOverNovice: +(stats.expert.winRate / Math.max(stats.novice.winRate, 1e-9)).toFixed(2), meanScoreRatio: +(stats.expert.meanScore / Math.max(stats.novice.meanScore, 1e-9)).toFixed(2), winNoviceOverRandom: +(stats.novice.winRate / Math.max(stats.random.winRate, 1e-9)).toFixed(2) };
console.log(JSON.stringify(stats, null, 1));
