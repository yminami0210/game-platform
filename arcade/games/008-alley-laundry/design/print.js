// せんたく日和 見本用の描画道具
// 借りる物: 港町の雑貨屋で売っていた固形の洗濯石鹸の「包み紙」の平版刷り（特色4版＋墨の代わりのすみれ茶、
//   クレヨンで描いた石版の粒、版ずれ、版と版のすき間に残る紙の白）と、その町の裏路地の物干しの道具
//   （窓の鉄の腕金と滑車、板戸の鎧戸、塗り直しの継ぎはぎがある黄土の漆喰、木のばね式洗濯ばさみ、亜鉛のたらい）。
//   観光ポスターの「白壁・青い扉・ブーゲンビリア・海の見晴らし・光線つきの太陽」は描かない。
// 実装メモ: 粒（クレヨンの石版の粒）と紙の目は1回だけ作って pattern で使い回す。影版は multiply で重ねる。
//   ぼかし（filter）は使わない。
const C = {
  odo: "#e8c98a",     // 漆喰の黄土（地。壁）
  gunjo: "#3f7fb8",   // 昼の空の群青（空・ジーンズ・亜鉛のたらいの平網）
  midori: "#3d7a5a",  // 鎧戸の緑（板戸・鉢の葉・鳩の首）
  tomato: "#d2452f",  // トマトの赤（主役。赤い靴下・色移り・得点の印）
  shiro: "#edf0ee",   // 青み付けの白（紙の白・白い洗濯物。洗濯の青み付けの白で、クリームにしない）
  sumire: "#4a3446",  // 影のすみれ茶（墨の代わり。輪郭・文字・影版の元）
  // 重ね色（版の重ね刷りの結果。新しい色を足さない）
  kage: "#a890c4",    // 影版（すみれ茶の平網）。必ず multiply で重ねる
  nure: "#8f8094",    // すみれ茶の濃い平網（窓の中・鳩）。濡れには使わない（濡れは群青の薄刷り）
  shita: "#d9b778",   // 塗り直しの漆喰（黄土を2度刷り）
};
let seed = 8;
const setSeed = (s) => (seed = s);
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const j = (a) => (rnd() * 2 - 1) * a;
const NS = "http://www.w3.org/2000/svg";
function el(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
const f1 = (n) => n.toFixed(1);
// 切り絵の線（直線の辺、角ごとに少しずれる）
function cut(pts, amt = 1, close = true) {
  return pts.map((p, i) => `${i ? "L" : "M"}${f1(p[0] + j(amt))},${f1(p[1] + j(amt))}`).join("") + (close ? "Z" : "");
}
function smooth(pts, close = true) {
  const n = pts.length; let d = `M${f1(pts[0][0])},${f1(pts[0][1])}`;
  const P = (i) => pts[close ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
  for (let i = 0; i < (close ? n : n - 1); i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f1(c1[0])},${f1(c1[1])} ${f1(c2[0])},${f1(c2[1])} ${f1(p2[0])},${f1(p2[1])}`;
  }
  return d + (close ? "Z" : "");
}
function blobPts(cx, cy, rx, ry, n = 12, rough = 0.15, rot = 0) {
  const a = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2 + j(0.12), k = 1 + j(rough);
    const x = Math.cos(t) * rx * k, y = Math.sin(t) * ry * k;
    a.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
  }
  return a;
}
const blob = (...a) => smooth(blobPts(...a));

// ---- 1回だけ作る質感（クレヨンの粒・紙の目）。実装でも offscreen canvas で1回作って pattern にする ----
function grainURL(color, n, size = 180, lmin = 3, lmax = 6, clump = 0.55, ang = -0.42) {
  // 石版のクレヨンの擦れ: 丸い点ではなく、同じ向きに寝た短い筋（3〜6px）が少し固まる
  const cv = document.createElement("canvas"); cv.width = cv.height = size;
  const g = cv.getContext("2d"); g.strokeStyle = color; g.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const x = rnd() * size, y = rnd() * size;
    const k = rnd() < clump ? 2 + Math.floor(rnd() * 3) : 1;
    for (let m = 0; m < k; m++) {
      const l = lmin + rnd() * (lmax - lmin), a = ang + j(0.22);
      const px = x + j(3), py = y + j(2.5);
      g.globalAlpha = 0.5 + rnd() * 0.5; g.lineWidth = 0.7 + rnd() * 0.8;
      for (const [ox, oy] of [[0, 0], [size, 0], [-size, 0], [0, size], [0, -size]]) {
        g.beginPath(); g.moveTo(px + ox, py + oy); g.lineTo(px + ox + Math.cos(a) * l, py + oy + Math.sin(a) * l); g.stroke();
      }
    }
  }
  return cv.toDataURL();
}
function paperURL(size = 240) {
  const cv = document.createElement("canvas"); cv.width = cv.height = size;
  const g = cv.getContext("2d");
  // 紙の繊維（短い線を方向ばらばらに）と、ごく薄いしみ
  for (let i = 0; i < 520; i++) {
    const x = rnd() * size, y = rnd() * size, a = rnd() * Math.PI, l = 2 + rnd() * 7;
    g.strokeStyle = rnd() < 0.5 ? "rgba(74,52,70,0.10)" : "rgba(255,255,255,0.35)";
    g.lineWidth = 0.6; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  for (let i = 0; i < 60; i++) { g.fillStyle = "rgba(74,52,70,0.07)"; g.beginPath(); g.arc(rnd() * size, rnd() * size, 0.5 + rnd(), 0, 7); g.fill(); }
  return cv.toDataURL();
}
function defs(svg) {
  const d = el("defs", {}, svg);
  setSeed(101);
  const P = (id, url, size) => { const p = el("pattern", { id, patternUnits: "userSpaceOnUse", width: size, height: size }, d); el("image", { href: url, width: size, height: size }, p); };
  // 暗い擦れは「影の縁の帯・空の屋根ぎわ・たらい」の3か所だけに使う。日なたの壁と洗濯物には乗せない
  P("gSumire", grainURL(C.sumire, 700), 180);       // 影の縁のクレヨン（濃）
  P("gShiro", grainURL(C.shiro, 520, 180, 2.5, 5.5, 0.6), 180); // 版がかすれて紙の白が出る所（明るい擦れ）
  P("gGunjo", grainURL(C.gunjo, 800, 180, 2.5, 5), 180);        // 空の屋根ぎわ・たらい・濡れの縁
  P("gShita", grainURL(C.shita, 300, 180, 2.5, 5.5), 180); // 漆喰の2度刷りの擦れ（黄土の上の少し濃い黄土）
  P("paper", paperURL(), 240);
  return d;
}
// 版を1枚刷る（色・ずれ）。輪郭（すみれ茶）は別に引くので、ずれた分だけ輪郭の外に色がはみ出す／紙の白が残る
function plate(g, d, fill, dx = 0, dy = 0, extra = {}) {
  return el("path", Object.assign({ d, fill, transform: `translate(${dx},${dy})` }, extra), g);
}
// 粒を重ねる（クレヨンの濃淡。グラデーションは使わない）
function grain(g, d, id, op = 1, dx = 0, dy = 0) {
  return el("path", { d, fill: `url(#${id})`, opacity: op, transform: `translate(${dx},${dy})` }, g);
}
// すみれ茶の輪郭（筆圧の切れ目つき。切れ目の位置は不揃い）
function ink(g, d, w = 2, op = 0.92, cap = "round") {
  const p = el("path", { d, fill: "none", stroke: C.sumire, "stroke-width": w, "stroke-linejoin": "round", "stroke-linecap": cap, opacity: op }, g);
  let L = 0; try { L = p.getTotalLength(); } catch (e) {}
  if (L > 40) {
    // 切れ目は1本に1〜2か所だけ、位置は不揃い（等間隔の破線にしない）
    const n = L > 220 ? 2 : 1, cuts = [];
    for (let i = 0; i < n; i++) cuts.push(L * (0.12 + rnd() * 0.76));
    cuts.sort((a, b) => a - b);
    const da = []; let at = 0;
    cuts.forEach((c) => { const gap = 2.5 + rnd() * 3; da.push(f1(Math.max(1, c - at)), f1(gap)); at = c + gap; });
    da.push(f1(L * 2), "0");
    p.setAttribute("stroke-dasharray", da.join(" "));
    // 長い線は2本目を少しずらして一部だけ重ねる（引き直した跡）
    if (L > 160) { const s0 = rnd() * L * 0.5, len = L * (0.2 + rnd() * 0.3); el("path", { d, fill: "none", stroke: C.sumire, "stroke-width": f1(w * 0.6), "stroke-dasharray": `0 ${f1(s0)} ${f1(len)} ${f1(L * 2)}`, "stroke-linecap": "round", opacity: op * 0.8, transform: `translate(${f1(j(0.9))},${f1(j(0.9))})` }, g); }
  }
  return p;
}
const mul = { style: "mix-blend-mode:multiply" };

// ---- 綱（点の重さで折れ線にたわむ＋手描きの揺れ）。実装でも同じ式で y を出す ----
function ropeY(x1, y1, x2, y2, loads, x) {
  let y = y1 + (y2 - y1) * (x - x1) / (x2 - x1);
  const L = x2 - x1, t = (x - x1) / L;
  y += 6 * 4 * t * (1 - t); // 綱そのものの重み
  for (const { x: a, w } of loads) { const s = x < a ? (x - x1) / (a - x1) : (x2 - x) / (x2 - a); y += w * Math.max(0, s); }
  return y;
}
function rope(g, x1, y1, x2, y2, loads, opt = {}) {
  const pts = []; const n = 34;
  for (let i = 0; i <= n; i++) { const x = x1 + (x2 - x1) * i / n; pts.push([x, ropeY(x1, y1, x2, y2, loads, x) + (i && i < n ? j(0.7) : 0)]); }
  const d = smooth(pts, false);
  el("path", { d, fill: "none", stroke: opt.color || C.sumire, "stroke-width": opt.w || 2.2, "stroke-linecap": "round", opacity: 0.95 }, g);
  // 撚りの明るい筋（短く、間隔不揃い）
  let da = []; for (let i = 0; i < 10; i++) da.push(f1(3 + rnd() * 9), f1(5 + rnd() * 14));
  el("path", { d, fill: "none", stroke: C.shiro, "stroke-width": 0.7, "stroke-dasharray": da.join(" "), opacity: 0.5, transform: "translate(0,-0.6)" }, g);
  return (x) => ropeY(x1, y1, x2, y2, loads, x);
}

// ---- 洗濯ばさみ（木・ばね）。1本ずつ角度と長さが違う ----
function peg(g, x, y, rot = 0, s = 1) {
  const p = el("g", { transform: `translate(${f1(x)},${f1(y)}) rotate(${f1(rot + j(5))}) scale(${s})` }, g);
  const h = 17 + j(1.5), w = 5.2 + j(0.4);
  const d = cut([[-w / 2, -6], [w / 2, -6.5], [w / 2 + 0.4, h - 6], [-w / 2 + 0.3, h - 5.5]], 0.3);
  plate(p, d, C.odo, 0.8, 0.6);
  grain(p, d, "gShita", 1, 0.8, 0.6);
  el("path", { d: `M0,-5.5 L0.2,${f1(h - 6)}`, stroke: C.sumire, "stroke-width": 0.8, opacity: 0.7 }, p);
  ink(p, d, 1.3);
  el("path", { d: `M${f1(-w / 2 - 0.5)},2 q${f1(w / 2 + 0.5)},2.4 ${f1(w + 1)},0`, stroke: C.sumire, "stroke-width": 1.4, fill: "none" }, p); // ばね
  return p;
}

// ---- 洗濯物（切り絵。上辺が綱に沿う。tilt は風の傾き） ----
// 局所座標の点を、上辺の左右のピン位置に合わせて変形する
function hang(pts, xa, ya, xb, yb, w, tilt = 0) {
  return pts.map(([x, y]) => [xa + (xb - xa) * (x / w) + tilt * y, ya + (yb - ya) * (x / w) + y]);
}
const SHAPES = {
  shirt: { w: 72, pts: [[0, 0], [25, 0], [35, 10], [46, 0], [72, 0], [82, 30], [71, 36], [69, 86], [36, 88], [4, 84], [2, 37], [-9, 32]] },
  sock: { w: 15, pts: [[0, 0], [15, 0], [16, 38], [27, 41], [30, 51], [12, 54], [1, 47]] },
  jeans: { w: 76, pts: [[0, 0], [76, 0], [75, 34], [73, 118], [48, 120], [41, 37], [36, 37], [29, 119], [4, 117], [1, 34]] },
  sheet: { w: 150, pts: [[0, 0], [150, 0], [152, 66], [154, 124], [134, 133], [112, 141], [88, 152], [70, 149], [46, 141], [22, 136], [-2, 126], [-1, 58]] },
  towel: { w: 56, pts: [[0, 0], [56, 0], [57, 92], [44, 95], [30, 92], [14, 96], [-1, 93]] },
};
// wet: 0（乾いた）〜1（びしょ濡れ）。濡れ＝濡れ版を multiply、乾き＝紙の白が粒で出る
function garment(g, kind, xa, ya, xb, yb, color, opt = {}) {
  const S = SHAPES[kind], tilt = opt.tilt || 0, wet = opt.wet ?? 0, k = opt.k || 1;
  const P = hang(S.pts.map(([x, y]) => [x * k, y * k]), xa, ya, xb, yb, S.w * k, tilt);
  const gg = el("g", {}, g);
  const d = cut(P, 0.9);
  const ox = opt.ox ?? 1.8, oy = opt.oy ?? -1.2; // 色版のずれ
  plate(gg, d, color, ox, oy);
  if (opt.decor) opt.decor(gg, P, ox, oy, d);
  if (wet > 0) {
    // 濡れ＝群青の薄刷り（青みの白。灰色にしない）＋水がたまる裾ほど濃い帯。暗い粒は乗せない
    const wk = color === C.shiro ? 1 : 0.8;
    plate(gg, d, C.gunjo, ox, oy, Object.assign({ opacity: f1((0.05 + wet * 0.09) * wk) }, mul));
    const ys = P.map((p) => p[1]), xs = P.map((p) => p[0]);
    const top = Math.min(...ys), bot = Math.max(...ys), x0 = Math.min(...xs) - 4, x1 = Math.max(...xs) + 4;
    const yb = bot - (bot - top) * (0.25 + wet * 0.45);
    const id = "w" + Math.floor(rnd() * 1e9);
    const cl = el("clipPath", { id }, gg); el("path", { d }, cl);
    // しみの縁はゆるい起伏だけ（山並みに見えるギザギザにしない）
    const edge = []; const nE = 4, tiltE = j(5);
    for (let i = 0; i <= nE; i++) edge.push([x0 + (x1 - x0) * i / nE, yb + tiltE * (i / nE - 0.5) + j(2.5)]);
    const band = smooth(edge.concat([[x1 + 2, bot + 8], [x0 - 2, bot + 8]]));
    const bg = el("g", { "clip-path": `url(#${id})` }, gg);
    plate(bg, band, C.gunjo, ox, oy, Object.assign({ opacity: f1((0.07 + wet * 0.15) * wk) }, mul));
    grain(bg, smooth(edge.map(([x, y]) => [x, y - 2]).concat(edge.slice().reverse().map(([x, y]) => [x, y + 5]))), "gGunjo", 0.25 * wet, ox, oy);
  } else {
    grain(gg, d, "gShiro", 0.5, ox, oy);
  }
  // 折り目・しわ（短い線を2〜3本、向きと長さ不揃い）
  (opt.folds || []).forEach(([a, b]) => { const p1 = P[a], p2 = P[b]; const m = [(p1[0] + p2[0]) / 2 + j(6), (p1[1] + p2[1]) / 2 + j(6)]; el("path", { d: `M${f1(m[0])},${f1(m[1])} q${f1(j(6))},${f1(8 + rnd() * 6)} ${f1(j(5))},${f1(14 + rnd() * 16)}`, fill: "none", stroke: C.sumire, "stroke-width": 1.1, opacity: 0.55, "stroke-linecap": "round" }, gg); });
  ink(gg, d, opt.lw || 1.9);
  return { P, d, g: gg };
}

// ---- 鳩（ずんぐり。羽の2本の黒い帯、首の緑の光沢。姿勢を毎回変える） ----
function pigeon(g, x, y, opt = {}) {
  const s = opt.s || 1, flip = opt.flip ? -1 : 1, hunch = opt.hunch ?? 0.5;
  const p = el("g", { transform: `translate(${x},${y}) scale(${flip * s},${s})` }, g);
  const body = blobPts(0, -11, 17, 10 + hunch * 2, 11, 0.08, -0.12);
  const bd = smooth(body);
  const tail = cut([[-14, -12], [-31, -5 + hunch * 3], [-30, 0 + hunch * 2], [-12, -5]], 0.6);
  const head = blob(13 + hunch * 2, -24 + hunch * 4, 6.5, 6, 9, 0.06);
  // 体の版（すみれ茶の淡い平網＝灰紫）
  [tail, bd, head].forEach((d) => { plate(p, d, C.shiro, 0, 0); plate(p, d, C.nure, 1.5, -1, Object.assign({ opacity: 0.62 }, mul)); grain(p, d, "gShiro", 0.5, 1.5, -1); });
  // 首の光沢（緑の版）
  el("path", { d: cut([[6, -24 + hunch * 3], [16, -20 + hunch * 4], [15, -12], [5, -11]], 0.8), fill: C.midori, opacity: 0.75, transform: "translate(2,-1)" }, p);
  // 羽と2本の帯
  const wing = cut([[-12, -16], [6, -18], [10, -10], [-4, -6], [-16, -9]], 0.7);
  plate(p, wing, C.nure, 0, 0, mul);
  el("path", { d: "M-6,-15 l3,7 M-1,-16 l3,8", stroke: C.sumire, "stroke-width": 2.2, "stroke-linecap": "round", opacity: 0.85 }, p);
  // 足（トマトの版）
  el("path", { d: `M-2,${f1(-2)} l-1,6 M4,-2 l1,6`, stroke: C.tomato, "stroke-width": 1.8, "stroke-linecap": "round" }, p);
  // くちばし・目
  el("path", { d: `M${f1(19 + hunch * 2)},${f1(-25 + hunch * 4)} l5,1.5 l-5,1.2Z`, fill: C.sumire }, p);
  el("circle", { cx: f1(15 + hunch * 2), cy: f1(-26 + hunch * 4), r: 1.7, fill: C.tomato }, p);
  el("circle", { cx: f1(15.3 + hunch * 2), cy: f1(-26 + hunch * 4), r: 0.8, fill: C.sumire }, p);
  ink(p, bd, 1.6); ink(p, head, 1.5); ink(p, tail, 1.4);
  return p;
}

// ---- 窓（板戸の鎧戸。板は3枚で幅が違う、Z の筋かい）と鉄の腕金・滑車 ----
function shutter(g, x, y, w, h, skew = 0) {
  const pts = [[x, y], [x + w, y + skew], [x + w, y + h + skew], [x, y + h]];
  const d = cut(pts, 0.8);
  plate(g, d, C.midori, 2, 1.5);
  grain(g, d, "gShiro", 0.35, 2, 1.5); // 日焼けで色が抜けた所
  // 板の継ぎ目（幅が違う3枚）
  const cuts = [0.28 + j(0.04), 0.63 + j(0.05)];
  cuts.forEach((c) => el("path", { d: `M${f1(x + w * c)},${f1(y + skew * c + 2)} L${f1(x + w * c + j(0.8))},${f1(y + h + skew * c - 2)}`, stroke: C.sumire, "stroke-width": 1.3, opacity: 0.75 }, g));
  // 横の桟2本（高さも傾きも少し違う）
  [0.2 + j(0.03), 0.74 + j(0.04)].forEach((t) => el("path", { d: cut([[x + 2, y + h * t + skew * 0.05], [x + w - 2, y + h * t + skew * 0.95 + j(1.5)]], 0.5, false), fill: "none", stroke: C.sumire, "stroke-width": 3.2, opacity: 0.7 }, g));
  ink(g, d, 1.8);
}
function windowAt(g, x, y, w, h, opt = {}) {
  const gg = el("g", {}, g);
  const o = cut([[x, y], [x + w, y + 1], [x + w - 1, y + h], [x + 1, y + h - 1]], 0.8);
  // 窓の中は真っ黒にしない: 影版の平網＋上のまぐさ下にだけ濃い擦れの帯
  plate(gg, o, C.nure, 0, 0, Object.assign({ opacity: 0.9 }, mul));
  plate(gg, o, C.kage, 0, 0, mul);
  grain(gg, cut([[x, y], [x + w, y + 1], [x + w, y + h * 0.35], [x, y + h * 0.4]], 0.5), "gSumire", 0.9);
  el("path", { d: cut([[x - 3, y - 1], [x + w + 3, y]], 0.5, false), stroke: C.sumire, "stroke-width": 2.4, fill: "none" }, gg);
  // 窓台（塗り直しの漆喰）
  const sill = cut([[x - 6, y + h - 1], [x + w + 6, y + h], [x + w + 5, y + h + 7], [x - 5, y + h + 6]], 0.6);
  plate(gg, sill, C.shita, 1, 1); ink(gg, sill, 1.4);
  if (opt.left !== false) shutter(gg, x - (opt.lw || w * 0.42), y + 2, opt.lw || w * 0.42, h - 3, -3);
  if (opt.right !== false) shutter(gg, x + w - (opt.rclose ? w * 0.38 : 0), y + 1, opt.rw || w * 0.44, h - 2, 3);
  return gg;
}
function bracket(g, x, y, dir = 1, bent = 0) {
  const gg = el("g", {}, g);
  const arm = 22;
  el("path", { d: `M${x},${y} L${f1(x + dir * arm)},${f1(y + bent)} M${x},${y + 14} L${f1(x + dir * (arm - 4))},${f1(y + 2 + bent)}`, stroke: C.sumire, "stroke-width": 2.6, "stroke-linecap": "round", fill: "none" }, gg);
  const cx = x + dir * (arm + 2), cy = y + bent + 1;
  el("path", { d: blob(cx, cy, 5.5, 5.5, 10, 0.05), fill: C.odo, transform: "translate(1,-1)" }, gg);
  ink(gg, blob(cx, cy, 5.5, 5.5, 10, 0.05), 1.6, 1);
  el("circle", { cx, cy, r: 1.3, fill: C.sumire }, gg);
  return [cx, cy - 5];
}
// 漆喰の継ぎはぎ（塗り直し・剥げて煉瓦がのぞく所）
function patch(g, cx, cy, w, h, brick = false) {
  const pts = blobPts(cx, cy, w, h, 9, 0.28, j(0.3));
  const d = cut(pts, 1.5);
  plate(g, d, brick ? C.shiro : C.shita, 0, 0); if (!brick) grain(g, d, "gShita", 0.9);
  if (brick) {
    for (let i = 0; i < 3; i++) {
      const bx = cx - w * 0.6 + rnd() * w * 1.1, by = cy - h * 0.5 + i * (h * 0.24) + j(2);
      const bw = 13 + rnd() * 6, bh = 6 + rnd() * 1.5;
      const bd = cut([[bx, by], [bx + bw, by + j(1)], [bx + bw + j(1), by + bh], [bx + j(1), by + bh]], 0.6);
      plate(g, bd, C.tomato, 1.2, -0.8, { opacity: 0.7 }); grain(g, bd, "gShiro", 0.6, 1.2, -0.8);
    }
  }
  ink(g, d, 1.2, 0.6);
}
// 亜鉛のたらい（濡れかご）
function tub(g, x, y, w, h) {
  const gg = el("g", {}, g);
  const body = cut([[x, y], [x + w, y + 2], [x + w - 12, y + h], [x + 10, y + h - 1]], 1);
  plate(gg, body, C.shiro, 0, 0); grain(gg, body, "gGunjo", 0.55, 1.5, -1);
  el("path", { d: `M${x + 6},${y + h * 0.45} q${w / 2},${f1(5 + j(1))} ${w - 10},0`, fill: "none", stroke: C.sumire, "stroke-width": 1.2, opacity: 0.6 }, gg); // たらいの帯
  ink(gg, body, 2);
  const rim = smooth(blobPts(x + w / 2, y + 1, w / 2 + 3, 9, 16, 0.03));
  plate(gg, rim, C.shiro, 0, 0); grain(gg, rim, "gGunjo", 0.8, 1.5, -1); ink(gg, rim, 2);
  // 取っ手（左右で形が違う）
  el("path", { d: `M${x - 2},${y + 8} q-9,4 -2,12`, fill: "none", stroke: C.sumire, "stroke-width": 2.2 }, gg);
  el("path", { d: `M${x + w + 1},${y + 9} q8,6 1,11`, fill: "none", stroke: C.sumire, "stroke-width": 2.2 }, gg);
  return gg;
}
// 籐のかご（乾いたかご）: 編み目は描かず、手で引いた不揃いな斜線を数本だけ
function basket(g, x, y, w, h) {
  const gg = el("g", {}, g);
  // 取っ手（付け根を縁の内側に差し込む）
  el("path", { d: `M${x + 16},${y + 6} C${x + 20},${y - 36} ${x + w - 24},${y - 40} ${x + w - 16},${y + 4}`, fill: "none", stroke: C.sumire, "stroke-width": 5 }, gg);
  el("path", { d: `M${x + 16},${y + 6} C${x + 20},${y - 36} ${x + w - 24},${y - 40} ${x + w - 16},${y + 4}`, fill: "none", stroke: C.odo, "stroke-width": 2.4 }, gg);
  const body = cut([[x, y + 4], [x + w, y], [x + w - 8, y + h], [x + 9, y + h + 1]], 1.2);
  plate(gg, body, C.odo, 1.5, -1); grain(gg, body, "gShita", 1, 1.5, -1); grain(gg, body, "gShiro", 0.4, 1.5, -1);
  // 胴の籐を2〜3段の帯だけ（高さ不揃い。編み目は描かない）
  [0.42 + j(0.05), 0.7 + j(0.05)].forEach((t) => el("path", { d: cut([[x + 4 + t * 4, y + h * t], [x + w - 4 - t * 6, y + h * t + j(2)]], 0.8, false), stroke: C.sumire, "stroke-width": 1.3, opacity: 0.6, fill: "none" }, gg));
  ink(gg, body, 2);
  // 縁の厚み（2度刷りの黄土＋すみれ茶の帯）
  const rim = cut([[x - 3, y + 1], [x + w + 3, y - 3], [x + w + 2, y + 7], [x - 2, y + 11]], 0.8);
  plate(gg, rim, C.shita, 1, -1); el("path", { d: cut([[x - 2, y + 8], [x + w + 2, y + 4], [x + w + 2, y + 7], [x - 2, y + 11]], 0.6), fill: C.sumire, opacity: 0.7 }, gg); ink(gg, rim, 1.6);
  [[x + 14, y + 4], [x + w - 16, y + 2]].forEach(([px, py]) => el("path", { d: blob(px, py + 2, 3.2, 4, 7, 0.1), fill: C.sumire }, gg));
  return gg;
}
// たたんだ山（乾いたかごの中・結果画面）
function foldedPile(g, x, y, list) {
  // たたんだ布: 角を丸め、折り山の側がふくらみ、上の布ほど少しずれて沈む（本の背に見せない）
  let yy = y;
  list.forEach(([w, h, c], i) => {
    const xx = x + j(4) + (i % 2 ? 4 : -3), sag = 1.5 + rnd() * 1.5;
    const d = smooth([[xx + 3, yy - h], [xx + w * 0.5, yy - h - sag], [xx + w - 3, yy - h + 0.5], [xx + w + 2.5, yy - h * 0.5], [xx + w - 2, yy], [xx + w * 0.5, yy + 1], [xx + 2, yy], [xx - 1.5, yy - h * 0.5]]);
    plate(g, d, c, 1.5, -1); if (c === C.shiro) grain(g, d, "gShiro", 0.5);
    el("path", { d: `M${f1(xx + w * 0.62)},${f1(yy - h + 2)} q2,${f1(h * 0.4)} 0,${f1(h - 3)}`, stroke: C.sumire, "stroke-width": 1, fill: "none", opacity: 0.5 }, g); // たたみ目（縦）
    ink(g, d, 1.5);
    yy -= h - 3;
  });
}
