// ステージ1本の純粋なシミュレーション。DOM・時間API・Math.random を使わない（決定的）。
// createStage(level, tuning, carry) → state、step(state, input, dt) → events、clone(state)。
// input = { l, r, u, d, j, b }（押されているか）。dt は 1/60 固定。
import { T } from './level.js';
import { createEnemy, updateEnemy } from './enemies.js';
import { createBoss, updateBoss } from './boss.js';

const TS = 16;
export const DT = 1 / 60;
const NO_INPUT = { l: false, r: false, u: false, d: false, j: false, b: false };

export function createStage(level, tuning, carry = {}) {
  const P = tuning.player;
  const ents = level.ents;
  const cps = ents.filter(e => e.kind === 'checkpoint');
  const cp = carry.checkpoint ?? -1;
  const start = cp >= 0 ? cps[cp] : ents.find(e => e.kind === 'start');
  const tiles = level.tiles.slice();
  for (const i of carry.taken ?? []) tiles[i] = T.EMPTY;
  const s = {
    t: 0, frame: 0, level, tuning,
    tiles, taken: [...(carry.taken ?? [])],
    p: {
      x: start.x + 3, y: start.y + TS - P.h, w: P.w, h: P.h, vx: 0, vy: 0, face: 1, onGround: true, coyote: 0, buffer: 0,
      jumping: false, noCut: 0, power: !!carry.power, inv: 0, ride: -1, glide: false, prevBottom: 0,
      skid: false, landV: 0, combo: 0, airT: 0,
    },
    prevJ: true,
    cam: { x: 0, y: 0, look: 0, ty: 0 },
    enemies: ents.filter(e => e.kind === 'enemy').map((e, i) => createEnemy(e, i)),
    shots: [], items: [],
    medals: carry.medals ? carry.medals.slice() : new Array(level.medalCount).fill(false),
    coins: carry.coins ?? 0,
    checkpoint: cp,
    checkpoints: cps.map(c => ({ x: c.x, y: c.y })),
    springs: ents.filter(e => e.kind === 'spring').map(e => ({ x: e.x, y: e.y + 9, w: 16, h: 7, squash: 0 })),
    switches: ents.filter(e => e.kind === 'switch').map(e => ({ x: e.x, y: e.y + 10, w: 16, h: 6, down: false })),
    movers: ents.filter(e => e.kind === 'moverH' || e.kind === 'moverV').map(e => ({
      x0: e.x, y0: e.y, x: e.x, y: e.y, w: 48, h: 8, dx: 0, dy: 0, range: e.range, vert: e.kind === 'moverV',
      phase: 0,
    })).sort((a, b) => a.x0 - b.x0).map((m, i) => ({ ...m, phase: (i % 2) * 0.5 })), // 隣どうしは逆向きに動く（間が開いたり閉じたりする）
    vents: ents.filter(e => e.kind === 'vent').map(e => ventColumn(level, e)),
    crumbles: [...level.crumbleAt.keys()].map(i => ({ i, st: 0, t: 0 })),
    goals: ents.filter(e => e.kind === 'goal' || e.kind === 'secret').map(e => ({ x: e.x + 4, y: e.y - 32, w: 8, h: 48, secret: e.kind === 'secret' })),
    sw: 0, swArmed: true,
    hitstop: 0, shake: 0,
    status: 'play', statusT: 0, exit: null, finished: false,
    deaths: carry.deaths ?? 0, time: carry.time ?? 0,
    boss: null, lock: null,
    arena: ents.find(e => e.kind === 'arena') ?? null,
    events: [],
  };
  const bossEnt = ents.find(e => e.kind === 'boss');
  if (bossEnt) s.boss = createBoss(bossEnt, level, tuning);
  snapCamera(s);
  return s;
}

function ventColumn(level, e) {
  let top = e.ty - 1, n = 0;
  while (top >= 0 && n < 9 && !isSolidTile(level.tiles[top * level.w + e.tx])) { top--; n++; }
  const y0 = (top + 1) * TS;
  // 蒸気は吹き出し口より少し広がる（左右に 1 マス弱ずつ）
  return { x: e.x - 12, y: y0, w: 40, h: e.y + TS - y0, pulse: !!e.pulse, phase: (e.tx % 5) * 0.37, on: true };
}

