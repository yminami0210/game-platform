// 起動・ゲームループ・UI・__GS__ の公開。
import { createGame, step, actions, layerNamesOf } from './core/game.js';
import { createRenderer } from './render/renderer.js';
import { createInput } from './input/input.js';
import * as sfx from './audio/sfx.js';
import * as bgm from './audio/bgm.js';
import { load, save, migrate } from './save.js';
import { createScreens } from './ui/screens.js';
import { advance } from './core/loop.js';

// data/ の JSON が増えたらここと sw.js に足す（simulate.mjs と同じく、複数なら ファイル名キー で core に渡る）
const DATA_FILES = ['balance', 'layers', 'creatures', 'colors', 'texts'];
const data = Object.fromEntries(await Promise.all(DATA_FILES.map(async n => [n, await (await fetch(`src/data/${n}.json`)).json()])));
const names = layerNamesOf(data);
const colors = data.colors.list;
const tutorialText = data.texts.tutorial;
const $ = id => document.getElementById(id);
const canvas = $('stage');
const renderer = createRenderer(canvas);
const saved = load();
const DT = 1 / 60;
let state = createGame({ seed: 1, data }); // タイトルでも群れの光を見せる
const input = createInput(canvas, { getX: () => state.x, unitPx: () => renderer.unitPx() });
let botAction = null;
let running = false, paused = false, banked = 0, resultTimer = 0, acc = 0, last = performance.now();
const events = [];
const t0 = performance.now();
const log = (type, extra = {}) => events.push({ ...extra, type, t: (performance.now() - t0) / 1000 }); // t は実時間（秒）
const vibe = ms => saved.vibe !== false && navigator.vibrate?.(ms);
$('best').textContent = `ベスト ${saved.best}`;
sfx.setMuted(!!saved.muted); bgm.setMuted(!!saved.muted); renderer.setReducedMotion(!!saved.calm);

// 群れの色: 灯した花の累計で解放（見た目のみ）
const unlockColors = () => { for (const c of colors) if (saved.flowersTotal >= c.unlockFlowers && !saved.colorsUnlocked.includes(c.id)) saved.colorsUnlocked.push(c.id); };
const applyColor = () => renderer.setColor((colors.find(c => c.id === saved.color) ?? colors[0]).hex);
unlockColors(); applyColor();

const screens = await createScreens({
  root: $('screens'), saved, persist: () => save(saved), names,
  onStart: () => start(), onMute: m => { sfx.setMuted(m); bgm.setMuted(m); },
  onReduce: v => { renderer.setReducedMotion(v); document.documentElement.classList.toggle('calm', v); },
  onReset: () => {
    Object.assign(saved, migrate({ muted: saved.muted, vibe: saved.vibe, calm: saved.calm })); // 設定は残して記録だけ消す
    save(saved); applyColor(); drawColors(); $('best').textContent = 'ベスト 0';
  },
});
document.documentElement.classList.toggle('calm', !!saved.calm);

// タイトルの色えらび（ホタル色のまるいボタン。未解放は薄く押せない）
const colorRow = document.createElement('div'); colorRow.id = 'colors'; colorRow.setAttribute('role', 'group');
document.querySelector('#s-title .low')?.insertBefore(colorRow, document.getElementById('t-best'));
function drawColors() {
  colorRow.innerHTML = '';
  for (const c of colors) {
    const b = document.createElement('button'), ok = saved.colorsUnlocked.includes(c.id);
    b.style.setProperty('--c', c.hex); b.disabled = !ok; b.setAttribute('aria-pressed', saved.color === c.id);
    b.setAttribute('aria-label', ok ? c.name : `${c.name}（ねむり花 ${c.unlockFlowers}）`);
    b.onclick = () => { saved.color = c.id; save(saved); applyColor(); drawColors(); };
    colorRow.appendChild(b);
  }
}
drawColors();
screens.show('title');

