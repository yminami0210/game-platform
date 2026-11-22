// 起動・画面遷移・__GS__ の公開。ゲームの規則は core/ にあり、ここは表示と入力だけ。
import { createGame, step, macroActions, microActions, snapshot, reportsOf, canDeploy } from './core/game.js';
import { TYPES, PRINCIPLES } from './core/battle.js';
import { explain, learnedFrom } from './core/explain.js';
import { chip, zoneHTML, board, reportRow, ZORDER } from './render/view.js';
import { load, save, record } from './save.js';

const [balance, T] = await Promise.all(['balance', 'text'].map((n) => fetch(`src/data/${n}.json`).then((r) => r.json())));
const data = { balance, text: T };
const B = balance;
const app = document.getElementById('app');
let store = load();
let fx = store.fx !== false;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
document.body.classList.toggle('nofx', !fx);

let screen = 'title', g = null, selected = null, picked = null;
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
  selected = null; picked = null; dg = null;
  screen = 'gunji';
}

// ---------- 描画 ----------
let shown = null;
function render() {
  app.innerHTML = { title: viewTitle, gunji: viewGunji, digest: viewDigest, result: viewResult }[screen]();
  if (shown !== screen) app.firstElementChild?.classList.add('fade'); // 画面が変わった時だけ淡く出す
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

function viewGunji() {
  const reports = reportsOf(g);
  const spyNow = g.principles.includes('spy') && !g.spyTarget;
  const rows = reports.map((r) => reportRow(T, r, { spy: spyNow })).join('');
  const marks = {}; for (const z of ZORDER) marks[z] = '';
  for (const r of reports) if (r.subject !== 'wind') marks[r.claim] += chip(T, 'e', r.subject, null, { src: r.source });
  const placed = (z) => TYPES.filter((t) => g.place[t] === z).map((t) => chip(T, 'p', t, B.playerCount[t], { act: `select:${t}`, sel: selected === t })).join('');
  const cells = ZORDER.map((z) => zoneHTML(T, z, marks[z] + placed(z), { target: !!selected })).join('');
  const tray = TYPES.filter((t) => !g.place[t]).map((t) => chip(T, 'p', t, B.playerCount[t], { act: `select:${t}`, sel: selected === t })).join('');
  const cards = PRINCIPLES.map((p) => {
    const on = g.principles.includes(p), lock = p === 'spy' && g.spyTarget;
    return `<button class="card${on ? ' on' : ''}${lock ? ' locked' : ''}" data-act="principle:${p}" aria-pressed="${on}"><b>${T.principles[p].name}</b><small>${T.principles[p].pian}・${T.principles[p].brief}</small></button>`;
  }).join('');
  const hint = spyNow ? '用間: 確かめる報告を1つ選べ' : !TYPES.every((t) => g.place[t]) ? '兵科を選び、地形をタップして配置' : g.principles.length < 2 ? '原則を2つ選べ' : '準備よし';
  return `<div class="screen"><div class="info"><b>${T.battle.name}</b><span>軍議</span></div><div class="scroll">
  <h2>斥候報告</h2>${rows}
  <h2>配置（敵の印は報告のとおり）</h2>${board(cells)}
  <div class="tray" data-act="tray">${tray || '<span class="hint">全て配置済み。駒をタップで動かせる</span>'}</div>
  <h2>孫子の原則（2つ）</h2><div class="cards">${cards}</div></div>
  <div class="panel" style="padding-bottom:0;text-align:center;font-size:14px;color:var(--ink-soft)">${hint}</div>
  <div class="bar"><button class="btn sub" data-act="undo">${T.ui.undo}</button><button class="btn main" data-act="deploy" ${canDeploy(g) ? '' : 'disabled'}>${T.ui.deploy}</button></div></div>`;
}

function viewDigest() {
  const d = dg, v = d.view;
  const cells = ZORDER.map((z) => {
    const ps = TYPES.filter((t) => v.p[t].zone === z).map((t) => chip(T, 'p', t, Math.round(v.p[t].count), { dead: v.p[t].count < 0.5, act: picked == null && d.waiting ? `pick:${t}` : (d.waiting && picked === t ? `pick:${t}` : undefined), sel: d.waiting && picked === t })).join('');
    const es = TYPES.filter((t) => v.e[t].zone === z).map((t) => chip(T, 'e', t, Math.round(v.e[t].count), { dead: v.e[t].count < 0.5 })).join('');
    return zoneHTML(T, z, es + ps, { act: d.waiting && picked ? `izone:${z}` : `noop:${z}`, target: d.waiting && picked && g.plan.place[picked] !== z, flash: fx && d.flash === z, fire: v.fire && (z === 'river' || z === 'plain') });
  }).join('');
  const round = Math.min(B.rounds, Math.max(0, d.round));
  const dots = Array.from({ length: B.rounds }, (_, i) => `<span class="${i < round ? 'on' : ''}"></span>`).join('');
  const baseW = Math.round((v.baseHp / B.baseHp) * 100);
  let panel;
  if (d.waiting) {
    const chips = TYPES.map((t) => chip(T, 'p', t, null, { act: `pick:${t}`, sel: picked === t })).join('');
    panel = `<div class="panel pulse"><div class="row"><span class="ki">機</span><span>${picked ? '送る先の地形をタップ' : '号令で動かす部隊を選べ（1部隊）'}</span></div><div class="row">${chips}</div><div class="row" style="margin-top:8px"><button class="btn sub" data-act="skip">${T.ui.skip}</button></div></div>`;
  } else {
    panel = `<div class="bar"><button class="btn sub" data-act="ff">${T.ui.fast}${d.speed > 1 ? ' ●' : ''}</button>${d.manual ? `<button class="btn main" data-act="next">${T.ui.next}</button>` : ''}</div>`;
  }
  return `<div class="screen"><div class="info"><b>${T.battle.name}</b><span class="dots" aria-label="第${round}合">${dots}</span></div>
  <div class="hp" title="本陣" aria-label="本陣の守り"><div style="width:${baseW}%"></div></div>
  <div class="caption">${esc(d.caption)}</div><div class="scroll">${board(cells)}</div>${panel}</div>`;
}

function viewResult() {
  const r = g.result, sc = r.score;
  const ex = explain(r, g.plan, T);
  const why = ex.map((e) => `<div class="why ${e.kind}"><q>${esc(e.quote)}<span>${esc(e.src)}</span></q><p>${esc(e.body)}</p></div>`).join('');
  const sq = [1, 2, 3].map((i) => `<span class="${sc >= i ? 'on' : ''}"></span>`).join('');
  const newly = g.newLearned?.length ? `<div class="learn">習得: ${g.newLearned.map((p) => T.principles[p].name).join('・')}</div>` : '';
  return `<div class="screen"><div class="info"><b>${T.battle.name}</b><span>解説</span></div><div class="scroll">
  <div class="stamp ${sc >= 2 ? '' : 'lose'}">${sc >= 2 ? T.scoreLabel[sc].slice(0, 2) : '惜'}</div>
  <div class="squares" aria-label="評価 ${sc}/3">${sq}</div><div class="big" style="font-size:24px;margin:0">${T.scoreLabel[sc]}</div>
  <p class="lead">${T.scoreLead[sc]}</p>${why}${newly}</div>
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
const cap = (k, z) => T.captions[k].replace('{z}', z ? T.zones[z] : '');
function applyEvent(ev) {
  const d = dg, v = d.view; d.flash = null; v.fire = false;
  d.round = Math.max(d.round, ev.t);
  switch (ev.kind) {
    case 'deploy': d.caption = cap('deploy'); break;
    case 'intervene': v.p[ev.unit].zone = ev.to; d.caption = cap('intervene'); d.flash = ev.to; vibrate(20); break;
    case 'high_ground': d.caption = cap('high_ground'); d.flash = 'hill'; break;
    case 'choke': d.caption = cap('choke'); d.flash = 'gorge'; break;
    case 'trap': d.caption = cap('trap'); d.flash = ev.zone; break;
    case 'clash':
      for (const [t, n] of ev.p) v.p[t].count = n;
      for (const [t, n] of ev.e) v.e[t].count = n;
      d.caption = cap('clash', ev.zone); d.flash = ev.zone; vibrate(12); break;
    case 'base_hit': v.baseHp = ev.baseHp; d.caption = cap('base_hit', ev.zone); d.flash = ev.zone; vibrate(30); break;
    case 'fire': v.fire = true; d.caption = cap('fire_E'); break;
    case 'backfire': v.fire = true; d.caption = cap('backfire'); vibrate(30); break;
    case 'end': d.caption = cap('end'); break;
  }
}
function schedule() {
  clearTimeout(timer);
  if (screen !== 'digest' || dg.waiting || dg.manual) return;
  timer = setTimeout(advance, (fx ? 1100 : 700) / dg.speed);
}
function advance() {
  const d = dg, list = g.result.events;
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
  d.idx = g.result.events.findIndex((e) => e.t >= B.interveneRound + 1);
  if (d.idx < 0) d.idx = g.result.events.length;
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
    if (k === 'select') selected = selected === a ? null : a;
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