export function clone(s) {
  return {
    ...s,
    tiles: s.tiles.slice(), taken: s.taken.slice(), p: { ...s.p }, cam: { ...s.cam },
    enemies: s.enemies.map(e => ({ ...e })), shots: s.shots.map(o => ({ ...o })), items: s.items.map(o => ({ ...o })),
    medals: s.medals.slice(), checkpoints: s.checkpoints,
    springs: s.springs.map(o => ({ ...o })), switches: s.switches.map(o => ({ ...o })),
    movers: s.movers.map(o => ({ ...o })), vents: s.vents.map(o => ({ ...o })), crumbles: s.crumbles.map(o => ({ ...o })),
    boss: s.boss && { ...s.boss }, lock: s.lock && { ...s.lock }, events: [],
  };
}

// ---- タイル ----
const isSolidTile = t => t === T.GROUND || t === T.BLOCK || t === T.BOX_POWER || t === T.BOX_COIN || t === T.BOX_USED || t === T.CRUMBLE;
export function tileAt(s, tx, ty) {
  const L = s.level;
  if (tx < 0 || tx >= L.w) return T.GROUND; // 左右の端は壁
  if (ty < 0 || ty >= L.h) return T.EMPTY;
  return s.tiles[ty * L.w + tx];
}
export function solidAt(s, tx, ty) {
  const t = tileAt(s, tx, ty);
  if (isSolidTile(t)) return true;
  if (t === T.RED) return s.sw === 0;
  if (t === T.BLUE) return s.sw === 1;
  return false;
}

// 箱を x 方向に動かし、壁で止める。当たったら true
export function moveX(s, o, dx, solidEnts) {
  o.x += dx;
  const top = Math.floor(o.y / TS), bot = Math.floor((o.y + o.h - 0.01) / TS);
  if (dx > 0) {
    const tx = Math.floor((o.x + o.w - 0.01) / TS);
    for (let ty = top; ty <= bot; ty++) if (solidAt(s, tx, ty)) { o.x = tx * TS - o.w; return true; }
  } else if (dx < 0) {
    const tx = Math.floor(o.x / TS);
    for (let ty = top; ty <= bot; ty++) if (solidAt(s, tx, ty)) { o.x = (tx + 1) * TS; return true; }
  }
  if (solidEnts) for (const r of solidEnts) {
    if (overlap(o, r)) { if (dx > 0) o.x = r.x - o.w; else if (dx < 0) o.x = r.x + r.w; return true; }
  }
  if (s.lock && o === s.p) {
    if (o.x < s.lock.x) { o.x = s.lock.x; return true; }
    if (o.x + o.w > s.lock.x + s.lock.w) { o.x = s.lock.x + s.lock.w - o.w; return true; }
  }
  return false;
}

// y 方向。戻り値: 0=何もなし, 1=着地, -1=天井
export function moveY(s, o, dy, oneway, onCeil) {
  const prevBottom = o.y + o.h;
  o.y += dy;
  const left = Math.floor(o.x / TS), right = Math.floor((o.x + o.w - 0.01) / TS);
  if (dy > 0) {
    const ty = Math.floor((o.y + o.h - 0.01) / TS);
    for (let tx = left; tx <= right; tx++) {
      const t = tileAt(s, tx, ty);
      if (solidAt(s, tx, ty) || (oneway && t === T.ONEWAY && prevBottom <= ty * TS + 0.5)) { o.y = ty * TS - o.h; return 1; }
    }
  } else if (dy < 0) {
    const ty = Math.floor(o.y / TS);
    let hit = false;
    for (let tx = left; tx <= right; tx++) {
      const t = tileAt(s, tx, ty);
      if (solidAt(s, tx, ty) || (onCeil && t === T.HIDDEN)) { hit = true; if (onCeil) onCeil(tx, ty); }
    }
    if (hit) { o.y = (ty + 1) * TS; return -1; }
  }
  return 0;
}
export const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const approach = (v, target, amt) => (v < target ? Math.min(target, v + amt) : Math.max(target, v - amt));

