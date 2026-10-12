// 朝つゆの網 見本用の描画道具（canvas 2D）
// 借りる物: イギリスの家庭菜園の一角（ハシバミの豆の支柱・麻ひもの結び目・イチイの生垣・
//   支柱の先に伏せた素焼きの鉢・亜鉛のじょうろ）を、毛糸の刺繍（クルーエル刺繍）の1枚の布として描く。
//   糸は銀糸を布に「とめ縫い（カウチング）」で留めたもの、朝露は糸に縫い付けたガラスのビーズ、
//   虫の通り道は「しつけ糸」（仮縫いの粗い運針）。水彩・パステル・石版刷りの紙の地は使わない。
// 実装メモ: 動かない物（布・空・生垣・土・支柱・葉・鉢・じょうろ）は起動時に offscreen canvas へ
//   1回だけ描き、毎フレームは drawImage。動く糸・ビーズ・虫は lineTo / arc / fillRect / globalAlpha /
//   translate・rotate だけで描ける形にしてある。ctx.filter・shadowBlur・毎フレームの乱数生成は使わない。
const C = {
  yew: "#34432b",     // イチイの生垣（奥の面）
  yewL: "#4e5f38",    // 生垣の明るい葉（重ね色）
  leaf: "#7d9a3c",    // 豆の葉の黄緑（毛糸）
  leafD: "#5a7430",   // 葉の陰・葉脈の外（重ね色）
  leafL: "#a7bd5c",   // 葉脈（重ね色）
  hazel: "#7b6450",   // ハシバミの樹皮（支柱・糸巻き・土）
  hazelL: "#a08566",  // 樹皮の明るい側（重ね色）
  hazelD: "#4f3e30",  // 土・樹皮の陰（重ね色）
  silver: "#e6eae6",  // 銀糸（主役。糸と露）
  lemon: "#e6c21f",   // スズメバチのレモン（危ない物だけ）
  slate: "#2a2f33",   // 粘板岩の濃灰（墨。とめ縫い・文字・虫の脚）
  linen: "#c3c9bd",   // 麻布の地（刺していない所。見える面は小さく）
  sky1: "#d7ddd3", sky2: "#b8c9c6", sky3: "#e3d6b8", // 朝の空の毛糸（薄く、布が透ける）
  pot: "#b56a43",     // 素焼きの鉢（小さく。主役にしない）
  zinc: "#9aa4a3", zincL: "#c3cac7", zincD: "#6c7675",
  tape: "#f5f4ee",    // 名前テープの白（灰色にしない）
  scarlet: "#cf4a2c", // ベニバナインゲンの花（小さな結び玉だけ）
  ladyR: "#c23a2a", bee: "#c98f2a", beeD: "#6b4a2a", moth: "#c4ab84", mothD: "#7a6650",
  beetle: "#55703a", beetleL: "#8fa65a", spider: "#a8713e", spiderD: "#7a4f2c", spiderL: "#c8ac80",
};
let _s = 7;
const setSeed = (n) => (_s = (n >>> 0) || 1);
function R() { _s ^= _s << 13; _s >>>= 0; _s ^= _s >> 17; _s ^= _s << 5; _s >>>= 0; return _s / 4294967296; }
const rr = (a, b) => a + R() * (b - a);
const pick = (a) => a[Math.floor(R() * a.length)];
function rgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
function mix(h, k, t) { const a = rgb(h), b = rgb(k); return "#" + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, "0")).join(""); }
const lighten = (h, t) => mix(h, "#ffffff", t), darken = (h, t) => mix(h, "#000000", t);
const vary = (h) => (R() < 0.5 ? lighten(h, rr(0, 0.09)) : darken(h, rr(0, 0.09)));

// 1針（毛糸のふくらみ: 下に濃い影 → 本体 → 上に細い光）
function stitch(g, x1, y1, x2, y2, w, col, o = {}) {
  g.lineCap = "round";
  if (o.sh !== false) { g.strokeStyle = C.slate; g.globalAlpha = o.shA ?? 0.32; g.lineWidth = w + 0.6; line(g, x1 + 0.7, y1 + 1.1, x2 + 0.7, y2 + 1.1); }
  g.globalAlpha = o.a ?? 1; g.strokeStyle = col; g.lineWidth = w; line(g, x1, y1, x2, y2);
  if (o.hi !== false && w >= 1.4) {
    g.globalAlpha = (o.a ?? 1) * 0.45; g.strokeStyle = lighten(typeof col === "string" && col[0] === "#" ? col : C.silver, 0.45); g.lineWidth = Math.max(0.5, w * 0.3);
    const ux = (x2 - x1), uy = (y2 - y1); line(g, x1 + ux * 0.25 - 0.4, y1 + uy * 0.25 - 0.5, x1 + ux * 0.7 - 0.4, y1 + uy * 0.7 - 0.5);
  }
  g.globalAlpha = 1;
}
function line(g, a, b, c, d) { g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); }

