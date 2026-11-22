// 赤壁1戦 数値モデル試作。純関数のみ（Math.random 不使用）。実装版は game/src/core/battle.js 想定。
import { createRng } from '../game/src/core/rng.js';

export const ZONES = ['hill', 'gorge', 'river', 'plain'];
export const TYPES = ['inf', 'arc', 'cav'];
export const PRINCIPLES = ['high', 'choke', 'trap', 'fire', 'spy'];
export const B = {
  rounds: 6, k: 0.22, noise: 0.05, interveneRound: 2,
  playerCount: { inf: 40, arc: 30, cav: 30 },
  enemyCount: { inf: 50, arc: 40, cav: 30 },
  baseHp: 40, baseHit: 0.12,
  typeAdv: 1.3, typeDis: 0.8, // 歩>騎>弓>歩
  beats: { inf: 'cav', cav: 'arc', arc: 'inf' },
  terrain: {
    inf: { hill: 1.0, gorge: 1.2, river: 0.9, plain: 1.0 },
    arc: { hill: 1.25, gorge: 1.1, river: 1.1, plain: 0.9 },
    cav: { hill: 0.7, gorge: 0.6, river: 0.5, plain: 1.3 },
  },
  enemyZoneWeight: { hill: 0.15, gorge: 0.2, river: 0.35, plain: 0.3 },
  high: { atk: 1.3, def: 0.85 }, choke: { def: 0.65 }, trap: { atk: 1.5, enemyAtk: 0.8 },
  exit: { gorge: 'plain', river: 'plain', plain: 'hill' },
  fireEnemy: 0.10, fireSelf: 0.05, backfire: 0.12, fireFrom: 2,
  srcTrue: { high: 0.92, mid: 0.7, low: 0.35 },
  srcWeight: { high: 0.3, mid: 0.4, low: 0.3 },
  windEast: 0.5,
  winEnemyLeft: 0.4, goodEnemyLeft: 0.75, perfectEnemyLeft: 0.2, perfectOwn: 0.5,
};
const wpick = (rng, w, keys) => { let s = 0; for (const z of keys) s += w[z]; let r = rng.next() * s; for (const z of keys) { r -= w[z]; if (r <= 0) return z; } return keys[keys.length - 1]; };
export const allowedZones = (t) => (t === 'cav' ? ZONES.filter((z) => z !== 'river') : ZONES);

export function makeScenario(seed) {
  const rng = createRng(seed * 7919 + 13);
  const enemy = TYPES.map((t) => ({ type: t, count: B.enemyCount[t], zone: wpick(rng, B.enemyZoneWeight, allowedZones(t)) }));
  return { enemy, wind: rng.next() < B.windEast ? 'E' : 'W' };
}
// 斥候報告: 出所(信頼度の手がかり)と claim。偽報は他ゾーン/逆風。騎兵が川にいる等の不可能報告は見抜ける。
export function makeReports(sc, seed) {
  const rng = createRng(seed * 104729 + 7);
  const mk = (subject, truth, alts) => {
    const source = wpick(rng, B.srcWeight, ['high', 'mid', 'low']);
    const ok = rng.next() < B.srcTrue[source];
    const claim = ok ? truth : alts.filter((a) => a !== truth)[Math.floor(rng.next() * (alts.length - 1))];
    return { subject, claim, source, truth: undefined, confirmed: false, feasible: subject === 'wind' || subject !== 'cav' || claim !== 'river' };
  };
  const reports = sc.enemy.map((e) => mk(e.type, e.zone, ZONES));
  reports.push(mk('wind', sc.wind, ['E', 'W']));
  return reports; // 真偽(ok)はエンジン外に出さない
}
export function applySpy(reports, sc, target) {
  return reports.map((r) => {
    if (r.subject !== target) return r;
    const truth = r.subject === 'wind' ? sc.wind : sc.enemy.find((e) => e.type === r.subject).zone;
    return { ...r, claim: truth, source: 'high', confirmed: true, feasible: true };
  });
}