// ---- 1ステップ ----
export function step(s, input = NO_INPUT, dt = DT) {
  const ev = s.events = [];
  if (s.hitstop > 0) {
    // 止まっている間に押したジャンプは捨てずに先行入力として残す
    if (input.j && !s.prevJ) s.p.buffer = s.tuning.player.bufferFrames + s.hitstop;
    s.hitstop--; s.prevJ = input.j; return ev;
  }
  s.frame++;
  if (s.shake > 0) s.shake = Math.max(0, s.shake - dt * 30);
  if (s.status === 'dead') {
    s.statusT += dt;
    s.p.vy = Math.min(s.p.vy + 1100 * dt, 400); s.p.y += s.p.vy * dt;
    if (s.statusT > 1.0) respawn(s);
    return ev;
  }
  if (s.status === 'clear') {
    s.statusT += dt;
    if (s.statusT > 0.5 && s.exit !== 'knot') { s.p.face = 1; s.p.vx = 40; }
    else s.p.vx = 0;
    if (!s.boss || s.exit !== 'knot') runPlayerPhysics(s, NO_INPUT, dt, true);
    if (s.statusT > 2.6 && !s.finished) { s.finished = true; ev.push({ type: 'finished', exit: s.exit }); }
    updateCamera(s, dt);
    return ev;
  }
  s.t += dt; s.time += dt;
  updateWorld(s, dt);
  runPlayerPhysics(s, input, dt, false);
  s.prevJ = input.j;
  interact(s, input, dt);
  for (const e of s.enemies) if (e.alive && isActive(s, e)) updateEnemy(s, e, dt);
  s.enemies = s.enemies.filter(e => e.alive || e.deadT < 0.6);
  for (const e of s.enemies) if (!e.alive) e.deadT += dt;
  if (s.boss) updateBoss(s, s.boss, dt);
  updateShots(s, dt);
  updateItems(s, dt);
  if (s.p.y > s.level.ph + 24 && s.status === 'play') die(s, 'fall');
  updateCamera(s, dt);
  return ev;
}

function isActive(s, e) {
  if (e.awake) return true;
  if (e.x > s.cam.x - 48 && e.x < s.cam.x + s.tuning.view.w + 48) e.awake = true;
  return e.awake;
}

function updateWorld(s, dt) {
  const M = s.tuning.mover;
  for (const m of s.movers) {
    const period = (m.range * 2) / M.speed;
    const ph = ((s.t / period + m.phase) % 1);
    const f = ph < 0.5 ? ph * 2 : 2 - ph * 2;
    const sm = f * f * (3 - 2 * f); // 端でゆっくり
    const nx = m.vert ? m.x0 : m.x0 + sm * m.range;
    const ny = m.vert ? m.y0 - sm * m.range : m.y0;
    m.dx = nx - m.x; m.dy = ny - m.y; m.x = nx; m.y = ny;
  }
  const V = s.tuning.vent;
  for (const v of s.vents) {
    if (!v.pulse) { v.on = true; continue; }
    const per = V.onTime + V.offTime;
    v.on = ((s.t + v.phase) % per) < V.onTime;
  }
  const C = s.tuning.crumble;
  for (const c of s.crumbles) {
    if (c.st === 1) { c.t += dt; if (c.t >= C.delay) { c.st = 2; c.t = 0; s.tiles[c.i] = T.EMPTY; s.events.push({ type: 'crumble', i: c.i }); } }
    else if (c.st === 2) {
      c.t += dt;
      if (c.t >= C.respawn) {
        const tx = c.i % s.level.w, ty = Math.floor(c.i / s.level.w);
        if (!overlap(s.p, { x: tx * TS, y: ty * TS, w: TS, h: TS })) { c.st = 0; s.tiles[c.i] = T.CRUMBLE; }
      }
    }
  }
  for (const sp of s.springs) sp.squash = Math.max(0, sp.squash - dt);
}

function solidEntities(s) {
  const out = [];
  for (const e of s.enemies) if (e.alive && e.type === 'yubi') out.push(e);
  return out;
}

