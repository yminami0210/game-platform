// 起動・画面遷移・__GS__ の公開。ゲームの規則は core/ にあり、ここは表示と入力だけ。
import { createGame, step, macroActions, microActions, snapshot, reportsOf, canDeploy } from './core/game.js';
import { TYPES, PRINCIPLES } from './core/battle.js';
import { explain, learnedFrom, principleStatus, checkReports } from './core/explain.js';
import { chip, zoneHTML, board, reportChip, ZORDER } from './render/view.js';
import { trail } from './render/ink.js';
import { load, save, record } from './save.js';

const [balance, T] = await Promise.all(['balance', 'text'].map((n) => fetch(`src/data/${n}.json`).then((r) => r.json())));
const data = { balance, text: T };
const B = balance;
const app = document.getElementById('app');
let store = load();
let fx = store.fx !== false;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
document.body.classList.toggle('nofx', !fx);

let screen = 'title', g = null, selected = null, picked = null, hl = null;
let dg = null; // ダイジェスト再生の状態
let seedCounter = (Date.now() & 0xffff) + 1;
const events = [];
const t0 = Date.now();
const log = (type, extra = {}) => events.push({ ...extra, type, t: (Date.now() - t0) / 1000 });
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const vibrate = (ms) => { if (fx) navigator.vibrate?.(ms); };
let timer = 0;

function newGame() {
  clearTimeout(timer);
  g = createGame({ seed: seedCounter++, data });
  selected = null; picked = null; dg = null; hl = null;
  screen = 'gunji';
}

// ---------- 描画 ----------
let shown = null;
function render() {
  app.innerHTML = { title: viewTitle, gunji: viewGunji, digest: viewDigest, result: viewResult }[screen]();
  if (shown !== screen) app.firstElementChild?.classList.add('fade', 'enter'); // 画面が変わった時だけ淡く出す（巻物もこの時だけ広がる）
  shown = screen;
}

function viewTitle() {
  const n = store.learned.length;
  const pr = PRINCIPLES.map((p) => `<span class="${store.learned.includes(p) ? 'on' : ''}">${T.principles[p].name}</span>`).join('');
  return `<div class="screen"><div class="info"><span>戦場選択</span><span>最高 ${T.scoreLabel[store.best]}</span></div>
  <div class="scroll"><div class="big">${T.title}</div>
  <div class="tile" style="border-color:var(--vermilion)"><span><b style="font-family:var(--serif);font-size:24px">${T.battle.name}</b><br>${T.battle.summary}</span></div>
  <h2>習得した兵法 ${n}/${PRINCIPLES.length}</h2><div class="pr-list">${pr}</div>
  <div class="tile off"><span>統一地図</span><span>準備中</span></div><div class="tile off"><span>兵法図鑑</span><span>準備中</span></div></div>
  <div class="bar"><button class="btn sub" data-act="fx" aria-label="演出の切替">演出 ${fx ? 'あり' : 'なし'}</button><button class="btn main" data-act="start">${T.ui.start}</button></div></div>`;
}

