// ワールド1のボス「大蛾ケバ」。体力6、2回ごとに攻撃の型が変わる（3段階）。
// 突進のあと地面で息を切らす（rest）間だけ踏める。
import { solidAt } from './stage.js';
import { createEnemy } from './enemies.js';

export function createBoss(ent, level, tuning) {
  let ty = ent.ty;
  while (ty < level.h && !(level.tiles[ty * level.w + ent.tx] === 1 || level.tiles[ty * level.w + ent.tx] === 2)) ty++;
  const floorY = ty * 16;
  return {
    x: ent.x - 8, y: floorY - 120, w: 32, h: 24, cx: ent.x + 8, floorY, topY: floorY - 128,
    hp: tuning.boss.hp, phase: 0, mode: 'wait', t: 0, tt: 0, awake: false,
    tx: 0, ty: 0, swoopsLeft: 0, dustT: 0, knot: null, face: -1,
  };
}

const HOVER_TIME = [2.6, 2.2, 1.9];

export function updateBoss(s, b, dt) {
  const B = s.tuning.boss, p = s.p;
  b.t += dt; b.tt += dt;
  const L = s.lock ? s.lock.x + 18 : b.cx - 170, R = s.lock ? s.lock.x + s.lock.w - 18 - b.w : b.cx + 170 - b.w;
  const goTo = (x, y, sp) => {
    const dx = x - b.x, dy = y - b.y, d = Math.hypot(dx, dy);
    if (d <= sp * dt) { b.x = x; b.y = y; return true; }
    b.x += dx / d * sp * dt; b.y += dy / d * sp * dt; return false;
  };
  b.face = p.x + p.w / 2 < b.x + b.w / 2 ? -1 : 1;
  switch (b.mode) {
    case 'wait':
      b.y = b.topY + Math.sin(b.tt * 2) * 4;
      if (b.awake) { b.mode = 'intro'; b.t = 0; s.events.push({ type: 'bossintro' }); }
      break;
    case 'intro':
      b.y = b.topY + Math.sin(b.tt * 2) * 4;
      if (b.t > 1.6) enter(s, b, 'hover');
      break;
    case 'hover': {
      const hx = b.cx - b.w / 2 + Math.sin(b.t * 1.3) * 118;
      b.x += (Math.max(L, Math.min(R, hx)) - b.x) * Math.min(1, 4 * dt);
      b.y = b.topY + Math.sin(b.tt * 2.6) * 6;
      if (b.phase >= 1) {
        b.dustT += dt;
        if (b.dustT > B.dustEvery) {
          b.dustT = 0;
          s.shots.push({ kind: 'dust', x: b.x + b.w / 2 - 4, y: b.y + b.h, w: 8, h: 8, vx: 0, vy: 30, g: 40, t: 0, stompable: false });
          s.events.push({ type: 'dust', x: b.x + b.w / 2, y: b.y + b.h });
        }
      }
      if (b.t > HOVER_TIME[b.phase]) { enter(s, b, 'windup'); b.swoopsLeft = b.phase === 2 ? 1 : 0; }
      break;
    }
    case 'windup':
      if (b.t > (b.swoopsLeft === 0 && b.phase === 2 && b.second ? 0.42 : 0.5)) {
        b.tx = Math.max(L, Math.min(R, p.x + p.w / 2 - b.w / 2)); b.ty = b.floorY - b.h;
        enter(s, b, 'swoop'); s.events.push({ type: 'swoop', x: b.x + b.w / 2, y: b.y });
      }
      break;
    case 'swoop':
      if (goTo(b.tx, b.ty, B.swoop[b.phase])) {
        s.shake = Math.max(s.shake, 3);
        s.events.push({ type: 'bossland', x: b.x + b.w / 2, y: b.floorY });
        if (b.swoopsLeft > 0) { b.swoopsLeft--; b.second = true; enter(s, b, 'hop'); }
        else { b.second = false; enter(s, b, 'rest'); }
      }
      break;
    case 'hop':
      if (goTo(b.x, b.floorY - b.h - 72, 260)) enter(s, b, 'windup');
      break;
    case 'rest':
      if (b.t > B.rest[b.phase]) enter(s, b, 'rise');
      break;
    case 'hurt':
      b.y -= 30 * dt;
      if (b.t > 0.7) {
        if (b.hp <= 0) { enter(s, b, 'defeat'); s.events.push({ type: 'bossdown', x: b.x + b.w / 2, y: b.y + b.h / 2 }); s.shots.length = 0; for (const e of s.enemies) if (e.alive) { e.alive = false; e.deadT = 0; } break; }
        const ph = b.hp > 4 ? 0 : b.hp > 2 ? 1 : 2;
        if (ph !== b.phase) {
          b.phase = ph; s.events.push({ type: 'bossphase', phase: ph });
          if (ph === 2) spawnLarvae(s, 2);
        }
        enter(s, b, 'rise');
      }
      break;
    case 'rise':
      if (goTo(b.x, b.topY, 130)) {
        enter(s, b, 'hover');
        if (b.phase === 2) {
          fanPins(s, b);
          if (s.enemies.filter(e => e.alive && e.type === 'iga').length < 2) spawnLarvae(s, 1);
        }
      }
      break;
    case 'defeat':
      b.y = Math.min(b.y + 40 * dt, b.floorY - b.h);
      if (b.t > 1.8 && !b.dropped) {
        b.dropped = true; b.hp = 0;
        b.knot = { x: b.x + b.w / 2 - 7, y: b.y, w: 14, h: 14 };
        s.events.push({ type: 'knotDrop', x: b.knot.x + 7, y: b.knot.y });
      }
      if (b.knot) b.knot.y = Math.min(b.knot.y + 60 * dt, b.floorY - 14);
      break;
  }
}

function enter(s, b, mode) { b.mode = mode; b.t = 0; }

function fanPins(s, b) {
  const B = s.tuning.boss, p = s.p;
  const cx = b.x + b.w / 2, cy = b.y + b.h;
  const a0 = Math.atan2(p.y + p.h / 2 - cy, p.x + p.w / 2 - cx);
  for (const da of [-0.32, 0, 0.32]) {
    const a = a0 + da;
    s.shots.push({ kind: 'pin', x: cx - 4, y: cy - 2, w: 8, h: 6, vx: Math.cos(a) * B.pinSpeed, vy: Math.sin(a) * B.pinSpeed, t: 0, stompable: true });
  }
  s.events.push({ type: 'shoot', x: cx, y: cy });
}

function spawnLarvae(s, n) {
  const lx = s.lock ? s.lock.x : 0;
  const spots = [lx + 24, lx + (s.lock ? s.lock.w : s.tuning.view.w) - 40];
  for (let i = 0; i < n; i++) {
    const x = spots[(s.enemies.length + i) % 2];
    const ty = Math.floor((s.boss.floorY - 16) / 16);
    if (solidAt(s, Math.floor(x / 16), ty)) continue;
    const e = createEnemy({ type: 'iga', x: Math.floor(x / 16) * 16, y: ty * 16, tx: Math.floor(x / 16), ty }, 900 + s.enemies.length);
    e.y -= 40; e.awake = true; e.dir = x < lx + 100 ? 1 : -1;
    s.enemies.push(e);
    s.events.push({ type: 'summon', x: e.x + 6, y: e.y });
  }
}