// 麻布の地（刺していない所だけ見える。織り目は格子にせず、不揃いな短い節で）
function linen(g, w, h) {
  g.fillStyle = C.linen; g.fillRect(0, 0, w, h);
  for (let i = 0; i < w * h / 55; i++) {
    const x = rr(0, w), y = rr(0, h), l = rr(1.5, 5), v = R() < 0.5;
    g.strokeStyle = R() < 0.5 ? lighten(C.linen, 0.18) : darken(C.linen, 0.1); g.globalAlpha = rr(0.35, 0.8); g.lineWidth = rr(0.6, 1.2);
    line(g, x, y, v ? x : x + l, v ? y + l : y);
  }
  g.globalAlpha = 1;
}
// 面を毛糸の針で埋める（ロング＆ショート／シードステッチ）。dens(x,y) で密度を場所ごとに変える
function fill(g, path, o) {
  g.save(); path(g); g.clip();
  const [x0, y0, x1, y1] = o.box, n = Math.round((x1 - x0) * (y1 - y0) / (o.per ?? 30));
  for (let i = 0; i < n; i++) {
    const x = rr(x0, x1), y = rr(y0, y1);
    if (o.dens && R() > o.dens(x, y)) continue;
    const a = o.angf ? o.angf(x, y) : (o.ang ?? 0) + rr(-(o.jit ?? 0.25), o.jit ?? 0.25), l = rr(o.l0 ?? 5, o.l1 ?? 12);
    const col = typeof o.col === "function" ? o.col(x, y) : vary(pick(o.col));
    stitch(g, x, y, x + Math.cos(a) * l, y + Math.sin(a) * l, rr(o.w0 ?? 1.6, o.w1 ?? 2.4), col, { shA: o.shA ?? 0.28 });
  }
  g.restore();
}
// サテンステッチ（形の向きに沿って平行に。間隔と角度は少しずつ不揃い）
function satin(g, path, cx, cy, rad, ang, col, o = {}) {
  g.save(); path(g); g.clip();
  const sp = o.sp ?? 2.1, ca = Math.cos(ang), sa = Math.sin(ang);
  for (let d = -rad; d <= rad; d += sp * rr(0.8, 1.2)) {
    const a = ang + rr(-0.06, 0.06), px = cx - sa * d, py = cy + ca * d;
    const c = Array.isArray(col) ? vary(pick(col)) : vary(col);
    stitch(g, px - Math.cos(a) * rad, py - Math.sin(a) * rad, px + Math.cos(a) * rad, py + Math.sin(a) * rad, sp * 1.25, c, { shA: 0.18 });
  }
  g.restore();
  if (o.edge !== false) { g.save(); path(g); g.strokeStyle = o.edge ?? darken(Array.isArray(col) ? col[0] : col, 0.35); g.lineWidth = o.ew ?? 1.3; g.setLineDash([3.2, 1.1]); g.stroke(); g.restore(); }
}
function ell(cx, cy, rx, ry, rot = 0) { return (g) => { g.beginPath(); g.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2); }; }
function poly(pts) { return (g) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); }; }
// フレンチノット（結び玉）
function knot(g, x, y, r, col) {
  g.fillStyle = C.slate; g.globalAlpha = 0.35; g.beginPath(); g.arc(x + 0.7, y + 1, r + 0.4, 0, 7); g.fill();
  g.globalAlpha = 1; g.fillStyle = vary(col); g.beginPath();
  for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2, q = r * rr(0.85, 1.1); i ? g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q) : g.moveTo(x + q, y); }
  g.closePath(); g.fill();
  g.strokeStyle = lighten(col, 0.4); g.globalAlpha = 0.6; g.lineWidth = Math.max(0.5, r * 0.32);
  g.beginPath(); g.arc(x - r * 0.15, y - r * 0.1, r * 0.55, Math.PI * 0.95, Math.PI * 1.6); g.stroke(); g.globalAlpha = 1;
}
// 糸（銀糸のとめ縫い）。始点・終点・たるみ量。たるみは下向き（重さ）。返り値は曲線上の点列
function curvePts(x1, y1, x2, y2, sag, n = 24) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 + sag, pts = [];
  for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; pts.push([u * u * x1 + 2 * u * t * mx + t * t * x2, u * u * y1 + 2 * u * t * my + t * t * y2]); }
  return pts;
}
function couch(g, pts, o = {}) {
  const pl = (ox, oy) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x + ox, y + oy) : g.moveTo(x + ox, y + oy))); g.stroke(); };
  g.lineCap = "round"; g.lineJoin = "round";
  g.strokeStyle = C.slate; g.globalAlpha = 0.45; g.lineWidth = 2.6; pl(0.9, 1.5);
  g.globalAlpha = 1; g.strokeStyle = o.col ?? "#cfd6d4"; g.lineWidth = 2.2; pl(0, 0);
  g.strokeStyle = "#ffffff"; g.globalAlpha = 0.85; g.lineWidth = 0.8; pl(-0.4, -0.5); g.globalAlpha = 1;
  // とめ縫い（墨の小さな横留め。間隔は不揃い）
  let acc = rr(4, 12), next = rr(13, 22);
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i], d = Math.hypot(bx - ax, by - ay);
    acc += d;
    while (acc > next) {
      acc -= next; next = rr(13, 24);
      const t = 1 - acc / d, x = ax + (bx - ax) * t, y = ay + (by - ay) * t, nx = -(by - ay) / d, ny = (bx - ax) / d, h = rr(2, 2.8);
      g.strokeStyle = o.tack ?? C.slate; g.lineWidth = 1.1; g.globalAlpha = 0.9; line(g, x - nx * h, y - ny * h, x + nx * h + rr(-0.6, 0.6), y + ny * h);
      g.globalAlpha = 1;
    }
  }
}
// 朝露のガラスビーズ（光らせない。透けた胴＋下の濃い縁＋小さな白い点）
function bead(g, x, y, r) {
  g.fillStyle = C.slate; g.globalAlpha = 0.4; g.beginPath(); g.arc(x + 0.8, y + 1.2, r, 0, 7); g.fill();
  g.globalAlpha = 0.92; g.fillStyle = "#b9ccce"; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  g.globalAlpha = 1; g.fillStyle = "#eef3f2"; g.beginPath(); g.arc(x - r * 0.15, y - r * 0.2, r * 0.62, 0, 7); g.fill();
  g.strokeStyle = "#5b6d70"; g.lineWidth = Math.max(0.8, r * 0.35); g.beginPath(); g.arc(x, y, r * 0.86, 0.15 * Math.PI, 0.9 * Math.PI); g.stroke();
  g.fillStyle = "#ffffff"; g.beginPath(); g.arc(x - r * 0.38, y - r * 0.42, Math.max(0.7, r * 0.26), 0, 7); g.fill();
}
function beadsOn(g, pts, every = 18, r0 = 1.5, r1 = 3) {
  let acc = rr(0, every);
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); acc += d;
    if (acc > every) { acc = rr(-every * 0.6, every * 0.2); bead(g, pts[i][0] + rr(-1, 1), pts[i][1] + rr(0.5, 2), rr(r0, r1)); }
  }
}
// しつけ糸（虫の通り道の予告。粗い運針で、針目の長さも間隔もばらばら）
function baste(g, pts, col, w = 1.6, o = {}) {
  const segs = []; let tot = 0;
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push(d); tot += d; }
  const at = (s) => { let i = 0; while (i < segs.length - 1 && s > segs[i]) { s -= segs[i]; i++; } const t = Math.min(1, s / segs[i]); return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t]; };
  let s = rr(0, 6);
  while (s < tot) {
    const l = rr(o.l0 ?? 7, o.l1 ?? 13), a = at(s), b = at(Math.min(tot, s + l));
    stitch(g, a[0], a[1], b[0], b[1], w, col, { shA: o.shA ?? 0.4, hi: false });
    s += l + rr(o.g0 ?? 5, o.g1 ?? 10);
  }
}
// ハシバミの支柱（長さ方向のサテン＋皮目の短い横針）
function pole(g, x1, y1, x2, y2, w) {
  const a = Math.atan2(y2 - y1, x2 - x1), nx = -Math.sin(a), ny = Math.cos(a), bend = rr(-3, 3);
  const mx = (x1 + x2) / 2 + nx * bend, my = (y1 + y2) / 2 + ny * bend;
  const P = (g) => { g.beginPath(); g.moveTo(x1 + nx * w, y1 + ny * w); g.quadraticCurveTo(mx + nx * w * 0.9, my + ny * w * 0.9, x2 + nx * w * 0.6, y2 + ny * w * 0.6); g.lineTo(x2 - nx * w * 0.6, y2 - ny * w * 0.6); g.quadraticCurveTo(mx - nx * w * 0.9, my - ny * w * 0.9, x1 - nx * w, y1 - ny * w); g.closePath(); };
  g.save(); g.globalAlpha = 0.45; g.translate(2, 3); P(g); g.fillStyle = C.slate; g.fill(); g.restore();
  g.save(); P(g); g.clip(); g.fillStyle = C.hazelD; g.fill();
  const L = Math.hypot(x2 - x1, y2 - y1);
  for (let k = -w; k < w; k += rr(1.4, 2.2)) {
    let s = rr(-20, 0);
    while (s < L) {
      const l = rr(14, 34), c = k < -w * 0.2 ? pick([C.hazelL, C.hazel]) : k > w * 0.5 ? pick([C.hazelD, C.hazel]) : C.hazel;
      const bx = x1 + Math.cos(a) * s + nx * (k + bend * Math.sin(Math.PI * s / L)), by = y1 + Math.sin(a) * s + ny * (k + bend * Math.sin(Math.PI * s / L));
      stitch(g, bx, by, bx + Math.cos(a) * l, by + Math.sin(a) * l, 2.1, vary(c), { shA: 0.2 });
      s += l + rr(1, 3);
    }
  }
  for (let i = 0; i < L / 26; i++) { const s = rr(0, L), k = rr(-w * 0.6, w * 0.4), bx = x1 + Math.cos(a) * s + nx * k, by = y1 + Math.sin(a) * s + ny * k; stitch(g, bx, by, bx + nx * rr(2, 4), by + ny * rr(2, 4), 1.2, "#cdb999", { shA: 0.2, hi: false }); }
  g.restore();
}
// 麻ひもの結び目（結び玉の固まり＋垂れたひもの端2本）
function twine(g, x, y, s = 1) {
  const jute = "#b39a6a";
  for (let i = 0; i < 5; i++) knot(g, x + rr(-4, 4) * s, y + rr(-3, 3) * s, rr(2.2, 3) * s, jute);
  stitch(g, x + 2 * s, y + 3 * s, x + 6 * s, y + 14 * s, 1.5, jute, { shA: 0.35 });
  stitch(g, x - 1 * s, y + 3 * s, x - 5 * s, y + 11 * s, 1.5, darken(jute, 0.1), { shA: 0.35 });
}
// 豆の葉（ハート形。中心の葉脈から斜めに刺す「フィッシュボーン」）
function leaf(g, x, y, len, ang, o = {}) {
  const ca = Math.cos(ang), sa = Math.sin(ang), w = len * (o.wr ?? 0.62);
  const tx = x + ca * len, ty = y + sa * len, nx = -sa, ny = ca;
  const P = (g) => { g.beginPath(); g.moveTo(x, y);
    g.bezierCurveTo(x + nx * w * 0.9 - ca * len * 0.15, y + ny * w * 0.9 - sa * len * 0.15, x + ca * len * 0.55 + nx * w * 0.75, y + sa * len * 0.55 + ny * w * 0.75, tx, ty);
    g.bezierCurveTo(x + ca * len * 0.55 - nx * w * 0.7, y + sa * len * 0.55 - ny * w * 0.7, x - nx * w * 0.85 - ca * len * 0.15, y - ny * w * 0.85 - sa * len * 0.15, x, y); g.closePath(); };
  g.save(); g.globalAlpha = 0.4; g.translate(1.6, 2.4); P(g); g.fillStyle = C.slate; g.fill(); g.restore();
  g.save(); P(g); g.clip(); g.fillStyle = C.leafD; g.fill();
  const light = o.light ?? 1;
  for (let t = -0.12; t < 1; t += rr(0.035, 0.05)) {
    const vx = x + ca * len * t, vy = y + sa * len * t;
    for (const sd of [1, -1]) {
      const ex = vx + nx * sd * w + ca * len * -0.22, ey = vy + ny * sd * w + sa * len * -0.22;
      const c = sd * light > 0 ? pick([C.leaf, C.leafL, C.leaf]) : pick([C.leafD, C.leaf]);
      stitch(g, ex, ey, vx + ca * 2, vy + sa * 2, 2, vary(c), { shA: 0.22 });
    }
  }
  g.restore();
  stitch(g, x, y, x + ca * len * 0.85, y + sa * len * 0.85, 1.1, C.leafL, { shA: 0.2, hi: false });
  g.save(); P(g); g.strokeStyle = darken(C.leafD, 0.25); g.lineWidth = 1.1; g.setLineDash([3, 1.2]); g.stroke(); g.restore();
  return [tx, ty];
}
// 名前テープ（白い織りのテープ。両端を折り返して2針で縫い留め）
function tape(g, x, y, w, h, o = {}) {
  g.save(); g.translate(x, y); g.rotate(o.rot ?? 0);
  g.fillStyle = C.slate; g.globalAlpha = 0.4; g.fillRect(2, 3, w, h); g.globalAlpha = 1;
  g.fillStyle = o.bg ?? C.tape; g.beginPath(); g.moveTo(0, 0.6); g.lineTo(w, 0); g.lineTo(w - 0.4, h); g.lineTo(0.3, h + 0.5); g.closePath(); g.fill();
  g.fillStyle = darken(o.bg ?? C.tape, 0.1); g.fillRect(0, 0, 4, h); g.fillRect(w - 4, 0, 4, h);
  g.strokeStyle = o.edge ?? "#7d8a8c"; g.lineWidth = 0.9; line(g, 5, 2.2, w - 5, 2); line(g, 5, h - 2, w - 5, h - 2.2);
  for (const sx of [2, w - 2]) { stitch(g, sx, h * 0.25, sx, h * 0.25 + 3, 1.1, C.slate, { sh: false, hi: false }); stitch(g, sx, h * 0.65, sx, h * 0.65 + 3, 1.1, C.slate, { sh: false, hi: false }); }
  g.restore();
}
function text(g, s, x, y, font, col, o = {}) {
  g.save(); g.font = font; g.fillStyle = col; g.textAlign = o.align ?? "left"; g.textBaseline = o.base ?? "alphabetic";
  if (o.rot) { g.translate(x, y); g.rotate(o.rot); x = 0; y = 0; }
  g.fillText(s, x, y); g.restore();
}
// 木の糸巻き（残りの糸 = 銀糸の巻きの太さ）
function reel(g, x, y, amt, s = 1) {
  const W = 26 * s, H = 34 * s;
  g.save(); g.translate(x, y);
  const fl = (yy) => { g.fillStyle = C.slate; g.globalAlpha = 0.4; g.beginPath(); g.ellipse(1.5, yy + 2, W / 2 + 4, 4.5 * s, 0, 0, 7); g.fill(); g.globalAlpha = 1;
    satin(g, ell(0, yy, W / 2 + 4, 4.5 * s), 0, yy, W / 2 + 6, 0.2, [C.hazelL, C.hazel], { sp: 1.8, ew: 1 }); };
  fl(H / 2);
  g.fillStyle = C.hazelD; g.fillRect(-5 * s, -H / 2, 10 * s, H);
  const rw = 5 * s + (W / 2 - 5 * s) * amt;
  if (amt > 0.02) {
    g.fillStyle = "#aeb8b6"; g.fillRect(-rw, -H / 2 + 3, rw * 2, H - 6);
    for (let yy = -H / 2 + 4; yy < H / 2 - 3; yy += rr(1.6, 2.6)) { g.strokeStyle = pick(["#dfe5e3", "#c3ccca", "#f2f5f4"]); g.lineWidth = rr(0.8, 1.3); line(g, -rw + 0.5, yy + rr(-0.6, 0.6), rw - 0.5, yy + rr(-0.8, 0.8)); }
    g.strokeStyle = C.slate; g.globalAlpha = 0.35; g.lineWidth = 1; line(g, rw, -H / 2 + 3, rw, H / 2 - 3); g.globalAlpha = 1;
  }
  fl(-H / 2);
  g.fillStyle = C.slate; g.beginPath(); g.ellipse(0, -H / 2, 3 * s, 1.4 * s, 0, 0, 7); g.fill();
  if (amt > 0.02) { g.strokeStyle = "#dfe5e3"; g.lineWidth = 1.1; g.beginPath(); g.moveTo(rw - 1, -4); g.quadraticCurveTo(rw + 8, 4, rw + 4, 16 * s); g.stroke(); }
  g.restore();
}
// 縫い針（1日の進み。上の縁を運針で縫い進む）
function needle(g, x, y, ang = -0.35) {
  g.save(); g.translate(x, y); g.rotate(ang);
  g.fillStyle = C.slate; g.globalAlpha = 0.4; g.beginPath(); g.moveTo(-15, 2.4); g.lineTo(17, 1.6); g.lineTo(-15, 4.2); g.fill(); g.globalAlpha = 1;
  g.fillStyle = "#c8cfcf"; g.beginPath(); g.moveTo(-16, -1.5); g.lineTo(18, 0); g.lineTo(-16, 1.5); g.quadraticCurveTo(-19, 0, -16, -1.5); g.fill();
  g.strokeStyle = "#ffffff"; g.lineWidth = 0.7; line(g, -14, -0.7, 12, -0.1);
  g.strokeStyle = C.slate; g.lineWidth = 0.9; g.beginPath(); g.ellipse(-13, 0, 2.4, 0.6, 0, 0, 7); g.stroke();
  g.restore();
}
// まち針（糸をかけられる所）。sel で選んだ状態（頭が大きく、糸が1本垂れる）
function pin(g, x, y, sel = false) {
  stitch(g, x, y, x + 5, y + 9, 1.1, "#c8cfcf", { shA: 0.35, hi: false });
  knot(g, x, y, sel ? 4.6 : 3.2, sel ? C.silver : "#5f7f8c");
  if (sel) { g.strokeStyle = "#dfe5e3"; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x, y + 3); g.quadraticCurveTo(x - 6, y + 14, x - 1, y + 22); g.stroke(); }
}

