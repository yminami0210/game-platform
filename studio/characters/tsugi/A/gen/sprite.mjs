import fs from 'fs';
const W = 28, H = 28;
const PAL = { K: '#2b2420', R: '#b8372b', D: '#8f2a21', C: '#f0e6cf', B: '#26426b', Y: '#d39a22' };
function frame(o) {
  const g = Array.from({ length: H }, () => Array(W).fill('.'));
  const set = (x, y, c) => { if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = c; };
  const poly = (pts, c) => { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let ins = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y + .5) !== (yj > y + .5) && (x + .5) < (xj - xi) * (y + .5 - yi) / (yj - yi) + xi) ins = !ins; } if (ins) set(x, y, c); } };
  const line = (x0, y0, x1, y1, c, th = 1) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let i = 0; i <= n; i++) { const x = Math.round(x0 + (x1 - x0) * i / (n || 1)), y = Math.round(y0 + (y1 - y0) * i / (n || 1)); for (let a = 0; a < th; a++) for (let b = 0; b < th; b++) set(x + a, y + b, c); } };
  const dy = o.dy || 0, T = (pts) => pts.map(([x, y]) => [x, y + dy]);
  // 脚
  for (const L of o.legs) line(L[0], L[1], L[2], L[3], 'R', 3);
  // 胴
  poly(T([[8, 17], [20, 17], [21, 23], [7, 23]]), 'R');
  // 腕（奥）なし。手前の腕
  // 頭巾（角は後ろ=左へ垂れる）
  poly(T([[20, 16], [21, 11], [17, 6], [12, 4], [8, 5], [6, 8], [7, 13], [8, 16]]), 'R');
  // 折り目の陰
  poly(T([[12, 4], [17, 6], [21, 11], [20, 16], [14, 16]]), 'D');
  // 角の垂れ
  const tx = o.tail;
  line(8, 5 + dy, tx[0], tx[1] + dy, 'R', 2);
  // 顔布
  poly(T([[16, 8], [20, 8], [22, 11], [21, 15], [17, 16], [15, 12]]), 'C');
  // 当て布
  for (let y = 19; y <= 21; y++) for (let x = 12; x <= 14; x++) set(x, y + dy, 'B');
  // 針（背中に斜め）
  line(5, 23 + dy, 12, 14 + dy, 'C', 1);
  set(4, 24 + dy, 'Y'); set(3, 24 + dy, 'Y');
  // 腕
  line(17, 19 + dy + (o.arm || 0), 18 + (o.armx || 0), 22 + dy + (o.arm || 0), 'R', 2);
  // 房
  for (const [x, y] of o.tuft) set(x, y + dy, 'Y');
  // 外周の墨（透明に隣接する塗りの外側に輪郭を置く）
  const filled = g.map(r => r.map(c => c !== '.'));
  const out = g.map(r => r.slice());
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!filled[y][x]) { for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { if (filled[y + b]?.[x + a]) { out[y][x] = 'K'; break; } } }
  // 輪郭の内側（頭巾と胴の境、顔布の縁）
  const G = out; const setO = (x, y, c) => { if (x >= 0 && x < W && y >= 0 && y < H) G[y][x] = c; };
  for (let x = 8; x <= 20; x++) if (G[16 + dy]?.[x] === 'R' || G[16 + dy]?.[x] === 'D') setO(x, 16 + dy, 'K');
  // 顔の縁を示す（右側は輪郭で済む）
  // 目（縦ステッチの束）・眉・口
  const ex = 18, ey = 10 + dy, eh = o.eh || 3;
  for (let k = 0; k < eh; k++) { setO(ex, ey + k, 'K'); setO(ex + 2, ey + k, 'K'); }
  
  setO(ex, ey - 2 + (o.brow || 0), 'K'); setO(ex + 1, ey - 2 + (o.brow || 0), 'K'); setO(ex + 2, ey - 2 + (o.brow || 0), 'K');
  setO(20, 14 + dy, 'K'); setO(21, 14 + dy, 'K');
  // 全体を最下行へ寄せる
  let maxY = 0; for (let y = 0; y < H; y++) if (G[y].some(c => c !== '.')) maxY = y;
  const shift = 27 - maxY; const res = Array.from({ length: H }, () => Array(W).fill('.'));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (G[y][x] !== '.' && y + shift >= 0 && y + shift < H) res[y + shift][x + 2 < W ? x + 2 : x] = G[y][x];
  return res.map(r => r.join(''));
}
const tuftN = [[0, 3], [2, 3], [1, 4], [3, 4], [0, 5], [2, 5], [3, 6], [1, 6], [2, 7]];
const tuftUp = [[1, 2], [3, 2], [5, 2], [2, 3], [4, 3], [1, 4], [3, 4], [5, 4], [4, 5]];
const tuftBack = [[0, 3], [1, 3], [0, 4], [1, 4], [2, 4], [0, 5], [1, 5], [2, 5], [0, 6], [2, 6], [1, 7]];
const tuftDrop = [[2, 7], [3, 7], [4, 7], [2, 8], [3, 8], [4, 8], [2, 9], [4, 9], [3, 10]];
const fr = {
  stand: frame({ tail: [4, 5], tuft: tuftN, legs: [[10, 22, 10, 25], [17, 22, 17, 25]], eh: 3 }),
  run1: frame({ tail: [3, 4], tuft: tuftBack, legs: [[10, 23, 7, 25], [16, 23, 18, 25]], arm: 0, armx: 2, eh: 3 }),
  run2: frame({ tail: [3, 3], tuft: tuftBack, legs: [[11, 23, 11, 23], [15, 23, 15, 23]], dy: -1, arm: 0, armx: 0, eh: 3 }),
  run3: frame({ tail: [3, 4], tuft: tuftBack, legs: [[10, 23, 13, 25], [16, 23, 12, 24]], arm: 1, armx: -1, eh: 3 }),
  jump: frame({ tail: [4, 4], tuft: tuftUp, legs: [[10, 23, 9, 24], [16, 23, 17, 24]], dy: 1, arm: -2, armx: 2, eh: 4, brow: -1 }),
  fall: frame({ tail: [4, 7], tuft: tuftDrop, legs: [[10, 23, 9, 25], [16, 23, 18, 25]], arm: -2, armx: 3, eh: 4, brow: -1 }),
};
const used = new Set(Object.values(fr).flat().join('').replace(/\./g, '')); 
const palette = Object.fromEntries([...used].map(k => [k, PAL[k]]));
const json = { w: W, h: H, palette, frames: fr };
const out = new URL('../sprite.json', import.meta.url).pathname;
fs.writeFileSync(out, JSON.stringify(json, null, 1).replace(/\n\s+("[.A-Z]{28}",?)/g, ' $1').replace(/\[ "/g, '[\n  "').replace(/ ("[.A-Z]{28}")/g, '\n  $1'));
// プレビュー（8倍・全フレーム並べ）
const sc = 10, names = Object.keys(fr);
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${names.length * (W * sc + 10)}" height="${H * sc}" viewBox="0 0 ${names.length * (W * sc + 10)} ${H * sc}"><rect width="100%" height="100%" fill="#9ccbc4"/>`;
names.forEach((n, i) => fr[n].forEach((row, y) => [...row].forEach((c, x) => { if (c !== '.') svg += `<rect x="${i * (W * sc + 10) + x * sc}" y="${y * sc}" width="${sc}" height="${sc}" fill="${PAL[c]}"/>`; })));
fs.writeFileSync(new URL('../sprite-preview.svg', import.meta.url).pathname, svg + '</svg>');
