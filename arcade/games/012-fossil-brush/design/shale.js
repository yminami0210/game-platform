// 012 ひと刷けの骨 — 見本用の描画道具（実装でも同じ考え方で使う）
// 方針: 動かない層は起動時に1回だけ作る。毎フレームは drawImage と destination-out の合成だけ。
// ctx.filter / shadowBlur / setLineDash は使わない（見本でも使わない）。
"use strict";

const C = {
  shale: "#4b5859",     // 油頁岩の青鈍（掘った後の母岩）
  crust: "#707a76",     // 風化した上の層（こする前）
  dust: "#a9b0a6",      // 頁岩の粉（白鼠）
  bone: "#b9732e",      // 化石骨の飴色（主役）
  boneDeep: "#5e3418",  // 骨の焦げ茶（陰・関節）
  boneLight: "#dfa968", // 骨の明るい縁
  lino: "#7a3c2e",      // 弁柄のリノリウム（作業台）
  wax: "#efeee6",       // ダーマトの白（ひびの印・板の番号）
  ink: "#1d2731",       // 鉄紺（墨・文字）
  paper: "#d6cdb2",     // 藁半紙（札・ラベル）
  pine: "#c9ad7c",      // 木箱の松
  tin: "#97a0a0",       // 刷毛の口金
  bristle: "#d8c8a0",   // 豚毛
};

