// 011 炉ばたの一吹き — 見本用の描画道具（鳩羽色のパステル紙に、ソフトパステルと木炭で描く）
// 実装でも同じ考え方を canvas で使う: 動かない物は起動時に1回だけ描いて drawImage。
// ctx.filter / shadowBlur / createPattern は使わない。熱は「ガラスの内側だけ」に lighter で重ねる。
const C = {
  paper: "#8a8291",   // 鳩羽色のパステル紙（地）
  brick: "#c7a98a",   // 耐火煉瓦の素焼き色（炉・壁の一部）
  hot: "#e8662a",     // 熱いガラスの朱橙（主役）
  core: "#ffd29a",    // ガラスの芯（内側にだけ重ねる淡い色。単独で面にしない）
  ember: "#8e2f22",   // 冷めかけの暗赤
  cold: "#6c6670",    // 冷えたガラスの鈍い灰
  teal: "#1f7a72",    // 瓶ガラスの青緑（仕上がり・成功）
  chalk: "#f6f3ea",   // 白墨（注文の輪郭・小さい字）
  gold: "#e0b04a",    // 合った所の白墨がほどける色（線だけ）
  charcoal: "#2d2629",// 木炭の墨
  slate: "#363a3f",   // 石盤
  iron: "#4a4650",    // 鉄（竿・炉の扉）
  day: "#dfe6e2",     // 窓の昼の光（運河）
  wood: "#8a6247",    // 濡らした桜のブロック・作業台
};
let _s = 1;
function setSeed(s) { _s = s >>> 0 || 1; }
function rnd() { _s ^= _s << 13; _s >>>= 0; _s ^= _s >>> 17; _s ^= _s << 5; _s >>>= 0; return _s / 4294967296; }
function rr(a, b) { return a + (b - a) * rnd(); }
function pick(a) { return a[Math.floor(rnd() * a.length)]; }
function hex2rgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function rgb(r, g, b, a = 1) { return `rgba(${r | 0},${g | 0},${b | 0},${a})`; }
function mix(a, b, t) { const A = hex2rgb(a), B = hex2rgb(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join(""); }
function jitterCol(h, k = 0.08) { const [r, g, b] = hex2rgb(h); const f = 1 + rr(-k, k); return rgb(Math.min(255, r * f), Math.min(255, g * f), Math.min(255, b * f)); }

// ゆっくり変わる値（紙の目の濃さ・擦れのむら用。全面に同じ密度にしない）
function vnoise(x, y, seed = 7) {
  const h = (i, j) => { let n = i * 374761393 + j * 668265263 + seed * 2147483647; n = (n ^ (n >> 13)) * 1274126177; return ((n ^ (n >> 16)) >>> 0) / 4294967296; };
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, s = t => t * t * (3 - 2 * t);
  const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
  return a + (b - a) * s(xf) + (c - a) * s(yf) + (a - b - c + d) * s(xf) * s(yf);
}

const DPR = 2;
function makeCanvas(id, W, H) {
  const cv = document.getElementById(id); cv.width = W * DPR; cv.height = H * DPR; cv.style.width = W + "px"; cv.style.height = H + "px";
  const g = cv.getContext("2d"); g.scale(DPR, DPR); g.lineCap = "round"; g.lineJoin = "round"; g.W = W; g.H = H; return g;
}
// 層は本体と同じ画素数・同じ変換で作る（translate/rotate 中でも位置がずれない）
function layer(g) { const cv = document.createElement("canvas"); cv.width = g.canvas.width; cv.height = g.canvas.height; const L = cv.getContext("2d"); L.setTransform(g.getTransform()); L.lineCap = "round"; L.lineJoin = "round"; L.cv = cv; L.W = g.W; L.H = g.H; return L; }

// 紙の目（ハニカム状の凹み）。パステルを乗せた所だけに出す（地の紙には出さない）
let TOOTH = null;
function tooth(w, h) {
  if (TOOTH && TOOTH.width === w && TOOTH.height === h) return TOOTH;
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h; const t = cv.getContext("2d"); const sv = _s; setSeed(901);
  for (let i = 0; i < w * h / 36; i++) {
    const x = rnd() * w, y = rnd() * h, d = vnoise(x / 120, y / 120, 3);
    if (rnd() > 0.35 + d * 0.6) continue;           // 濃さがまだらに変わる
    t.fillStyle = `rgba(0,0,0,${rr(0.5, 1)})`;
    t.beginPath(); t.ellipse(x, y, rr(0.7, 2.0), rr(0.6, 1.6), rr(0, 3.14), 0, 7); t.fill();
  }
  _s = sv; TOOTH = cv; return cv;
}
// 層を本体に合成。紙の目で一部を抜く（strength 0..1。筆圧が弱いほど紙が透ける）
function compose(g, L, toothK = 0.45, alpha = 1, op = "source-over") {
  if (toothK > 0) { const T = tooth(L.cv.width, L.cv.height); L.save(); L.setTransform(1, 0, 0, 1, 0, 0); L.globalCompositeOperation = "destination-out"; L.globalAlpha = toothK; L.drawImage(T, 0, 0); L.restore(); }
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = alpha; g.globalCompositeOperation = op; g.drawImage(L.cv, 0, 0); g.restore();
}
// 紙の地。均一な1色にしない: 大きなむら（漉きむら）と、ごく薄い指の擦れ
function paper(g, W, H) {
  g.fillStyle = C.paper; g.fillRect(0, 0, W, H);
  const step = 6;
  for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) {
    const v = vnoise(x / 140, y / 140, 11) - 0.5, w = vnoise(x / 30, y / 30, 5) - 0.5;
    const k = v * 0.16 + w * 0.04;
    g.fillStyle = k > 0 ? `rgba(255,248,250,${k})` : `rgba(40,30,45,${-k})`; g.fillRect(x, y, step, step);
  }
}