function runPlayerPhysics(s, input, dt, auto) {
  const P = s.tuning.player, p = s.p;
  const wasGround = p.onGround;
  // 乗っている足場に運ばれる
  if (p.ride >= 0) {
    const m = s.movers[p.ride];
    moveX(s, p, m.dx, null);
    p.y = m.y - p.h;
  }
  const dir = auto ? Math.sign(p.vx) : (input.r && !input.l ? 1 : input.l && !input.r ? -1 : 0);
  const run = input.b;
  const max = run ? P.runMax : P.walkMax;
  if (!auto) {
    p.skid = false;
    if (p.onGround) {
      if (dir !== 0) {
        if (p.vx !== 0 && Math.sign(p.vx) !== dir) { p.vx += dir * P.turnAccel * dt; p.skid = Math.abs(p.vx) > 40; }
        else if (Math.abs(p.vx) < max) p.vx = Math.max(-max, Math.min(max, p.vx + dir * (run ? P.accelRun : P.accelGround) * dt));
        else p.vx = approach(p.vx, dir * max, P.friction * dt);
      } else p.vx = approach(p.vx, 0, P.friction * dt);
    } else {
      if (dir !== 0) {
        const turning = p.vx !== 0 && Math.sign(p.vx) !== dir;
        if (turning || Math.abs(p.vx) < max) p.vx = Math.max(-Math.max(max, Math.abs(p.vx)), Math.min(Math.max(max, Math.abs(p.vx)), p.vx + dir * P.accelAir * (turning ? 1.5 : 1) * dt));
      } else p.vx = approach(p.vx, 0, P.frictionAir * dt);
    }
    if (dir) p.face = dir;
    // ジャンプ（先行入力・コヨーテ）
    const pressed = input.j && !s.prevJ;
    if (pressed) p.buffer = P.bufferFrames; else if (p.buffer > 0) p.buffer--;
    if (p.onGround) p.coyote = P.coyoteFrames; else if (p.coyote > 0) p.coyote--;
    if (p.buffer > 0 && (p.onGround || p.coyote > 0)) {
      p.vy = -(P.jumpV + Math.abs(p.vx) * P.jumpRunBonus);
      p.onGround = false; p.coyote = 0; p.buffer = 0; p.jumping = true; p.ride = -1; p.noCut = 0;
      s.events.push({ type: 'jump', x: p.x + p.w / 2, y: p.y + p.h, run: Math.abs(p.vx) > P.walkMax + 5 });
    }
  }
  // 重力
  let g;
  if (p.vy < 0) {
    g = (input.j || p.noCut > 0) ? P.gravUpHeld : P.gravUpReleased;
    if (Math.abs(p.vy) < P.apexBand && input.j) g *= P.apexGravScale;
  } else {
    g = P.gravDown;
    if (Math.abs(p.vy) < P.apexBand && input.j) g *= P.apexGravScale;
  }
  if (p.noCut > 0) p.noCut -= dt;
  p.vy += g * dt;
  p.glide = false;
  if (p.power && p.vy > P.glideFall && input.j && !p.onGround) { p.vy = approach(p.vy, P.glideFall, 2400 * dt); p.glide = true; }
  // 蒸気
  const V = s.tuning.vent;
  for (const v of s.vents) {
    if (!v.on || !overlap(p, v)) continue;
    const target = input.j ? -V.maxUp * (p.power ? 1.15 : 1) : 50;
    p.vy = approach(p.vy, target, V.lift * dt);
    p.onGround = false; p.ride = -1;
    if (s.frame % 6 === 0) s.events.push({ type: 'steam', x: p.x + p.w / 2, y: p.y + p.h });
  }
  p.vy = Math.min(p.vy, P.maxFall);
  // 移動と衝突
  const solids = solidEntities(s);
  const hitWall = moveX(s, p, p.vx * dt, solids);
  if (hitWall) p.vx = 0;
  p.prevBottom = p.y + p.h;
  const fallV = p.vy;
  let r = moveY(s, p, p.vy * dt, !input.d || p.vy < 0 ? true : !dropThrough(s, p), (tx, ty) => bumpTile(s, tx, ty));
  if (r === -1) {
    // 天井の角なら横にずらして通す
    const nudged = cornerNudge(s, p, P.cornerNudge);
    if (nudged) { r = moveY(s, p, 0, true); } else { p.vy = Math.max(p.vy, 30); s.events.push({ type: 'bonk', x: p.x + p.w / 2, y: p.y }); }
  }
  let landed = r === 1;
  // エンティティの上面（足場・ばね・スイッチ・ユビヌキ）
  if (!landed && p.vy >= 0) landed = landOnEntities(s, p, input) || landed;
  else if (landed) p.ride = -1;
  if (!landed && p.vy >= 0 && p.ride < 0) {
    // 足元の確認（重力で毎フレーム少し落ちるので、moveY が拾う）
  }
  if (landed) {
    if (!wasGround) {
      p.landV = fallV;
      s.events.push({ type: 'land', x: p.x + p.w / 2, y: p.y + p.h, v: fallV });
      if (fallV > 300) s.shake = Math.max(s.shake, 2);
    }
    p.vy = 0; p.onGround = true; p.jumping = false; p.combo = 0; p.airT = 0;
    if (r === 1) stepOnCrumble(s, p);
    // 歩いてばねボタンに乗り上げても弾む（足の中心がボタンの上）
    for (const sp of s.springs) {
      const c = p.x + p.w / 2;
      if (c > sp.x + 2 && c < sp.x + sp.w - 2 && p.y + p.h > sp.y && p.y + p.h <= sp.y + sp.h + 1) {
        p.vy = -(input.j ? P.springVHeld : P.springV); p.noCut = 0.28; p.jumping = false; p.onGround = false; p.combo = 0; p.coyote = 0; p.buffer = 0;
        sp.squash = 0.18; s.events.push({ type: 'spring', x: sp.x + 8, y: sp.y });
        break;
      }
    }
  } else {
    if (p.vy !== 0 || r !== 1) { p.onGround = false; p.airT += dt; }
  }
  if (p.y < -64) p.y = -64;
}

