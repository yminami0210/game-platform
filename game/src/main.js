// 起動・場面の切り替え（タイトル → 物語 → 地図 → ステージ → 結果 → …）・固定刻みのループ・__GS__ の公開。
import { parseLevel } from './core/level.js';
import { createStage, step, DT } from './core/stage.js';
import { moveFrom, recordResult, openNodes, medalTotal, emptyProgress } from './core/world.js';
import { createRenderer } from './render/renderer.js';
import { createMapView } from './render/mapview.js';
import { createInput } from './input/input.js';
import * as sfx from './audio/sfx.js';
import { load, save, wipe } from './save.js';

const $ = id => document.getElementById(id);
const getJSON = async p => (await fetch(p)).json();
const [tuning, world, text] = await Promise.all([getJSON('src/data/tuning.json'), getJSON('src/data/world1.json'), getJSON('src/data/text.json')]);
const stages = {};
const ready = await getJSON('src/data/stages/index.json'); // できているステージだけ読む（404 を出さない）
await Promise.all(ready.map(async id => { stages[id] = await getJSON(`src/data/stages/${id}.json`); }));
const levels = {};
const levelOf = id => (levels[id] ??= parseLevel(stages[id]));

const canvas = $('stage');
// ツギの絵（決まった案のドット絵）。無ければ仮の絵
let playerSprite = null;
if (tuning.playerSprite) { try { playerSprite = await getJSON(tuning.playerSprite); } catch {} }
const renderer = createRenderer(canvas, tuning.view);
if (playerSprite) renderer.setPlayerSprite(playerSprite);
const mapView = createMapView(renderer, world);
const input = createInput($('pad'));
let saved = load();
sfx.setMuted(saved.muted);

// ---- テレメトリ（playtester・ボット用） ----
const events = [];
const t0 = performance.now();
const log = (type, extra = {}) => { events.push({ ...extra, type, t: +((performance.now() - t0) / 1000).toFixed(2) }); if (events.length > 5000) events.splice(0, 1000); };

// ---- 画面の大きさに UI を合わせる ----
function layoutUI() {
  const vw = innerWidth, vh = innerHeight;
  const VW = tuning.view.w, VH = tuning.view.h;
  const s = Math.min(vw / VW, vh / VH), dpr = Math.min(devicePixelRatio || 1, 2);
  const sd = s * dpr; // renderer.js と同じ決め方
  const sc = sd >= 1 && Math.floor(sd) / sd >= 0.85 ? Math.floor(sd) / dpr : s;
  const w = VW * sc, h = VH * sc;
  const ui = $('ui');
  Object.assign(ui.style, { left: `${(vw - w) / 2}px`, top: `${(vh - h) / 2}px`, width: `${w}px`, height: `${h}px` });
  ui.style.setProperty('--gh', `${h}px`);
  const touch = matchMedia('(pointer: coarse)').matches;
  $('pad').hidden = !(touch || input.device === 'touch') || !['stage', 'map'].includes(scene);
  $('rotate').hidden = !(touch && vh > vw);
}
addEventListener('resize', layoutUI);

// ---- メニュー（キー・パッド・タップ共通） ----
let menu = null; // { el, idx, onPick, onBack }
function openMenu(el, onPick, onBack) {
  const btns = [...el.querySelectorAll('button')].filter(b => !b.disabled && !b.hidden);
  menu = { el, btns, idx: 0, onPick, onBack };
  btns.forEach((b, i) => { b.onclick = () => { sfx.unlock(); menu = { ...menu, idx: i }; pick(); }; });
  markMenu();
}
function markMenu() { menu?.btns.forEach((b, i) => b.classList.toggle('sel', i === menu.idx)); }
function pick() { if (!menu) return; const b = menu.btns[menu.idx]; sfx.play('ok'); const m = menu; menu = null; m.onPick(b.dataset.act, b); }
function menuInput() {
  if (!menu) return;
  if (input.pressed('u') || input.pressed('l')) { menu.idx = (menu.idx + menu.btns.length - 1) % menu.btns.length; markMenu(); sfx.play('select'); }
  if (input.pressed('d') || input.pressed('r')) { menu.idx = (menu.idx + 1) % menu.btns.length; markMenu(); sfx.play('select'); }
  if (input.pressed('j') || input.pressed('start')) pick();
  else if (input.pressed('b') && menu.onBack) { const m = menu; menu = null; sfx.play('select'); m.onBack(); }
}
const show = (id, on = true) => { $(id).hidden = !on; };
const hideAll = () => ['title', 'story', 'tsuzuku', 'maptotal', 'mapcard', 'hud', 'boss', 'intro', 'pause', 'mappause', 'result', 'help'].forEach(id => show(id, false));

