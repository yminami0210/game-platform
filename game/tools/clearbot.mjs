// クリア確認ボット: ステージの JSON を読み、本物の core（物理・敵）を回しながら
// 「8フレームずつのボタン操作」を A* で探して、ゴール（または金ボタン・隠し出口・ボス撃破）まで到達できるか確かめる。
//   node game/tools/clearbot.mjs [ステージID...] [--medals] [--json]
// ライブラリとしても使う: import { solve, loadStage } from './clearbot.mjs'
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseLevel } from '../src/core/level.js';
import { createStage, step, clone } from '../src/core/stage.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = join(HERE, '../src/data');
export const tuning = JSON.parse(readFileSync(join(DATA, 'tuning.json'), 'utf8'));
export function loadStage(id) { return parseLevel(JSON.parse(readFileSync(join(DATA, 'stages', `${id}.json`), 'utf8'))); }
export function stageIds() { return JSON.parse(readFileSync(join(DATA, 'stages', 'index.json'), 'utf8')); }

const MACRO = 8;
let KX = 6, KT = 60; // 状態をまとめる細かさ（位置 px・時間 フレーム）
export function setKey(kx, kt) { KX = kx; KT = kt; }
const ACTS = [];
for (const dir of [1, 0, -1]) for (const j of [false, true]) for (const b of [false, true]) {
  if (dir === 0 && b) continue;
  ACTS.push({ l: dir < 0, r: dir > 0, u: false, d: false, j, b });
}

class Heap {
  constructor() { this.a = []; }
  push(x) { const a = this.a; a.push(x); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p].f <= a[i].f) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
  pop() { const a = this.a; const top = a[0], last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < a.length && a[l].f < a[m].f) m = l; if (r < a.length && a[r].f < a[m].f) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } } return top; }
  get size() { return this.a.length; }
}

// target: { kind: 'goal'|'secret'|'medal'|'boss', idx? }
export function solve(level, { target = { kind: 'goal' }, maxNodes = 120000, carry = {}, weight = 1.6, start = null } = {}) {
  const s0 = start ? clone(start) : createStage(level, tuning, carry);
  const R = tuning.player.runMax / 60; // px/frame
  const gx = targetPoint(level, target);
  const done = s => {
    if (target.kind === 'medal') return s.medals[target.idx];
    if (target.kind === 'point') return Math.abs(s.p.x + 5 - target.x) < 9 && Math.abs(s.p.y + s.p.h - target.y) < 6 && s.status === 'play';
    if (target.kind === 'boss') return s.status === 'clear' && s.exit === 'knot';
    return s.status === 'clear' && s.exit === target.kind;
  };
  const h = s => {
    if (target.kind === 'boss' && s.boss) {
      const b = s.boss;
      if (b.knot) return Math.hypot(b.knot.x - s.p.x, b.knot.y - s.p.y) / R;
      return b.hp * 400 + (s.lock ? 0 : Math.abs(gx.x - s.p.x) / R);
    }
    const dx = Math.abs(gx.x - (s.p.x + 5)), dy = gx.y - (s.p.y + 7);
    return (dx + Math.max(0, -dy) * 0.5 + Math.max(0, dy) * 0.25) / R;
  };
  const seen = new Map();
  const heap = new Heap();
  heap.push({ s: s0, g: 0, f: h(s0), path: null });
  let nodes = 0, best = null;
  while (heap.size && nodes < maxNodes) {
    const n = heap.pop(); nodes++;
    for (let ai = 0; ai < ACTS.length; ai++) {
      const a = ACTS[ai];
      const c = clone(n.s);
      let died = false, ok = false;
      for (let k = 0; k < MACRO; k++) {
        step(c, a);
        if (c.status === 'dead') { died = true; break; }
        if ((target.kind !== 'point' || k === MACRO - 1) && done(c)) { ok = true; break; }
      }
      const path = { a: ai, prev: n.path };
      if (ok) return { ok: true, nodes, frames: n.g + MACRO, path: unwind(path), state: c };
      if (died) continue;
      const p = c.p;
      const key = `${Math.round(p.x / KX)},${Math.round(p.y / KX)},${Math.round(p.vx / 30)},${Math.round(p.vy / 60)},${p.power ? 1 : 0},${c.sw},${Math.floor(c.frame / KT)},${c.boss ? c.boss.hp + c.boss.mode : ''}`;
      const g = n.g + MACRO;
      if (seen.has(key) && seen.get(key) <= g) continue;
      seen.set(key, g);
      const hv = h(c);
      if (!best || hv < best.h) best = { h: hv, x: p.x, y: p.y };
      heap.push({ s: c, g, f: g + weight * hv, path });
    }
  }
  return { ok: false, nodes, best };
}