function dropThrough(s, p) {
  // ↓ で一方通行の床を降りる（立っているときだけ）
  const ty = Math.floor((p.y + p.h + 1) / TS);
  const l = Math.floor(p.x / TS), r = Math.floor((p.x + p.w - 0.01) / TS);
  for (let tx = l; tx <= r; tx++) if (tileAt(s, tx, ty) !== T.ONEWAY) return false;
  return true;
}

function cornerNudge(s, p, n) {
  for (let d = 1; d <= n; d++) {
    for (const dir of [-1, 1]) {
      const test = { x: p.x + dir * d, y: p.y - 1, w: p.w, h: p.h };
      if (!boxHitsSolid(s, test)) { p.x = test.x; return true; }
    }
  }
  return false;
}
function boxHitsSolid(s, o) {
  for (let ty = Math.floor(o.y / TS); ty <= Math.floor((o.y + o.h - 0.01) / TS); ty++)
    for (let tx = Math.floor(o.x / TS); tx <= Math.floor((o.x + o.w - 0.01) / TS); tx++) if (solidAt(s, tx, ty) || tileAt(s, tx, ty) === T.HIDDEN) return true;
  return false;
}

function landOnEntities(s, p, input) {
  const P = s.tuning.player;
  const bottom = p.y + p.h, prev = p.prevBottom;
  const cross = top => prev <= top + 0.5 && bottom >= top && p.vy >= 0;
  const hx = r => p.x + p.w > r.x + 1 && p.x < r.x + r.w - 1;
  for (let i = 0; i < s.movers.length; i++) {
    const m = s.movers[i];
    if (hx(m) && cross(m.y)) { p.y = m.y - p.h; p.ride = i; return true; }
  }
  if (p.ride >= 0) {
    const m = s.movers[p.ride];
    if (hx(m) && Math.abs(bottom - m.y) < 2) { p.y = m.y - p.h; return true; }
    p.ride = -1;
  }
  for (const sp of s.springs) {
    if (hx(sp) && cross(sp.y)) {
      p.y = sp.y - p.h;
      p.vy = -(input.j ? P.springVHeld : P.springV); p.noCut = 0.28; p.jumping = false; p.onGround = false; p.combo = 0; p.coyote = 0; p.buffer = 0;
      sp.squash = 0.18;
      s.events.push({ type: 'spring', x: sp.x + 8, y: sp.y });
      return false;
    }
  }
  for (const sw of s.switches) {
    const top = sw.down ? sw.y + 4 : sw.y;
    if (hx(sw) && cross(top)) {
      p.y = top - p.h;
      if (!sw.down) { sw.down = true; s.sw ^= 1; s.events.push({ type: 'switch', x: sw.x + 8, y: sw.y, sw: s.sw }); s.shake = Math.max(s.shake, 1.5); }
      return true;
    }
  }
  for (const e of s.enemies) {
    if (e.alive && e.type === 'yubi' && hx(e) && cross(e.y)) { p.y = e.y - p.h; return true; }
  }
  return false;
}