// ---- 場面 ----
let scene = 'title';
let titleState = null, titleT = 0;
function toTitle() {
  scene = 'title'; hideAll(); show('title');
  titleState = createStage(levelOf('1-1'), tuning); renderer.setLevel(levelOf('1-1'));
  const cont = $('title').querySelector('[data-act="continue"]');
  cont.hidden = !saved.prog.seenIntro;
  sfx.music('title');
  openMenu($('title-menu'), act => {
    sfx.unlock();
    if (act === 'new') { saved = { v: 2, muted: saved.muted, prog: emptyProgress() }; wipe(); save(saved); startStory('intro'); }
    else if (act === 'continue') toMap();
    else if (act === 'help') showHelp(toTitle);
  });
  layoutUI();
}
function showHelp(back) {
  show('help');
  openMenu($('help-menu'), () => { show('help', false); back(); }, () => { show('help', false); back(); });
}

let story = null;
function startStory(kind) {
  scene = 'story'; hideAll(); show('story');
  story = { kind, pages: text[kind], i: 0, t: 0 };
  sfx.music(kind === 'ending' ? 'ending' : 'map');
  setStoryPage();
  $('story').querySelector('.skip').onclick = () => endStory();
  log('story', { kind });
}
function setStoryPage() { $('story-text').textContent = story.pages[story.i].text; story.t = 0; }
function nextStory() {
  sfx.play('select');
  if (++story.i >= story.pages.length) return endStory();
  setStoryPage();
}
function endStory() {
  if (story.kind === 'intro') { saved.prog.seenIntro = true; save(saved); toMap(); }
  else {
    saved.prog.seenEnding = true; save(saved);
    scene = 'tsuzuku'; hideAll(); show('tsuzuku'); story.t = 0;
    log('ending');
  }
}

