// 1戦のセッション（軍議→開戦→介入→結果）の状態機械。純粋なJS。UI・ボット・simulate.mjs が共通で使う。
// 行動(action)は文字列: place:<兵科>:<地形> / principle:<原則> / spy:<報告の対象> / deploy / intervene:<兵科>:<地形> / skip
import { createEngine, ZONES, TYPES, PRINCIPLES } from './battle.js';
import { createRng } from './rng.js';

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
    place: {}, principles: [], plan: null, result: null, intervention: null, busy: 0,
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
  s.phase = 'battle'; s.score = s.result.score; // score は simulate.mjs の先読み用。画面は result 局面まで見せない
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

// 一括の策（軍議を一度に決める）。simulate.mjs とブラウザのボットが使う。
// 形式: plan:inf=hill,arc=plain,cav=river|high,fire[|spy対象]。半分は報告を鵜呑みにした配置、半分は無作為。
export function macroActions(s, n = 40) {
  const out = [];
  const claimed = s.rawReports.filter((r) => r.subject !== 'wind').map((r) => r.claim);
  for (let k = 0; k < n; k++) {
    const rng = createRng(s.seed * 977 + k);
    const place = {};
    if (k % 2 === 0) { const ts = [...TYPES].sort(() => rng.next() - 0.5); ts.forEach((t, i) => { place[t] = claimed[i]; }); }
    else for (const t of TYPES) place[t] = ZONES[rng.int(0, ZONES.length - 1)];
    const pr = [...PRINCIPLES].sort(() => rng.next() - 0.5).slice(0, 2);
    let str = `plan:${TYPES.map((t) => `${t}=${place[t]}`).join(',')}|${pr.join(',')}`;
    if (pr.includes('spy')) str += `|${s.rawReports[rng.int(0, s.rawReports.length - 1)].subject}`;
    out.push(str);
  }
  return out;
}

function applyMacro(s, str) {
  const [pl, pr, spy] = str.slice(5).split('|');
  for (const kv of pl.split(',')) { const [t, z] = kv.split('='); if (!setPlace(s, t, z)) return false; }
  for (const p of pr.split(',')) if (!togglePrinciple(s, p)) return false;
  if (spy && !chooseSpy(s, spy)) return false;
  return deploy(s);
}

// 細かい操作の一覧（UI用）
export function microActions(s) {
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

// simulate.mjs 用: 軍議は一括の策、再生中は待つだけ
export function actions(s) {
  if (s.phase === 'plan') return macroActions(s);
  return s.phase === 'battle' ? ['wait'] : ['retry'];
}

// 行動を1つ適用。結果が出たら clear / fail を返す。
// dt を渡すと（simulate.mjs）、一括の策のあと simSeconds（軍議+再生の目安）が経ってから結果になる。UI は dt を渡さない。
export function step(s, action, dt) {
  const ev = [];
  const [k, a, b] = String(action).split(':');
  let ok = false;
  if (k === 'plan') { ok = applyMacro(s, String(action)); if (ok) { ev.push({ type: 'deploy' }); s.busy = s.data.balance?.simSeconds ?? s.data.simSeconds ?? 75; } }
  else if (k === 'place') ok = setPlace(s, a, b);
  else if (k === 'principle') ok = togglePrinciple(s, a);
  else if (k === 'spy') ok = chooseSpy(s, a);
  else if (k === 'deploy') { ok = deploy(s); if (ok) ev.push({ type: 'deploy' }); }
  else if (k === 'intervene') ok = intervene(s, a, b);
  else if (k === 'skip') ok = intervene(s, null);
  if (dt && s.phase === 'battle' && s.busy > 0 && k !== 'plan') { s.busy -= dt; if (s.busy <= 0) ok = intervene(s, null); }
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