function missing() {
  const m = [];
  const un = TYPES.filter((t) => !g.place[t]).map((t) => T.typeChar[t]);
  if (un.length) m.push(`${un.join('・')}が未配置`);
  if (g.principles.length < 2) m.push(`原則あと${2 - g.principles.length}つ`);
  if (g.principles.includes('spy') && !g.spyTarget) m.push('用間の対象を選ぶ');
  return m;
}
const emptyInner = () => Object.fromEntries(ZORDER.map((z) => [z, { e: {}, p: {} }]));
function viewGunji() {
  const reports = reportsOf(g);
  const spyNow = g.principles.includes('spy') && !g.spyTarget;
  // 盤: 敵は報告どおりの「残像」（破線・薄墨・印字 確/概/疑）、味方は置いた駒
  const inner = emptyInner();
  for (const r of reports) if (r.subject !== 'wind') inner[r.claim].e[r.subject] = chip(T, 'e', r.subject, T.source[r.source].mark, { src: r.source, ghost: true, hl: hl === r.subject, bad: !r.feasible });
  for (const t of TYPES) if (g.place[t]) inner[g.place[t]].p[t] = chip(T, 'p', t, B.playerCount[t], { act: `chip:${t}`, sel: selected === t });
  const cells = ZORDER.map((z) => zoneHTML(T, z, inner[z], { target: !!selected })).join('');
  const rows = reports.map((r) => reportChip(T, r, { spy: spyNow, hl: hl === r.subject })).join('');
  const tray = TYPES.filter((t) => !g.place[t]).map((t) => chip(T, 'p', t, B.playerCount[t], { act: `select:${t}`, sel: selected === t })).join('');
  const cards = PRINCIPLES.map((p) => {
    const on = g.principles.includes(p), lock = p === 'spy' && g.spyTarget;
    const st = on || p !== 'spy' ? principleStatus(p, g.place, reports, B.exit) : 'maybe';
    const pr = T.principles[p];
    return `<button class="card${on ? ' on' : ''}${lock ? ' locked' : ''}" data-act="principle:${p}" aria-pressed="${on}" aria-label="${pr.name}。${pr.cond}"><b>${pr.short}</b><small>${pr.cond}</small><em class="st ${st}">${T.status[st]}</em></button>`;
  }).join('');
  const miss = missing();
  const hint = miss.length ? `開戦するには: ${miss.join('／')}` : '準備よし。開戦できる';
  const rl = spyNow ? '用間: 確かめる報告をタップ' : `${T.sourceLegend}　取消線=偽の報せ`;
  return `<div class="screen"><div class="info"><b>${T.battle.name}</b><span>軍議</span></div>
  <div class="bwrap">${board(cells)}</div>
  <div class="reps">${rows}</div><div class="legend rl">${rl}</div>
  <div class="dock"><div class="tray" data-act="tray">${tray || '<span class="hint">全て配置済み。駒をタップで選び直せる</span>'}</div>
  <div class="cards">${cards}</div>
  <div class="need ${miss.length ? 'warn' : ''}">${hint}</div></div>
  <div class="bar"><button class="btn sub" data-act="undo">${T.ui.undo}</button><button class="btn main" data-act="deploy" ${canDeploy(g) ? '' : 'disabled'}>${T.ui.deploy}</button></div></div>`;
}

function viewDigest() {
  const d = dg, v = d.view;
  const inner = emptyInner();
  for (const t of TYPES) {
    const u = v.p[t];
    inner[u.zone].p[t] = chip(T, 'p', t, Math.round(u.count), { dead: u.count < 0.5, act: picked == null && d.waiting ? `pick:${t}` : (d.waiting && picked === t ? `pick:${t}` : undefined), sel: d.waiting && picked === t });
    const e = v.e[t];
    if (e) inner[e.zone].e[t] = chip(T, 'e', t, Math.round(e.count), { dead: e.count < 0.5 });
  }
  const cells = ZORDER.map((z) => zoneHTML(T, z, inner[z], { act: d.waiting && picked ? `izone:${z}` : `noop:${z}`, target: d.waiting && picked && g.plan.place[picked] !== z, flash: fx && d.flash === z, splash: d.splash, fire: v.fire && (z === 'river' || z === 'plain') })).join('');
  const round = Math.min(B.rounds, Math.max(0, d.round));
  const dots = Array.from({ length: B.rounds }, (_, i) => `<span class="${i < round ? 'on' : ''}"></span>`).join('');
  const baseW = Math.round((v.baseHp / B.baseHp) * 100);
  let panel;
  if (d.waiting) {
    const chips = TYPES.map((t) => chip(T, 'p', t, null, { act: `pick:${t}`, sel: picked === t })).join('');
    panel = `<div class="panel pulse"><div class="row"><span class="ki">機</span><span>${picked ? '送る先の地形をタップ' : '号令で動かす部隊を選べ（1部隊）'}</span></div><div class="row">${chips}<button class="btn sub" data-act="skip" style="flex:none;padding:0 16px">${T.ui.skip}</button></div></div>`;
  } else {
    panel = `<div class="bar"><button class="btn sub" data-act="ff">${T.ui.fast}${d.speed > 1 ? ' ●' : ''}</button>${d.manual ? `<button class="btn main" data-act="next">${T.ui.next}</button>` : ''}</div>`;
  }
  return `<div class="screen"><div class="info"><b>${T.battle.name}</b><span class="dots" aria-label="第${round}合">${dots}</span></div>
  <div class="hp" title="本陣" aria-label="本陣の守り"><div style="width:${baseW}%"></div></div>
  <div class="bwrap roll big-board"><i class="rod"></i>${board(cells, d.trail ? trail(d.trail[0], d.trail[1]) : '')}<i class="rod"></i></div>
  <div class="caption"><span>${d.mark ? `<span class="seal ${d.mark.k}">${esc(d.mark.t)}</span>` : ''}${esc(d.caption)}</span>${d.sub ? `<small>${esc(d.sub)}</small>` : ''}</div>${panel}</div>`;
}