// ソフトパステルの面: 方向のある短いストロークを重ねる（筆圧・長さ・間隔は1本ずつ違う）
// path(ctx) は輪郭のパスを作る関数。輪郭の外へ少しはみ出すストロークを許す（over）
function pastel(g, path, col, o = {}) {
  const W = g.W, H = g.H, L = layer(g);
  const ang = o.ang ?? -0.9, len = o.len ?? [6, 16], wid = o.wid ?? [1.6, 3.2], dens = o.dens ?? 1, a = o.a ?? [0.55, 0.95];
  const bb = o.bb || [0, 0, W, H];
  L.save(); path(L); L.clip();
  const cols = Array.isArray(col) ? col : [col];
  const n = Math.floor((bb[2] * bb[3]) / 14 * dens);
  const ms = o.mseed ?? Math.floor(rr(1, 999));
  for (let i = 0; i < n; i++) {
    const x = bb[0] + rnd() * bb[2], y = bb[1] + rnd() * bb[3];
    // 筆圧のむら: ゆっくり変わる値で、塗りの密度を場所ごとに変える
    if (o.mottle && rnd() < o.mottle * vnoise(x / (o.mscale || 26), y / (o.mscale || 26), ms) * 1.6) continue;
    const an = (typeof ang === "function" ? ang(x, y) : ang) + rr(-(o.spread ?? 0.22), o.spread ?? 0.22), l = rr(len[0], len[1]);
    const bw = typeof o.bow === "function" ? o.bow(x, y) : (o.bow ?? 0) + rr(-1.2, 1.2);
    L.strokeStyle = jitterCol(pick(cols), o.var ?? 0.07); L.globalAlpha = rr(a[0], a[1]); L.lineWidth = rr(wid[0], wid[1]);
    L.beginPath(); L.moveTo(x - Math.cos(an) * l / 2, y - Math.sin(an) * l / 2);
    L.quadraticCurveTo(x - Math.sin(an) * bw, y + Math.cos(an) * bw, x + Math.cos(an) * l / 2, y + Math.sin(an) * l / 2); L.stroke();
  }
  L.restore();
  compose(g, L, o.tooth ?? 0.45, o.alpha ?? 1, o.op);
}
// 塗りの形を輪郭とずらす（人の手のパステルは輪郭と塗りが 1〜3px ずれる）
function loose(pts, amp = 2.5, seg = 14) { const o = wob([...pts, pts[0]], 0, seg); return o.map(([x, y]) => [x + rr(-amp, amp), y + rr(-amp, amp)]); }
// 物ごとのストロークの組（長さ・太さ・向き・密度を変える）
const ST = {
  wall:  { ang: (x, y) => 0.12 + (vnoise(x / 120, y / 120, 8) - 0.5) * 0.6, len: [26, 60], wid: [5, 10], a: [0.12, 0.3], dens: 0.22, tooth: 0.25, spread: 0.12, mottle: 0.7, mscale: 60 },
  brick: { ang: () => (rnd() < 0.8 ? 0 : 1.57), len: [6, 14], wid: [2, 3.4], a: [0.7, 1], dens: 1.8, tooth: 0.3, spread: 0.3, mottle: 0.45, mscale: 18 },
  wood:  { len: [30, 70], wid: [1.2, 2.6], a: [0.55, 0.95], dens: 0.9, tooth: 0.3, spread: 0.04, mottle: 0.35, mscale: 30 },
  iron:  { ang: 1.45, len: [10, 22], wid: [2, 3.4], a: [0.8, 1], dens: 1.6, tooth: 0.2, mottle: 0.25 },
  sky:   { ang: (x, y) => 0.05, len: [20, 40], wid: [5, 9], a: [0.3, 0.6], dens: 0.35, tooth: 0.08, spread: 0.08 },
  cloth: { len: [4, 9], wid: [1.4, 2.4], a: [0.6, 0.95], dens: 1.6, tooth: 0.45, spread: 0.6, mottle: 0.3 },
};
function S(name, extra = {}) { return Object.assign({}, ST[name], extra); }
// 紙の地に、パステルが掠った跡をごく弱く（場所で濃さが変わる）
function paperGraze(g, W, H, cols) {
  pastel(g, c => { c.beginPath(); c.rect(-10, -10, W + 20, H + 20); }, cols, { ang: (x, y) => (vnoise(x / 150, y / 150, 2) - 0.5) * 1.2, len: [10, 30], wid: [1.2, 3], a: [0.1, 0.28], dens: 0.45, tooth: 0.55, mottle: 0.85, mscale: 50, bb: [0, 0, W, H] });
}
// 指でこすった面（擦筆）。境目が柔らかく、粒が少ない
function smudge(g, path, col, a = 0.5, bb) {
  pastel(g, path, col, { ang: rr(-0.4, 0.4), len: [14, 30], wid: [5, 9], a: [0.08, 0.2], dens: 0.6, tooth: 0.15, alpha: a, bb });
}