// 地図
let mapS = null;
function toMap(newEdges = []) {
  scene = 'map'; hideAll(); show('mapcard'); show('maptotal');
  const at = world.nodes.some(n => n.id === saved.prog.at) ? saved.prog.at : 'home';
  mapS = { at, move: null, sewing: newEdges.map(e => ({ edge: e, t: 0 })), t: 0, face: 1 };
  sfx.music('map');
  updateMapCard();
  layoutUI();
}
function updateMapCard() {
  const n = world.nodes.find(x => x.id === mapS.at);
  const st = saved.prog.stages[n.stage];
  $('map-name').textContent = n.stage ? (text.stages[n.stage]?.name ?? n.stage) : n.name;
  $('map-num').textContent = n.stage ? (n.kind === 'fort' ? '1-砦' : n.secret ? '1-ひみつ' : n.stage) + (stages[n.stage] ? '' : '（準備中）') : '出発点';
  $('map-medals').hidden = !n.stage;
  [...$('map-medals').children].forEach((i, k) => i.classList.toggle('on', !!st?.medals[k]));
  $('map-best').textContent = st?.best != null ? `記録 ${fmt(st.best)}` : '';
  const total = Object.keys(stages).length * 3;
  $('maptotal').textContent = `金ボタン ${medalTotal(saved.prog)}／${total}　糸玉 ${saved.prog.coins}`;
}
function mapUpdate(dt) {
  const m = mapS; m.t += dt;
  if (m.sewing.length) {
    const sw = m.sewing[0]; sw.t += dt / 1.4;
    if (Math.floor(sw.t * 40) !== Math.floor((sw.t - dt / 1.4) * 40)) sfx.play('sew');
    if (sw.t >= 1) m.sewing.shift();
    return;
  }
  if (m.move) {
    m.move.t += dt / 0.42;
    if (m.move.t >= 1) { m.at = m.move.to; m.move = null; saved.prog.at = m.at; save(saved); updateMapCard(); sfx.play('step'); }
    return;
  }
  const h = input.held;
  const dir = { x: (h.r ? 1 : 0) - (h.l ? 1 : 0), y: (h.d ? 1 : 0) - (h.u ? 1 : 0) };
  if (dir.x || dir.y) {
    const to = moveFrom(world, saved.prog, m.at, dir);
    if (to) {
      const e = world.edges.find(e => (e.a === m.at && e.b === to) || (e.b === m.at && e.a === to));
      m.move = { to, t: 0, edge: e, rev: e.b === m.at };
      const a = world.nodes.find(n => n.id === m.at), b = world.nodes.find(n => n.id === to);
      m.face = b.x >= a.x ? 1 : -1;
    }
  }
  if (input.pressed('j')) {
    const n = world.nodes.find(x => x.id === m.at);
    if (n.stage && stages[n.stage]) enterStage(n.stage);
  }
  if (input.pressed('start')) {
    scene = 'mappause'; show('mappause'); soundLabel();
    openMenu($('mappause-menu'), act => {
      if (act === 'resume') { show('mappause', false); scene = 'map'; }
      else if (act === 'sound') { toggleSound(); scene = 'map'; show('mappause', false); }
      else if (act === 'help') { show('mappause', false); showHelp(() => { scene = 'map'; }); scene = 'help'; }
      else if (act === 'title') toTitle();
    }, () => { show('mappause', false); scene = 'map'; });
  }
}
function mapDraw(t) {
  const m = mapS;
  const sewing = m.sewing[0];
  mapView.drawWorld(sewing ? { ...saved.prog } : saved.prog, t, sewing ? { sewing: { edge: sewing.edge, t: sewing.t } } : {});
  let x, y, hop = 0;
  const node = id => world.nodes.find(n => n.id === id);
  if (m.move) {
    const q = mapView.curve(m.move.edge);
    const tt = m.move.rev ? 1 - m.move.t : m.move.t;
    ({ x, y } = mapView.at(q, tt)); hop = (m.move.t * 3) % 1;
  } else { x = node(m.at).x; y = node(m.at).y; }
  // 取り戻した結び玉の分だけ、ヌイばあが針箱のそばに縫い戻っている（ワールド1: 手）
  if (saved.prog.seenEnding) { const h = world.nodes.find(n => n.id === 'home'); mapView.drawHand(h.x + 4, h.y - 22, 1, 1); }
  mapView.drawToken(x, y - 4, t, m.face, hop);
  renderer.presentBig();
}