function stepOnCrumble(s, p) {
  const ty = Math.floor((p.y + p.h + 1) / TS);
  for (let tx = Math.floor(p.x / TS); tx <= Math.floor((p.x + p.w - 0.01) / TS); tx++) {
    const i = ty * s.level.w + tx;
    if (s.tiles[i] === T.CRUMBLE) {
      const c = s.crumbles[s.level.crumbleAt.get(i)];
      if (c.st === 0) { c.st = 1; c.t = 0; s.events.push({ type: 'crumbleStart', i }); }
    }
  }
}

function bumpTile(s, tx, ty) {
  const i = ty * s.level.w + tx, t = s.tiles[i];
  const x = tx * TS, y = ty * TS;
  if (t === T.BOX_POWER) {
    s.tiles[i] = T.BOX_USED;
    s.items.push({ kind: 'wata', x: x + 2, y: y - 14, w: 12, h: 12, vx: 0, vy: -50, t: 0, dir: s.p.face });
    s.events.push({ type: 'box', x: x + 8, y, item: 'wata' });
  } else if (t === T.BOX_COIN || t === T.HIDDEN) {
    s.tiles[i] = T.BOX_USED; s.coins++;
    s.events.push({ type: 'box', x: x + 8, y, item: 'coin', hidden: t === T.HIDDEN });
    s.events.push({ type: 'coin', x: x + 8, y: y - 12 });
  } else if (t === T.BOX_USED || t === T.GROUND || t === T.BLOCK) {
    // 何も出ない
  }
  // 箱の上の敵を突き上げる
  for (const e of s.enemies) {
    if (e.alive && e.stompable && e.x + e.w > x && e.x < x + TS && Math.abs(e.y + e.h - y) < 3) kill(s, e, 'bump');
  }
}

function interact(s, input, dt) {
  const p = s.p, P = s.tuning.player, L = s.level;
  if (p.inv > 0) p.inv -= dt;
  // 糸玉・トゲ
  const l = Math.floor(p.x / TS), r = Math.floor((p.x + p.w - 0.01) / TS);
  const t0 = Math.floor(p.y / TS), t1 = Math.floor((p.y + p.h - 0.01) / TS);
  for (let ty = t0; ty <= t1; ty++) for (let tx = l; tx <= r; tx++) {
    const t = tileAt(s, tx, ty);
    if (t === T.COIN) {
      const i = ty * L.w + tx; s.tiles[i] = T.EMPTY; s.taken.push(i); s.coins++;
      s.events.push({ type: 'coin', x: tx * TS + 8, y: ty * TS + 8 });
    } else if (t === T.SPIKE) {
      const spike = spikeBox(s, tx, ty);
      if (overlap(p, spike)) hurt(s, 'spike');
    }
  }
  // 金ボタン
  for (const m of L.ents) {
    if (m.kind === 'medal' && !s.medals[m.idx] && overlap(p, { x: m.x + 2, y: m.y + 2, w: 12, h: 12 })) {
      s.medals[m.idx] = true; s.events.push({ type: 'medal', idx: m.idx, x: m.x + 8, y: m.y + 8 }); s.hitstop = 3;
    }
  }
  // 待ち針
  s.checkpoints.forEach((c, i) => {
    if (i > s.checkpoint && overlap(p, { x: c.x + 4, y: c.y - 16, w: 8, h: 32 })) {
      s.checkpoint = i; s.events.push({ type: 'checkpoint', idx: i, x: c.x + 8, y: c.y });
    }
  });
  // ゴール
  for (const g of s.goals) {
    if (overlap(p, g)) { clear(s, g.secret ? 'secret' : 'goal'); return; }
  }
  // スイッチは足が離れたら戻る
  for (const sw of s.switches) {
    if (sw.down && !(p.x + p.w > sw.x && p.x < sw.x + sw.w && Math.abs(p.y + p.h - (sw.y + 4)) < 3)) sw.down = false;
  }
  // 敵
  for (const e of s.enemies) {
    if (!e.alive || e.type === 'yubi' || !overlap(p, e)) continue;
    if (e.stompable && p.vy > 0 && p.prevBottom <= e.y + 7) stomp(s, e, input);
    else hurt(s, e.type);
  }
  // ボス
  const b = s.boss;
  if (b && b.hp > 0 && overlap(p, b)) {
    if (b.mode === 'rest' && p.vy > 0 && p.prevBottom <= b.y + 10) {
      b.hp--; b.mode = 'hurt'; b.t = 0;
      p.vy = -(input.j ? P.stompBounceHeld + 40 : P.stompBounce + 40);
      s.hitstop = s.tuning.hitstop.boss; s.shake = 4;
      s.events.push({ type: 'bosshit', hp: b.hp, x: b.x + b.w / 2, y: b.y });
    } else if (b.mode !== 'rest' && b.mode !== 'hurt' && b.mode !== 'defeat' && b.mode !== 'intro') hurt(s, 'boss');
  }
  // 結び玉（ボスを倒すと出る）
  if (b && b.knot && overlap(p, b.knot)) { b.knot = null; s.events.push({ type: 'knot' }); clear(s, 'knot'); }
  // 闘技場に入ったら画面を固定
  if (s.arena && !s.lock && p.x > s.arena.x + 24) {
    s.lock = { x: s.arena.x, w: 24 * TS }; // 闘技場は24マス（画面より広ければカメラが中で動く）
    s.events.push({ type: 'arenaLock' });
    if (s.boss) s.boss.awake = true;
  }
}

