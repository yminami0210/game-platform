// 1戦のセッション（軍議→開戦→介入→結果）の状態機械。純粋なJS。UI・ボット・simulate.mjs が共通で使う。
// 行動(action)は文字列: place:<兵科>:<地形> / principle:<原則> / spy:<報告の対象> / deploy / intervene:<兵科>:<地形> / skip
import { createEngine, ZONES, TYPES, PRINCIPLES } from './battle.js';

const engines = new WeakMap();
export function engineOf(data) {
  const B = data.balance ?? data;
  if (!engines.has(B)) engines.set(B, createEngine(B));
  return engines.get(B);
}

export function createGame({ seed = 1, data }) {
  const eng = engineOf(data);
  const sc = eng.makeScenario(seed);
  return {
    seed, data, phase: 'plan', alive: true, score: 0,
    sc, rawReports: eng.makeReports(sc, seed), spyTarget: null,
    place: {}, principles: [], plan: null, result: null, intervention: null,
  };
}

export function clone(s) {
  return { ...s, place: { ...s.place }, principles: [...s.principles], intervention: s.intervention && { ...s.intervention } };
}

// 画面に見せる報告（用間で確定した分を反映）
export function reportsOf(s) {
  return s.spyTarget && s.principles.includes('spy') ? engineOf(s.data).applySpy(s.rawReports, s.sc, s.spyTarget) : s.rawReports;
}

export function setPlace(s, type, zone) {
  if (s.phase !== 'plan' || !TYPES.includes(type)) return false;
  if (zone == null) { delete s.place[type]; return true; }
  if (!ZONES.includes(zone)) return false;
  s.place[type] = zone; return true;
}

// 用間は報告を確かめた後は外せない（外して見比べる抜け道を塞ぐ）
export function togglePrinciple(s, p) {
  if (s.phase !== 'plan' || !PRINCIPLES.includes(p)) return false;
  const i = s.principles.indexOf(p);
  if (i >= 0) { if (p === 'spy' && s.spyTarget) return false; s.principles.splice(i, 1); return true; }
  if (s.principles.length >= 2) return false;
  s.principles.push(p); return true;
}

export function chooseSpy(s, target) {
  if (s.phase !== 'plan' || !s.principles.includes('spy') || s.spyTarget) return false;
  if (!s.rawReports.some((r) => r.subject === target)) return false;
  s.spyTarget = target; return true;
}

export function canDeploy(s) {
  return s.phase === 'plan' && TYPES.every((t) => s.place[t]) && s.principles.length === 2 && (!s.principles.includes('spy') || !!s.spyTarget);
}

export function deploy(s) {
  if (!canDeploy(s)) return false;
  s.plan = { place: { ...s.place }, principles: [...s.principles], intervention: null };
  s.result = engineOf(s.data).resolveBattle(s.sc, s.plan, s.seed);
  s.phase = 'battle';
  return true;
}

// 3ラウンド目の頭の介入。unit が null なら何もしない。1〜2ラウンドは再計算しても変わらない。
export function intervene(s, unit, zone) {
  if (s.phase !== 'battle') return false;
  if (unit != null) {
    if (!TYPES.includes(unit) || !ZONES.includes(zone) || s.plan.place[unit] === zone) return false;
    s.plan = { ...s.plan, intervention: { unit, zone } };
    s.intervention = { unit, zone };
    s.result = engineOf(s.data).resolveBattle(s.sc, s.plan, s.seed);
  }
  s.phase = 'result'; s.alive = false; s.score = s.result.score;
  return true;
}

export function actions(s) {
  if (s.phase === 'plan') {
    const a = [];
    for (const t of TYPES) for (const z of ZONES) a.push(`place:${t}:${z}`);
    for (const p of PRINCIPLES) a.push(`principle:${p}`);
    if (s.principles.includes('spy') && !s.spyTarget) for (const r of s.rawReports) a.push(`spy:${r.subject}`);
    if (canDeploy(s)) a.push('deploy');
    return a;
  }
  if (s.phase === 'battle') {
    const a = ['skip'];
    for (const t of TYPES) for (const z of ZONES) if (s.plan.place[t] !== z) a.push(`intervene:${t}:${z}`);
    return a;
  }
  return ['retry'];
}

// 行動を1つ適用。結果が出たら clear / fail を返す。dt は使わない（simulate.mjs 互換）。
export function step(s, action) {
  const ev = [];
  const [k, a, b] = String(action).split(':');
  let ok = false;
  if (k === 'place') ok = setPlace(s, a, b);
  else if (k === 'principle') ok = togglePrinciple(s, a);
  else if (k === 'spy') ok = chooseSpy(s, a);
  else if (k === 'deploy') { ok = deploy(s); if (ok) ev.push({ type: 'deploy' }); }
  else if (k === 'intervene') ok = intervene(s, a, b);
  else if (k === 'skip') ok = intervene(s, null);
  if (ok && s.phase === 'result') ev.push({ type: s.result.win ? 'clear' : 'fail', score: s.score, win: s.result.win, reasons: [...s.result.reasons] });
  return ev;
}

// ボット・テレメトリ用に真値(sc)を除いた状態
export function snapshot(s) {
  return {
    seed: s.seed, phase: s.phase, place: { ...s.place }, principles: [...s.principles], spyTarget: s.spyTarget,
    reports: reportsOf(s).map((r) => ({ ...r })), intervention: s.intervention,
    result: s.phase === 'result' ? { score: s.score, win: s.result.win, reasons: [...s.result.reasons] } : null,
  };
}