// 木炭の線: 揺れ・筆圧（太さの変化）・ときどきのかすれ。2度引きで少しずれる
function charcoal(g, pts, w = 2, col = C.charcoal, o = {}) {
  const passes = o.passes ?? 2;
  for (let p = 0; p < passes; p++) {
    const dx = p ? rr(-1.1, 1.1) : 0, dy = p ? rr(-1.1, 1.1) : 0;
    g.strokeStyle = col; g.globalAlpha = p ? 0.38 : (o.a ?? 0.92);
    for (let i = 1; i < pts.length; i++) {
      if (o.gaps && rnd() < o.gaps) continue;
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
      const t = i / pts.length, press = o.press ? o.press(t) : (0.7 + 0.5 * Math.sin(t * 3.1 + p));
      g.lineWidth = Math.max(0.6, w * press * rr(0.85, 1.12));
      g.beginPath(); g.moveTo(x0 + dx + rr(-0.5, 0.5), y0 + dy + rr(-0.5, 0.5)); g.lineTo(x1 + dx + rr(-0.5, 0.5), y1 + dy + rr(-0.5, 0.5)); g.stroke();
    }
  }
  g.globalAlpha = 1;
}
// 点列を細かく割って揺らす
function wob(pts, amp = 1.2, seg = 6) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], d = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(d / seg));
    for (let k = 0; k < n; k++) { const t = k / n; out.push([x0 + (x1 - x0) * t + rr(-amp, amp) * 0.5, y0 + (y1 - y0) * t + rr(-amp, amp) * 0.5]); }
  }
  out.push(pts[pts.length - 1]); return out;
}
// 白墨の線: 実線を描いてから紙の目で強く抜く（setLineDash の点線にしない）
function chalk(g, pts, w = 2.6, col = C.chalk, o = {}) {
  const L = layer(g);
  L.strokeStyle = col; L.lineWidth = w; L.globalAlpha = o.a ?? 0.95;
  L.beginPath(); pts.forEach(([x, y], i) => i ? L.lineTo(x, y) : L.moveTo(x, y)); L.stroke();
  L.lineWidth = w * 0.5; L.globalAlpha = 0.5; L.beginPath(); pts.forEach(([x, y], i) => i ? L.lineTo(x + 0.8, y + 0.6) : L.moveTo(x + 0.8, y + 0.6)); L.stroke();
  compose(g, L, o.tooth ?? 0.7);
}
function polyPath(pts) { return c => { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); }; }
function ellPath(x, y, rx, ry, rot = 0) { return c => { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); }; }
function bbox(pts, pad = 4) { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const [x, y] of pts) { a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); d = Math.max(d, y); } return [a - pad, b - pad, c - a + pad * 2, d - b + pad * 2]; }