// 解説用: 最終局面（イベントを最後まで適用した駒の位置と兵数）
function finalBoard() {
  const p = {}, e = {};
  for (const t of TYPES) p[t] = { zone: g.plan.place[t], count: B.playerCount[t] };
  for (const u of g.sc.enemy) e[u.type] = { zone: u.zone, count: u.count };
  for (const ev of g.result.events) {
    if (ev.kind === 'intervene') p[ev.unit].zone = ev.to;
    else if (ev.kind === 'clash') { for (const [t, n] of ev.p) p[t].count = n; for (const [t, n] of ev.e) e[t].count = n; }
  }
  const inner = emptyInner();
  for (const t of TYPES) {
    inner[p[t].zone].p[t] = chip(T, 'p', t, null, { dead: p[t].count < 0.5 });
    if (e[t]) inner[e[t].zone].e[t] = chip(T, 'e', t, null, { dead: e[t].count < 0.5 });
  }
  return board(ZORDER.map((z) => zoneHTML(T, z, inner[z], { act: null })).join(''), '', 'mini');
}

function viewResult() {
  const r = g.result, sc = r.score;
  const ex = explain(r, g.plan, T);
  const why = ex.map((e) => `<div class="why ${e.kind}"><q>${esc(e.quote)}</q><span class="src">${esc(e.src)}</span><p>${esc(e.body)}</p></div>`).join('');
  const sq = [1, 2, 3].map((i) => `<span class="${sc >= i ? 'on' : ''}"></span>`).join('');
  const ck = checkReports(g.rawReports, g.sc, g.spyTarget, T);
  const rowsHTML = ck.rows.map((x) => `<div class="ck ${x.hit ? 'hit' : 'miss'}"><span class="badge ${x.source}">${x.mark}</span><span>${esc(x.claim)}<small>信頼度${x.label}${x.spied ? '・' + T.check.spy : ''}${x.hit ? '' : '／' + T.check.truth.replace('{v}', x.truth)}</small></span><b>${x.hit ? '◎' + T.check.hit : '×' + T.check.miss}</b></div>`).join('');
  const tallyS = ['high', 'mid', 'low'].filter((k) => ck.tally[k]).map((k) => T.check.lv.replace('{l}', T.source[k].label).replace('{h}', ck.tally[k][0]).replace('{n}', ck.tally[k][1])).join('　');
  const checkHTML = `<h2>${T.check.title}</h2>${rowsHTML}<p class="legend">${T.check.tally.replace('{s}', tallyS)}</p>`;
  const help = T.scoreHelp.replace('{g}', Math.round((1 - B.goodEnemyLeft) * 100)).replace('{w}', Math.round((1 - B.winEnemyLeft) * 100)).replace('{p}', Math.round((1 - B.perfectEnemyLeft) * 100)).replace('{o}', Math.round(B.perfectOwn * 100));
  const newly = g.newLearned?.length ? `<div class="learn">習得: ${g.newLearned.map((p) => T.principles[p].name).join('・')}</div>` : '';
  return `<div class="screen"><div class="info"><b>${T.battle.name}</b><span>解説</span></div>
  <div class="bwrap mw" aria-label="最終局面">${finalBoard()}</div><div class="scroll">
  <div class="rhead"><div class="stamp ${sc >= 2 ? '' : 'lose'}" aria-label="落款 ${T.scoreLabel[sc]}"><span>${['惜', '善', '勝', '完'][sc]}</span></div><div><div class="big" style="font-size:24px;margin:0">${T.scoreLabel[sc]}</div><div class="squares" aria-label="評価 ${sc}/3">${sq}</div></div></div>
  <p class="lead">${T.scoreLead[sc]}</p>${why}${checkHTML}${newly}<p class="legend">${help}</p></div>
  <div class="bar" style="flex-direction:column"><button class="btn main" data-act="retry" style="flex:none">${T.ui.retry}</button><button class="btn sub" data-act="title" style="flex:none">${T.ui.toTitle}</button></div></div>`;
}

// ---------- ダイジェスト再生 ----------
function startDigest() {
  const p = {}, e = {};
  const d = { idx: 0, round: 0, caption: '', flash: null, speed: 1, waiting: false, manual: reduceMotion, intervened: false,
    view: { p, e, baseHp: B.baseHp, fire: false } };
  for (const t of TYPES) { p[t] = { zone: g.plan.place[t], count: B.playerCount[t] }; }
  for (const u of g.sc.enemy) e[u.type] = { zone: u.zone, count: u.count };
  dg = d; screen = 'digest'; advance();
}
const fmt = (str, o = {}) => str
  .replace('{highAtk}', B.high.atk).replace('{highDef}', B.high.def).replace('{chokeDef}', B.choke.def)
  .replace('{trapAtk}', B.trap.atk).replace('{trapEnemy}', B.trap.enemyAtk)
  .replace('{fireE}', Math.round(B.fireEnemy * 100)).replace('{fireS}', Math.round(B.fireSelf * 100)).replace('{backfire}', Math.round(B.backfire * 100))
  .replace('{z}', o.z ? T.zones[o.z] : '').replace('{p}', o.p ?? '').replace('{why}', o.why ?? '')
  .replace('{a}', o.a ?? '').replace('{b}', o.b ?? '');
