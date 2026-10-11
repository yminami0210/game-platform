// 似顔絵と人形: 台帳の「見た目」（顔・目・まゆ・口・髪・肌・体型・服・小物）から描く。
// カード・台帳・窓口のプレビュー・地図・建物の中・目線の画面で同じ絵を使う。
// 人形は向き（正面・後ろ・左・右）を持ち、歩くと手足が振れる。
import { BODY_SHAPE } from './shared/looks.js';

const INK = '#22324f';
const SHOE = '#3a2a22';
const cache = new Map();

const shade = (hex, k) => { // 色を少し暗く（k<0）・明るく（k>0）
  const n = parseInt(String(hex || '#888888').slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
};

// 画面上の進む向き（vx: 右が正、vy: 手前が正）から、人形の向きを決める
export function facingFromScreen(vx, vy) {
  if (Math.abs(vy) >= Math.abs(vx) * 0.75) return vy >= 0 ? 'front' : 'back';
  return vx >= 0 ? 'right' : 'left';
}

// ---- 頭（100 を一辺とした座標。顔の中心はおおよそ (50, 46)、顔の半径は 22） ----
function headFront(g, l, X, Y, u, detail) {
  const hc = l.hairColor || '#1f1b18', skin = l.skin || '#f3d2b4', hair = l.hair || 'short';
  g.fillStyle = hc;
  // 後ろ髪
  if (hair === 'long') { g.beginPath(); g.moveTo(X(26), Y(44)); g.quadraticCurveTo(X(24), Y(20), X(50), Y(19)); g.quadraticCurveTo(X(76), Y(20), X(74), Y(44)); g.lineTo(X(77), Y(80)); g.quadraticCurveTo(X(50), Y(86), X(23), Y(80)); g.closePath(); g.fill(); g.stroke(); }
  if (hair === 'bob') { g.beginPath(); g.moveTo(X(25), Y(64)); g.lineTo(X(25), Y(40)); g.quadraticCurveTo(X(26), Y(19), X(50), Y(19)); g.quadraticCurveTo(X(74), Y(19), X(75), Y(40)); g.lineTo(X(75), Y(64)); g.closePath(); g.fill(); g.stroke(); }
  if (hair === 'perm') for (const [px, py] of [[29, 40], [71, 40], [30, 55], [70, 55]]) { g.beginPath(); g.arc(X(px), Y(py), 9 * u, 0, 7); g.fill(); g.stroke(); }
  // 耳
  g.fillStyle = skin;
  for (const ex of [28.5, 71.5]) { g.beginPath(); g.ellipse(X(ex), Y(48), 4 * u, 6 * u, 0, 0, 7); g.fill(); g.stroke(); }
  // 顔の形（あごにかけて少し細く）
  g.beginPath();
  const face = l.face || 'round';
  if (face === 'oval') { g.moveTo(X(50), Y(21)); g.bezierCurveTo(X(73), Y(21), X(73), Y(58), X(50), Y(71)); g.bezierCurveTo(X(27), Y(58), X(27), Y(21), X(50), Y(21)); }
  else if (face === 'square') { g.moveTo(X(36), Y(23)); g.lineTo(X(64), Y(23)); g.quadraticCurveTo(X(72), Y(24), X(72), Y(36)); g.lineTo(X(71), Y(56)); g.quadraticCurveTo(X(68), Y(67), X(50), Y(68)); g.quadraticCurveTo(X(32), Y(67), X(29), Y(56)); g.lineTo(X(28), Y(36)); g.quadraticCurveTo(X(28), Y(24), X(36), Y(23)); }
  else if (face === 'egg') { g.moveTo(X(50), Y(22)); g.bezierCurveTo(X(76), Y(22), X(72), Y(62), X(50), Y(69)); g.bezierCurveTo(X(28), Y(62), X(24), Y(22), X(50), Y(22)); }
  else { g.moveTo(X(50), Y(23)); g.bezierCurveTo(X(76), Y(23), X(75), Y(60), X(50), Y(67)); g.bezierCurveTo(X(25), Y(60), X(24), Y(23), X(50), Y(23)); }
  g.fillStyle = skin; g.fill(); g.stroke();
  // 前髪
  g.fillStyle = hc;
  g.beginPath();
  if (hair === 'crop') { g.moveTo(X(28), Y(36)); g.lineTo(X(29), Y(22)); g.quadraticCurveTo(X(50), Y(16), X(71), Y(22)); g.lineTo(X(72), Y(36)); g.lineTo(X(68), Y(30)); g.lineTo(X(32), Y(30)); g.closePath(); }
  else if (hair === 'short') { g.moveTo(X(27), Y(42)); g.quadraticCurveTo(X(26), Y(17), X(50), Y(18)); g.quadraticCurveTo(X(74), Y(17), X(73), Y(42)); g.quadraticCurveTo(X(70), Y(31), X(60), Y(30)); g.quadraticCurveTo(X(52), Y(34), X(44), Y(30)); g.quadraticCurveTo(X(32), Y(31), X(27), Y(42)); }
  else if (hair === 'parted') { g.moveTo(X(27), Y(43)); g.quadraticCurveTo(X(26), Y(17), X(52), Y(18)); g.quadraticCurveTo(X(75), Y(19), X(73), Y(41)); g.quadraticCurveTo(X(68), Y(30), X(58), Y(28)); g.quadraticCurveTo(X(40), Y(27), X(27), Y(43)); }
  else if (hair === 'perm') { for (const [px, py] of [[33, 27], [43, 21], [55, 21], [66, 27], [50, 26]]) { g.moveTo(X(px + 8), Y(py)); g.arc(X(px), Y(py), 8 * u, 0, 7); } }
  else if (hair === 'bob' || hair === 'long') { g.moveTo(X(27), Y(42)); g.quadraticCurveTo(X(27), Y(18), X(50), Y(18)); g.quadraticCurveTo(X(73), Y(18), X(73), Y(42)); g.lineTo(X(70), Y(36)); g.quadraticCurveTo(X(50), Y(33), X(30), Y(36)); g.closePath(); }
  else if (hair === 'bun') { g.moveTo(X(58), Y(13)); g.arc(X(50), Y(13), 8 * u, 0, 7); g.moveTo(X(28), Y(40)); g.quadraticCurveTo(X(28), Y(19), X(50), Y(19)); g.quadraticCurveTo(X(72), Y(19), X(72), Y(40)); g.quadraticCurveTo(X(62), Y(28), X(50), Y(28)); g.quadraticCurveTo(X(38), Y(28), X(28), Y(40)); }
  if (hair !== 'bald') {
    g.fill(); g.stroke();
    if (detail) { g.strokeStyle = 'rgba(255,255,255,.28)'; g.beginPath(); g.moveTo(X(38), Y(23)); g.quadraticCurveTo(X(46), Y(20), X(54), Y(21)); g.stroke(); g.strokeStyle = INK; } // 髪のつや
  } else { g.strokeStyle = 'rgba(34,50,79,.25)'; g.beginPath(); g.arc(X(41), Y(30), 4 * u, Math.PI, Math.PI * 1.8); g.stroke(); g.strokeStyle = INK; }
  if (!detail) { // 小さいときは目だけ
    g.fillStyle = INK;
    for (const s of [-1, 1]) { g.beginPath(); g.arc(X(50 + s * 9.5), Y(46), Math.max(0.7, 2.6 * u), 0, 7); g.fill(); }
    return headExtra(g, l, X, Y, u, 'front');
  }
  // ほお
  g.fillStyle = 'rgba(240,130,120,.32)';
  for (const ex of [36, 64]) { g.beginPath(); g.ellipse(X(ex), Y(55), 4.8 * u, 3 * u, 0, 0, 7); g.fill(); }
  // まゆ
  const lw = g.lineWidth;
  g.lineWidth = Math.max(0.8, (l.brows === 'thick' ? 3.2 : 1.7) * u);
  g.strokeStyle = shade(hc, -0.2);
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(X(50 + s * 5), Y(38)); g.quadraticCurveTo(X(50 + s * 10), Y(l.eyes === 'sharp' ? 36.5 : 35.5), X(50 + s * 14), Y(l.eyes === 'droop' ? 38.5 : 37)); g.stroke(); }
  g.strokeStyle = INK; g.lineWidth = lw;
  // 目（白目と黒目、光）
  for (const s of [-1, 1]) {
    const ex = X(50 + s * 9.5), ey = Y(46);
    if (l.eyes === 'smile') { g.beginPath(); g.arc(ex, ey + 1.5 * u, 3.4 * u, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); continue; }
    const rx = (l.eyes === 'sharp' ? 3.8 : 3.2) * u, ry = (l.eyes === 'sharp' ? 2.3 : l.eyes === 'droop' ? 3.1 : 3.4) * u;
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(ex, ey, rx, ry, l.eyes === 'droop' ? s * 0.15 : l.eyes === 'sharp' ? -s * 0.2 : 0, 0, 7); g.fill();
    g.fillStyle = '#2a211c'; g.beginPath(); g.ellipse(ex, ey + 0.3 * u, rx * 0.62, ry * 0.85, 0, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(ex + 0.9 * u, ey - 0.8 * u, Math.max(0.5, 0.9 * u), 0, 7); g.fill();
    g.beginPath(); g.moveTo(ex - rx, ey - ry * 0.4); g.quadraticCurveTo(ex, ey - ry * 1.35, ex + rx, ey - ry * 0.4); g.stroke(); // まぶた
  }
  // 鼻（影でかく）と口
  g.strokeStyle = shade(skin, -0.35);
  g.beginPath(); g.moveTo(X(51), Y(48)); g.quadraticCurveTo(X(53.5), Y(53), X(49.5), Y(54)); g.stroke();
  g.strokeStyle = INK;
  g.beginPath();
  if (l.mouth === 'flat') { g.moveTo(X(45), Y(60)); g.quadraticCurveTo(X(50), Y(61), X(55), Y(60)); g.stroke(); }
  else if (l.mouth === 'open') { g.fillStyle = '#9c3a33'; g.moveTo(X(44.5), Y(58.5)); g.quadraticCurveTo(X(50), Y(57.5), X(55.5), Y(58.5)); g.quadraticCurveTo(X(50), Y(66), X(44.5), Y(58.5)); g.fill(); g.stroke(); g.fillStyle = '#e88a86'; g.beginPath(); g.ellipse(X(50), Y(62), 3 * u, 1.4 * u, 0, 0, 7); g.fill(); }
  else { g.moveTo(X(44), Y(58)); g.quadraticCurveTo(X(50), Y(63.5), X(56), Y(58)); g.stroke(); }
  headExtra(g, l, X, Y, u, 'front');
}

function headBack(g, l, X, Y, u) {
  const hc = l.hairColor || '#1f1b18', skin = l.skin || '#f3d2b4', hair = l.hair || 'short';
  g.fillStyle = skin;
  for (const ex of [28.5, 71.5]) { g.beginPath(); g.ellipse(X(ex), Y(48), 4 * u, 6 * u, 0, 0, 7); g.fill(); g.stroke(); }
  g.beginPath(); g.ellipse(X(50), Y(45), 22.5 * u, 23 * u, 0, 0, 7); g.fill(); g.stroke();
  if (hair === 'bald') return headExtra(g, l, X, Y, u, 'back');
  g.fillStyle = hc;
  g.beginPath();
  const low = { crop: 56, short: 62, parted: 62, perm: 62, bob: 66, long: 84, bun: 60 }[hair] || 58;
  g.moveTo(X(27), Y(Math.min(low, 60))); g.quadraticCurveTo(X(25), Y(18), X(50), Y(18)); g.quadraticCurveTo(X(75), Y(18), X(73), Y(Math.min(low, 60)));
  if (low > 60) { g.lineTo(X(hair === 'long' ? 77 : 75), Y(low)); g.quadraticCurveTo(X(50), Y(low + 4), X(hair === 'long' ? 23 : 25), Y(low)); }
  else g.quadraticCurveTo(X(50), Y(low + 5), X(27), Y(Math.min(low, 60)));
  g.closePath(); g.fill(); g.stroke();
  if (hair === 'perm') for (const [px, py] of [[34, 30], [50, 25], [66, 30], [40, 46], [60, 46], [50, 56]]) { g.beginPath(); g.arc(X(px), Y(py), 8 * u, 0, 7); g.fill(); g.stroke(); }
  if (hair === 'bun') { g.beginPath(); g.arc(X(50), Y(22), 9 * u, 0, 7); g.fill(); g.stroke(); }
  headExtra(g, l, X, Y, u, 'back');
}

// 右を向いた横顔（左向きは呼ぶ側で左右反転する）
function headSide(g, l, X, Y, u, detail) {
  const hc = l.hairColor || '#1f1b18', skin = l.skin || '#f3d2b4', hair = l.hair || 'short';
  if (hair === 'long' || hair === 'bob') { g.fillStyle = hc; g.beginPath(); g.moveTo(X(30), Y(30)); g.lineTo(X(26), Y(hair === 'long' ? 82 : 64)); g.lineTo(X(52), Y(hair === 'long' ? 82 : 64)); g.lineTo(X(54), Y(36)); g.closePath(); g.fill(); g.stroke(); }
  // 頭と顔（鼻とあごの線）
  g.fillStyle = skin;
  g.beginPath();
  g.moveTo(X(48), Y(22)); g.bezierCurveTo(X(66), Y(21), X(73), Y(32), X(72), Y(43));
  g.lineTo(X(76), Y(50)); g.lineTo(X(71.5), Y(52)); // 鼻
  g.quadraticCurveTo(X(72), Y(60), X(66), Y(64)); g.quadraticCurveTo(X(58), Y(70), X(48), Y(66));
  g.bezierCurveTo(X(30), Y(66), X(26), Y(50), X(28), Y(38)); g.bezierCurveTo(X(30), Y(26), X(38), Y(22), X(48), Y(22));
  g.closePath(); g.fill(); g.stroke();
  // 耳
  g.beginPath(); g.ellipse(X(45), Y(48), 4 * u, 6 * u, 0, 0, 7); g.fill(); g.stroke();
  // 髪（後ろ半分と頭頂）
  if (hair !== 'bald') {
    g.fillStyle = hc;
    g.beginPath();
    const back = { crop: 50, short: 56, parted: 56, perm: 58, bob: 62, long: 62, bun: 56 }[hair] || 56;
    g.moveTo(X(hair === 'crop' ? 62 : 66), Y(hair === 'parted' ? 30 : 33)); g.bezierCurveTo(X(64), Y(18), X(36), Y(14), X(28), Y(32));
    g.quadraticCurveTo(X(25), Y(back - 8), X(34), Y(back)); g.lineTo(X(42), Y(back - 2)); g.lineTo(X(41), Y(40)); g.quadraticCurveTo(X(52), Y(36), X(hair === 'crop' ? 62 : 66), Y(hair === 'parted' ? 30 : 33));
    g.closePath(); g.fill(); g.stroke();
    if (hair === 'perm') for (const [px, py] of [[34, 28], [46, 22], [58, 24], [30, 44], [36, 54]]) { g.beginPath(); g.arc(X(px), Y(py), 7 * u, 0, 7); g.fill(); g.stroke(); }
    if (hair === 'bun') { g.beginPath(); g.arc(X(32), Y(22), 8 * u, 0, 7); g.fill(); g.stroke(); }
  }
  // 目・まゆ・口
  g.fillStyle = INK;
  if (l.eyes === 'smile') { g.beginPath(); g.arc(X(63), Y(47), 2.8 * u, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
  else { g.beginPath(); g.ellipse(X(63.5), Y(46), Math.max(0.6, 1.8 * u), Math.max(0.6, (l.eyes === 'sharp' ? 1.6 : 2.6) * u), 0, 0, 7); g.fill(); }
  if (detail) {
    const lw = g.lineWidth;
    g.lineWidth = Math.max(0.8, (l.brows === 'thick' ? 3 : 1.6) * u); g.strokeStyle = shade(hc, -0.2);
    g.beginPath(); g.moveTo(X(59), Y(38.5)); g.lineTo(X(68), Y(37.5)); g.stroke();
    g.lineWidth = lw; g.strokeStyle = INK;
    g.fillStyle = 'rgba(240,130,120,.32)'; g.beginPath(); g.ellipse(X(62), Y(55), 4 * u, 2.6 * u, 0, 0, 7); g.fill();
    g.beginPath(); g.moveTo(X(66), Y(59)); g.quadraticCurveTo(X(69), Y(60.5), X(70.5), Y(58.5)); g.stroke();
  }
  headExtra(g, l, X, Y, u, 'side');
}

function headExtra(g, l, X, Y, u, view) {
  if (l.extra === 'glasses' && view !== 'back') {
    const lw = g.lineWidth; g.lineWidth = Math.max(0.8, 1.7 * u);
    if (view === 'front') {
      for (const s of [-1, 1]) { g.beginPath(); g.roundRect(X(50 + s * 9.5) - 6 * u, Y(46) - 4.6 * u, 12 * u, 9.2 * u, 3 * u); g.stroke(); }
      g.beginPath(); g.moveTo(X(46.5), Y(45)); g.lineTo(X(53.5), Y(45)); g.stroke();
    } else { g.beginPath(); g.roundRect(X(59), Y(42), 9 * u, 8 * u, 2.5 * u); g.stroke(); g.beginPath(); g.moveTo(X(59), Y(45)); g.lineTo(X(46), Y(44)); g.stroke(); }
    g.lineWidth = lw;
  } else if (l.extra === 'hat') {
    g.fillStyle = '#6b5a4c';
    const cx = view === 'side' ? 50 : 50, bw = view === 'side' ? 34 : 30;
    g.beginPath(); g.ellipse(X(cx + (view === 'side' ? 4 : 0)), Y(25), bw * u, 5.5 * u, 0, 0, 7); g.fill(); g.stroke();
    g.beginPath(); g.roundRect(X(34), Y(9), 32 * u, 16 * u, 6 * u); g.fill(); g.stroke();
    g.fillStyle = '#c8463a'; g.fillRect(X(34), Y(19.5), 32 * u, 4 * u);
  } else if (l.extra === 'scarf') {
    g.fillStyle = '#efe6d0'; g.fillRect(X(27), Y(28), 46 * u, 6 * u); g.strokeRect(X(27), Y(28), 46 * u, 6 * u);
    if (view === 'back') { g.beginPath(); g.moveTo(X(50), Y(33)); g.lineTo(X(46), Y(42)); g.lineTo(X(54), Y(42)); g.closePath(); g.fill(); g.stroke(); } // 結び目
  }
}

// 胸から上の似顔絵を (cx, cy) を中心に size の正方形へ描く
export function drawPortrait(g, look, cx, cy, size, { bg = '#fbfaf4' } = {}) {
  const l = look || {};
  const u = size / 100;
  const X = (v) => cx + (v - 50) * u, Y = (v) => cy + (v - 50) * u;
  const [bw] = BODY_SHAPE[l.body] || [1, 1];
  g.save();
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.lineWidth = Math.max(1, 2 * u); g.strokeStyle = INK;
  if (bg) { g.fillStyle = bg; g.beginPath(); g.arc(cx, cy, size / 2, 0, 7); g.fill(); }
  g.beginPath(); g.arc(cx, cy, size / 2, 0, 7); g.clip();
  // 肩と服（なで肩、襟、ボタン）
  const sw = 34 * bw;
  g.fillStyle = l.top || '#3a6aa0';
  g.beginPath(); g.moveTo(X(50 - sw), Y(104)); g.bezierCurveTo(X(50 - sw), Y(80), X(50 - sw * 0.6), Y(73), X(50), Y(72)); g.bezierCurveTo(X(50 + sw * 0.6), Y(73), X(50 + sw), Y(80), X(50 + sw), Y(104)); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = shade(l.top, -0.15); g.beginPath(); g.moveTo(X(50 - sw), Y(104)); g.bezierCurveTo(X(50 - sw), Y(88), X(50 - sw * 0.85), Y(82), X(50 - sw * 0.7), Y(80)); g.lineTo(X(50 - sw * 0.6), Y(104)); g.fill();
  // 首（あごの下に影）
  g.fillStyle = l.skin || '#f3d2b4'; g.beginPath(); g.moveTo(X(44), Y(62)); g.lineTo(X(44), Y(76)); g.quadraticCurveTo(X(50), Y(79), X(56), Y(76)); g.lineTo(X(56), Y(62)); g.fill(); g.stroke();
  g.fillStyle = 'rgba(34,50,79,.12)'; g.fillRect(X(44), Y(64), 12 * u, 4 * u);
  g.fillStyle = '#fbfaf4'; g.beginPath(); g.moveTo(X(41), Y(74)); g.lineTo(X(50), Y(86)); g.lineTo(X(59), Y(74)); g.lineTo(X(55), Y(73)); g.lineTo(X(50), Y(80)); g.lineTo(X(45), Y(73)); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = INK; for (const by of [91, 99]) { g.beginPath(); g.arc(X(50), Y(by), 1.3 * u, 0, 7); g.fill(); }
  if (l.extra === 'scarf') { g.fillStyle = '#e9e6dc'; g.fillRect(X(36), Y(70), 28 * u, 6 * u); g.strokeRect(X(36), Y(70), 28 * u, 6 * u); }
  headFront(g, l, X, Y, u, true);
  g.restore();
}

// 似顔絵の画像（data URL）。同じ見た目は使い回す
export function portraitUrl(look, size = 96) {
  const key = size + JSON.stringify(look || {});
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  drawPortrait(c.getContext('2d'), look, size / 2, size / 2, size);
  const url = c.toDataURL('image/png');
  if (cache.size > 800) cache.clear();
  cache.set(key, url);
  return url;
}

// 人ごとの決まった着こなし（台帳の性別と年齢から）
export function personStyle(info = {}) {
  return { skirt: info.sex === 'f' && info.age >= 13 && info.id % 4 !== 0, child: info.age < 13 };
}

// 全身の人形。(x, y) は足もと、h は背の高さ（画面の px）。
// facing: front | back | left | right。walk: 歩く動きの位相（止まっているときは null）
export function drawFigure(g, look, x, y, h, { seated = false, outline = true, facing = 'front', walk = null, skirt = false, child = false } = {}) {
  const l = look || {};
  const [bw, bh] = BODY_SHAPE[l.body] || [1, 1];
  const H = h * bh, Wd = h * bw;
  const r = H * (child ? 0.135 : 0.115);        // 頭の半径（4〜4.5 頭身）
  const drop = seated ? H * 0.25 : 0;
  const hip = y - H * 0.46 + drop, shoulder = y - H * 0.78 + drop;
  const headCy = shoulder - H * 0.035 - r * 0.92;
  const sw = Wd * (l.body === 'stout' ? 0.165 : 0.15), hw = Wd * (l.body === 'round' ? 0.15 : 0.125);
  const top = l.top || '#3a6aa0', bottom = l.bottom || '#2b3a55', skin = l.skin || '#f3d2b4';
  const swing = walk == null ? 0 : Math.sin(walk);
  const side = facing === 'left' || facing === 'right';
  const tiny = h < 14;
  g.save();
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.strokeStyle = INK; g.lineWidth = outline ? Math.max(0.7, h * 0.012) : 0.01;
  if (side && facing === 'left') { g.translate(x, 0); g.scale(-1, 1); x = 0; }
  const st = () => outline && g.stroke();
  // 影
  g.fillStyle = 'rgba(34,50,79,.18)'; g.beginPath(); g.ellipse(x, y, Wd * 0.2, Math.max(1, h * 0.025), 0, 0, 7); g.fill();

  const limb = (px, py, len, w, ang, color, end, endColor) => { // 肩や腰を支点に回す手足
    g.save(); g.translate(px, py); g.rotate(ang);
    g.fillStyle = color; g.beginPath(); g.roundRect(-w / 2, 0, w, len, w / 2); g.fill(); st();
    if (end) { g.fillStyle = endColor; g.beginPath(); end(len, w); g.fill(); st(); }
    g.restore();
  };
  const hand = (len, w) => g.arc(0, len, w * 0.48, 0, 7);
  const shoe = (dir) => (len, w) => g.ellipse(dir * w * 0.25, len, w * 0.75, w * 0.4, 0, 0, 7);
  const legLen = (seated ? H * 0.2 : y - hip) - H * 0.02, legW = Wd * 0.085;
  const armLen = H * 0.3, armW = Wd * 0.068;

  if (!side) {
    // 足（スカートなら脚は肌色で細く）
    const lift = (s) => (walk == null ? 0 : Math.max(0, s * swing) * H * 0.035);
    for (const s of [-1, 1]) {
      const lx = x + s * Wd * 0.052;
      g.save(); g.translate(0, -lift(s));
      if (seated) { g.fillStyle = bottom; g.beginPath(); g.roundRect(lx - legW / 2, hip, legW, legLen, legW / 2); g.fill(); st(); g.fillStyle = SHOE; g.beginPath(); g.ellipse(lx, hip + legLen, legW * 0.7, legW * 0.4, 0, 0, 7); g.fill(); }
      else limb(lx, hip, legLen, skirt ? legW * 0.7 : legW, 0, skirt ? skin : bottom, (len, w) => g.ellipse(0, len, w * 0.8, w * 0.42, 0, 0, 7), SHOE);
      g.restore();
    }
    if (skirt) { g.fillStyle = bottom; g.beginPath(); g.moveTo(x - hw, hip - H * 0.03); g.lineTo(x + hw, hip - H * 0.03); g.lineTo(x + hw * 1.35, hip + H * (seated ? 0.08 : 0.16)); g.lineTo(x - hw * 1.35, hip + H * (seated ? 0.08 : 0.16)); g.closePath(); g.fill(); st(); }
    // 腕（胴の後ろ側から）
    const aSw = swing * 0.12;
    for (const s of [-1, 1]) limb(x + s * sw * 0.92, shoulder + H * 0.03, armLen, armW, -s * 0.1 + s * aSw, top, hand, skin);
    // 胴
    g.fillStyle = top;
    g.beginPath();
    g.moveTo(x - sw * 0.55, shoulder - H * 0.005);
    g.quadraticCurveTo(x - sw, shoulder, x - sw, shoulder + H * 0.07);
    g.quadraticCurveTo(x - (l.body === 'round' ? sw * 1.12 : sw * 0.98), (shoulder + hip) / 2, x - hw, hip);
    g.lineTo(x + hw, hip);
    g.quadraticCurveTo(x + (l.body === 'round' ? sw * 1.12 : sw * 0.98), (shoulder + hip) / 2, x + sw, shoulder + H * 0.07);
    g.quadraticCurveTo(x + sw, shoulder, x + sw * 0.55, shoulder - H * 0.005);
    g.closePath(); g.fill(); st();
    if (!skirt && !tiny) { g.fillStyle = shade(bottom, -0.1); g.fillRect(x - hw, hip - H * 0.035, hw * 2, H * 0.035); } // ベルトのあたり
    if (!tiny && facing === 'front') { // 襟とボタン
      g.fillStyle = '#fbfaf4'; g.beginPath(); g.moveTo(x - sw * 0.42, shoulder); g.lineTo(x, shoulder + H * 0.07); g.lineTo(x + sw * 0.42, shoulder); g.closePath(); g.fill(); st();
      if (h > 40) { g.fillStyle = INK; for (const k of [0.13, 0.21]) { g.beginPath(); g.arc(x, shoulder + H * k, Math.max(0.6, h * 0.008), 0, 7); g.fill(); } }
    }
    // 腕を少し前に重ねる（正面のとき）
    if (facing === 'front' && !tiny) for (const s of [-1, 1]) { g.fillStyle = 'rgba(34,50,79,.10)'; g.fillRect(x + s * sw * 0.92 - armW * 0.1, shoulder + H * 0.06, armW * 0.2 * s, armLen * 0.6); }
  } else {
    // 横向き: 奥の手足は少し暗く
    const legA = walk == null ? (seated ? -1.35 : 0) : swing * 0.45;
    limb(x, hip, seated ? H * 0.17 : legLen, legW, seated ? -1.35 : -legA, shade(skirt ? skin : bottom, -0.2), shoe(1), SHOE);
    limb(x - Wd * 0.04, shoulder + H * 0.03, armLen, armW, walk == null ? 0.05 : -swing * 0.5, shade(top, -0.2), hand, shade(skin, -0.1));
    limb(x, hip, seated ? H * 0.17 : legLen, legW, seated ? -1.35 : legA, skirt ? skin : bottom, shoe(1), SHOE);
    if (skirt) { g.fillStyle = bottom; g.beginPath(); g.moveTo(x - Wd * 0.08, hip - H * 0.03); g.lineTo(x + Wd * 0.08, hip - H * 0.03); g.lineTo(x + Wd * (seated ? 0.24 : 0.12), hip + H * (seated ? 0.06 : 0.16)); g.lineTo(x - Wd * 0.11, hip + H * (seated ? 0.06 : 0.16)); g.closePath(); g.fill(); st(); }
    // 胴（おなかと背中）
    const tw = Wd * (l.body === 'round' ? 0.12 : l.body === 'stout' ? 0.105 : 0.09);
    g.fillStyle = top;
    g.beginPath();
    g.moveTo(x - tw * 0.8, shoulder); g.quadraticCurveTo(x, shoulder - H * 0.012, x + tw * 0.8, shoulder);
    g.quadraticCurveTo(x + tw * (l.body === 'round' ? 1.5 : 1.1), (shoulder + hip) / 2 + H * 0.04, x + tw, hip);
    g.lineTo(x - tw, hip); g.quadraticCurveTo(x - tw * 1.05, (shoulder + hip) / 2, x - tw * 0.8, shoulder);
    g.closePath(); g.fill(); st();
    limb(x + Wd * 0.01, shoulder + H * 0.03, armLen, armW, walk == null ? -0.05 : swing * 0.5, top, hand, skin);
  }
  // 首
  g.fillStyle = skin; g.fillRect(x - r * 0.28, headCy + r * 0.7, r * 0.56, shoulder - headCy - r * 0.6);
  // 頭（似顔絵と同じ部品）
  const u = r / 22;
  const X = (v) => x + (v - 50) * u, Y = (v) => headCy + (v - 46) * u;
  g.lineWidth = outline ? Math.max(0.6, Math.min(2 * u, h * 0.012)) : 0.01;
  if (tiny) { // 小さいときは丸と髪だけ
    g.fillStyle = skin; g.beginPath(); g.arc(x, headCy, r, 0, 7); g.fill();
    if (l.hair !== 'bald') { g.fillStyle = l.hairColor || '#1f1b18'; g.beginPath(); g.arc(x, headCy - r * 0.12, r * 1.02, facing === 'back' ? 0 : Math.PI * 1.02, facing === 'back' ? Math.PI * 2 : Math.PI * 1.98); g.fill(); }
  } else if (facing === 'back') headBack(g, l, X, Y, u);
  else if (side) headSide(g, l, X, Y, u, h > 50);
  else headFront(g, l, X, Y, u, h > 50);
  g.restore();
}