// ---- ガラス ----
// prof: 上(竿の口)から下までの半径の列。cx: 軸の x。top: 竿の口の y。h: 高さ
function glassOutline(cx, top, h, prof, wob1 = 0.6) {
  const n = prof.length, L = [], R = [];
  for (let i = 0; i < n; i++) { const y = top + h * i / (n - 1), r = prof[i]; L.push([cx - r + rr(-wob1, wob1), y]); R.push([cx + r + rr(-wob1, wob1), y]); }
  // 底は丸く閉じる
  const rb = prof[n - 1], yb = top + h, bot = [];
  for (let k = 1; k < 8; k++) { const a = Math.PI - k / 8 * Math.PI; bot.push([cx + Math.cos(a) * rb, yb + Math.sin(a) * rb * 0.55]); }
  return { pts: [...L, ...bot, ...R.reverse()], L, R: R.reverse() };
}
// heat: 1=熱い 0.5=暗赤 0=冷えた。state: hot|warn|cold|done|thin|bubble|broken
// o.workY: 作業中の高さ（0..1）。o.small: 小さい器（映り込みを描かない）
function drawGlass(g, cx, top, h, prof, heat = 1, o = {}) {
  const sh = glassOutline(cx, top, h, prof), P = polyPath(sh.pts), bb = bbox(sh.pts, 6);
  const n = prof.length, st = o.state || "hot";
  let best = 0; prof.forEach((r, i) => { if (r >= prof[best]) best = i; });
  // ガラスの面は丸みに沿った弧のストローク（中央で平ら、縁ほど強く曲がる）
  const arc = { ang: (x, y) => 0.04, bow: (x, y) => { const i = Math.min(n - 1, Math.max(0, Math.round((y - top) / h * (n - 1)))), r = prof[i] || 1; return 3.2 * Math.max(-1, Math.min(1, (x - cx) / r)) ** 2 * 1.4 + rr(-0.6, 0.6); }, len: [8, 20], wid: [1.6, 3], spread: 0.08 };
  const body = st === "done" ? C.teal : heat > 0.5 ? mix(C.ember, C.hot, (heat - 0.5) * 2) : mix(C.cold, C.ember, heat * 2);
  if (st === "done") {
    pastel(g, P, [C.teal, mix(C.teal, C.day, 0.35)], Object.assign({}, arc, { a: [0.25, 0.5], dens: 0.9, bb, tooth: 0.35, mottle: 0.4 }));
    edgeBand(g, sh, mix(C.teal, C.charcoal, 0.35), 4.5, 0.85);
  } else if (st === "thin") {
    // 薄すぎ: 淡い朱橙を疎らに塗り、ガラス越しに壁の紙が透ける。縁だけ細く明るい
    smudge(g, P, mix(C.hot, C.core, 0.55), 0.75, bb);
    pastel(g, P, [mix(C.hot, C.core, 0.6)], Object.assign({}, arc, { a: [0.25, 0.45], dens: 0.25, bb, tooth: 0.3 }));
    rim(g, sh, mix(C.core, C.chalk, 0.4), 1.6, 0.9);
  } else {
    pastel(g, P, [body, mix(body, C.charcoal, 0.12)], Object.assign({}, arc, { a: [0.75, 1], dens: 1.25, bb, tooth: 0.16, mottle: 0.25, mscale: 18 }));
    edgeBand(g, sh, mix(body, C.charcoal, 0.45), 3.5, 0.8);
    // 竿に近い首は鉄に熱を取られて暗い
    { const nk = Math.max(3, Math.floor(n * 0.18)), pts = [...sh.L.slice(0, nk), ...sh.R.slice(0, nk).reverse()];
      pastel(g, polyPath(pts), [mix(body, C.charcoal, 0.5), mix(body, C.ember, 0.6)], Object.assign({}, arc, { a: [0.35, 0.75], dens: 1.3, bb: bbox(pts), tooth: 0.35 })); }
    // 芯: 厚い所に、大きさも位置も違う斑を2〜3枚（大きな淡い楕円の面を作らない）。外へは出さない
    if (heat > 0.4) {
      const k = (heat - 0.4) / 0.6;
      const blobs = [[best, 0.52, 0.07, 0.12], [Math.max(1, best - 4), 0.3, 0.04, -0.2], [Math.min(n - 2, best + 2), 0.24, 0.035, 0.3]];
      for (const [i, sx, sy, off] of blobs) {
        const r = prof[i], y = top + h * i / (n - 1), x = cx + r * off;
        const rad = Array.from({ length: 11 }, () => [rr(0.6, 1.3), rr(0.6, 1.3)]);
        for (const sc of [1, 0.66, 0.36]) {  // 3段に重ねて縁ほど薄く（切り紙の硬い縁にしない）
          const pts = rad.map(([a1, a2], q) => { const an = q / 11 * Math.PI * 2; return [x + Math.cos(an) * r * sx * a1 * sc, y + Math.sin(an) * h * sy * a2 * sc]; });
          pastel(g, c => { polyPath(sh.pts)(c); c.clip(); polyPath(pts)(c); }, [C.core, mix(C.core, C.hot, 0.45)], Object.assign({}, arc, { a: [0.3, 0.7], dens: 0.7, bb: bbox(pts), tooth: 0.6, alpha: 0.3 * k, op: "lighter" }));
        }
      }
    }
    // 冷えの筋: 髪の毛ほどの短い擦れ（warn は少し、cold は多め）。割れのひびとは描き分ける
    if (st === "warn" || st === "cold" || st === "broken") scuffs(g, sh, cx, top, h, prof, st === "warn" ? 0.45 : 1);
  }
  if (st === "bubble") bubble(g, cx + prof[Math.floor(n * 0.62)] * 0.12, top + h * 0.62, prof[Math.floor(n * 0.62)] * 0.4, body);
  if (st === "broken") crack(g, cx, top, h, prof);
  // 窓の映り込み（大きいガラスだけ）
  if (!o.small && h >= 120 && st !== "thin") windowGlint(g, cx, top, h, prof, st === "done" ? 0.55 : 0.5);
  // 竿の付け根のジャックの押し跡（細い溝1本）
  if (st !== "done") { const i = 1, r = prof[i], y = top + h * i / (n - 1) + 2; charcoal(g, wob([[cx - r + 1, y], [cx, y + 2.5], [cx + r - 1, y]], 0.3, 3), 1.1, mix(body, C.charcoal, 0.6), { passes: 1, a: 0.8 }); }
  // 木炭の輪郭: 窓に向いた左側は細くかすれ、右と底は太い。所々で塗りと離れる
  charcoal(g, wob(sh.L, 0.8, 5), 1.3, C.charcoal, { gaps: 0.16, a: 0.75 });
  const rest = sh.pts.slice(sh.L.length - 1);
  charcoal(g, wob(rest, 0.8, 5), 2.4, C.charcoal, { press: t => 0.7 + 0.6 * Math.sin(t * 3.14), gaps: 0.04 });
  if (o.workY != null) workMark(g, cx, top, h, prof, o.workY);
  return sh;
}
function edgeBand(g, sh, col, w, a) {
  const L = layer(g); L.save(); polyPath(sh.pts)(L); L.clip();
  L.strokeStyle = col; L.globalAlpha = a; L.lineWidth = w * 2; L.beginPath(); sh.pts.forEach(([x, y], i) => i ? L.lineTo(x, y) : L.moveTo(x, y)); L.closePath(); L.stroke();
  L.restore(); compose(g, L, 0.5);
}
function rim(g, sh, col, w, a) {
  const L = layer(g); L.save(); polyPath(sh.pts)(L); L.clip();
  L.strokeStyle = col; L.globalAlpha = a; L.lineWidth = w * 2; L.beginPath(); sh.pts.forEach(([x, y], i) => i ? L.lineTo(x, y) : L.moveTo(x, y)); L.closePath(); L.stroke();
  L.restore(); compose(g, L, 0.3);
}
// 窓の映り込み: 十字の桟のある弓なりの四角を1つ（白墨色 50%、紙の目で抜く）。平行線にしない
function windowGlint(g, cx, top, h, prof, a) {
  const n = prof.length; let best = 0; prof.forEach((r, i) => { if (r >= prof[best]) best = i; });
  const i0 = Math.max(1, best - 3), r = prof[i0], y = top + h * i0 / (n - 1);
  if (r < 24) return;
  const w = r * 0.26, hh = r * 0.34, x0 = cx - r * 0.7, y0 = y - hh * 0.6, bw = r * 0.06;
  const quad = []; // 左右の辺は丸みで外へ弓なり、上下の辺はわずかに下がる
  for (let k = 0; k <= 6; k++) { const t = k / 6; quad.push([x0 + w * t, y0 + Math.sin(t * Math.PI) * -bw * 0.5 + t * bw]); }
  for (let k = 0; k <= 6; k++) { const t = k / 6; quad.push([x0 + w + bw + Math.sin(t * Math.PI) * bw, y0 + bw + hh * t]); }
  for (let k = 0; k <= 6; k++) { const t = k / 6; quad.push([x0 + w - w * t + bw * 0.5, y0 + hh + bw * 1.6 - t * bw]); }
  for (let k = 0; k <= 6; k++) { const t = k / 6; quad.push([x0 - Math.sin(t * Math.PI) * bw * 1.4, y0 + hh - hh * t]); }
  const L = layer(g); L.fillStyle = C.chalk; L.globalAlpha = a; polyPath(quad)(L); L.fill();
  // 桟の十字は抜く（細く、少し曲がる）
  L.globalCompositeOperation = "destination-out"; L.globalAlpha = 1; L.strokeStyle = "#000"; L.lineWidth = Math.max(1.6, r * 0.05);
  L.beginPath(); L.moveTo(x0 + w * 0.5 + bw * 0.3, y0 - 2); L.quadraticCurveTo(x0 + w * 0.5 + bw, y0 + hh / 2, x0 + w * 0.5 + bw * 0.4, y0 + hh + 4); L.stroke();
  L.beginPath(); L.moveTo(x0 - 4, y0 + hh * 0.45); L.quadraticCurveTo(x0 + w / 2, y0 + hh * 0.45 + bw, x0 + w + bw + 4, y0 + hh * 0.5 + bw); L.stroke();
  compose(g, L, 0.45);
}
// 冷えの筋: 髪の毛ほどの細さの短い白い擦れ（向き不揃い。枝分かれさせない）
function scuffs(g, sh, cx, top, h, prof, k) {
  const L = layer(g); L.save(); polyPath(sh.pts)(L); L.clip(); L.strokeStyle = C.chalk; const n = prof.length;
  for (let i = 0; i < 26 * k; i++) {
    const j = Math.floor(rr(0.12, 0.95) * n), r = prof[j], y = top + h * j / (n - 1), x = cx + rr(-r * 0.85, r * 0.85), an = rr(-0.5, 0.5), l = rr(3, 9);
    L.lineWidth = rr(0.4, 0.7); L.globalAlpha = rr(0.4, 0.8);
    L.beginPath(); L.moveTo(x, y); L.quadraticCurveTo(x + l / 2, y + rr(-1.5, 1.5), x + Math.cos(an) * l, y + Math.sin(an) * l); L.stroke();
  }
  L.restore(); compose(g, L, 0.5);
}
// 割れ: 木炭の太い折れ線＋片側に白墨の光（ひび）。欠けたかけらが1つ下へ
function crack(g, cx, top, h, prof) {
  const n = prof.length, i = Math.floor(n * 0.55), r = prof[i], y = top + h * 0.55;
  const pts = [[cx - r * 0.9, y - 10], [cx - r * 0.4, y + 2], [cx - r * 0.1, y - 6], [cx + r * 0.3, y + 8], [cx + r * 0.85, y + 1]];
  charcoal(g, pts, 2.6, C.charcoal, { passes: 1, press: () => 1 });
  chalk(g, pts.map(([x, y2]) => [x + 0.5, y2 + 2.6]), 1.2, C.chalk, { tooth: 0.3 });
  charcoal(g, [[cx - r * 0.1, y - 6], [cx - r * 0.05, y - 22]], 1.8, C.charcoal, { passes: 1 });
  const sh = [[cx + r * 0.6, y + h * 0.42], [cx + r * 0.85, y + h * 0.38], [cx + r * 0.78, y + h * 0.46]];
  pastel(g, polyPath(sh), [C.cold], { ang: 0, len: [3, 6], wid: [1, 2], dens: 4, bb: bbox(sh), tooth: 0.2 });
  charcoal(g, [...sh, sh[0]], 1.2, C.charcoal, { passes: 1 });
}
// 気泡: 内側にゆがんだ白っぽい楕円（白墨の弧2本・閉じない）＋その周りだけ色が薄い
function bubble(g, x, y, r, body) {
  const ring = Array.from({ length: 15 }, (_, k) => { const a = k / 14 * Math.PI * 2; return [x + Math.cos(a) * r * 1.35 * (1 + 0.12 * Math.sin(a * 2)), y + Math.sin(a) * r * 0.95]; });
  pastel(g, polyPath(ring), [mix(body, C.core, 0.5)], { ang: 0.05, len: [5, 10], wid: [1.4, 2.4], a: [0.4, 0.7], dens: 1, bb: bbox(ring), tooth: 0.4, alpha: 0.7 });
  const pt = (a0, a1, k) => Array.from({ length: 9 }, (_, q) => { const a = a0 + (a1 - a0) * q / 8; return [x + Math.cos(a) * r * k * (1 + 0.15 * Math.sin(a * 3 + 1)), y + Math.sin(a) * r * 0.62 * k]; });
  chalk(g, pt(-2.8, -0.4, 1), 1.8, C.chalk, { tooth: 0.35 });
  chalk(g, pt(0.5, 2.2, 0.92), 1.4, C.chalk, { tooth: 0.5, a: 0.75 });
}
// 作業中の高さ: ガラスの両脇に白墨の「く」の字の刻みを左右1本ずつ（ゲージにしない）
function workMark(g, cx, top, h, prof, t) {
  const n = prof.length, i = Math.round(t * (n - 1)), r = prof[i], y = top + h * t;
  for (const s of [-1, 1]) chalk(g, wob([[cx + s * (r + 11), y - 5], [cx + s * (r + 5), y], [cx + s * (r + 11), y + 5]], 0.5, 3), 2.2, C.chalk, { tooth: 0.4 });
}