// --- 生き物（どれも小さく、刺繍の形で。写実的な脚・毛・複眼は描かない） ---
// 庭蜘蛛: 丸い腹（サテン）に白い結び玉の十字、短い脚8本は2針ずつ（毛・爪・目は描かない）
function spider(g, x, y, s = 1, rot = 0) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  const legs = [[-1, -6, -12, -12, -15, -4], [-1, -3, -14, -4, -18, 4], [-1, 0, -13, 4, -15, 12], [-1, 3, -9, 9, -10, 16]];
  for (const [ax, ay, bx, by, cx, cy] of legs) for (const m of [1, -1]) {
    stitch(g, ax * m, ay, bx * m + rr(-0.6, 0.6), by + rr(-0.6, 0.6), 2, C.spiderL, { shA: 0.55, hi: false });
    stitch(g, bx * m, by, cx * m + rr(-0.8, 0.8), cy + rr(-0.6, 0.6), 1.8, C.spiderL, { shA: 0.55, hi: false });
  }
  satin(g, ell(0, -6, 5, 5.5), 0, -6, 7, 1.57, [C.spiderD], { sp: 1.6, ew: 1 });
  satin(g, ell(0, 8, 9, 10.5, 0.05), 0, 8, 12, 0.4, [C.spider, C.spiderD], { sp: 1.8 });
  for (const [kx, ky] of [[0, 2], [0, 7.5], [0.4, 13], [-4.5, 7], [4.5, 7.8]]) knot(g, kx, ky, 1.6, "#f2efe6");
  g.restore();
}
function fly(g, x, y, s = 1, rot = 0) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  for (const m of [1, -1]) { g.save(); ell(m * 5, -5, 5.5, 3.2, m * -0.5)(g); g.fillStyle = "rgba(220,228,228,0.55)"; g.fill(); g.strokeStyle = "#8d9a9c"; g.lineWidth = 1; g.setLineDash([2.4, 1]); g.stroke(); g.restore(); }
  satin(g, ell(0, 1, 3.6, 6), 0, 1, 7, 0, ["#3c4448", C.slate], { sp: 1.5, ew: 0.8 });
  knot(g, 0, -6, 2.6, "#3c4448");
  g.restore();
}
function moth(g, x, y, s = 1, rot = 0) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  for (const m of [1, -1]) {
    const W1 = ell(m * 9, -3, 10, 7, m * -0.35), W2 = ell(m * 7, 7, 7, 5, m * 0.4);
    satin(g, W2, m * 7, 7, 9, m * 0.9, [C.mothD, C.moth], { sp: 1.7, ew: 1.1, edge: C.slate });
    satin(g, W1, m * 9, -3, 12, m * 0.5, [C.moth, lighten(C.moth, 0.15)], { sp: 1.7, ew: 1.1, edge: C.slate });
    knot(g, m * 11, -4, 2.4, C.mothD); knot(g, m * 11, -4, 1, "#efe9dc");
  }
  satin(g, ell(0, 2, 2.8, 9), 0, 2, 10, 1.57, [C.mothD], { sp: 1.4, ew: 0.8 });
  stitch(g, -1, -7, -6, -13, 1.2, C.mothD, { hi: false }); stitch(g, 1, -7, 6, -13, 1.2, C.mothD, { hi: false });
  g.restore();
}
function beetle(g, x, y, s = 1, rot = 0) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  for (const m of [1, -1]) for (const yy of [-3, 3, 9]) stitch(g, m * 6, yy, m * 12, yy + 3, 1.5, C.slate, { hi: false });
  satin(g, ell(0, -9, 5.5, 3.6), 0, -9, 7, 0, [C.beetle], { sp: 1.6, ew: 0.9 });
  satin(g, ell(0, 3, 9, 11), 0, 3, 12, 1.57, [C.beetle, darken(C.beetle, 0.15)], { sp: 1.8 });
  stitch(g, 0, -7, 0, 13, 1.1, darken(C.beetle, 0.4), { hi: false });
  stitch(g, -5, -4, -6, 6, 1.6, "#dfe5e3", { shA: 0.15 }); stitch(g, 4, -5, 5, 0, 1.4, C.beetleL, { shA: 0.1 });
  g.restore();
}
function ladybird(g, x, y, s = 1, rot = 0) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  satin(g, ell(0, -8, 4.5, 3.2), 0, -8, 6, 0, [C.slate], { sp: 1.4, ew: 0.8 });
  satin(g, ell(0, 1, 8, 8.5), 0, 1, 10, 1.4, [C.ladyR, darken(C.ladyR, 0.12)], { sp: 1.8 });
  stitch(g, 0, -6, 0, 9.5, 1, C.slate, { hi: false });
  for (const [kx, ky, r] of [[-4, -2, 1.8], [4.2, -1, 1.6], [-3.5, 4.5, 1.5], [3.8, 5, 1.9], [0, 0, 0]]) if (r) knot(g, kx, ky, r, C.slate);
  g.restore();
}
// ミツバチ: 丸い体、毛は描かず「結び玉の群れ」でふっくら。色は琥珀と焦げ茶（レモンは使わない）
function bee(g, x, y, s = 1, rot = 0) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  for (const m of [1, -1]) { g.save(); ell(m * 6, -7, 6, 4, m * -0.6)(g); g.fillStyle = "rgba(225,232,232,0.6)"; g.fill(); g.strokeStyle = "#8d9a9c"; g.lineWidth = 1; g.setLineDash([2.4, 1]); g.stroke(); g.restore(); }
  for (let i = 0; i < 26; i++) { const a = rr(0, 6.28), q = rr(0, 1) ** 0.6 * 8; knot(g, Math.cos(a) * q, 2 + Math.sin(a) * q * 1.05, rr(1.5, 2.1), Math.sin(a) * q > 2.5 || Math.sin(a) * q < -4.5 ? C.beeD : C.bee); }
  knot(g, 0, -8, 3, C.beeD);
  g.restore();
}
// スズメバチ: 細い腰ととがった腹。帯は幅がそろわない3本。羽は線だけ。針は描かない
function wasp(g, x, y, s = 1, rot = 0) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  for (const m of [1, -1]) { g.save(); ell(m * 8, -6, 9, 3, m * -0.35)(g); g.fillStyle = "rgba(225,232,232,0.5)"; g.fill(); g.strokeStyle = "#7d8a8c"; g.lineWidth = 1; g.setLineDash([2.6, 1]); g.stroke(); g.restore(); }
  satin(g, ell(0, -12, 3.6, 3.2), 0, -12, 5, 0, [C.lemon], { sp: 1.3, ew: 0.8, edge: C.slate });
  satin(g, ell(0, -5, 4, 4.4), 0, -5, 6, 0, [C.slate], { sp: 1.4, ew: 0.8 });
  const ab = poly([[-5.6, 2], [5.6, 2], [5, 9], [2.6, 15], [0, 18], [-2.6, 15], [-5, 9]]);
  satin(g, ab, 0, 8, 12, 0, [C.lemon], { sp: 1.6, edge: C.slate, ew: 1 });
  g.save(); ab(g); g.clip();
  for (const [yy, h] of [[4.2, 1.6], [8.6, 2.6], [13.2, 2]]) { g.fillStyle = C.slate; g.beginPath(); g.moveTo(-7, yy); g.lineTo(7, yy - 0.8); g.lineTo(7, yy + h); g.lineTo(-7, yy + h + 0.6); g.fill(); }
  g.restore();
  stitch(g, -1.5, -14, -5, -19, 1.1, C.slate, { hi: false }); stitch(g, 1.5, -14, 5, -19, 1.1, C.slate, { hi: false });
  g.restore();
}
// 糸巻きの途中の虫（銀糸で包まれていく。くるくるの帯を2〜3本だけ）
function wrapped(g, x, y, s = 1) {
  g.save(); g.translate(x, y); g.scale(s, s);
  satin(g, ell(0, 0, 6, 9, 0.2), 0, 0, 10, 0.3, ["#d6dddb", "#bfc8c6"], { sp: 1.4, ew: 0.9, edge: "#8d9a9c" });
  g.restore();
}
// 鉢を伏せた支柱の頭（英国の菜園の小物）
function potOnCane(g, x, y, s = 1) {
  g.save(); g.translate(x, y); g.scale(s, s);
  const P = poly([[-11, -16], [11, -16], [14, 2], [-14, 2]]);
  g.save(); g.globalAlpha = 0.4; g.translate(2, 3); P(g); g.fillStyle = C.slate; g.fill(); g.restore();
  satin(g, P, 0, -7, 16, 1.57, [C.pot, darken(C.pot, 0.12)], { sp: 2 });
  satin(g, poly([[-15, 0], [15, 0], [15, 6], [-15, 6]]), 0, 3, 16, 0, [lighten(C.pot, 0.1), C.pot], { sp: 1.8 });
  g.restore();
}
function wateringCan(g, x, y, s = 1) {
  g.save(); g.translate(x, y); g.scale(s, s);
  satin(g, poly([[22, -2], [54, -44], [57, -41], [26, 2]]), 40, -20, 30, -0.92, [C.zinc, C.zincL], { sp: 1.7 });
  satin(g, ell(58, -44, 5, 7, -0.9), 58, -44, 8, 0.6, [C.zincL], { sp: 1.4 });
  const B = poly([[-22, -34], [22, -36], [24, 6], [-24, 8]]);
  g.save(); g.globalAlpha = 0.4; g.translate(2, 3); B(g); g.fillStyle = C.slate; g.fill(); g.restore();
  satin(g, B, 0, -14, 30, 1.57, [C.zinc, C.zincD, C.zincL], { sp: 2 });
  for (const yy of [-24, -6]) stitch(g, -22, yy, 22, yy - 1, 1.6, C.zincD, { hi: false });
  g.strokeStyle = C.zincD; g.lineWidth = 3; g.beginPath(); g.moveTo(-14, -35); g.quadraticCurveTo(0, -56, 16, -36); g.stroke();
  g.strokeStyle = C.zincL; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-13, -36); g.quadraticCurveTo(0, -55, 15, -37); g.stroke();
  g.restore();
}
// 布の上に画像を作る共通処理（DPR 2）
function makeCanvas(id, w, h, dpr = 2) {
  const c = document.getElementById(id); c.width = w * dpr; c.height = h * dpr; c.style.width = w + "px"; c.style.height = h + "px";
  const g = c.getContext("2d"); g.scale(dpr, dpr); return g;
}
// 2本の糸（点列）の交点（結び目の位置）
function crossings(A, B) {
  const out = [];
  for (let i = 1; i < A.length; i++) for (let j = 1; j < B.length; j++) {
    const [x1, y1] = A[i - 1], [x2, y2] = A[i], [x3, y3] = B[j - 1], [x4, y4] = B[j];
    const d = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4); if (!d) continue;
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / d, u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / d;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) out.push([x1 + t * (x2 - x1), y1 + t * (y2 - y1)]);
  }
  return out;
}
// 生垣のかたまり（上が明るく下が暗い、丸いこんもり。かたまりごとに針の向きを変える）
function clump(g, cx, cy, rx, ry, base, light) {
  const P = (g) => { g.beginPath(); for (let i = 0; i <= 14; i++) { const a = i / 14 * Math.PI * 2, q = rr(0.9, 1.06); g.lineTo(cx + Math.cos(a) * rx * q, cy + Math.sin(a) * ry * q); } g.closePath(); };
  g.save(); g.globalAlpha = 0.3; g.translate(1.5, 3.5); P(g); g.fillStyle = C.slate; g.fill(); g.restore();
  g.save(); P(g); g.fillStyle = base; g.fill(); g.restore();
  // 針は株元（下の中央）から扇に広がる向き。上の縁ほど明るい色
  const bx = cx + rr(-rx * 0.2, rx * 0.2), by = cy + ry * 1.3;
  fill(g, P, { box: [cx - rx, cy - ry, cx + rx, cy + ry], per: 4, ang: 0, jit: 0, l0: 5, l1: 10, w0: 1.9, w1: 2.5, shA: 0.12,
    col: (x, y) => { const t = (y - (cy - ry)) / (2 * ry) + rr(-0.15, 0.15); return vary(t < 0.3 ? light : t < 0.75 ? base : darken(base, 0.08)); },
    angf: (x, y) => Math.atan2(y - by, x - bx) + rr(-0.15, 0.15) });
}
// 豆のつる（茎の運針で支柱に巻きつく）
function vine(g, x1, y1, x2, y2, amp = 7, col = C.leafD) {
  const n = Math.max(6, Math.hypot(x2 - x1, y2 - y1) / 8), a = Math.atan2(y2 - y1, x2 - x1), nx = -Math.sin(a), ny = Math.cos(a), ph = rr(0, 6);
  let px = x1, py = y1;
  for (let i = 1; i <= n; i++) {
    const t = i / n, w = Math.sin(t * 9 + ph) * amp * rr(0.8, 1.1), x = x1 + (x2 - x1) * t + nx * w, y = y1 + (y2 - y1) * t + ny * w;
    stitch(g, px, py, x, y, 1.6, vary(col), { shA: 0.3, hi: false }); px = x; py = y;
  }
}