// ステージ
let S = null, stageId = null, introT = 0, botPlan = null, botStep = 0, lastHud = '';
function enterStage(id, opts = {}) {
  stageId = id; scene = 'stage'; hideAll(); show('hud');
  const L = levelOf(id);
  S = createStage(L, tuning, opts.carry ?? {});
  renderer.setLevel(L);
  introT = opts.noIntro ? 99 : 0;
  $('intro-num').textContent = id === '1-F' ? 'ワールド1　砦' : id === '1-S' ? 'ワールド1　ひみつ' : `ワールド ${id}`;
  $('intro-name').textContent = text.stages[id]?.name ?? id;
  $('intro-hint').textContent = text.stages[id]?.hint ?? '';
  show('intro', !opts.noIntro);
  $('h-stage').textContent = text.stages[id]?.name ?? id;
  sfx.music(stages[id].music ?? 'meadow');
  lastHud = '';
  log('start', { stage: id });
  layoutUI();
}
function stageUpdate(dt) {
  if (input.pressed('start') && S.status === 'play') return openPause();
  introT += dt;
  if (introT > 2.2) show('intro', false);
  acc += dt;
  while (acc >= DT) {
    acc -= DT;
    const held = botPlan ? botPlan(botStep++) : input.held;
    const evs = step(S, held);
    if (evs.length) handleEvents(evs);
    if (scene !== 'stage') break;
  }
}
function handleEvents(evs) {
  renderer.onEvents(evs, S);
  for (const e of evs) {
    switch (e.type) {
      case 'land': sfx.play('land', { k: Math.min(1, e.v / 330) }); break;
      case 'stomp': sfx.play('stomp', { combo: e.combo }); break;
      case 'kill': sfx.play('stomp', { combo: 1 }); break;
      case 'die': sfx.play('die'); navigator.vibrate?.(80); log('fail', { stage: stageId, by: e.by, x: Math.round(S.p.x / 16), score: Math.round(S.p.x / 16) }); break;
      case 'respawn': log('retry', { stage: stageId }); break;
      case 'medal': sfx.play('medal'); log('medal', { stage: stageId, idx: e.idx }); break;
      case 'checkpoint': sfx.play('checkpoint'); log('checkpoint', { stage: stageId, idx: e.idx }); break;
      case 'clear': sfx.play(e.exit === 'knot' ? 'knot' : 'clear'); sfx.music(null); log('clear', { stage: stageId, exit: e.exit, time: +e.time.toFixed(2), deaths: e.deaths, medals: e.medals.filter(Boolean).length }); break;
      case 'finished': showResult(); break;
      case 'bossintro': sfx.music('boss'); break;
      case 'arenaLock': sfx.music(null); break;
      case 'powerdown': sfx.play('powerdown'); navigator.vibrate?.(40); break;
      case 'knotDrop': sfx.play('power'); break;
      default: sfx.play(e.type);
    }
  }
}
function hud() {
  const key = `${S.coins}|${S.medals.join()}|${S.boss?.hp}|${S.boss?.awake}`;
  if (key === lastHud) return; lastHud = key;
  $('h-coins').textContent = S.coins;
  [...$('h-medals').children].forEach((i, k) => i.classList.toggle('on', !!S.medals[k]));
  const b = S.boss;
  show('boss', !!(b && b.awake && b.hp > 0));
  if (b) $('boss-hp').innerHTML = Array.from({ length: tuning.boss.hp }, (_, i) => `<b class="${i < b.hp ? '' : 'off'}"></b>`).join('');
}
function openPause() {
  scene = 'pause'; show('pause'); soundLabel();
  openMenu($('pause-menu'), act => {
    show('pause', false); scene = 'stage';
    if (act === 'retry') { const c = { checkpoint: S.checkpoint, taken: S.taken, medals: S.medals, coins: S.coins, deaths: S.deaths + 1, time: S.time }; enterStage(stageId, { carry: c, noIntro: true }); }
    else if (act === 'map') { leaveStage(null); }
    else if (act === 'sound') { toggleSound(); }
    else if (act === 'help') { scene = 'help'; showHelp(() => { scene = 'stage'; }); }
  }, () => { show('pause', false); scene = 'stage'; });
}
function leaveStage(exit) {
  const r = { exit, medals: S.medals, coins: S.coins, deaths: S.deaths, time: S.time };
  const newEdges = recordResult(world, saved.prog, stageId, r);
  saved.prog.at = world.nodes.find(n => n.stage === stageId)?.id ?? saved.prog.at;
  save(saved);
  if (exit === 'knot' && !saved.prog.seenEnding) return startStory('ending');
  toMap(newEdges);
}
let resultBest = null;
function showResult() {
  scene = 'result';
  const prev = saved.prog.stages[stageId]?.best;
  const time = S.time;
  $('r-title').textContent = S.exit === 'secret' ? 'ひみつの出口を見つけた' : S.exit === 'knot' ? '結び玉をとりもどした' : (text.stages[stageId]?.name ?? '') + '　クリア';
  $('r-time').textContent = fmt(time);
  const isNew = prev == null || time < prev;
  $('r-best').innerHTML = isNew ? `<span class="new">${fmt(time)}（新記録）</span>` : fmt(prev);
  $('r-medals').textContent = `${S.medals.filter(Boolean).length} / ${S.medals.length}`;
  $('r-coins').textContent = S.coins;
  $('r-deaths').textContent = `${S.deaths} 回`;
  show('result');
  openMenu($('result-menu'), act => {
    show('result', false);
    if (act === 'again') { const id = stageId; recordResult(world, saved.prog, id, { exit: S.exit, medals: S.medals, coins: S.coins, deaths: S.deaths, time: S.time }); save(saved); enterStage(id); }
    else leaveStage(S.exit);
  });
}
const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}.${String(Math.floor((s % 1) * 10))}`;
function soundLabel() { document.querySelectorAll('[data-act="sound"]').forEach(b => { b.textContent = `音: ${saved.muted ? 'なし' : 'あり'}`; }); }
function toggleSound() { saved.muted = !saved.muted; sfx.setMuted(saved.muted); save(saved); soundLabel(); }

// ---- ループ ----
let acc = 0, last = performance.now(), wall = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now; wall += dt;
  input.poll();
  if (input.device === 'touch' && $('pad').hidden && ['stage', 'map'].includes(scene)) layoutUI();
  menuInput();
  switch (scene) {
    case 'title':
      titleT += dt; titleState.cam.x = 40 + Math.sin(titleT * 0.15) * 30;
      renderer.draw(titleState, dt, wall); break;
    case 'story':
      story.t += dt;
      mapView.drawScene(story.pages[story.i].scene, saved.prog, wall, story.t); renderer.presentBig();
      if ((input.pressed('j') || input.pressed('start')) && story.t > 0.25) nextStory();
      break;
    case 'tsuzuku':
      story.t += dt; mapView.drawScene('drift', saved.prog, wall, 6 + story.t); renderer.presentBig();
      if (story.t > 1.5 && (input.pressed('j') || input.pressed('start'))) toMap();
      break;
    case 'map': mapUpdate(dt); mapDraw(wall); break;
    case 'mappause': case 'help':
      if (S && $('hud').hidden === false) renderer.draw(S, 0, wall); else mapDraw(wall);
      break;
    case 'stage': stageUpdate(dt); if (scene === 'stage' || scene === 'result') { renderer.draw(S, dt, wall); hud(); } break;
    case 'pause': renderer.draw(S, 0, wall); break;
    case 'result': acc += dt; while (acc >= DT) { acc -= DT; step(S, {}); } renderer.draw(S, dt, wall); break;
  }
  requestAnimationFrame(frame);
}
addEventListener('pointerdown', () => sfx.unlock(), { once: false });
addEventListener('keydown', () => sfx.unlock());
document.addEventListener('visibilitychange', () => { last = performance.now(); acc = 0; if (document.hidden && scene === 'stage' && S.status === 'play') openPause(); });

toTitle();
requestAnimationFrame(frame);

// ---- playtester / ボット用フック ----
window.__GS__ = {
  version: 2,
  get state() { return S ? { scene, stage: stageId, x: S.p.x, y: S.p.y, status: S.status, deaths: S.deaths, medals: S.medals, time: S.time, coins: S.coins } : { scene }; },
  events,
  get running() { return scene === 'stage' && S?.status === 'play'; },
  get scene() { return scene; },
  setPlayerSprite: sp => renderer.setPlayerSprite(sp),
  enterStage: (id, carry) => { sfx.unlock(); enterStage(id, { carry, noIntro: true }); },
  toMap: () => toMap(),
  // 操作列（ステップ番号 → 押されているボタン）で、本物のループのまま遊ばせる
  setPlan: fn => { botPlan = fn; botStep = 0; acc = 0; },
  clearPlan: () => { botPlan = null; },
  progress: () => saved.prog,
  bot: {
    actions: () => (scene === 'stage' ? ['r', 'rj', 'rb', 'rbj', 'l', 'j', 'none'] : ['start']),
    press: a => {
      if (a === 'start' || a === 'retry') { if (scene !== 'stage') enterStage('1-1', { noIntro: true }); return; }
      const h = { r: a.includes('r'), l: a === 'l', j: a.includes('j'), b: a.includes('b') };
      botPlan = () => h;
    },
    release: () => { botPlan = null; },
  },
};