function spikeBox(s, tx, ty) {
  // 上に固い物があれば天井トゲ
  const ceil = solidAt(s, tx, ty - 1) && !solidAt(s, tx, ty + 1);
  return ceil ? { x: tx * TS + 2, y: ty * TS, w: 12, h: 8 } : { x: tx * TS + 2, y: ty * TS + 8, w: 12, h: 8 };
}

function stomp(s, e, input) {
  const P = s.tuning.player, p = s.p;
  kill(s, e, 'stomp');
  p.vy = -(input.j ? P.stompBounceHeld : P.stompBounce); p.jumping = false; p.noCut = 0.1; p.coyote = 0;
  p.combo++;
  s.hitstop = s.tuning.hitstop.stomp; s.shake = Math.max(s.shake, 1.2);
  s.events.push({ type: 'stomp', x: e.x + e.w / 2, y: e.y, combo: p.combo, enemy: e.type });
}
export function kill(s, e, how) {
  e.alive = false; e.deadT = 0; e.how = how;
  if (how !== 'stomp') s.events.push({ type: 'kill', x: e.x + e.w / 2, y: e.y, enemy: e.type, how });
}

export function hurt(s, by) {
  const p = s.p, P = s.tuning.player;
  if (p.inv > 0 || s.status !== 'play') return;
  if (p.power) {
    p.power = false; p.inv = P.hurtInvuln;
    p.vy = -P.hurtKnockY; p.vx = -p.face * P.hurtKnockX; p.onGround = false; p.ride = -1;
    s.hitstop = s.tuning.hitstop.hurt; s.shake = 3;
    s.events.push({ type: 'powerdown', by, x: p.x + p.w / 2, y: p.y });
  } else die(s, by);
}

export function die(s, by) {
  if (s.status !== 'play') return;
  s.status = 'dead'; s.statusT = 0; s.deaths++;
  s.p.vy = by === 'fall' ? 0 : -280; s.p.vx = 0; s.p.power = false;
  s.hitstop = by === 'fall' ? 0 : s.tuning.hitstop.hurt; s.shake = 3;
  s.events.push({ type: 'die', by, x: s.p.x + s.p.w / 2, y: s.p.y, deaths: s.deaths });
}

function clear(s, exit) {
  if (s.status !== 'play') return;
  s.status = 'clear'; s.statusT = 0; s.exit = exit;
  s.p.vx = 0; s.p.inv = 0;
  s.events.push({ type: 'clear', exit, time: s.time, medals: s.medals.slice(), coins: s.coins, deaths: s.deaths });
}