function unwind(p) { const out = []; while (p) { out.push(p.a); p = p.prev; } return out.reverse(); }

function targetPoint(level, target) {
  const e = level.ents;
  if (target.kind === 'point') return { x: target.x, y: target.y };
  if (target.kind === 'medal') { const m = e.find(x => x.kind === 'medal' && x.idx === target.idx); return { x: m.x + 8, y: m.y + 8 }; }
  if (target.kind === 'boss') { const a = e.find(x => x.kind === 'arena') ?? e.find(x => x.kind === 'boss'); return { x: a.x + 40, y: a.y }; }
  const g = e.find(x => x.kind === (target.kind === 'secret' ? 'secret' : 'goal'));
  return { x: g.x + 8, y: g.y };
}

// 金ボタンなど: 直接届かなければ、近くの「飛ばしてくれる物」（ばね・蒸気・足場）を経由して探す
export function solveVia(level, target, opts = {}) {
  const direct = solve(level, { target, maxNodes: opts.direct ?? 120000 });
  if (direct.ok) return direct;
  const tp = targetPoint(level, target);
  const launchers = level.ents.filter(e => ['spring', 'vent', 'moverH', 'moverV', 'switch'].includes(e.kind))
    .map(e => ({ e, d: Math.hypot(e.x + 8 - tp.x, e.y - tp.y) })).filter(o => o.d < 16 * 18).sort((a, b) => a.d - b.d).slice(0, 4);
  let nodes = direct.nodes;
  for (const { e } of launchers) {
    const pt = e.kind === 'moverH' || e.kind === 'moverV' ? { kind: 'point', x: e.x + 24, y: e.y } : { kind: 'point', x: e.x + 8, y: e.kind === 'spring' ? e.y + 9 : e.y + 16 };
    const a = solve(level, { target: pt, maxNodes: 60000 });
    nodes += a.nodes;
    if (!a.ok) continue;
    const b = solve(level, { target, maxNodes: 60000, start: a.state });
    nodes += b.nodes;
    if (b.ok) return { ok: true, nodes, frames: a.frames + b.frames, path: [...a.path, ...b.path], via: e.kind };
  }
  return { ...direct, nodes };
}

// ボス戦: A* で闘技場に入り、そこからは「先を少し読んで一番よい操作」を選び続ける
function evalBoss(c) {
  if (c.status === 'dead') return -1e9;
  if (c.status === 'clear') return 1e9;
  const b = c.boss, p = c.p;
  let v = (tuning.boss.hp - b.hp) * 1e5;
  const px = p.x + p.w / 2, py = p.y + p.h;
  if (b.knot) return v + 5e4 - Math.hypot(b.knot.x + 7 - px, b.knot.y + 7 - py);
  const bx = b.x + b.w / 2;
  if (b.mode === 'rest') v += 2000 - Math.abs(bx - px) * 4 - Math.max(0, py - b.y) * 2;
  else v -= Math.max(0, 110 - Math.abs(bx - px)) * 6; // 突進・休み以外は離れておく
  if (p.power) v += 300;
  return v;
}
export function bossChoose(s, depth = 2) {
  let best = 0, bestV = -Infinity;
  for (let ai = 0; ai < ACTS.length; ai++) {
    const c = clone(s);
    for (let k = 0; k < MACRO; k++) step(c, ACTS[ai]);
    let v = evalBoss(c);
    if (v > -1e9 && v < 1e9 && depth > 1) {
      let bv = -Infinity;
      for (const bj of [0, 1, 4, 6, 7, 8]) {
        const c2 = clone(c);
        for (let k = 0; k < MACRO * 2; k++) step(c2, ACTS[bj]);
        bv = Math.max(bv, evalBoss(c2));
      }
      v = bv;
    }
    if (v > bestV) { bestV = v; best = ai; }
  }
  return best;
}
export function arenaPoint(level) {
  const A = level.ents.find(e => e.kind === 'arena');
  let ty = A.ty; while (ty < level.h && level.tiles[ty * level.w + A.tx + 3] !== 1) ty++;
  return { kind: 'point', x: A.x + 56, y: ty * 16 };
}
export function solveBoss(level, { maxSeconds = 150, start = null } = {}) {
  const A = level.ents.find(e => e.kind === 'arena');
  let s, path = [], nodes = 0;
  if (start && start.lock) { s = clone(start); }
  else {
    const r1 = solve(level, { target: arenaPoint(level), maxNodes: 250000, start });
    nodes += r1.nodes;
    if (!r1.ok) return { ok: false, nodes, best: r1.best };
    s = r1.state; path = [...r1.path];
  }
  for (let i = 0; i < maxSeconds * 60 / MACRO; i++) {
    const ai = bossChoose(s); nodes++;
    path.push(ai);
    for (let k = 0; k < MACRO; k++) {
      step(s, ACTS[ai]);
      if (s.status === 'clear') return { ok: true, nodes, frames: path.length * MACRO, path, state: s };
      if (s.status === 'dead') return { ok: false, nodes, best: { x: s.p.x, y: s.p.y, h: s.boss.hp } };
    }
  }
  return { ok: false, nodes, best: { x: s.p.x, y: s.p.y, h: s.boss.hp } };
}