// 再生用イベント列: 不発の原則を第1合の後ろに差し込む
function viewEvents() {
  const r = g.result, list = [...r.events];
  const fired = (k) => r.reasons.some((x) => x.split(':')[0] === k);
  const unmet = g.plan.principles.filter((p) => (p === 'high' || p === 'choke' || p === 'trap') ? !fired(p) : p === 'fire' ? !fired('fire_ok') && !fired('fire_backfire') : false);
  list.splice(1, 0, ...unmet.map((p) => ({ t: 1, kind: 'unmet', p })));
  return list;
}
function clashNote(ev) {
  const notes = [];
  for (const [pt, pn] of ev.p) for (const [et, en] of ev.e) {
    if (pn < 0.5 || en < 0.5) continue;
    if (B.beats[pt] === et) notes.push(fmt(T.captions.strong, { a: T.types[pt], b: T.types[et] }));
    else if (B.beats[et] === pt) notes.push(fmt(T.captions.weak, { a: T.types[pt], b: T.types[et] }));
  }
  for (const [pt] of ev.p) { const c = B.terrain[pt][ev.zone]; if (c >= 1.2) notes.push(fmt(T.captions.tgood, { a: T.types[pt], z: ev.zone })); else if (c <= 0.7) notes.push(fmt(T.captions.tbad, { a: T.types[pt], z: ev.zone })); }
  return notes.slice(0, 2).join('。');
}
function applyEvent(ev) {
  const d = dg, v = d.view; d.flash = null; d.splash = false; d.trail = null; v.fire = false; d.sub = ''; d.mark = null;
  d.round = Math.max(d.round, ev.t);
  const C = T.captions;
  const eff = (k, o) => { d.caption = C[k][0]; d.sub = fmt(C[k][1], o); d.mark = { k: 'on', t: '効' }; };
  switch (ev.kind) {
    case 'deploy': d.caption = C.deploy; break;
    case 'intervene': v.p[ev.unit].zone = ev.to; d.caption = C.intervene; d.sub = `${T.types[ev.unit]}を${T.zones[ev.to]}へ`; d.flash = ev.to; d.trail = [ev.from, ev.to]; vibrate(20); break;
    case 'high_ground': eff('high_ground'); d.flash = 'hill'; break;
    case 'choke': eff('choke'); d.flash = 'gorge'; break;
    case 'trap': eff('trap', { z: ev.zone }); d.flash = ev.zone; break;
    case 'unmet': d.caption = C.unmet[0]; d.sub = fmt(C.unmet[1], { p: T.principles[ev.p].name, why: T.unmet[ev.p] }); d.mark = { k: 'off', t: '不発' }; break;
    case 'clash':
      for (const [t, n] of ev.p) v.p[t].count = n;
      for (const [t, n] of ev.e) v.e[t].count = n;
      d.caption = fmt(C.clash, { z: ev.zone }); d.sub = clashNote(ev); d.flash = ev.zone; d.splash = !reduceMotion; vibrate(12); break;
    case 'base_hit': v.baseHp = ev.baseHp; d.caption = fmt(C.base_hit, { z: ev.zone }); d.sub = C.base_hit_sub; d.flash = ev.zone; vibrate(30); break;
    case 'fire': v.fire = true; eff('fire_E'); break;
    case 'backfire': v.fire = true; d.caption = C.backfire[0]; d.sub = fmt(C.backfire[1]); d.mark = { k: 'off', t: '裏目' }; vibrate(30); break;
    case 'end': d.caption = C.end; d.sub = `${T.scoreLabel[ev.score]}（敵の残り ${Math.round(ev.eLeft * 100)}%）`; break;
  }
}
function schedule() {
  clearTimeout(timer);
  if (screen !== 'digest' || dg.waiting || dg.manual) return;
  timer = setTimeout(advance, (fx ? 1100 : 700) / dg.speed);
}
function advance() {
  const d = dg, list = viewEvents();
  if (!d || screen !== 'digest' || d.waiting) return;
  const ev = list[d.idx];
  if (ev && ev.t >= B.interveneRound + 1 && !d.intervened) { d.waiting = true; d.round = B.interveneRound; d.caption = '機が来た。号令を下せ'; log('intervene_offer'); render(); return; }
  if (!ev) return finish();
  d.idx++; applyEvent(ev); render();
  if (ev.kind === 'end') { timer = setTimeout(finish, 900 / d.speed); return; }
  schedule();
}
function doIntervene(unit, zone) {
  const d = dg;
  if (!d.waiting) return;
  const ok = unit ? step(g, `intervene:${unit}:${zone}`) : step(g, 'skip');
  if (!ok.length && g.phase !== 'result') return; // 無効な移動
  d.waiting = false; d.intervened = true; picked = null;
  // 再計算後のイベント列から、第3合の頭の続きを探す（1〜2合は同一）
  const vl = viewEvents();
  d.idx = vl.findIndex((e) => e.t >= B.interveneRound + 1);
  if (d.idx < 0) d.idx = vl.length;
  render(); schedule();
}
function finish() {
  clearTimeout(timer);
  if (g.phase !== 'result') step(g, 'skip');
  const r = g.result;
  g.newLearned = learnedFrom(r, g.plan).filter((p) => !store.learned.includes(p));
  store = { ...record(store, r.score, g.plan.principles, learnedFrom(r, g.plan)), fx };
  save(store);
  log(r.win ? 'clear' : 'fail', { score: r.score, reasons: r.reasons });
  vibrate(r.win ? [20, 40, 20] : 40);
  screen = 'result'; render();
}

