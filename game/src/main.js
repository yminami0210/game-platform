// 起動・ゲームループ・UI・__GS__ の公開。
import { createGame, step, actions } from './core/game.js';
import { createRenderer } from './render/renderer.js';
import { createInput } from './input/input.js';
import * as sfx from './audio/sfx.js';
import { load, save } from './save.js';

const data = await (await fetch('src/data/balance.json')).json();
const $ = id => document.getElementById(id);
const canvas = $('stage');
const renderer = createRenderer(canvas);
const input = createInput(canvas);
const saved = load();
const DT = 1 / 60;
let state = createGame({ seed: 1, data }); state.alive = false;
let botAction = null;
let running = false, acc = 0, last = performance.now(), bestShown = saved.best;
const events = [];
const t0 = performance.now();
const log = (type, extra = {}) => events.push({ ...extra, type, t: (performance.now() - t0) / 1000 }); // t は実時間（秒）
$('best').textContent = `BEST ${bestShown}`;

function start() {
  sfx.unlock(); sfx.play('start');
  state = createGame({ seed: (Date.now() & 0xffffffff) >>> 0, data });
  running = true; $('title').hidden = true; $('result').hidden = true;
  log(events.some(e => e.type === 'start') ? 'retry' : 'start');
}
function handle(evs) {
  for (const e of evs) {
    log(e.type, e);
    if (e.type === 'score') { $('score').textContent = e.value; sfx.play('score', { pitch: 1 + Math.min(1, e.value / 50) }); }
    if (e.type === 'fail') {
      running = false; renderer.hit(); sfx.play('fail'); navigator.vibrate?.(60);
      if (e.score > saved.best) { saved.best = e.score; save(saved); $('best').textContent = `BEST ${saved.best}`; }
      $('final').textContent = `${e.score} よけた`; $('result').hidden = false;
    }
  }
}
$('start').onclick = start; $('retry').onclick = start;

function frame(now) {
  let dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (running) { acc += dt; while (acc >= DT) { handle(step(state, botAction ?? input.action, DT)); acc -= DT; } }
  renderer.draw(state, dt);
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
