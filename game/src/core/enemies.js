// 敵7種の動き。どれも動きがはっきり違うように作る（studio/gdd.md の表）。
import { moveX, moveY, solidAt } from './stage.js';

const SIZE = { iga: [12, 10], kona: [12, 10], choki: [12, 12], hari: [12, 11], tsumu: [12, 10], yubi: [16, 16], kedama: [12, 12] };
const STOMPABLE = { iga: true, kona: true, choki: true, hari: false, tsumu: true, yubi: false, kedama: true };

export function createEnemy(ent, id) {
  const [w, h] = SIZE[ent.type];
  const e = {
    id, type: ent.type, w, h, x: ent.x + (16 - w) / 2, y: ent.y + 16 - h, vx: 0, vy: 0, dir: -1,
    alive: true, deadT: 0, awake: false, st: 'idle', t: 0, onGround: false, stompable: STOMPABLE[ent.type],
  };
  e.sx = e.x; e.sy = e.y;
  if (ent.type === 'tsumu') e.y = e.sy = ent.y; // 天井にぶら下がる
  if (ent.type === 'kona') e.y = e.sy = ent.y + 3;
  if (ent.type === 'yubi') { e.x = ent.x; e.y = ent.y; e.t = (ent.tx % 4) * 0.4; }
  return e;
}

const G = 1500;
function fall(s, e, dt) {
  e.vy = Math.min(e.vy + G * dt, 320);
  const r = moveY(s, e, e.vy * dt, true);
  e.onGround = r === 1;
  if (r !== 0) e.vy = 0;
  if (e.y > s.level.ph + 16) { e.alive = false; e.deadT = 1; }
}
const edgeAhead = (s, e) => {
  const fx = e.dir > 0 ? e.x + e.w + 1 : e.x - 1;
  return !solidAt(s, Math.floor(fx / 16), Math.floor((e.y + e.h + 2) / 16)) && !oneWayAt(s, fx, e.y + e.h + 2);
};
const oneWayAt = (s, x, y) => s.tiles[Math.floor(y / 16) * s.level.w + Math.floor(x / 16)] === 3;

export function updateEnemy(s, e, dt) {
  const E = s.tuning.enemies, p = s.p;
  e.t += dt;
  switch (e.type) {
    case 'iga': { // 歩いて壁で折り返す
      if (moveX(s, e, e.dir * E.iga.speed * dt)) e.dir *= -1;
      fall(s, e, dt);
      break;
    }
    case 'hari': { // 段差の手前でも折り返す。背中が針
      if (e.onGround && edgeAhead(s, e)) e.dir *= -1;
      if (moveX(s, e, e.dir * E.hari.speed * dt)) e.dir *= -1;
      fall(s, e, dt);
      break;
    }
    case 'kona': { // 左右に飛び、上下にゆれる
      const K = E.kona;
      e.x += e.dir * K.speed * dt;
      if (e.x < e.sx - K.range) { e.x = e.sx - K.range; e.dir = 1; }
      if (e.x > e.sx + K.range) { e.x = e.sx + K.range; e.dir = -1; }
      e.y = e.sy + Math.sin(e.t * 3.1) * K.bob;
      break;
    }
    case 'choki': { // 近づくと、ためてから跳びかかる
      const C = E.choki;
      const dx = p.x - e.x;
      if (e.st === 'idle') { if (Math.abs(dx) < C.wake) { e.st = 'wait'; e.t = 0; } }
      else if (e.st === 'wait') {
        e.dir = dx < 0 ? -1 : 1; e.vx = 0;
        if (e.t > C.wait && e.onGround) { e.st = 'hop'; e.vy = -C.hopVY; e.vx = e.dir * C.hopVX; e.onGround = false; s.events.push({ type: 'hop', x: e.x + 6, y: e.y + e.h }); }
      } else if (e.st === 'hop') {
        if (moveX(s, e, e.vx * dt)) e.vx = 0;
      }
      fall(s, e, dt);
      if (e.st === 'hop' && e.onGround) { e.st = 'wait'; e.t = 0; e.vx = 0; }
      break;
    }
    case 'tsumu': { // 真下に来ると糸で落ちてきて、戻る
      const U = E.tsumu;
      const below = p.y > e.y && Math.abs(p.x + p.w / 2 - (e.x + e.w / 2)) < U.reach;
      if (e.st === 'idle') { if (below) { e.st = 'drop'; s.events.push({ type: 'drop', x: e.x + 6, y: e.y }); } }
      else if (e.st === 'drop') {
        const r = moveY(s, e, U.drop * dt, true);
        if (r === 1 || e.y - e.sy > 16 * 9) { e.st = 'wait'; e.t = 0; }
      } else if (e.st === 'wait') { if (e.t > U.wait) e.st = 'climb'; }
      else if (e.st === 'climb') { e.y -= U.climb * dt; if (e.y <= e.sy) { e.y = e.sy; e.st = 'idle'; } }
      break;
    }
    case 'yubi': { // その場で針を撃つ（上に乗れる）
      const Y = E.yubi;
      const dx = p.x + p.w / 2 - (e.x + 8);
      e.dir = dx < 0 ? -1 : 1;
      if (e.t > Y.period) {
        e.t = 0;
        if (Math.abs(dx) < Y.range && Math.abs(dx) > 20 && s.status === 'play') {
          s.shots.push({ kind: 'pin', x: e.x + (e.dir > 0 ? 14 : -10), y: e.y + 5, w: 12, h: 4, vx: e.dir * Y.shot, vy: 0, t: 0, stompable: true });
          s.events.push({ type: 'shoot', x: e.x + 8, y: e.y + 6 });
        }
      }
      break;
    }
    case 'kedama': { // 弾みながら進む
      const K = E.kedama;
      if (moveX(s, e, e.dir * K.speed * dt)) e.dir *= -1;
      fall(s, e, dt);
      if (e.onGround) { e.vy = -K.hop; e.onGround = false; }
      break;
    }
  }
}
