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
  for (let i = 0; i < n; i++) {
    const x = bb[0] + rnd() * bb[2], y = bb[1] + rnd() * bb[3];
    const an = (typeof ang === "function" ? ang(x, y) : ang) + rr(-0.22, 0.22), l = rr(len[0], len[1]);
    L.strokeStyle = jitterCol(pick(cols), o.var ?? 0.07); L.globalAlpha = rr(a[0], a[1]); L.lineWidth = rr(wid[0], wid[1]);
    L.beginPath(); L.moveTo(x - Math.cos(an) * l / 2, y - Math.sin(an) * l / 2);
    L.quadraticCurveTo(x + rr(-1.2, 1.2), y + rr(-1.2, 1.2), x + Math.cos(an) * l / 2, y + Math.sin(an) * l / 2); L.stroke();
  }
  L.restore();
  compose(g, L, o.tooth ?? 0.45, o.alpha ?? 1, o.op);
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
// heat: 1=熱い 0.5=暗赤 0=冷えた。state: hot|done|thin|bubble
function drawGlass(g, cx, top, h, prof, heat = 1, o = {}) {
  const sh = glassOutline(cx, top, h, prof), P = polyPath(sh.pts), bb = bbox(sh.pts, 6);
  const n = prof.length;
  // 本体の色（温度で 朱橙 → 暗赤 → 鈍い灰。ゲージを出さない）
  const body = o.state === "done" ? C.teal : heat > 0.5 ? mix(C.ember, C.hot, (heat - 0.5) * 2) : mix(C.cold, C.ember, heat * 2);
  if (o.state === "done") {
    // 仕上がり: 透けた青緑。中央は薄く地が透け、縁は厚く濃い
    pastel(g, P, [C.teal, mix(C.teal, C.day, 0.35)], { ang: (x, y) => 0.05, len: [8, 18], wid: [1.4, 2.6], a: [0.25, 0.5], dens: 0.9, bb, tooth: 0.35 });
    edgeBand(g, sh, mix(C.teal, C.charcoal, 0.35), 4.5, 0.85);
  } else {
    // 面は横に巻くストローク（回っている丸みが出る）。中央の縦帯を少し明るく
    pastel(g, P, [body, mix(body, C.charcoal, 0.15)], { ang: (x, y) => Math.sin((x - cx) / 40) * 0.25, len: [7, 16], wid: [1.8, 3.2], a: [0.7, 0.98], dens: 1.25, bb, tooth: 0.18 });
    // 縁は暗い（厚みで暗く見える）
    edgeBand(g, sh, mix(body, C.charcoal, 0.45), 3.5, 0.8);
    // 竿に近い首は冷えて暗い（鉄に熱を取られる）。電球の口金のような帯にせず、上から下へ薄れる
    {
      const nk = Math.max(3, Math.floor(n * 0.18)), pts = [...sh.L.slice(0, nk), ...sh.R.slice(0, nk).reverse()];
      pastel(g, polyPath(pts), [mix(body, C.charcoal, 0.5), mix(body, C.ember, 0.6)], { ang: 0.05, len: [5, 12], wid: [1.6, 2.8], a: [0.35, 0.75], dens: 1.3, bb: bbox(pts), tooth: 0.35 });
    }
    // 芯: いちばん厚い所（胴の下・窓と反対の右寄り）にだけ、形の違う2〜3枚の斑で重ねる。外へは一切にじませない
    if (heat > 0.25 && o.state !== "thin") {
      const k = (heat - 0.25) / 0.75;
      let best = 0; prof.forEach((r, i) => { if (r >= prof[best]) best = i; });
      const blobs = [[best, 0.62, 0.34], [Math.max(1, best - 4), 0.4, 0.22], [Math.min(n - 2, best + 2), 0.3, 0.16]];
      for (const [i, sx, sy] of blobs) {
        const r = prof[i], y = top + h * i / (n - 1), x = cx + r * 0.16;
        const rad = Array.from({ length: 13 }, () => [rr(0.75, 1.15), rr(0.7, 1.2)]);
        // 大きさを3段に変えて重ねる（縁ほど薄い。硬い切り紙の縁にしない）
        for (const sc of [1.0, 0.7, 0.42]) {
          const pts = rad.map(([a1, a2], q) => { const an = q / 12 * Math.PI * 2; return [x + Math.cos(an) * r * sx * a1 * sc * rr(0.92, 1.08), y + Math.sin(an) * h * sy * 0.5 * a2 * sc * rr(0.92, 1.08)]; });
          pastel(g, c => { polyPath(sh.pts)(c); c.clip(); polyPath(pts)(c); }, [C.core, mix(C.core, C.hot, 0.45)], { ang: (px, py) => Math.sin((px - cx) / 30) * 0.3, len: [5, 12], wid: [1.4, 2.6], a: [0.3, 0.7], dens: 0.75, bb: bbox(pts), tooth: 0.55, alpha: 0.3 * k, op: "lighter" });
        }
      }
    }
    if (o.state === "thin") pastel(g, P, [C.chalk, mix(C.chalk, C.hot, 0.25)], { ang: 0.1, len: [6, 14], wid: [1.4, 2.4], a: [0.2, 0.5], dens: 0.7, bb, tooth: 0.5, alpha: 0.75 });
    if (heat < 0.35) crazing(g, sh, cx, top, h, prof, (0.35 - heat) / 0.35);
  }
  if (o.state === "bubble") bubble(g, cx + prof[Math.floor(n * 0.6)] * 0.15, top + h * 0.6, prof[Math.floor(n * 0.6)] * 0.42);
  // 窓の映り込み（運河の窓が丸みに沿って小さく曲がって映る）。光る塊ではなく「窓の形」
  windowGlint(g, cx, top, h, prof, o.state === "done" ? 1 : 0.85);
  // 木炭の輪郭: 窓に向いた左側は細くかすれ、右と底は太い
  charcoal(g, wob(sh.L, 0.8, 5), 1.3, C.charcoal, { gaps: 0.12, a: 0.75 });
  const rest = sh.pts.slice(sh.L.length - 1);
  charcoal(g, wob(rest, 0.8, 5), 2.4, C.charcoal, { press: t => 0.7 + 0.6 * Math.sin(t * 3.14) });
  return sh;
}
function edgeBand(g, sh, col, w, a) {
  const L = layer(g); L.save(); polyPath(sh.pts)(L); L.clip();
  L.strokeStyle = col; L.globalAlpha = a; L.lineWidth = w * 2; L.beginPath(); sh.pts.forEach(([x, y], i) => i ? L.lineTo(x, y) : L.moveTo(x, y)); L.closePath(); L.stroke();
  L.restore(); compose(g, L, 0.5);
}
function windowGlint(g, cx, top, h, prof, a) {
  const n = prof.length; let best = 0; prof.forEach((r, i) => { if (r >= prof[best]) best = i; });
  const i0 = Math.max(1, best - 2), r = prof[i0], y = top + h * i0 / (n - 1);
  if (r < 10) return;
  // 運河の窓（4枚のガラス）が、丸みに沿って小さく弓なりに映る。上の2枚は大きく、下の2枚は細い
  const x0 = cx - r * 0.7, pw = Math.max(2, r * 0.07), ph = Math.min(h * 0.11, r * 0.42), gap = Math.max(1.3, r * 0.03);
  const L = layer(g); L.fillStyle = C.day; L.globalAlpha = a;
  for (const [col, row] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
    const px = x0 + col * (pw + gap) + row * r * 0.04, py = y - ph + row * (ph + gap), w = pw * (col ? 0.75 : 1), hh = ph * (row ? 0.55 : 1);
    const bend = r * 0.025;
    L.beginPath(); L.moveTo(px + bend, py); L.lineTo(px + w + bend * 0.6, py + 0.6); L.quadraticCurveTo(px + w - bend, py + hh / 2, px + w + bend * 0.2, py + hh); L.lineTo(px - bend * 0.2, py + hh - 0.5); L.quadraticCurveTo(px - bend * 1.4, py + hh / 2, px + bend, py); L.fill();
  }
  compose(g, L, 0.3, 0.8);
}
// 冷えた表面の細い白い筋（短い・向き不揃い・枝分かれ。規則的な縞にしない）
function crazing(g, sh, cx, top, h, prof, k) {
  const L = layer(g); L.save(); polyPath(sh.pts)(L); L.clip();
  L.strokeStyle = C.chalk; const n = prof.length;
  for (let i = 0; i < 9 * k + 3; i++) {
    const j = Math.floor(rr(0.1, 0.95) * n), r = prof[j], y = top + h * j / (n - 1), x = cx + rr(-r * 0.8, r * 0.8);
    let px = x, py = y, an = rr(-0.6, 0.6) + (rnd() < 0.5 ? 0 : Math.PI);
    L.lineWidth = rr(0.6, 1.1); L.globalAlpha = rr(0.45, 0.85); L.beginPath(); L.moveTo(px, py);
    for (let s = 0; s < 4; s++) { an += rr(-0.7, 0.7); px += Math.cos(an) * rr(3, 8); py += Math.sin(an) * rr(2, 6); L.lineTo(px, py); if (rnd() < 0.3) { L.moveTo(px, py); L.lineTo(px + rr(-5, 5), py + rr(-5, 5)); L.moveTo(px, py); } }
    L.stroke();
  }
  L.restore(); compose(g, L, 0.3);
}
function bubble(g, x, y, r) {
  const pts = []; for (let k = 0; k <= 14; k++) { const a = k / 14 * Math.PI * 2; pts.push([x + Math.cos(a) * r * (1 + 0.18 * Math.sin(a * 2 + 1)), y + Math.sin(a) * r * 0.8 * (1 + 0.12 * Math.cos(a * 3))]); }
  pastel(g, polyPath(pts), [mix(C.chalk, C.hot, 0.2)], { ang: 0.3, len: [4, 9], wid: [1.2, 2], a: [0.3, 0.6], dens: 1, bb: bbox(pts), tooth: 0.5, alpha: 0.8 });
  charcoal(g, wob(pts.slice(3, 12), 0.6, 4), 1.1, mix(C.charcoal, C.ember, 0.3), { passes: 1, a: 0.7 });
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

// 砂袋（命）。broken=崩れた袋（中身がこぼれて平たい）
// 砂袋（命）: 麻の袋を横に寝かせた枕形。両端の角を縛り、上に縫い目。broken=破れて中身がこぼれ、平たい
function sandbag(g, x, y, s = 1, broken = false) {
  const w = 30 * s, hh = (broken ? 7 : 14) * s, pts = [];
  // 四隅を少しつまんだ枕の輪郭
  const c = [[x - w, y - hh * 0.7], [x - w * 0.5, y - hh * (broken ? 0.9 : 1.15)], [x + w * 0.4, y - hh * (broken ? 0.8 : 1.2)], [x + w, y - hh * 0.8], [x + w * 1.04, y + hh * 0.6], [x + w * 0.3, y + hh * 1.05], [x - w * 0.5, y + hh], [x - w * 1.05, y + hh * 0.7]];
  for (let i = 0; i < c.length; i++) { const p = c[i], q = c[(i + 1) % c.length]; pts.push(p, [(p[0] + q[0]) / 2 + rr(-1.5, 1.5) * s, (p[1] + q[1]) / 2 + rr(-1.5, 1.5) * s]); }
  pastel(g, polyPath(pts), ["#a8936e", "#b9a37c", "#9a8562"], { ang: (px, py) => 0.15 + (px - x) / w * 0.25, len: [5, 11], wid: [1.4, 2.6], dens: 1.4, bb: bbox(pts), tooth: 0.4 });
  // 縛った角の耳
  for (const [ex, ey, d] of [[x - w * 1.02, y - hh * 0.65, -1], [x + w * 1.0, y - hh * 0.75, 1]]) {
    const ear = [[ex, ey - 3 * s], [ex + d * 9 * s, ey - 7 * s], [ex + d * 8 * s, ey + 2 * s], [ex, ey + 3 * s]];
    pastel(g, polyPath(ear), ["#9a8562"], { ang: 0.4, len: [3, 7], wid: [1.2, 2], dens: 3, bb: bbox(ear), tooth: 0.3 });
    charcoal(g, wob([...ear, ear[0]], 0.4, 3), 1.1, C.charcoal, { passes: 1 });
    charcoal(g, [[ex, ey - 4 * s], [ex + d * 1.5, ey + 4 * s]], 2.2, C.charcoal, { passes: 1 });
  }
  charcoal(g, wob([...pts, pts[0]], 0.7, 5), 1.6, C.charcoal, { gaps: 0.05 });
  if (!broken) {
    // 上の縫い目（不揃いな短い針目。点線にしない）
    let px = x - w * 0.75;
    while (px < x + w * 0.7) { const l = rr(3, 6) * s; charcoal(g, [[px, y - hh * 0.9 + rr(-1, 1)], [px + l, y - hh * 0.95 + rr(-1, 1)]], 1.1, C.charcoal, { passes: 1, a: 0.7 }); px += l + rr(3, 6) * s; }
  } else {
    // 裂け目とこぼれた砂（小さな山1つ）
    charcoal(g, wob([[x + w * 0.2, y - hh], [x + w * 0.35, y - hh * 0.2], [x + w * 0.3, y + hh * 0.4]], 0.6, 3), 1.6, C.charcoal, { passes: 1 });
    const pile = [[x + w * 0.7, y + hh * 1.1], [x + w * 1.1, y - hh * 0.1], [x + w * 1.6, y + hh * 1.1]];
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