function start() {
  sfx.unlock(); const a = sfx.getAudio(); if (a) { bgm.initBgm(a.ctx, a.masterGain); bgm.startBgm(0); }
  sfx.play('start');
  state = createGame({ seed: (Date.now() & 0xffffffff) >>> 0, data, tutorial: !saved.tutorialDone, meta: { flowersTotal: saved.flowersTotal } });
  clearTimeout(resultTimer); resultTimer = 0; banked = 0;
  running = true; acc = 0; screens.show('none'); setPaused(false);
  $('score').textContent = '0';
  log(events.some(e => e.type === 'start') ? 'retry' : 'start');
}
function handle(evs) {
  for (const e of evs) {
    if (e.type !== 'score' && e.type !== 'gate') log(e.type, e);
    renderer.event(e, state);
    if (e.type === 'score') $('score').textContent = e.value;
    else if (e.type === 'pickup') { sfx.play('pickup', { pitch: 1 + e.n * 0.1 }); vibe(10); }
    else if (e.type === 'scatter') { sfx.play('scatter'); vibe(25); }
    else if (e.type === 'gate') sfx.play('gate');
    else if (e.type === 'bloom') {
      sfx.play('bloom'); vibe([15, 30, 15]);
      const d = state.flowersLit - banked; // ラン途中でも花の累計を保存
      if (d > 0) { banked += d; saved.flowersTotal += d; unlockColors(); save(saved); }
    }
    else if (e.type === 'puddle') sfx.play('puddle');
    else if (e.type === 'layer') { sfx.play('layer'); bgm.setBgmLayer(e.index - 1); }
    else if (e.type === 'creature') {
      if (!saved.dex.includes(e.id)) { saved.dex.push(e.id); save(saved); sfx.play('bloom', { pitch: 1.4 }); }
    } else if (e.type === 'fail') {
      running = false; sfx.play('fail'); bgm.stopBgm();
      const newBest = e.score > saved.best;
      if (newBest) saved.best = e.score;
      saved.bestLayer = Math.max(saved.bestLayer, e.layer);
      saved.flowersTotal += Math.max(0, state.flowersLit - banked); banked = state.flowersLit; saved.tutorialDone = true; unlockColors();
      save(saved); $('best').textContent = `ベスト ${saved.best}`; screens.setBest(saved.best);
      drawColors();
      const res = { score: e.score, layer: e.layer, flowers: state.flowersLit, maxN: state.maxN, newBest };
      const showIt = () => { document.removeEventListener('pointerdown', showIt); if (!resultTimer) return; clearTimeout(resultTimer); resultTimer = 0; if (!running) screens.showResult(res); };
      resultTimer = setTimeout(showIt, 900); // 光が溶けて静まる余韻（タップでスキップ）
      setTimeout(() => { if (resultTimer) document.addEventListener('pointerdown', showIt, { once: true }); }, 250); // 失敗直前の連打で飛ばさない
    }
  }
}

// チュートリアルの吹き出し（初回のみ。止めない）
const hint = $('hint');
function updateHint() {
  const i = running && state.tutorial && state.passed < 3 ? state.passed : -1;
  const txt = i >= 0 ? tutorialText[i] ?? '' : '';
  if (hint.textContent !== txt) hint.textContent = txt;
  hint.hidden = !txt;
}

function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (running) {
    const r = advance(acc, dt, paused, DT); acc = r.acc;
    for (let i = 0; i < r.steps && running; i++) handle(step(state, botAction ?? input.action(state.x), DT));
    if (running && state.tutorial && state.passed >= 3 && !saved.tutorialDone) { saved.tutorialDone = true; save(saved); }
  }
  updateHint();
  renderer.draw(state, dt);
  $('layer').textContent = names[Math.min(names.length - 1, state.layer)] ?? '';
  $('count').textContent = state.alive ? state.N : 0;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// 一時停止（running は保ったまま paused で step を止める）
const pauseEl = $('pause');
function setPaused(p) {
  if (p && !running) return;
  paused = p; pauseEl.hidden = !p; $('b-pause').hidden = p || !running;
  const a = sfx.getAudio(); if (a?.ctx) (p ? a.ctx.suspend() : a.ctx.resume()).catch?.(() => {});
  last = performance.now(); acc = 0;
}
$('b-pause').onclick = () => setPaused(true);
$('p-resume').onclick = () => setPaused(false);
$('p-title').onclick = () => { running = false; setPaused(false); bgm.stopBgm(); screens.show('title'); };
document.addEventListener('visibilitychange', () => { if (document.hidden) setPaused(true); last = performance.now(); acc = 0; });

// playtester / balance 用フック
window.__GS__ = {
  version: 1,
  get state() { return state; },
  events,
  get running() { return running; },
  get paused() { return paused; },
  // ボットは「押しっぱなしの入力」を差し替えるだけ。実際のゲームループで遊ぶ。
  bot: {
    actions: () => (running ? actions(state) : ['start']),
    press: a => { if (a === 'start' || a === 'retry') { if (paused) setPaused(false); else if (!running) start(); return; } botAction = a; },
    release: () => { botAction = null; },
  },
};
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js');