// plan: { place:{inf,arc,cav}, principles:[..2], intervention:{unit,zone}|null }
export function resolveBattle(sc, plan, seed = 1) {
  const rng = createRng(seed * 31337 + 5);
  const pr = new Set(plan.principles.filter((p) => p !== 'spy'));
  const P = TYPES.map((t) => ({ type: t, count: B.playerCount[t], zone: plan.place[t], side: 'p' }));
  const E = sc.enemy.map((e) => ({ ...e, side: 'e' }));
  const ev = []; const reasons = new Set();
  let baseHp = B.baseHp;
  const startE = E.reduce((s, u) => s + u.count, 0), startP = P.reduce((s, u) => s + u.count, 0);
  ev.push({ t: 0, kind: 'deploy', player: P.map(({ type, zone }) => ({ type, zone })), principles: [...plan.principles] });
  for (let t = 1; t <= B.rounds; t++) {
    if (plan.intervention && t - 1 === B.interveneRound) {
      const u = P.find((x) => x.type === plan.intervention.unit);
      if (u && u.count > 0) { ev.push({ t, kind: 'intervene', unit: u.type, from: u.zone, to: plan.intervention.zone }); u.zone = plan.intervention.zone; }
    }
    const dP = new Map(), dE = new Map(); // 受けるダメージ
    for (const z of ZONES) {
      const ps = P.filter((u) => u.zone === z && u.count > 0), es = E.filter((u) => u.zone === z && u.count > 0);
      if (!ps.length && es.length) {
        if (t >= 2) { const d = es.reduce((s, u) => s + u.count * B.baseHit, 0); baseHp -= d; ev.push({ t, kind: 'base_hit', zone: z, dmg: +d.toFixed(1), baseHp: Math.max(0, +baseHp.toFixed(1)) }); reasons.add('uncovered:' + z); }
        continue;
      }
      if (ps.length && !es.length) { if (t === 1) reasons.add('idle:' + z); continue; }
      if (!ps.length) continue;
      const exitZ = B.exit[z];
      const trapped = pr.has('trap') && exitZ && P.some((u) => u.zone === exitZ && u.count > 0);
      if (trapped && t === 1) { ev.push({ t, kind: 'trap', zone: z }); reasons.add('trap:' + z); }
      if (pr.has('high') && z === 'hill' && t === 1) { ev.push({ t, kind: 'high_ground' }); reasons.add('high'); }
      if (pr.has('choke') && z === 'gorge' && t === 1) { ev.push({ t, kind: 'choke' }); reasons.add('choke'); }
      const mult = (a, d) => (B.beats[a.type] === d.type ? B.typeAdv : B.beats[d.type] === a.type ? B.typeDis : 1);
      for (const a of ps) for (const d of es) {
        let x = a.count * B.k * mult(a, d) * B.terrain[a.type][z] / es.length * (1 + (rng.next() * 2 - 1) * B.noise);
        if (pr.has('high') && z === 'hill') x *= B.high.atk;
        if (trapped) x *= B.trap.atk;
        if (pr.has('choke') && z === 'gorge') { /* 防御側で適用 */ }
        dE.set(d, (dE.get(d) || 0) + x);
      }
      for (const a of es) for (const d of ps) {
        let x = a.count * B.k * mult(a, d) * B.terrain[a.type][z] / ps.length * (1 + (rng.next() * 2 - 1) * B.noise);
        if (pr.has('high') && z === 'hill') x *= B.high.def;
        if (pr.has('choke') && z === 'gorge') x *= B.choke.def;
        if (trapped) x *= B.trap.enemyAtk;
        dP.set(d, (dP.get(d) || 0) + x);
      }
    }
    // 火攻（風は真の値で判定）
    if (pr.has('fire') && t >= B.fireFrom && P.some((u) => u.type === 'arc' && u.count > 0)) {
      if (sc.wind === 'E') {
        for (const u of E) if ((u.zone === 'river' || u.zone === 'plain') && u.count > 0) dE.set(u, (dE.get(u) || 0) + u.count * B.fireEnemy);
        for (const u of P) if ((u.zone === 'river' || u.zone === 'plain') && u.count > 0) dP.set(u, (dP.get(u) || 0) + u.count * B.fireSelf);
        ev.push({ t, kind: 'fire', wind: 'E' }); reasons.add('fire_ok');
      } else {
        for (const u of P) if ((u.zone === 'river' || u.zone === 'plain') && u.count > 0) dP.set(u, (dP.get(u) || 0) + u.count * B.backfire);
        ev.push({ t, kind: 'backfire', wind: 'W' }); reasons.add('fire_backfire');
      }
    }
    for (const [u, d] of dE) u.count = Math.max(0, u.count - d);
    for (const [u, d] of dP) u.count = Math.max(0, u.count - d);
    for (const z of ZONES) {
      const ps = P.filter((u) => u.zone === z), es = E.filter((u) => u.zone === z);
      if (ps.length && es.length) ev.push({ t, kind: 'clash', zone: z, p: ps.map((u) => [u.type, Math.round(u.count)]), e: es.map((u) => [u.type, Math.round(u.count)]) });
    }
  }
  const eLeft = E.reduce((s, u) => s + u.count, 0) / startE, pLeft = P.reduce((s, u) => s + u.count, 0) / startP;
  const baseOk = baseHp > 0;
  let score = 0;
  if (baseOk && eLeft <= B.goodEnemyLeft) score = 1;
  if (baseOk && eLeft <= B.winEnemyLeft) score = 2;
  if (baseOk && eLeft <= B.perfectEnemyLeft && pLeft >= B.perfectOwn) score = 3;
  ev.push({ t: B.rounds + 1, kind: 'end', score, win: score >= 2, eLeft: +eLeft.toFixed(2), pLeft: +pLeft.toFixed(2), baseHp: Math.max(0, +baseHp.toFixed(1)) });
  return { score, win: score >= 2, eLeft, pLeft, baseHp, events: ev, reasons: [...reasons] };
}
export const value = (r) => r.score + 0.5 * (1 - r.eLeft) + 0.2 * r.pLeft;