function respawn(s) {
  const fresh = createStage(s.level, s.tuning, {
    checkpoint: s.checkpoint, taken: s.taken, medals: s.medals, coins: s.coins, deaths: s.deaths, time: s.time,
  });
  Object.assign(s, fresh);
  s.events.push({ type: 'respawn' });
}

function updateShots(s, dt) {
  const p = s.p;
  for (const o of s.shots) {
    o.t += dt;
    o.vy += (o.g ?? 0) * dt;
    o.x += o.vx * dt; o.y += o.vy * dt;
    const tx = Math.floor((o.x + o.w / 2) / TS), ty = Math.floor((o.y + o.h / 2) / TS);
    if (solidAt(s, tx, ty) || o.t > 6 || o.y > s.level.ph) { o.dead = true; continue; }
    if (overlap(p, o) && s.status === 'play') {
      if (o.stompable && p.vy > 0 && p.prevBottom <= o.y + 5) {
        o.dead = true; p.vy = -s.tuning.player.stompBounce; s.hitstop = 3;
        s.events.push({ type: 'stomp', x: o.x, y: o.y, combo: ++p.combo, enemy: 'pin' });
      } else { hurt(s, 'shot'); if (o.kind === 'pin') o.dead = true; }
    }
  }
  s.shots = s.shots.filter(o => !o.dead);
}

function updateItems(s, dt) {
  const p = s.p;
  for (const it of s.items) {
    it.t += dt;
    if (it.kind === 'wata') {
      if (it.t < 0.45) { it.y += it.vy * dt; }
      else {
        it.vx = 26 * it.dir;
        it.vy = Math.sin(it.t * 3) * 14;
        if (moveX(s, it, it.vx * dt, null)) it.dir *= -1;
        it.y += it.vy * dt;
      }
      if (overlap(p, it) && s.status === 'play') {
        it.dead = true;
        if (!p.power) { p.power = true; s.hitstop = s.tuning.hitstop.power; }
        s.events.push({ type: 'power', x: it.x + 6, y: it.y + 6 });
      }
      if (it.y > s.level.ph) it.dead = true;
    } else if (it.kind === 'knot') {
      it.y = Math.min(it.y + 30 * dt, it.floor);
    }
  }
  s.items = s.items.filter(i => !i.dead);
}

// ---- カメラ ----
function snapCamera(s) {
  const V = s.tuning.view, p = s.p;
  s.cam.x = clampCamX(s, p.x + p.w / 2 - V.w / 2);
  s.cam.ty = p.y + p.h / 2 - V.h * 0.58;
  s.cam.y = clampCamY(s, s.cam.ty);
}
const clampCamX = (s, x) => s.lock ? Math.max(s.lock.x, Math.min(s.lock.x + s.lock.w - s.tuning.view.w, x)) : Math.max(0, Math.min(s.level.pw - s.tuning.view.w, x));
const clampCamY = (s, y) => Math.max(0, Math.min(s.level.ph - s.tuning.view.h, y));
function updateCamera(s, dt) {
  const C = s.tuning.camera, V = s.tuning.view, p = s.p, cam = s.cam;
  const moving = Math.abs(p.vx) > 30;
  const want = moving ? Math.sign(p.vx) * C.lookAhead : cam.look;
  cam.look += (want - cam.look) * Math.min(1, C.lookEase * dt);
  const tx = clampCamX(s, p.x + p.w / 2 - V.w / 2 + cam.look);
  cam.x += (tx - cam.x) * Math.min(1, C.followX * dt);
  cam.x = clampCamX(s, cam.x);
  // 縦: 着地した高さに合わせる。画面の上下の余白を越えたときだけ追う
  const py = p.y + p.h / 2;
  if (p.onGround || p.ride >= 0) cam.ty = py - V.h * 0.58;
  if (py - cam.y < C.upMargin) cam.ty = Math.min(cam.ty, py - C.upMargin);
  if (cam.y + V.h - py < C.downMargin) cam.ty = Math.max(cam.ty, py - V.h + C.downMargin);
  cam.y += (clampCamY(s, cam.ty) - cam.y) * Math.min(1, C.followY * dt);
  cam.y = clampCamY(s, cam.y);
}

// ボットや外部用: 進み具合の目安
export function progress(s) { return s.p.x / s.level.pw; }
