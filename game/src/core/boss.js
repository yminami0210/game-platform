// ボス。ステージの "boss": "keba"（既定）| "tenaga" で切り替える。
// ワールド1「大蛾ケバ」: 体力6、2回ごとに攻撃の型が変わる（3段階）。突進のあと地面で息を切らす（rest）間だけ踏める。
// ワールド2「渦のテナガ」: 水面から糸腕を叩きつけ、頭を出した（rest）間だけ踏める。2段階目から渦で横に押す、3段階目は腕4本＋藍がめ。
import { solidAt, moveX } from './stage.js';
import { createEnemy } from './enemies.js';

export function bossKind(level) {
  return level.boss ?? (level.theme === 'river' ? 'tenaga' : 'keba'); // level.js が "boss" を渡すまでは theme で代用
}

export function createBoss(ent, level, tuning) {
  if (bossKind(level) === 'tenaga') return createTenaga(ent, level, tuning);
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
  if (b.kind === 'tenaga') return updateTenaga(s, b, dt);
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

// ---- 渦のテナガ ----
const T_WARN = [0.9, 0.8, 0.7];   // 糸腕の予告
const T_SUB = [1.6, 1.3, 1.1];    // 潜っている時間
const T_ARMS = [2, 2, 4];
const VORTEX = [0, 38, 52];       // 渦が横に押す速さ px/s

function createTenaga(ent, level, tuning) {
  let ty = ent.ty;
  while (ty < level.h && !(level.tiles[ty * level.w + ent.tx] === 1 || level.tiles[ty * level.w + ent.tx] === 2)) ty++;
  const floorY = ty * 16;
  return {
    kind: 'tenaga', x: ent.x - 8, y: floorY + 8, w: 32, h: 20, cx: ent.x + 8, floorY, topY: floorY + 8,
    hp: tuning.boss.hp, phase: 0, mode: 'wait', t: 0, tt: 0, awake: false,
    arms: [], vdir: 1, slams: 0, knot: null, face: -1,
  };
}

function updateTenaga(s, b, dt) {
  const p = s.p;
  b.t += dt; b.tt += dt;
  const L = s.lock ? s.lock.x + 18 : b.cx - 170, R = s.lock ? s.lock.x + s.lock.w - 18 - b.w : b.cx + 170 - b.w;
  const clampX = x => Math.max(L, Math.min(R, x));
  const pcx = p.x + p.w / 2;
  b.face = pcx < b.x + b.w / 2 ? -1 : 1;
  // 渦: 2段階目から、潜っている間は足場ごと横に流す（向きは叩きつけごとに入れ替わる）
  if (VORTEX[b.phase] && (b.mode === 'sub' || b.mode === 'warn') && s.status === 'play' && p.onGround) {
    moveX(s, p, b.vdir * VORTEX[b.phase] * dt);
    b.swirl = true;
  } else b.swirl = false;
  switch (b.mode) {
    case 'wait': case 'intro':
      b.y = b.topY;
      if (b.mode === 'wait' && b.awake) { b.mode = 'intro'; b.t = 0; s.events.push({ type: 'bossintro', boss: 'tenaga' }); }
      if (b.mode === 'intro' && b.t > 1.6) enter(s, b, 'sub');
      break;
    case 'sub':
      b.y = b.topY;
      if (b.t > T_SUB[b.phase]) {
        // 糸腕の落ちる場所を予告: 1本はプレイヤーの位置、残りは間隔をあけて並べる
        const n = T_ARMS[b.phase], gap = 52, xs = [];
        const side = b.slams % 2 ? -1 : 1;
        for (let i = 0; i < n; i++) xs.push(clampX(pcx - 7 + side * i * gap * (i % 2 ? 1 : -1) * (i > 1 ? 1.6 : 1)));
        b.arms = xs.map(x => ({ x, w: 14 }));
        enter(s, b, 'warn'); s.events.push({ type: 'armwarn' });
      }
      break;
    case 'warn':
      if (b.t > T_WARN[b.phase]) {
        for (const a of b.arms) s.shots.push({ kind: 'arm', x: a.x, y: b.floorY - 56, w: a.w, h: 54, vx: 0, vy: 0, t: 0, stompable: false });
        s.shake = Math.max(s.shake, 3);
        s.events.push({ type: 'bossland', x: b.arms[0].x + 7, y: b.floorY });
        if (b.phase === 2) throwJar(s, b);
        enter(s, b, 'slam');
      }
      break;
    case 'slam':
      if (b.t > 0.45) {
        s.shots = s.shots.filter(o => o.kind !== 'arm');
        b.arms = []; b.slams++; b.vdir = -b.vdir;
        // 腕を引いたあと、頭が水面に出る（プレイヤーから少し離れた所）
        const off = pcx < (L + R + b.w) / 2 ? 40 : -40;
        b.x = clampX(pcx - b.w / 2 + off);
        enter(s, b, 'emerge');
      }
      break;
    case 'emerge':
      b.y = Math.max(b.floorY - b.h, b.y - 160 * dt);
      if (b.y <= b.floorY - b.h) enter(s, b, 'rest');
      break;
    case 'rest':
      b.y = b.floorY - b.h;
      if (b.t > s.tuning.boss.rest[b.phase] + 0.3) enter(s, b, 'dive');
      break;
    case 'dive': case 'hurt':
      b.y += 120 * dt;
      if (b.mode === 'hurt' && b.t > 0.7) {
        if (b.hp <= 0) { enter(s, b, 'defeat'); s.events.push({ type: 'bossdown', x: b.x + b.w / 2, y: b.y }); s.shots.length = 0; b.y = b.floorY - b.h; break; }
        const ph = b.hp > 4 ? 0 : b.hp > 2 ? 1 : 2;
        if (ph !== b.phase) { b.phase = ph; s.events.push({ type: 'bossphase', phase: ph }); }
        enter(s, b, 'sub');
      } else if (b.mode === 'dive' && b.y >= b.topY) { b.y = b.topY; enter(s, b, 'sub'); }
      if (b.y > b.topY) b.y = b.topY;
      break;
    case 'defeat':
      if (b.t > 1.8 && !b.dropped) {
        b.dropped = true; b.hp = 0;
        b.knot = { x: b.x + b.w / 2 - 7, y: b.y, w: 14, h: 14 };
        s.events.push({ type: 'knotDrop', x: b.knot.x + 7, y: b.knot.y });
      }
      if (b.knot) b.knot.y = Math.min(b.knot.y + 60 * dt, b.floorY - 14);
      break;
  }
  // 潜っている頭には当たらない（床の下に置く）
  if (b.mode === 'sub' || b.mode === 'warn' || b.mode === 'slam' || b.mode === 'intro' || b.mode === 'wait') b.y = b.topY + 40;
}

function throwJar(s, b) {
  const p = s.p, sx = s.lock ? (p.x < s.lock.x + s.lock.w / 2 ? s.lock.x + s.lock.w - 30 : s.lock.x + 22) : b.cx;
  const dx = p.x + p.w / 2 - sx;
  s.shots.push({ kind: 'jar', x: sx, y: b.floorY - 40, w: 10, h: 10, vx: dx / 1.1, vy: -180, g: 300, t: 0, stompable: true });
  s.events.push({ type: 'shoot', x: sx, y: b.floorY - 40 });
}