// ---------- 入力（すべて data-act 経由。bot.press も同じ入口） ----------
function dispatch(act) {
  const [k, a, b] = act.split(':');
  if (act === 'start') { newGame(); log(events.some((e) => e.type === 'start') ? 'retry' : 'start'); }
  else if (act === 'retry') { newGame(); log('retry'); }
  else if (act === 'title') { clearTimeout(timer); screen = 'title'; }
  else if (act === 'fx') { fx = !fx; store = { ...store, fx }; save(store); document.body.classList.toggle('nofx', !fx); }
  else if (screen === 'gunji') {
    if (k === 'hl') hl = hl === a ? null : a;
    else if (k === 'spy') { step(g, act); hl = null; }
    else if (k === 'select') selected = selected === a ? null : a;
    else if (k === 'chip') { // 置いた駒: 別の駒を選択中なら、その駒の地形へ置く。そうでなければ選び直し
      if (selected && selected !== a) { step(g, `place:${selected}:${g.place[a]}`); selected = null; vibrate(8); }
      else selected = selected === a ? null : a;
    }
    else if (k === 'zone') { if (selected) { step(g, `place:${selected}:${a}`); selected = null; vibrate(8); } }
    else if (act === 'tray') { if (selected && g.place[selected]) { delete g.place[selected]; selected = null; } }
    else if (act === 'undo') { g.place = {}; selected = null; }
    else if (act === 'deploy') { if (step(g, 'deploy').length) { log('deploy', { principles: [...g.plan.principles] }); startDigest(); return; } }
    else { step(g, act); if (g.phase === 'battle') { log('deploy', { principles: [...g.plan.principles] }); startDigest(); return; } }
  } else if (screen === 'digest') {
    if (act === 'ff') { dg.speed = dg.speed > 1 ? 1 : 3; schedule(); }
    else if (act === 'next') { if (!dg.waiting) advance(); }
    else if (k === 'pick') picked = picked === a ? null : a;
    else if (k === 'izone') { if (picked) { doIntervene(picked, a); return; } }
    else if (act === 'skip') { doIntervene(null); return; }
    else if (k === 'intervene') { doIntervene(a, b); return; }
  } else return;
  render();
}
app.addEventListener('click', (e) => { const el = e.target.closest('[data-act]'); if (el && !el.disabled) dispatch(el.dataset.act); });
app.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role=button]')) { e.preventDefault(); e.target.click(); } });
document.addEventListener('visibilitychange', () => { if (document.hidden) clearTimeout(timer); else schedule(); });

// playtester / balance 用フック（真値は含めない）
window.__GS__ = {
  version: 1,
  get state() { return g ? { screen, ...snapshot(g) } : { screen }; },
  events,
  get running() { return screen === 'gunji' || screen === 'digest'; },
  bot: {
    actions: () => botActions(),
    press: (a) => { if (botActions().includes(a)) dispatch(a); },
  },
};
function botActions() {
  if (screen === 'title') return ['start'];
  if (screen === 'result') return ['retry'];
  if (screen === 'digest') return dg?.waiting ? microActions(g) : ['next'];
  return g ? macroActions(g) : [];
}
render();
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js');
