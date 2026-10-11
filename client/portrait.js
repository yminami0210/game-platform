// 似顔絵: 台帳の「見た目」（顔・目・まゆ・口・髪・肌・体型・服・小物）から描く。
// カード・台帳・窓口のプレビュー・建物の中・目線の画面で同じ絵を使う。
import { BODY_SHAPE } from './shared/looks.js';

const INK = '#22324f';
const cache = new Map();

// 胸から上の似顔絵を (cx, cy) を中心に size の正方形へ描く
export function drawPortrait(g, look, cx, cy, size, { bg = '#fbfaf4' } = {}) {
  const l = look || {};
  const u = size / 100; // 100 を一辺とした座標で描く
  const X = (v) => cx + (v - 50) * u, Y = (v) => cy + (v - 50) * u;
  const [bw] = BODY_SHAPE[l.body] || [1, 1];
  g.save();
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.lineWidth = Math.max(1, 2.2 * u); g.strokeStyle = INK;
  if (bg) { g.fillStyle = bg; g.beginPath(); g.arc(cx, cy, size / 2, 0, 7); g.fill(); }
  g.beginPath(); g.arc(cx, cy, size / 2, 0, 7); g.clip();
  // 肩と服
  const sw = 34 * bw;
  g.fillStyle = l.top || '#3a6aa0';
  g.beginPath(); g.moveTo(X(50 - sw), Y(102)); g.quadraticCurveTo(X(50 - sw), Y(74), X(50), Y(72)); g.quadraticCurveTo(X(50 + sw), Y(74), X(50 + sw), Y(102)); g.closePath(); g.fill(); g.stroke();
  // 襟
  g.fillStyle = '#fbfaf4'; g.beginPath(); g.moveTo(X(42), Y(73)); g.lineTo(X(50), Y(84)); g.lineTo(X(58), Y(73)); g.closePath(); g.fill(); g.stroke();
  if (l.extra === 'scarf') { g.fillStyle = '#e9e6dc'; g.fillRect(X(36), Y(70), 28 * u, 6 * u); g.strokeRect(X(36), Y(70), 28 * u, 6 * u); }
  // 首
  g.fillStyle = l.skin || '#f3d2b4'; g.fillRect(X(45), Y(62), 10 * u, 12 * u);
  // 後ろ髪（長髪・おかっぱ・パーマ）
  const hc = l.hairColor || '#1f1b18';
  g.fillStyle = hc;
  if (l.hair === 'long') { g.beginPath(); g.ellipse(X(50), Y(52), 25 * u, 28 * u, 0, 0, 7); g.fill(); g.stroke(); }
  if (l.hair === 'bob') { g.beginPath(); g.roundRect(X(26), Y(26), 48 * u, 40 * u, 14 * u); g.fill(); g.stroke(); }
  if (l.hair === 'perm') for (const [px, py] of [[30, 40], [70, 40], [32, 56], [68, 56]]) { g.beginPath(); g.arc(X(px), Y(py), 9 * u, 0, 7); g.fill(); g.stroke(); }
  // 耳
  g.fillStyle = l.skin || '#f3d2b4';
  for (const ex of [29, 71]) { g.beginPath(); g.ellipse(X(ex), Y(47), 4 * u, 6 * u, 0, 0, 7); g.fill(); g.stroke(); }
  // 顔
  g.beginPath();
  const face = l.face || 'round';
  if (face === 'oval') g.ellipse(X(50), Y(46), 20 * u, 25 * u, 0, 0, 7);
  else if (face === 'square') g.roundRect(X(29), Y(24), 42 * u, 44 * u, 11 * u);
  else if (face === 'egg') { g.moveTo(X(50), Y(22)); g.bezierCurveTo(X(76), Y(22), X(72), Y(62), X(50), Y(69)); g.bezierCurveTo(X(28), Y(62), X(24), Y(22), X(50), Y(22)); }
  else g.ellipse(X(50), Y(46), 22 * u, 22 * u, 0, 0, 7);
  g.fill(); g.stroke();
  // ほお
  g.fillStyle = 'rgba(242,140,140,.35)';
  for (const ex of [36, 64]) { g.beginPath(); g.ellipse(X(ex), Y(54), 4.5 * u, 3 * u, 0, 0, 7); g.fill(); }
  // 前髪
  g.fillStyle = hc;
  const hair = l.hair || 'short';
  g.beginPath();
  if (hair === 'crop') g.rect(X(29), Y(20), 42 * u, 12 * u);
  else if (hair === 'short') { g.moveTo(X(28), Y(40)); g.quadraticCurveTo(X(28), Y(18), X(50), Y(19)); g.quadraticCurveTo(X(72), Y(18), X(72), Y(40)); g.quadraticCurveTo(X(60), Y(28), X(28), Y(40)); }
  else if (hair === 'parted') { g.moveTo(X(27), Y(42)); g.quadraticCurveTo(X(27), Y(18), X(52), Y(19)); g.quadraticCurveTo(X(74), Y(20), X(73), Y(40)); g.lineTo(X(58), Y(29)); g.quadraticCurveTo(X(40), Y(28), X(27), Y(42)); }
  else if (hair === 'perm') { for (const [px, py] of [[34, 27], [44, 22], [56, 22], [66, 27]]) { g.moveTo(X(px + 8), Y(py)); g.arc(X(px), Y(py), 8 * u, 0, 7); } }
  else if (hair === 'bob' || hair === 'long') { g.moveTo(X(27), Y(40)); g.quadraticCurveTo(X(28), Y(19), X(50), Y(19)); g.quadraticCurveTo(X(72), Y(19), X(73), Y(40)); g.lineTo(X(73), Y(36)); g.lineTo(X(27), Y(36)); }
  else if (hair === 'bun') { g.moveTo(X(58), Y(13)); g.arc(X(50), Y(13), 8 * u, 0, 7); g.moveTo(X(28), Y(38)); g.quadraticCurveTo(X(28), Y(20), X(50), Y(20)); g.quadraticCurveTo(X(72), Y(20), X(72), Y(38)); g.quadraticCurveTo(X(50), Y(27), X(28), Y(38)); }
  if (hair !== 'bald') { g.fill(); g.stroke(); }
  else { g.strokeStyle = 'rgba(34,50,79,.25)'; g.beginPath(); g.arc(X(42), Y(30), 4 * u, 0, 7); g.stroke(); g.strokeStyle = INK; }
  // まゆ
  g.lineWidth = Math.max(1, (l.brows === 'thick' ? 3.4 : 1.8) * u);
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(X(50 + s * 5), Y(38)); g.lineTo(X(50 + s * 14), Y(l.eyes === 'sharp' ? 35 : 37)); g.stroke(); }
  // 目
  g.lineWidth = Math.max(1, 2.2 * u); g.fillStyle = INK;
  for (const s of [-1, 1]) {
    const ex = X(50 + s * 9.5), ey = Y(45);
    g.beginPath();
    if (l.eyes === 'smile') { g.arc(ex, ey + 1.5 * u, 3.4 * u, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
    else if (l.eyes === 'droop') { g.ellipse(ex, ey, 2.4 * u, 3 * u, 0, 0, 7); g.fill(); g.beginPath(); g.moveTo(ex - 3 * u * s * -1, ey - 3.5 * u); g.lineTo(ex + 4 * u * s, ey - 1.5 * u); g.stroke(); }
    else if (l.eyes === 'sharp') { g.moveTo(ex - 4 * u, ey + s * 0.8 * u); g.lineTo(ex + 4 * u, ey - s * 0.8 * u); g.lineWidth = Math.max(1, 3 * u); g.stroke(); g.lineWidth = Math.max(1, 2.2 * u); }
    else { g.ellipse(ex, ey, 2.6 * u, 3.2 * u, 0, 0, 7); g.fill(); }
  }
  // 鼻と口
  g.beginPath(); g.moveTo(X(50), Y(49)); g.lineTo(X(49), Y(53)); g.stroke();
  g.beginPath();
  if (l.mouth === 'flat') { g.moveTo(X(44), Y(60)); g.lineTo(X(56), Y(60)); g.stroke(); }
  else if (l.mouth === 'open') { g.fillStyle = '#b8483e'; g.ellipse(X(50), Y(60), 5 * u, 3.6 * u, 0, 0, 7); g.fill(); g.stroke(); }
  else { g.arc(X(50), Y(56), 6.5 * u, Math.PI * 0.2, Math.PI * 0.8); g.stroke(); }
  // 小物
  if (l.extra === 'glasses') {
    g.lineWidth = Math.max(1, 1.8 * u);
    for (const s of [-1, 1]) { g.beginPath(); g.roundRect(X(50 + s * 9.5) - 6 * u, Y(45) - 4.5 * u, 12 * u, 9 * u, 3 * u); g.stroke(); }
    g.beginPath(); g.moveTo(X(46.5), Y(45)); g.lineTo(X(53.5), Y(45)); g.stroke();
  } else if (l.extra === 'hat') {
    g.fillStyle = '#6b5a4c'; g.beginPath(); g.ellipse(X(50), Y(24), 30 * u, 6 * u, 0, 0, 7); g.fill(); g.stroke();
    g.beginPath(); g.roundRect(X(34), Y(8), 32 * u, 16 * u, 6 * u); g.fill(); g.stroke();
    g.fillStyle = '#c8463a'; g.fillRect(X(34), Y(19), 32 * u, 4 * u);
  } else if (l.extra === 'scarf') {
    g.fillStyle = '#efe6d0'; g.fillRect(X(28), Y(27), 44 * u, 6 * u); g.strokeRect(X(28), Y(27), 44 * u, 6 * u);
  }
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

// 全身の小さな人形（建物の中・目線の画面・地図で使う）。(x, y) は足もと。h は背の高さ（画面の px）
export function drawFigure(g, look, x, y, h, { seated = false, outline = true } = {}) {
  const l = look || {};
  const [bw, bh] = BODY_SHAPE[l.body] || [1, 1];
  const H = h * bh, w = h * 0.34 * bw;
  const head = h * 0.2;
  const legH = seated ? H * 0.14 : H * 0.34;
  const bodyH = H * 0.4;
  g.save();
  g.lineWidth = Math.max(1, h * 0.025); g.strokeStyle = INK;
  // 足
  g.fillStyle = l.bottom || '#2b3a55';
  g.fillRect(x - w * 0.42, y - legH, w * 0.36, legH); g.fillRect(x + w * 0.06, y - legH, w * 0.36, legH);
  if (outline && h > 18) { g.strokeRect(x - w * 0.42, y - legH, w * 0.36, legH); g.strokeRect(x + w * 0.06, y - legH, w * 0.36, legH); }
  // 胴
  const top = y - legH - bodyH;
  g.fillStyle = l.top || '#3a6aa0';
  g.beginPath(); g.roundRect(x - w / 2, top, w, bodyH, w * 0.3); g.fill(); if (outline && h > 10) g.stroke();
  // 頭
  const hy = top - head * 0.95;
  g.fillStyle = l.skin || '#f3d2b4';
  g.beginPath(); g.arc(x, hy, head, 0, 7); g.fill(); if (outline && h > 10) g.stroke();
  if (l.hair !== 'bald') {
    g.fillStyle = l.hairColor || '#1f1b18';
    g.beginPath(); g.arc(x, hy - head * 0.15, head * 1.02, Math.PI * 1.02, Math.PI * 1.98); g.closePath(); g.fill();
    if (l.hair === 'long' || l.hair === 'bob') g.fillRect(x - head * 1.02, hy - head * 0.2, head * 0.35, head * (l.hair === 'long' ? 1.6 : 0.9));
    if (l.hair === 'long' || l.hair === 'bob') g.fillRect(x + head * 0.67, hy - head * 0.2, head * 0.35, head * (l.hair === 'long' ? 1.6 : 0.9));
    if (l.hair === 'bun') { g.beginPath(); g.arc(x, hy - head * 1.15, head * 0.4, 0, 7); g.fill(); }
  }
  if (l.extra === 'hat') { g.fillStyle = '#6b5a4c'; g.fillRect(x - head * 1.3, hy - head * 0.75, head * 2.6, head * 0.3); g.fillRect(x - head * 0.8, hy - head * 1.4, head * 1.6, head * 0.7); }
  if (h > 26) {
    g.fillStyle = INK;
    for (const s of [-1, 1]) { g.beginPath(); g.arc(x + s * head * 0.38, hy + head * 0.1, Math.max(0.8, head * 0.1), 0, 7); g.fill(); }
    if (l.extra === 'glasses') { g.lineWidth = Math.max(1, head * 0.08); for (const s of [-1, 1]) { g.beginPath(); g.arc(x + s * head * 0.38, hy + head * 0.1, head * 0.25, 0, 7); g.stroke(); } }
  }
  g.restore();
}