// 竿（鉄）: 上から下へ。木炭の2本線＋鈍い灰のパステル
function pipe(g, x, y0, y1, w = 7) {
  const pts = [[x - w / 2, y0], [x + w / 2, y0], [x + w / 2 - 0.5, y1], [x - w / 2 + 0.5, y1]];
  pastel(g, polyPath(pts), [C.iron, mix(C.iron, C.paper, 0.3)], { ang: 1.45, len: [10, 24], wid: [1.4, 2.4], dens: 1.4, bb: bbox(pts), tooth: 0.3 });
  charcoal(g, wob([[x - w / 2, y0], [x - w / 2 + 0.4, y1]], 0.6, 8), 1.4, C.charcoal, { passes: 1 });
  charcoal(g, wob([[x + w / 2, y0], [x + w / 2 - 0.4, y1]], 0.6, 8), 2.0, C.charcoal, { passes: 1 });
  // 口金（竿の先の太い部分）
  const m = [[x - w * 0.8, y1 - 16], [x + w * 0.8, y1 - 16], [x + w * 0.7, y1 + 2], [x - w * 0.7, y1 + 2]];
  pastel(g, polyPath(m), [mix(C.iron, C.ember, 0.35)], { ang: 0.1, len: [5, 10], wid: [1.4, 2.4], dens: 1.6, bb: bbox(m), tooth: 0.25 });
  charcoal(g, wob([...m, m[0]], 0.5, 4), 1.5, C.charcoal, { passes: 1 });
}