// 見つけた操作列を再生し、本当に到達するか確かめる（決定性の確認を兼ねる）
export function replay(level, path, target, carry = {}) {
  const s = createStage(level, tuning, carry);
  for (const ai of path) for (let k = 0; k < MACRO; k++) {
    step(s, ACTS[ai]);
    if (target.kind === 'medal' ? s.medals[target.idx] : s.status === 'clear') return { ok: true, time: s.time, s };
    if (s.status === 'dead') return { ok: false, s };
  }
  return { ok: false, s };
}
export const ACTIONS = ACTS;
export const MACRO_FRAMES = MACRO;

// ---- CLI ----
export function checkStage(id, { medals = false, maxNodes } = {}) {
  const L = loadStage(id);
  const out = { id, name: L.name, w: L.w, targets: [] };
  const targets = [];
  if (L.ents.some(e => e.kind === 'boss')) targets.push({ kind: 'boss' });
  if (L.ents.some(e => e.kind === 'goal')) targets.push({ kind: 'goal' });
  if (L.ents.some(e => e.kind === 'secret')) targets.push({ kind: 'secret' });
  if (medals) for (let i = 0; i < L.medalCount; i++) targets.push({ kind: 'medal', idx: i });
  for (const t of targets) {
    const t0 = Date.now();
    const r = t.kind === 'medal' || t.kind === 'secret' ? solveVia(L, t) : t.kind === 'boss' ? solveBoss(L) : solve(L, { target: t, maxNodes: maxNodes ?? 150000 });
    const rp = r.ok ? replay(L, r.path, t) : null;
    out.targets.push({ target: t.kind + (t.idx != null ? t.idx : ''), ok: r.ok && rp.ok, nodes: r.nodes, botSeconds: r.ok ? +(r.frames / 60).toFixed(1) : null, ms: Date.now() - t0, stuckAt: r.ok ? null : r.best && { x: Math.round(r.best.x / 16), y: Math.round(r.best.y / 16) } });
  }
  out.ok = out.targets.every(t => t.ok);
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const ids = process.argv.slice(2).filter(a => !a.startsWith('--'));
  const medals = process.argv.includes('--medals');
  const res = (ids.length ? ids : stageIds()).map(id => checkStage(id, { medals }));
  if (process.argv.includes('--json')) console.log(JSON.stringify(res));
  else for (const r of res) {
    console.log(`${r.ok ? 'OK  ' : 'FAIL'} ${r.id} ${r.name}`);
    for (const t of r.targets) console.log(`     ${t.ok ? '○' : '×'} ${t.target.padEnd(7)} ${t.ok ? `${t.botSeconds}秒` : `届かず（最も近づいた所: x=${t.stuckAt?.x}, y=${t.stuckAt?.y}）`}  探索${t.nodes}ノード ${t.ms}ms`);
  }
  process.exit(res.every(r => r.ok) ? 0 : 1);
}
