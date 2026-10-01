// 起動・ゲームループ・UI・__GS__ の公開。
import { createGame, step, actions, layerNamesOf } from './core/game.js';
import { createRenderer } from './render/renderer.js';
import { createInput } from './input/input.js';
import * as sfx from './audio/sfx.js';
import { load, save } from './save.js';
import { createScreens } from './ui/screens.js';

// data/ の JSON が増えたらここと sw.js に足す（simulate.mjs と同じく、複数なら ファイル名キー で core に渡る）
const DATA_FILES = ['balance', 'layers'];
const data = Object.fromEntries(await Promise.all(DATA_FILES.map(async n => [n, await (await fetch(`src/data/${n}.json`)).json()])));
const names = layerNamesOf(data);
const $ = id => document.getElementById(id);
const canvas = $('stage');
const renderer = createRenderer(canvas);
const saved = load();
const DT = 1 / 60;
let state = createGame({ seed: 1, data }); // タイトルでも群れの光を見せる
const input = createInput(canvas, { getX: () => state.x, unitPx: () => renderer.unitPx() });
let botAction = null;
let running = false, acc = 0, last = performance.now();
const events = [];
const t0 = performance.now();
const log = (type, extra = {}) => events.push({ ...extra, type, t: (performance.now() - t0) / 1000 }); // t は実時間（秒）
$('best').textContent = `ベスト ${saved.best}`;
let maxN = 0;
sfx.setMuted(!!saved.muted); renderer.setReducedMotion(!!saved.calm);
const screens = await createScreens({
  root: $('screens'), saved, persist: () => save(saved), names,
  onStart: () => start(), onMute: m => sfx.setMuted(m), onReduce: v => { renderer.setReducedMotion(v); document.documentElement.classList.toggle('calm', v); },
  onReset: () => { saved.best = 0; saved.dex = []; save(saved); $('best').textContent = 'ベスト 0'; },
});
document.documentElement.classList.toggle('calm', !!saved.calm);
screens.show('title');

function start() {
  sfx.unlock(); sfx.play('start');
  state = createGame({ seed: (Date.now() & 0xffffffff) >>> 0, data });
  running = true; acc = 0; maxN = 0; screens.show('none');
  $('score').textContent = '0';
  log(events.some(e => e.type === 'start') ? 'retry' : 'start');
}
function handle(evs) {
  for (const e of evs) {
    if (e.type !== 'score' && e.type !== 'gate') log(e.type, e);
    renderer.event(e, state);
    if (e.type === 'score') $('score').textContent = e.value;
    if (e.type === 'pickup') { sfx.play('pickup', { pitch: 1 + e.n * 0.1 }); saved.vibe !== false && navigator.vibrate?.(10); }
    if (e.type === 'scatter') { sfx.play('scatter'); saved.vibe !== false && navigator.vibrate?.(25); }
    if (e.type === 'fail') {
      running = false; sfx.play('fail');
      const newBest = e.score > saved.best;
      if (newBest) { saved.best = e.score; save(saved); $('best').textContent = `ベスト ${saved.best}`; screens.setBest(saved.best); }
      setTimeout(() => { if (!running) screens.showResult({ score: e.score, layer: e.layer, flowers: state.flowersLit ?? 0, maxN, newBest }); }, 900); // 光が溶けて静まる余韻
    }
  }
}

function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (running) {
    acc += dt;
    while (acc >= DT && running) { handle(step(state, botAction ?? input.action(state.x), DT)); acc -= DT; }
  }
  if (running) maxN = Math.max(maxN, state.N);
  renderer.draw(state, dt);
  $('layer').textContent = names[Math.min(names.length - 1, state.layer)] ?? '';
  $('count').textContent = state.alive ? state.N : 0;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
document.addEventListener('visibilitychange', () => { last = performance.now(); acc = 0; });

// playtester / balance 用フック
window.__GS__ = {
  version: 1,
  get state() { return state; },
  events,
  get running() { return running; },
  // ボットは「押しっぱなしの入力」を差し替えるだけ。実際のゲームループで遊ぶ。
  bot: {
    actions: () => (running ? actions(state) : ['start']),
    press: a => { if (a === 'start' || a === 'retry') { if (!running) start(); return; } botAction = a; },
    release: () => { botAction = null; },
  },
};
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js');