// 砂袋（命）: 横に寝かせた麻袋。上辺は重みでたわみ、片端は紐で縛り、もう片端は折り込み。床に擦筆の影
function sandbag(g, x, y, s = 1, broken = false) {
  const w = 30 * s, hh = (broken ? 8 : 16) * s;
  smudge(g, ellPath(x + 2, y + hh * 0.9, w * 1.1, 5 * s), "#3f3946", 0.9, [x - w * 1.2, y + hh * 0.9 - 7 * s, w * 2.4, 14 * s]);
  // 角の丸い枕の輪郭（上辺は重みで中央がたわむ）
  const sg = v => Math.sign(v) * Math.abs(v);
  const pts = Array.from({ length: 28 }, (_, k) => { const a = k / 28 * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a);
    const px = x + w * Math.sign(c) * Math.abs(c) ** 0.55, py = y + hh * Math.sign(sn) * Math.abs(sn) ** 0.75 + (sn < 0 ? hh * 0.35 * (1 - Math.abs(c)) : 0); return [px + rr(-1, 1) * s, py + rr(-1, 1) * s]; });
  const bot = pts.slice(1, 14);
  pastel(g, polyPath(loose(pts, 1.2 * s)), ["#a8936e", "#b9a37c", "#9a8562"], { ang: (px) => (px - x) / w * 0.35, len: [10, 22], wid: [2.4, 4], a: [0.7, 1], dens: 1.3, bb: bbox(pts, 8), tooth: 0.3, spread: 0.1, mottle: 0.2 });
  pastel(g, c => { polyPath(pts)(c); c.clip(); c.beginPath(); c.rect(x - w - 4, y + hh * 0.15, w * 2 + 8, hh * 2); }, ["#7d6a4f"], { ang: 0, len: [10, 20], wid: [2, 3.4], a: [0.35, 0.65], dens: 1, bb: [x - w - 4, y, w * 2 + 8, hh + 6], tooth: 0.35 });
  // 縛った紐（右端だけ）と、左端の折り込み
  const ex = x + w, ey = y - hh * 0.35;
  charcoal(g, [[ex - 3 * s, ey - 6 * s], [ex - 2 * s, ey + 7 * s]], 2, "#5a4a3a", { passes: 1 });
  charcoal(g, wob([[ex - 2 * s, ey], [ex + 7 * s, ey - 2 * s], [ex + 6 * s, ey + 5 * s]], 0.4, 3), 1.1, "#5a4a3a", { passes: 1 });
  charcoal(g, wob([[x - w + 4 * s, y - hh * 0.6], [x - w + 7 * s, y + hh * 0.5]], 0.4, 3), 1, C.charcoal, { passes: 1, a: 0.6 });
  // 輪郭は下側だけ（床に接する所）。上は塗りのまま
  charcoal(g, wob(bot, 0.7, 5), 1.6, C.charcoal, { gaps: 0.15, passes: 1 });
  if (!broken) {
    let px = x - w * 0.7;
    while (px < x + w * 0.6) { const l = rr(3, 6) * s, t = (px - x + w) / (2 * w); const yy = y - hh * (0.75 + 0.3 * Math.sin(t * Math.PI)) + hh * 0.35 * Math.sin(t * Math.PI) ** 2 + 3 * s; charcoal(g, [[px, yy + rr(-0.6, 0.6)], [px + l, yy + rr(-0.6, 0.6)]], 1, C.charcoal, { passes: 1, a: 0.6 }); px += l + rr(3, 6) * s; }
  } else {
    charcoal(g, wob([[x + w * 0.2, y - hh], [x + w * 0.35, y - hh * 0.2], [x + w * 0.3, y + hh * 0.4]], 0.6, 3), 1.6, C.charcoal, { passes: 1 });
    const pile = [[x + w * 0.7, y + hh * 1.1], [x + w * 1.1, y - hh * 0.2], [x + w * 1.6, y + hh * 1.1]];
    pastel(g, polyPath(pile), ["#cdbb93", "#bca87e"], { ang: 0, len: [3, 6], wid: [1, 1.8], dens: 2, bb: bbox(pile), tooth: 0.55 });
  }
}
// 銀貨（1枚。浮き彫りの帆船ではなく、ただの刻印の欠け）
function coin(g, x, y, r = 8, tilt = 0.45) {
  pastel(g, ellPath(x, y, r, r * tilt), ["#c9cdd0", "#aeb3b8"], { ang: 0.2, len: [3, 7], wid: [1.2, 2], dens: 3, bb: [x - r - 2, y - r - 2, r * 2 + 4, r * 2 + 4], tooth: 0.25 });
  g.save(); g.fillStyle = mix("#aeb3b8", C.charcoal, 0.3); g.beginPath(); g.ellipse(x, y + r * tilt * 0.55, r, r * tilt * 0.6, 0, 0, Math.PI); g.fill(); g.restore();
  charcoal(g, wob(Array.from({ length: 13 }, (_, k) => [x + Math.cos(k / 12 * 6.283) * r, y + Math.sin(k / 12 * 6.283) * r * tilt]), 0.4, 3), 1.1, C.charcoal, { passes: 1, a: 0.8 });
}
// 文字（パステル紙の上・石盤の上）
function text(g, s, x, y, size, font, col, o = {}) {
  g.save(); g.font = `${o.weight || 400} ${size}px ${font}`; g.fillStyle = col; g.textAlign = o.align || "left"; g.textBaseline = o.base || "alphabetic";
  if (o.rot) { g.translate(x, y); g.rotate(o.rot); g.fillText(s, 0, 0); } else g.fillText(s, x, y);
  g.restore();
}
// 文字を白墨のかすれで描く（石盤の上）
function chalkText(g, s, x, y, size, font, o = {}) {
  const L = layer(g); text(L, s, x, y, size, font, o.col || C.chalk, o); compose(g, L, o.tooth ?? 0.35);
}
const FH = '"Zen Antique", "Hiragino Mincho ProN", serif';
const FB = '"BIZ UDPGothic", "Hiragino Sans", sans-serif';
