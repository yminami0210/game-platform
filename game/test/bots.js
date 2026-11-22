// テスト用ボット（balance_sim.mjs の移植）。初心者=鵜呑み・相性無視、上達者=事後確率で全探索・間者・介入。
import { createRng } from '../src/core/rng.js';
import { ZONES, TYPES, allowedZones } from '../src/core/battle.js';

const placements = []; for (const a of ZONES) for (const b of ZONES) for (const c of ZONES) placements.push({ inf: a, arc: b, cav: c });
const NOW = ['high', 'choke', 'trap', 'fire'];

export function createBots(eng, B, nSamples = 10) {
  const { applySpy, resolveBattle, value } = eng;
  function posterior(rep) {
    if (rep.subject === 'wind') { const p = B.srcTrue[rep.source]; return { E: rep.claim === 'E' ? p : 1 - p, W: rep.claim === 'W' ? p : 1 - p }; }
    const zs = allowedZones(rep.subject), p = B.srcTrue[rep.source], post = {}; let s = 0;
    for (const z of zs) { post[z] = B.enemyZoneWeight[z] * (z === rep.claim ? p : (1 - p) / 3); s += post[z]; }
    for (const z of zs) post[z] /= s; return post;
  }
  const draw = (rng, post) => { let r = rng.next(); for (const k of Object.keys(post)) { r -= post[k]; if (r <= 0) return k; } return Object.keys(post).pop(); };
  function sample(reps, rng, n) {
    const posts = Object.fromEntries(reps.map((r) => [r.subject, posterior(r)])); const out = [];
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
  const uncertainty = (rep) => { const p = posterior(rep); return (1 - Math.max(...Object.values(p))) * (rep.subject === 'wind' ? 0.9 : B.enemyCount[rep.subject] / 40); };
  const randomPrinciples = (rng) => ['high', 'choke', 'trap', 'fire', 'spy'].sort(() => rng.next() - 0.5).slice(0, 2);
  const bots = {
    random(sc, reps, seed) {
      const rng = createRng(seed + 99); const place = {};
      for (const t of TYPES) place[t] = ZONES[rng.int(0, 3)];
      return { place, principles: randomPrinciples(rng) };
    },
    novice(sc, reps, seed) {
      const rng = createRng(seed + 55);
      const claimed = reps.filter((r) => r.subject !== 'wind').map((r) => r.claim);
      const place = {}; [...TYPES].sort(() => rng.next() - 0.5).forEach((t, i) => { place[t] = claimed[i]; });
      return { place, principles: randomPrinciples(rng) };
    },
    expert(sc, reps, seed) {
      const rng = createRng(seed + 77);
      const cand = reps.map((r) => ({ r, u: r.confirmed ? 0 : uncertainty(r) })).sort((a, b) => b.u - a.u)[0];
      if (cand.u > 0.3) { // 間者を使う
        const rv = applySpy(reps, sc, cand.r.subject);
        const post = sample(rv.map((r) => (r.confirmed ? { ...r, source: 'high' } : r)), rng, nSamples);
        post.forEach((s) => { for (const r of rv) if (r.confirmed) { if (r.subject === 'wind') s.wind = r.claim; else s.enemy.find((e) => e.type === r.subject).zone = r.claim; } });
        return { ...bestPlan(post, NOW.map((p) => [p]), ['spy'], seed), spyTarget: cand.r.subject };
      }
      const post = sample(reps, rng, nSamples); const pairs = [];
      for (let i = 0; i < NOW.length; i++) for (let j = i + 1; j < NOW.length; j++) pairs.push([NOW[i], NOW[j]]);
      return bestPlan(post, pairs, [], seed);
    },
  };
  // 介入: 敵位置が見えた時点で最良の1手
  function bestIntervention(sc, plan, seed) {
    let best = { v: value(resolveBattle(sc, plan, seed + 1000)), iv: null };
    for (const t of TYPES) for (const z of ZONES) {
      if (plan.place[t] === z) continue;
      const iv = { unit: t, zone: z }; const v = value(resolveBattle(sc, { ...plan, intervention: iv }, seed + 1000)) - 0.02;
      if (v > best.v) best = { v, iv };
    }
    return best.iv;
  }
  return { ...bots, bestIntervention };
}