// ---------- 乱数・ノイズ（シード固定） ----------
let _s = 1;
function setSeed(s) { _s = s >>> 0 || 1; }
function rnd() { _s = (_s + 0x6D2B79F5) >>> 0; let t = _s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }
function rr(a, b) { return a + rnd() * (b - a); }
function hash2(i, j, s) { let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(s, 982451653)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function vnoise(x, y, s) { const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j; const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy); const a = hash2(i, j, s), b = hash2(i + 1, j, s), c = hash2(i, j + 1, s), d = hash2(i + 1, j + 1, s); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
function fbm(x, y, s, o = 4) { let t = 0, a = 0.5, f = 1, n = 0; for (let k = 0; k < o; k++) { t += a * vnoise(x * f, y * f, s + k * 31); n += a; a *= 0.5; f *= 2.03; } return t / n; }
function sstep(a, b, x) { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
function rgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function mixc(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
function css(c, a = 1) { return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`; }

// ---------- キャンバス ----------
let DPR = 2;
function makeCanvas(w, h) { const c = document.createElement("canvas"); c.width = Math.ceil(w * DPR); c.height = Math.ceil(h * DPR); const g = c.getContext("2d"); g.setTransform(DPR, 0, 0, DPR, 0, 0); g.W = w; g.H = h; return g; }
function mountCanvas(id, w, h) { const c = document.getElementById(id); c.width = w * DPR; c.height = h * DPR; c.style.width = w + "px"; c.style.height = h + "px"; const g = c.getContext("2d"); g.setTransform(DPR, 0, 0, DPR, 0, 0); g.W = w; g.H = h; return g; }
function blit(dst, src, x = 0, y = 0) { dst.drawImage(src.canvas, x, y, src.W, src.H); }
// 1画素ずつの質感（起動時に1回だけ）。fn(x,y) は css 座標 → [r,g,b,a(0..1)]
function pixelTex(w, h, fn) {
  const g = makeCanvas(w, h), W = g.canvas.width, H = g.canvas.height, im = g.createImageData(W, H), d = im.data;
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
    const c = fn(px / DPR, py / DPR, px, py); const k = (py * W + px) * 4;
    d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = (c[3] === undefined ? 1 : c[3]) * 255;
  }
  g.putImageData(im, 0, 0); return g;
}
function maskWith(tex, maskG) { // tex を mask の形で切り抜いた新しい層
  const g = makeCanvas(tex.W, tex.H); blit(g, maskG); g.globalCompositeOperation = "source-in"; blit(g, tex); g.globalCompositeOperation = "source-over"; return g;
}
function tint(maskG, col, a = 1) { const g = makeCanvas(maskG.W, maskG.H); blit(g, maskG); g.globalCompositeOperation = "source-in"; g.fillStyle = col; g.globalAlpha = a; g.fillRect(0, 0, g.W, g.H); g.globalAlpha = 1; g.globalCompositeOperation = "source-over"; return g; }
// 形の縁（左上だけ・右下だけ）: 形 − ずらした形
function rim(maskG, dx, dy) { const g = makeCanvas(maskG.W, maskG.H); blit(g, maskG); g.globalCompositeOperation = "destination-out"; blit(g, maskG, dx, dy); g.globalCompositeOperation = "source-over"; return g; }
// 形を少し太らせた影（ぼかしは使わず、ずらし重ね）
function spread(maskG, r, n = 10) { const g = makeCanvas(maskG.W, maskG.H); for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2; blit(g, maskG, Math.cos(a) * r, Math.sin(a) * r); } return g; }

// ---------- 形 ----------
function pathOf(pts, close = true) { const p = new Path2D(); pts.forEach(([x, y], i) => i ? p.lineTo(x, y) : p.moveTo(x, y)); if (close) p.closePath(); return p; }
function resample(pts, step) { const out = [pts[0]]; for (let i = 1; i < pts.length; i++) { const [ax, ay] = pts[i - 1], [bx, by] = pts[i]; const L = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.round(L / step)); for (let k = 1; k <= n; k++) out.push([ax + (bx - ax) * k / n, ay + (by - ay) * k / n]); } return out; }
// 不揃いな縁（欠け）: 辺を細かく分けて内側へ揺らす。ときどき大きな欠け
function chipped(pts, step, amp, bigChance = 0.08, big = 6) {
  const r = resample([...pts, pts[0]], step); r.pop(); const cx = r.reduce((s, p) => s + p[0], 0) / r.length, cy = r.reduce((s, p) => s + p[1], 0) / r.length;
  return r.map(([x, y]) => { const dx = cx - x, dy = cy - y, L = Math.hypot(dx, dy) || 1; let m = rr(0, amp); if (rnd() < bigChance) m += rr(big * 0.5, big); return [x + dx / L * m + rr(-0.6, 0.6), y + dy / L * m + rr(-0.6, 0.6)]; });
}
// 幅の変わる帯（肋骨・ひび・毛）。ws は点ごとの幅
function ribbon(pts, ws) {
  const L = [], R = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)]; let nx = -(b[1] - a[1]), ny = b[0] - a[0]; const n = Math.hypot(nx, ny) || 1; nx /= n; ny /= n;
    const w = (typeof ws === "function" ? ws(i / (pts.length - 1), i) : ws[i]) / 2;
    L.push([pts[i][0] + nx * w, pts[i][1] + ny * w]); R.push([pts[i][0] - nx * w, pts[i][1] - ny * w]);
  }
  return [...L, ...R.reverse()];
}
function quad(p0, p1, p2, n) { const o = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; o.push([u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]); } return o; }
function rot(pts, cx, cy, a) { const c = Math.cos(a), s = Math.sin(a); return pts.map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c]); }

// ---------- 骨の部品（架空の生き物「ながくびとかげ」「よろいうお」） ----------
// 椎骨: 糸巻き形の椎体＋傾いた棘突起＋前後の小さな突起。1個ずつ形を変える
function vertebra(cx, cy, ang, len, hgt, seed, flip = 1) {
  setSeed(seed); const L = len / 2, H = hgt / 2, k = rr(0.74, 0.82), lean = rr(0.18, 0.26) * len; // 棘は尾の側へ傾く
  // 椎体: 左右の端が少し広がった短い円柱（上下の辺はなめらかにくびれる。尖った角を作らない）
  const body = [];
  for (let i = 0; i <= 14; i++) { const t = i / 14, x = -L + t * len, pinch = 1 - (1 - k) * Math.sin(Math.PI * t); body.push([x, -H * pinch]); }
  for (let i = 0; i <= 6; i++) { const a = -Math.PI / 2 + i / 6 * Math.PI; body.push([L + Math.cos(a) * rr(1.6, 2.4), Math.sin(a) * H]); }
  for (let i = 14; i >= 0; i--) { const t = i / 14, x = -L + t * len, pinch = 1 - (1 - k) * Math.sin(Math.PI * t); body.push([x, H * pinch]); }
  for (let i = 0; i <= 6; i++) { const a = Math.PI / 2 + i / 6 * Math.PI; body.push([-L + Math.cos(a) * rr(1.2, 2), Math.sin(a) * H]); }
  // 棘: 1本の幅広い板。先は丸く、丸い角が1つだけ欠ける
  const sp = hgt * rr(0.95, 1.15), bw = len * rr(0.5, 0.56), tw = len * rr(0.34, 0.4), base = -H * k + 3, top = -H * k - sp;
  const spine = [[-bw / 2 + lean * 0.15, base], [-tw / 2 + lean * 0.85, top + tw * 0.5]];
  const chipAt = (rnd() * 7) | 0;
  for (let i = 0; i <= 8; i++) { const a = Math.PI + i / 8 * Math.PI, r = tw / 2 * (i === chipAt ? 0.72 : 1); spine.push([lean + Math.cos(a) * r, top + tw / 2 + Math.sin(a) * r * 0.9]); }
  spine.push([tw / 2 + lean * 0.85, top + tw * 0.5], [bw / 2 + lean * 0.15, base]);
  const f = (p) => rot(p.map(([x, y]) => [x, y * flip]), cx, cy, ang);
  const v = [f(body), f(spine)];
  v.ends = [[cx + Math.cos(ang) * (L + 0.5), cy + Math.sin(ang) * (L + 0.5)], [cx - Math.cos(ang) * (L - 0.5), cy - Math.sin(ang) * (L - 0.5)]].map((p) => [...p, ang, H * 0.78]);
  return v;
}
// 関節面: 椎体の両端に暗い細い楕円（骨の層に描く）
function vertebraEnds(L, list) { for (const [x, y, a, r] of list) { L.save(); L.translate(x, y); L.rotate(a); L.fillStyle = "rgba(70,36,14,0.9)"; L.beginPath(); L.ellipse(0, 0, 1.6, r, 0, 0, 7); L.fill(); L.fillStyle = "rgba(240,195,137,0.5)"; L.beginPath(); L.ellipse(-1.6, -r * 0.2, 0.7, r * 0.6, 0, 0, 7); L.fill(); L.restore(); } }
// 肋骨: 先へ細くなる弓なりの帯。折れていれば2本に分けてずらす
function rib(p0, p1, p2, w0, seed, brk = -1, shift = [0, 0]) {
  setSeed(seed); const pts = quad(p0, p1, p2, 26).map(([x, y], i) => [x + (vnoise(i * 0.4, seed, 3) - 0.5) * 1.4, y + (vnoise(i * 0.4, seed, 7) - 0.5) * 1.4]);
  const w = (t) => w0 * (1 - Math.pow(t, 0.8) * 0.66) * (t < 0.08 ? 0.75 + t * 3 : 1);
  const [hx, hy] = pts[1], knob = []; for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; knob.push([hx + Math.cos(a) * w0 * 0.75 * rr(0.85, 1.1), hy + Math.sin(a) * w0 * 0.6]); }
  const jag = (poly) => { const n = poly.length / 2, A = poly[n - 1], B = poly[n], dx = pts[pts.length - 1][0] - pts[pts.length - 3][0], dy = pts[pts.length - 1][1] - pts[pts.length - 3][1], dl = Math.hypot(dx, dy) || 1; const m = [(A[0] + B[0]) / 2 + (A[0] - B[0]) * rr(-0.3, 0.3) + dx / dl * rr(-3, 1.5), (A[1] + B[1]) / 2 + (A[1] - B[1]) * rr(-0.3, 0.3) + dy / dl * rr(-3, 1.5)]; poly.splice(n, 0, m); return poly; };
  if (brk < 0) return [jag(ribbon(pts, w)), knob];
  const n = Math.round(brk * 26), a = pts.slice(0, n + 1), b = pts.slice(n).map(([x, y]) => [x + shift[0], y + shift[1]]);
  return [ribbon(a, (t) => w(t * brk)), ribbon(b, (t) => w(brk + t * (1 - brk))), knob];
}
// よろいうおの鱗板: 角ばった板＋細かい粒の盛り上がり
function scute(cx, cy, r, ang, seed) { setSeed(seed); const n = 5 + (rnd() * 3 | 0), p = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + rr(-0.2, 0.2); const rr2 = r * rr(0.7, 1.1); p.push([Math.cos(a) * rr2 * 1.3, Math.sin(a) * rr2]); } return [rot(chipped(p, 3, 0.6, 0, 0), cx, cy, ang)]; }

// 骨の形（マスク）を描く
function boneMask(w, h, parts) { const g = makeCanvas(w, h); g.fillStyle = "#fff"; for (const p of parts) g.fill(pathOf(p)); return g; }
// 骨の層: 飴色のむら＋右下の焦げ茶の縁＋左上の明るい縁＋穴。輪郭線は引かない
function boneLayer(mask, seed, pits = []) {
  const w = mask.W, h = mask.H, B = rgb(C.bone), D = rgb(C.boneDeep), Lt = rgb(C.boneLight);
  const tex = pixelTex(w, h, (x, y, px, py) => {
    const m = fbm(x * 0.05, y * 0.05, seed, 4), m2 = fbm(x * 0.018, y * 0.018, seed + 5, 3), pore = fbm(x * 0.45, y * 0.45, seed + 9, 2);
    let c = mixc(B, D, sstep(0.5, 0.8, m) * 0.55); c = mixc(c, Lt, sstep(0.48, 0.22, m) * 0.45); c = mixc(c, mixc(B, D, 0.6), sstep(0.5, 0.78, m2) * 0.5);
    c = mixc(c, D, sstep(0.68, 0.78, pore) * 0.55);
    const g = hash2(px, py, seed) - 0.5; return [c[0] + g * 16, c[1] + g * 13, c[2] + g * 9, 1];
  });
  const L = maskWith(tex, mask);
  blit(L, tint(rim(mask, 4.5, 5), C.boneDeep, 0.35)); // 丸みの陰（広く薄く）
  blit(L, tint(rim(mask, 2, 2.4), C.boneDeep, 0.8));  // 右下の陰
  blit(L, tint(rim(mask, -2.6, -3), C.boneLight, 0.35)); // 丸みの光（広く薄く）
  blit(L, tint(rim(mask, -1.1, -1.3), "#f0c389", 0.85)); // 左上の明るい縁
  for (const [x, y, r] of pits) {
    L.fillStyle = css(rgb(C.boneDeep), 0.9); L.beginPath(); L.ellipse(x, y, r, r * rr(0.6, 0.9), rr(0, 3), 0, 7); L.fill();
    L.fillStyle = css(Lt, 0.7); L.beginPath(); L.ellipse(x + r * 0.3, y + r * 0.7, r * 0.7, r * 0.3, 0.3, 0, 7); L.fill();
  }
  L.globalCompositeOperation = "destination-in"; blit(L, mask); L.globalCompositeOperation = "source-over";
  return L;
}

// ---------- 母岩 ----------
// 掘った後の母岩: 青鈍の層理（不揃いな幅・明るさ）＋ごくまばらな雲母
function shaleTex(w, h, seed, ang, nb) {
  const A = rgb("#404c4d"), Bc = rgb("#55615f"), Lm = rgb("#6f7a76"), F = rgb("#b9beb4"), sn = Math.sin(ang), cs = Math.cos(ang);
  setSeed(seed * 7 + 1); const n = nb || (2 + (rnd() < 0.5 ? 1 : 0)), bands = [];
  let u = h * rr(0.1, 0.25); for (let k = 0; k < n; k++) { bands.push([u, rr(3, 14), rr(0.5, 1), rnd() < 0.7 ? 1 : -1]); u += h * rr(0.18, 0.5); }
  return pixelTex(w, h, (x, y, px, py) => {
    const uu = -x * sn + y * cs + 7 * (fbm(x * 0.008, y * 0.004, seed + 2, 2) - 0.5) * 2, v = x * cs + y * sn;
    let c = mixc(A, Bc, sstep(0.3, 0.75, fbm(x * 0.007, y * 0.007, seed, 4)));
    for (let k = 0; k < bands.length; k++) { const [u0, bw, st, sg] = bands[k], d = Math.abs(uu - u0) / bw; if (d > 1.6) continue;
      const fade = sstep(0.38, 0.62, fbm(v * 0.008 + k * 13, k * 7.3, seed + 4, 3)) * st, amt = Math.max(0, 1 - d * d) * fade; c = mixc(c, sg > 0 ? Lm : A, amt * 0.7); }
    const pits = fbm(x * 0.09, y * 0.09, seed + 13, 2); c = mixc(c, A, sstep(0.7, 0.8, pits) * 0.4);
    const nn = hash2(px, py, seed); if (nn > 0.9975 && fbm(x * 0.02, y * 0.02, seed + 21, 2) > 0.52) c = mixc(c, F, 0.7);
    const g = (hash2(px, py, seed + 1) - 0.5) * (6 + 10 * fbm(x * 0.03, y * 0.03, seed + 3, 2)); return [c[0] + g, c[1] + g, c[2] + g, 1];
  });
}
// こする前の上の層（風化した粉っぽい面）: 明るく艶なし。白い粉のむらと小さな凹み
function crustTex(w, h, seed, ang) {
  const A = rgb("#636d69"), Bc = rgb(C.crust), Lt = rgb("#8f978f"), Dk = rgb("#4c5653"), sn = Math.sin(ang), cs = Math.cos(ang);
  return pixelTex(w, h, (x, y, px, py) => {
    const u = -x * sn + y * cs + 12 * fbm(x * 0.008, y * 0.008, seed + 2, 3), v = x * cs + y * sn;
    let c = mixc(A, Bc, sstep(0.28, 0.72, fbm(u * 0.012, v * 0.008, seed, 4)));
    const st = fbm(u * 0.32, v * 0.012, seed + 6, 3); c = mixc(c, Lt, sstep(0.62, 0.78, st) * 0.1 * sstep(0.4, 0.65, fbm(v * 0.012, u * 0.02, seed + 7, 2)));
    const pit = fbm(x * 0.2, y * 0.2, seed + 8, 2); c = mixc(c, Dk, sstep(0.76, 0.84, pit) * 0.8);
    const g = (hash2(px, py, seed) - 0.5) * (6 + 14 * sstep(0.35, 0.7, fbm(x * 0.015, y * 0.015, seed + 11, 2))); return [c[0] + g, c[1] + g, c[2] + g * 0.95, 1];
  });
}
// 上の層の剥がれ段（層理に沿った角ばった段差。上側に明るい縁、下側に暗い縁）
function flakeSteps(g, cx, cy, rw, rh, ang, n, seed) {
  setSeed(seed);
  for (let k = 0; k < n; k++) {
    const x = cx + rr(-rw, rw), y = cy + rr(-rh, rh), w = rr(18, 70), h = rr(8, 26), a = ang + rr(-0.12, 0.12);
    const p = rot(chipped([[-w / 2, -h / 2], [w / 2, -h / 2 + rr(-3, 3)], [w / 2 + rr(-6, 6), h / 2], [-w / 2 + rr(-6, 6), h / 2]], 5, 2.2, 0.15, 4), x, y, a);
    const low = rnd() < 0.6; g.fillStyle = low ? "rgba(70,80,77,0.22)" : "rgba(150,158,150,0.14)"; g.fill(pathOf(p));
    // 段の縁は一辺の一部だけ（低い段は上側が暗い崖、高い段は上側が明るい）
    const i0 = (rnd() * p.length * 0.3) | 0, edge = p.slice(i0, i0 + Math.max(3, (p.length * rr(0.2, 0.4)) | 0));
    g.strokeStyle = "rgba(170,178,168,0.45)"; g.lineWidth = rr(0.8, 1.3); g.stroke(pathOf(edge, false));
  }
}
// 作業台: 弁柄のリノリウム。ゆがんだ大理石模様（筋は斜め・途切れる）、すり減った明るい所、細かい傷
function linoTex(w, h, seed) {
  const B = rgb(C.lino), D = rgb("#5e2b21"), Lt = rgb("#a2614a"), Wn = rgb("#8d5242");
  return pixelTex(w, h, (x, y, px, py) => {
    const a = 0.55, xr = x * Math.cos(a) - y * Math.sin(a), yr = x * Math.sin(a) + y * Math.cos(a);
    const wx = xr + 60 * fbm(x * 0.006, y * 0.006, seed + 1, 3), wy = yr + 60 * fbm(x * 0.006, y * 0.006, seed + 2, 3);
    let c = mixc(B, D, sstep(0.42, 0.7, fbm(x * 0.005, y * 0.005, seed + 3, 3)) * 0.8);
    const m = fbm(wx * 0.006, wy * 0.022, seed + 4, 5), vein = 1 - Math.min(1, Math.abs(m - 0.5) * 16);
    c = mixc(c, Lt, vein * 0.6 * sstep(0.3, 0.6, fbm(x * 0.008, y * 0.008, seed + 5, 2)));
    c = mixc(c, Wn, sstep(0.55, 0.75, fbm(x * 0.004, y * 0.01, seed + 6, 3)) * 0.45);
    const g = (hash2(px, py, seed) - 0.5) * (5 + 12 * fbm(x * 0.05, y * 0.05, seed + 7, 2)); return [c[0] + g, c[1] + g * 0.8, c[2] + g * 0.7, 1];
  });
}

// ---------- こする（実装もこの形: 作り置きのスタンプを destination-out で） ----------
// 毛の束のスタンプ。進む向きに垂直に細長い。毛先の不揃い・密度のむら。4種類作って回す
function bristleStamps(width, n = 4) {
  const out = [];
  for (let k = 0; k < n; k++) {
    setSeed(900 + k); const s = makeCanvas(width + 8, 14);
    for (let i = 0; i < width * 2.2; i++) { const x = 4 + rr(0, width), lenY = rr(2, 9) * (1 - Math.pow(Math.abs(x - 4 - width / 2) / (width / 2), 3) * 0.7); s.fillStyle = "#000"; s.fillRect(Math.round(x * 2) / 2, Math.round((7 - lenY / 2 + rr(-1.5, 1.5)) * 2) / 2, rr(1, 1.6), lenY); }
    out.push(s);
  }
  return out;
}
// 道のりに沿ってスタンプを押す（strength: 1回の濃さ）。layer は上の層（destination-out）
function scrape(layer, stamps, pts, strength = 0.5, step = 2.2) {
  const r = resample(pts, step); layer.save(); layer.globalCompositeOperation = "destination-out";
  for (let i = 1; i < r.length; i++) {
    const [ax, ay] = r[i - 1], [bx, by] = r[i], a = Math.atan2(by - ay, bx - ax) + Math.PI / 2, s = stamps[i % stamps.length];
    layer.globalAlpha = strength; layer.setTransform(DPR, 0, 0, DPR, 0, 0); layer.translate(bx, by); layer.rotate(a); layer.drawImage(s.canvas, -s.W / 2, -s.H / 2, s.W, s.H);
  }
  layer.restore();
}
// 掘った所の毛の跡（下の層に細い筋。こすった方向）
function brushTracks(g, pts, width, seed) {
  setSeed(seed); const r = resample(pts, 3);
  for (let k = 0; k < width * 0.22; k++) {
    const off = rr(-width / 2, width / 2), lt = rnd() < 0.5; g.strokeStyle = lt ? "rgba(140,152,146,0.14)" : "rgba(120,132,128,0.10)"; g.lineWidth = rr(0.4, 0.9); g.beginPath();
    let started = false; for (let i = 1; i < r.length; i++) { const [ax, ay] = r[i - 1], [bx, by] = r[i]; let nx = -(by - ay), ny = bx - ax; const n = Math.hypot(nx, ny) || 1; nx /= n; ny /= n; if (vnoise(i * 0.15, k, seed) < 0.45) { started = false; continue; } const x = bx + nx * off, y = by + ny * off; started ? g.lineTo(x, y) : g.moveTo(x, y); started = true; }
    g.stroke();
  }
}
// 削った粉: 道のりの両脇と終わりに寄る（同じ密度でばらまかない）
function dustPiles(g, pts, width, seed, amount = 1) {
  setSeed(seed); const r = resample(pts, 2), Lt = rgb(C.dust), Lt2 = rgb("#c4c8bd");
  for (let i = 1; i < r.length; i++) {
    const [ax, ay] = r[i - 1], [bx, by] = r[i]; let nx = -(by - ay), ny = bx - ax; const n = Math.hypot(nx, ny) || 1; nx /= n; ny /= n;
    const endBias = Math.pow(i / r.length, 4) * 7 + 0.15, cnt = Math.round(amount * endBias * rr(0, 2) * (vnoise(i * 0.08, 0, seed) > 0.35 ? 1 : 0.2));
    for (let k = 0; k < cnt; k++) {
      const side = rnd() < 0.5 ? -1 : 1, d = width / 2 + Math.abs(rr(-3, 6)) * (rnd() < 0.2 ? 2 : 1), x = bx + nx * d * side + rr(-1.5, 1.5), y = by + ny * d * side + rr(-1.5, 1.5), s = rr(0.6, 2.2) * (rnd() < 0.08 ? 1.8 : 1);
      g.fillStyle = "rgba(35,44,46,0.45)"; g.fillRect(x + 0.6, y + 0.7, s, s * rr(0.6, 1));
      g.fillStyle = css(rnd() < 0.6 ? Lt : Lt2, rr(0.75, 1)); g.beginPath(); g.moveTo(x, y); g.lineTo(x + s, y + rr(-0.3, 0.3)); g.lineTo(x + s * rr(0.4, 1), y + s * rr(0.6, 1)); g.closePath(); g.fill();
    }
  }
}

// ---------- ひび ----------
function crackPath(x, y, ang, len, seed, rough = 0.5) {
  setSeed(seed); const pts = [[x, y]]; let a = ang, cx = x, cy = y, d = 0;
  while (d < len) { const st = rr(3, 9); a += rr(-rough, rough) + (ang - a) * 0.25; cx += Math.cos(a) * st; cy += Math.sin(a) * st; d += st; pts.push([cx, cy]); }
  return pts;
}
// 割れ目: 片側に明るい唇（欠けた縁）、暗い裂け目、所々の小さな剥がれ。grow = 0..1（伸び・太さ）
function drawCrack(g, pts, seed, grow = 0, branches = []) {
  setSeed(seed); const n = pts.length, use = pts.slice(0, Math.max(2, Math.round(n * (0.75 + 0.25 * grow))));
  const w = (t, i) => (0.9 + 2.2 * grow) * (0.55 + 0.9 * Math.sin(Math.PI * Math.min(1, t * 1.15)) * (0.7 + 0.6 * vnoise(i * 0.3, 1, seed)));
  const lip = ribbon(use.map(([x, y]) => [x - 1.2, y - 1.3]), (t, i) => w(t, i) + 1.4);
  g.fillStyle = css(rgb("#9aa39c"), 0.85); g.fill(pathOf(lip));
  g.fillStyle = css(rgb("#141b1d"), 1); g.fill(pathOf(ribbon(use, w)));
  for (const b of branches) { const bp = crackPath(b[0], b[1], b[2], b[3] * (0.7 + 0.5 * grow), seed + b[4], 0.7); g.fillStyle = css(rgb("#9aa39c"), 0.7); g.fill(pathOf(ribbon(bp.map(([x, y]) => [x - 1, y - 1]), (t) => (1 - t) * (1.4 + grow) + 0.6))); g.fillStyle = "#141b1d"; g.fill(pathOf(ribbon(bp, (t) => (1 - t) * (1.1 + grow * 1.4) + 0.3))); }
  // 剥がれ（伸びるほど増える）: 縁に乗った小さな明るい破片
  const flakes = Math.round(2 + grow * 9);
  for (let k = 0; k < flakes; k++) {
    const i = 1 + (rnd() * (use.length - 2) | 0), [x, y] = use[i], s = rr(2, 4 + grow * 4), side = rnd() < 0.5 ? -1 : 1, a = rr(0, 6.28);
    const p = [[0, 0], [s, rr(-1, 1)], [s * rr(0.5, 0.9), s * rr(0.5, 0.9)], [rr(-1, 1), s * rr(0.4, 0.8)]].map(([px, py]) => [x + side * 2.5 + px * Math.cos(a) - py * Math.sin(a), y + side * 2 + px * Math.sin(a) + py * Math.cos(a)]);
    g.fillStyle = "rgba(20,27,29,0.55)"; g.fill(pathOf(p.map(([px, py]) => [px + 0.8, py + 1])));
    g.fillStyle = css(rgb(rnd() < 0.5 ? "#8c958f" : "#a7aea6"), 1); g.fill(pathOf(p));
  }
  return use;
}
// ダーマト（グリース鉛筆）の線: ざらついた石に蝋が乗る所・乗らない所。点線にしないよう、切れ目は長さも間隔も不揃い
function wax(g, pts, width, seed, col = C.wax, press = 1) {
  setSeed(seed); const r = resample(pts, 0.7), c = rgb(col);
  for (let i = 1; i < r.length; i++) {
    const [ax, ay] = r[i - 1], [bx, by] = r[i]; let nx = -(by - ay), ny = bx - ax; const n = Math.hypot(nx, ny) || 1; nx /= n; ny /= n;
    const t = i / r.length, pr = press * (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, t * 1.3 + 0.1))) * (0.75 + 0.5 * vnoise(i * 0.05, 3, seed));
    const skip = vnoise(i * 0.045, 7, seed) + (hash2(i, 5, seed) - 0.5) * 0.08; if (skip < 0.07) continue;
    const ww = width * (0.7 + 0.5 * pr);
    for (let k = -ww / 2; k <= ww / 2; k += 0.5) { const x = bx + nx * k, y = by + ny * k; const tooth = hash2(Math.round(x * 2), Math.round(y * 2), seed); if (tooth < 0.42 - pr * 0.32) continue; g.fillStyle = css(c, Math.min(1, 0.35 + pr * 0.6)); g.fillRect(x, y, 0.75, 0.75); }
  }
}
// 手で書いた数字（ダーマト用。フォントを使わない）
const GLYPH = {
  "0": [[[4, 0], [1, 3], [0, 10], [1.5, 17], [5, 19], [8.5, 16], [9.5, 9], [8.5, 2.5], [5, 0], [3, 1]]],
  "7": [[[0, 1.5], [3, 0.6], [10, 0.4], [7, 7], [4.5, 13], [3.5, 19]], [[3.5, 9.5], [9, 9]]],
  "1": [[[2, 3], [5, 0], [5, 19]]],
};
function waxText(g, str, x, y, sc, seed, ang = 0) { let ox = 0; for (const ch of str) { for (const s of (GLYPH[ch] || [])) wax(g, rot(s.map(([a, b]) => [(a + ox) * sc, b * sc]), x, y, ang), 2.4, seed + ox * 3, C.wax, 1.1); ox += 13; } }

// ---------- 刷毛（毛の残り = 絵の長さ） ----------
// remain 0..1。毛先は不揃いにすり減り、先は頁岩の粉で灰色に汚れる
function brush(g, x, y, ang, remain, seed) {
  setSeed(seed); g.save(); g.translate(x, y); g.rotate(ang);
  // 柄（ブナの白木。手あかで中ほどが暗い）
  const handle = chipped([[0, -7], [118, -9], [140, -11], [140, 11], [118, 9], [0, 7], [-6, 4], [-8, 0], [-6, -4]], 4, 0.4, 0, 0);
  g.fillStyle = "rgba(30,14,10,0.35)"; g.fill(pathOf(handle.map(([a, b]) => [a + 3, b + 4])));
  g.fillStyle = C.pine; g.fill(pathOf(handle));
  for (let i = 0; i < 9; i++) { const yy = rr(-6, 6); g.strokeStyle = `rgba(120,86,48,${rr(0.15, 0.4)})`; g.lineWidth = rr(0.4, 0.9); g.beginPath(); g.moveTo(rr(-4, 20), yy); g.bezierCurveTo(50, yy + rr(-2, 2), 90, yy + rr(-2, 2), 138, yy * 1.3 + rr(-1, 1)); g.stroke(); }
  g.fillStyle = "rgba(90,58,34,0.22)"; g.beginPath(); g.ellipse(70, 0, 34, 6.5, 0, 0, 7); g.fill();
  g.fillStyle = "rgba(255,240,210,0.35)"; g.fillRect(4, -6, 120, 1.6);
  g.fillStyle = "#2a2018"; g.beginPath(); g.ellipse(10, 0, 2.6, 2.1, 0, 0, 7); g.fill(); // 吊るし穴
  // 口金（ブリキ。かしめの線2本、片側だけへこみ）
  const fer = [[138, -12], [176, -13.5], [178, 13.5], [138, 12]];
  g.fillStyle = C.tin; g.fill(pathOf(fer));
  g.fillStyle = "rgba(255,255,255,0.35)"; g.fillRect(139, -11, 37, 3);
  g.fillStyle = "rgba(30,36,40,0.35)"; g.fillRect(139, 8, 38, 4.5);
  for (const cx of [146, 151]) { g.strokeStyle = "rgba(40,46,50,0.55)"; g.lineWidth = 0.9; g.beginPath(); g.moveTo(cx, -12); g.lineTo(cx + 0.5, 12); g.stroke(); }
  g.fillStyle = "rgba(40,46,50,0.4)"; g.beginPath(); g.ellipse(166, -4, 4, 2, 0.2, 0, 7); g.fill();
  // 毛
  const full = 74, len = 8 + full * remain, Bc = rgb(C.bristle), Dk = rgb("#7b8580");
  for (let i = 0; i < 90; i++) {
    const yy = -12 + 24 * (i / 89) + rr(-0.5, 0.5), wear = vnoise(i * 0.18, 2, seed) * 0.45 + rr(0, 0.12), l = len * (1 - wear * (0.35 + 0.65 * (1 - remain) + 0.2)), sp = yy * (1 + l / 120) + rr(-1.5, 1.5);
    const col = mixc(Bc, [176, 160, 122], rnd() * 0.6);
    g.strokeStyle = css(col, 1); g.lineWidth = rr(0.6, 1.1); g.beginPath(); g.moveTo(176, yy); g.quadraticCurveTo(176 + l * 0.6, yy + (sp - yy) * 0.4, 176 + l, sp); g.stroke();
    g.strokeStyle = css(Dk, rr(0.4, 0.8)); g.beginPath(); g.moveTo(176 + l * rr(0.7, 0.85), yy + (sp - yy) * 0.75); g.lineTo(176 + l, sp); g.stroke();
  }
  g.restore();
  return 176 + len;
}

// ---------- 札・ラベル ----------
function paperTex(w, h, seed) { const P = rgb(C.paper), D = rgb("#bfb393"); return pixelTex(w, h, (x, y, px, py) => { let c = mixc(P, D, sstep(0.5, 0.8, fbm(x * 0.03, y * 0.03, seed, 3)) * 0.5); const fib = fbm(x * 0.4, y * 0.06, seed + 3, 2); c = mixc(c, D, sstep(0.62, 0.7, fib) * 0.35); const n = (hash2(px, py, seed) - 0.5) * 10; return [c[0] + n, c[1] + n, c[2] + n * 0.8, 1]; }); }
function tagShape(w, h, notch = 9) { return chipped([[notch, 0], [w, 0], [w, h], [notch, h], [0, h - notch], [0, notch]], 6, 0.5, 0.02, 1.5); }
// ゴム印（鉄紺の版を2px ずらした二重、インクのかすれ）
function stampText(g, txt, x, y, font, seed, col = C.ink, a = 0.9) {
  setSeed(seed); g.save(); g.font = font; g.textBaseline = "alphabetic";
  const s = makeCanvas(g.W, g.H); s.font = font; s.textBaseline = "alphabetic"; s.fillStyle = col; s.fillText(txt, x, y);
  s.globalCompositeOperation = "destination-out"; for (let i = 0; i < 260; i++) { s.fillStyle = `rgba(0,0,0,${rr(0.3, 0.9)})`; s.fillRect(x + rr(-4, g.measureText(txt).width + 4), y + rr(-30, 6), rr(0.6, 2.4), rr(0.6, 1.8)); }
  g.globalAlpha = a * 0.35; blit(g, s, 1.6, 1.2); g.globalAlpha = a; blit(g, s); g.restore();
}

// こする前の骨の影 = 浮き彫り（左上に明るい縁・右下に暗い縁。ぼかさない。茶は alpha 0.1）
function ghostRelief(crust, mask) {
  crust.save(); crust.globalCompositeOperation = "source-atop";
  blit(crust, tint(mask, "#6b5d48", 0.1));
  blit(crust, tint(rim(mask, 1.6, 1.6), "#8d968f", 1));
  blit(crust, tint(rim(mask, -1.6, -1.6), "#545e5c", 1));
  crust.restore();
}
// ただの石の模様: 灰色で、縁がにじむ（ずらし重ねの作り置き）。浮き彫りは無い
function ghostFake(crust, mask) { crust.save(); crust.globalCompositeOperation = "source-atop"; blit(crust, tint(spread(mask, 5, 14), "#5f6764", 0.06)); blit(crust, tint(spread(mask, 2.5, 10), "#5f6764", 0.08)); crust.restore(); }
// 削った穴の縁の厚み: 穴の右下側に明るい欠け面、左上側の縁から穴へ落ちる硬い影（一筆ごとに作り直す）
function crustEdges(S, crust) {
  const sh = makeCanvas(crust.W, crust.H); blit(sh, crust, 2.5, 2.5); sh.globalCompositeOperation = "destination-out"; blit(sh, crust); blit(S, tint(sh, "#3a4546", 1));
  blit(S, crust);
  blit(S, tint(rim(crust, 1.8, 1.8), "#8a938e", 1));
}
// 骨のまわりの暗いにじみ（骨の縁から 1.5px だけ）
function boneHalo(S, mask) { blit(S, tint(spread(mask, 1.5, 10), "#2c3637", 0.6)); }
