// とんでけ大砲 見本用の描画道具
// 借りる物: 旅回りの小さな一座の「昼の天幕の中」（継ぎはぎの帆布を内から見た光・麻縄と柱・おがくず）と、
//           一座の道具馬車に看板描きが筆で入れた文字と飾り（深緑の板地・山吹の影つき文字・筆のかすれ）
const C = {
  hanpu: "#c4b184",   // 古帆布（天幕の内側。日に透けた生成り）
  hinata: "#dccb9b",  // 日なたの継ぎ当て（同じ帆布の薄い所。新しいインクではない）
  ogakuzu: "#cf9358", // 鉋屑（おがくずの床）
  midori: "#23574a",  // 馬車の深緑（看板の板地・リングの縁・大砲の台車）
  yamabuki: "#e9b021",// 車輪の山吹（主役。大砲の車輪・帯金・「ドン」・得点の文字だけ）
  botan: "#a8336a",   // 衣装の牡丹（曲芸師の衣装・シルクハットの帯・危ない物の印）
  sumi: "#1f302a",    // 緑の墨（輪郭・小さな文字。真っ黒にしない）
  // 重ね色（上の色を重ねた結果）
  kage: "#9b8d68",    // 帆布の影（帆布＋墨を薄く）
  shimi: "#a8956a",   // 雨じみ・煤の跡
  zou: "#7d806b",     // 象（帆布に墨を半分）
  zou2: "#666b59",    // 象の影側
  ita: "#8a6a45",     // 客席の板（鉋屑＋墨）
  midori2: "#3d6e5f", // 深緑の明るい所
};
let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const j = (a) => (rnd() * 2 - 1) * a;
const NS = "http://www.w3.org/2000/svg";
function el(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
function wobble(pts, amt = 1.2, close = true) {
  return pts.map((p, i) => `${i ? "L" : "M"}${(p[0] + j(amt)).toFixed(1)},${(p[1] + j(amt)).toFixed(1)}`).join("") + (close ? "Z" : "");
}
// 筆で引いた線（始点を太く、終点で抜く）を細長い面として返す
function stroke(pts, w0, w1 = w0 * 0.35, amt = 0.4) {
  const L = [], R = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const n = Math.hypot(dx, dy) || 1; dx /= n; dy /= n;
    const t = i / (pts.length - 1), w = (w0 + (w1 - w0) * t) / 2 * (0.85 + rnd() * 0.3);
    L.push([pts[i][0] - dy * w, pts[i][1] + dx * w]); R.unshift([pts[i][0] + dy * w, pts[i][1] - dx * w]);
  }
  return wobble(L.concat(R), amt);
}
function blob(cx, cy, rx, ry, n = 14, rough = 0.12, rot = 0) {
  const a = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2, k = 1 + j(rough);
    const x = Math.cos(t) * rx * k, y = Math.sin(t) * ry * k;
    a.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
  }
  return a;
}
function bez(p0, p1, p2, n = 12) {
  const a = [];
  for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; a.push([u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]); }
  return a;
}
function defs(svg) {
  const d = el("defs", {}, svg);
  d.innerHTML = `
  <filter id="weave" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="1.4 0.22" numOctaves="2" seed="4" result="a"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.2 1.3" numOctaves="2" seed="9" result="b"/>
    <feComposite in="a" in2="b" operator="arithmetic" k2="0.5" k3="0.5"/>
    <feColorMatrix values="0 0 0 0 0.16  0 0 0 0 0.14  0 0 0 0 0.09  0 0 0 -1.6 1.02"/>
  </filter>
  <filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="7"/></filter>
  <filter id="grain" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" seed="2"/>
    <feColorMatrix values="0 0 0 0 0.2  0 0 0 0 0.16  0 0 0 0 0.1  0 0 0 -1.2 0.66"/>
  </filter>
  <filter id="dry" x="-5%" y="-5%" width="110%" height="110%">
    <feTurbulence type="fractalNoise" baseFrequency="0.9 0.06" numOctaves="2" seed="6" result="n"/>
    <feColorMatrix in="n" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.6 1.75" result="m"/>
    <feComposite in="SourceGraphic" in2="m" operator="in"/>
  </filter>
  <filter id="rough" x="-5%" y="-5%" width="110%" height="110%">
    <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="5"/>
    <feDisplacementMap in="SourceGraphic" scale="2.2"/>
  </filter>`;
  return d;
}
// 天幕の帆布（内側）。中心の柱から放射状に、幅の揃わない布の継ぎを入れる。継ぎ当てと雨じみ
function roof(g, W, poleX, topY, eaveY) {
  // 1枚ごとに日の透け方が違う（3つの調子をばらばらに）
  const xs = [-40];
  while (xs[xs.length - 1] < W + 40) xs.push(xs[xs.length - 1] + 38 + rnd() * 52);
  const tones = [C.hanpu, C.hinata, C.hanpu, C.kage, C.hinata, C.hanpu, C.hanpu, C.kage];
  for (let i = 0; i < xs.length - 1; i++) {
    const t = tones[Math.floor(rnd() * tones.length)];
    const a = [poleX + (xs[i] - poleX) * 0.12, topY], b = [poleX + (xs[i + 1] - poleX) * 0.12, topY];
    const sag = 6 + rnd() * 10;
    const bottom = bez([xs[i + 1], eaveY + j(4)], [(xs[i] + xs[i + 1]) / 2, eaveY + sag], [xs[i], eaveY + j(4)], 6);
    el("path", { d: wobble([a, b, ...bottom], 0.8), fill: t }, g);
    // 縫い目（2本の運針。片方は途切れる）
    const sx = xs[i + 1];
    el("path", { d: wobble([b, [sx, eaveY + j(3)]], 0.6, false), stroke: C.kage, "stroke-width": 1.6, fill: "none" }, g);
    el("path", { d: wobble([[b[0] + 2, topY], [sx + 3, eaveY]], 0.5, false), stroke: C.sumi, "stroke-width": 1.4, "stroke-dasharray": `${3 + rnd() * 2} ${2.5 + rnd() * 2}`, fill: "none", opacity: 0.6 }, g);
  }
  el("rect", { x: 0, y: topY, width: W, height: eaveY - topY + 20, filter: "url(#weave)", opacity: 0.8 }, g);
}
function patch(g, x, y, w, h, rot, tone = C.hinata) {
  const pts = [[x, y], [x + w, y + j(2)], [x + w + j(2), y + h], [x + j(2), y + h + j(1)]];
  const G = el("g", { transform: `rotate(${rot} ${x + w / 2} ${y + h / 2})` }, g);
  el("path", { d: wobble(pts, 1), fill: tone }, G);
  const r = pts.map((p) => [p[0] + (p[0] > x + w / 2 ? -2.5 : 2.5), p[1] + (p[1] > y + h / 2 ? -2.5 : 2.5)]);
  el("path", { d: wobble(r, 0.5), fill: "none", stroke: C.sumi, "stroke-width": 0.8, "stroke-dasharray": "2.5 2.2", opacity: 0.55 }, G);
}
function stain(g, x, y, r, op = 0.5) {
  el("path", { d: wobble(blob(x, y, r, r * 0.7, 16, 0.3), 1.5), fill: C.shimi, opacity: op }, g);
  el("path", { d: wobble(blob(x + j(3), y + 2, r * 0.6, r * 0.4, 12, 0.3), 1), fill: "none", stroke: C.shimi, "stroke-width": 1.2, opacity: op }, g);
}
// 日の透けのむら（縁がぼけた明るい所。形は不揃い）
function sunleak(g, x, y, rx, ry) {
  el("path", { d: wobble(blob(x, y, rx, ry, 14, 0.3), 2), fill: C.hinata, filter: "url(#soft)", opacity: 0.85 }, g);
}
// 麻縄（撚りの斜線を不揃いに）
function rope(g, pts, w = 2.4, col = C.ita) {
  el("path", { d: stroke(pts, w, w * 0.9, 0.3), fill: col }, g);
  for (let i = 0; i < pts.length - 1; i += 1) {
    if (rnd() < 0.5) continue;
    const [x, y] = pts[i];
    el("path", { d: `M${x - 1},${y + 1} l2,-2`, stroke: C.sumi, "stroke-width": 0.6, opacity: 0.5 }, g);
  }
}
function line(a, b, n = 10, sag = 0) {
  const p = [];
  for (let i = 0; i <= n; i++) { const t = i / n; p.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + Math.sin(t * Math.PI) * sag]); }
  return p;
}
// 版ずれの重ね: 色面を少しずらして置き、墨の輪郭をかぶせる
function inked(g, pts, fill, opt = {}) {
  const off = opt.off || [1.6, 1.2];
  el("path", { d: wobble(pts, opt.amt ?? 0.6), fill, transform: `translate(${off[0]},${off[1]})` }, g);
  if (opt.line !== false) el("path", { d: wobble(pts, opt.amt ?? 0.6), fill: "none", stroke: C.sumi, "stroke-width": opt.w || 1.6, "stroke-linejoin": "round" }, g);
}
// 象（左向き・横から）。背に受け網を載せる
function elephant(g, x, y, s = 1) {
  const G = el("g", { transform: `translate(${x},${y}) scale(${s})` }, g);
  const body = [[-36, -40], [-18, -50], [8, -52], [32, -46], [46, -30], [48, -8], [44, 6], [-30, 8], [-40, -10]];
  const legs = [[-28, 0, 13], [-10, 2, 12], [18, 2, 12], [34, 0, 13]];
  legs.forEach(([lx, ly, w], i) => {
    const d = [[lx - w / 2, ly - 10], [lx + w / 2, ly - 10], [lx + w / 2 + j(1), ly + 28], [lx - w / 2 + j(1), ly + 28]];
    el("path", { d: wobble(d, 0.6), fill: i % 2 ? C.zou2 : C.zou, transform: "translate(1.4,1)" }, G);
    el("path", { d: wobble(d, 0.6), fill: "none", stroke: C.sumi, "stroke-width": 1.5 }, G);
    for (let k = 0; k < 3; k++) el("path", { d: `M${lx - w / 2 + 2 + k * 3.6},${ly + 28} l0.4,-2.5`, stroke: C.sumi, "stroke-width": 1 }, G);
  });
  inked(G, body, C.zou, { w: 1.8 });
  // 頭・耳・鼻（鼻は先で上へ巻く）
  const head = [[-34, -42], [-48, -46], [-62, -36], [-64, -18], [-58, -6], [-46, -4], [-36, -14]];
  inked(G, head, C.zou, { w: 1.8 });
  const trunk = stroke([[-60, -14], [-66, 2], [-68, 18], [-62, 30], [-56, 28]], 11, 4, 0.3);
  el("path", { d: trunk, fill: C.zou, transform: "translate(1.4,1)" }, G);
  el("path", { d: trunk, fill: "none", stroke: C.sumi, "stroke-width": 1.5 }, G);
  [[-66, 4], [-67, 11], [-66, 18]].forEach(([tx, ty]) => el("path", { d: `M${tx},${ty} l6,${j(1)}`, stroke: C.sumi, "stroke-width": 0.8 }, G));
  const ear = [[-40, -40], [-26, -38], [-22, -20], [-30, -6], [-40, -12]];
  inked(G, ear, C.zou2, { w: 1.4 });
  el("path", { d: wobble(blob(-52, -30, 2, 2.4, 8, 0.1), 0.2), fill: C.sumi }, G);
  // 頭飾り（牡丹の布と山吹の房）
  el("path", { d: wobble([[-50, -46], [-36, -50], [-30, -40], [-46, -36]], 0.6), fill: C.botan }, G);
  el("path", { d: wobble([[-44, -36], [-40, -36], [-41, -28], [-43, -28]], 0.4), fill: C.yamabuki }, G);
  // 尻尾
  el("path", { d: stroke([[46, -24], [54, -12], [53, 2]], 2.4, 1.2), fill: C.sumi }, G);
  // 皮のしわ（筆の短い線）
  for (let k = 0; k < 7; k++) { const sx = -20 + rnd() * 56, sy = -36 + rnd() * 34; el("path", { d: stroke([[sx, sy], [sx + 4 + rnd() * 3, sy + 2 + j(2)]], 1.3, 0.4), fill: C.sumi, opacity: 0.6 }, G); }
  return G;
}
// 受け網: 象の背の上にたわんだ袋。帆布の影色の面＋粗い網目の筆の線、縁は太い麻縄。山吹は使わない
function net(g, x, y, w, sagD = 18) {
  const G = el("g", {}, g);
  // 支えの棒（深緑の台枠から立つ2本）
  [[x - w / 2 + 4, -1], [x + w / 2 - 4, 1]].forEach(([px, d]) => el("path", { d: stroke([[px + d * 3, y + 30], [px, y - 2]], 5, 4, 0.3), fill: C.midori }, G));
  const L = [x - w / 2, y], R = [x + w / 2, y];
  const under = bez(R, [x + j(4), y + sagD * 2.3], L, 16);
  const rim = bez(L, [x, y - 6], R, 16);
  const bag = [...rim, ...under.slice(1)];
  el("path", { d: wobble(bag, 0.6), fill: C.kage, transform: "translate(1.6,1.4)" }, G);
  el("path", { d: wobble(bag, 0.6), fill: C.hinata }, G);
  // 網目: 斜めの筆の線を間隔不揃いに2方向（たわみに沿って曲げる）
  const sag = (t) => 4 * sagD * 1.15 * t * (1 - t);
  let t0 = 0.06;
  while (t0 < 0.95) {
    const xa = x - w / 2 + t0 * w, ya = y - 1;
    const tb = Math.min(0.98, t0 + 0.16), xb = x - w / 2 + tb * w;
    el("path", { d: stroke([[xa, ya], [(xa + xb) / 2, ya + sag((t0 + tb) / 2) * 0.8], [xb, y + sag(tb) * 0.95]], 1.4, 0.8, 0.3), fill: C.sumi, opacity: 0.75 }, G);
    const tc = Math.max(0.02, t0 - 0.12), xc = x - w / 2 + tc * w;
    el("path", { d: stroke([[xa + 2, ya], [(xa + xc) / 2, ya + sag((t0 + tc) / 2) * 0.75], [xc, y + sag(tc) * 0.95]], 1.2, 0.7, 0.3), fill: C.sumi, opacity: 0.6 }, G);
    t0 += 0.09 + rnd() * 0.07;
  }
  el("path", { d: wobble(under, 0.5, false), fill: "none", stroke: C.sumi, "stroke-width": 1.6 }, G);
  // 縁の太い麻縄
  rope(G, rim, 5, C.ita);
  el("path", { d: wobble(rim, 0.4, false), fill: "none", stroke: C.sumi, "stroke-width": 1, opacity: 0.7 }, G);
  return G;
}
// 大砲: 深緑の台車＋山吹の放射の車輪（道具馬車の車輪）＋牡丹の筒に山吹の帯金
function cannon(g, x, y, ang, s = 1, pull = 0) {
  const G = el("g", { transform: `translate(${x},${y}) scale(${s})` }, g);
  inked(G, [[-34, -6], [30, -12], [36, 2], [-30, 8]], C.midori, { w: 1.7 });
  const B = el("g", { transform: `translate(${-pull} ${pull * 0.4}) rotate(${-ang} 0 -10)` }, G);
  const barrel = [[-26, -24], [62, -20], [64, -18], [64, 2], [62, 4], [-26, 6], [-34, -2], [-34, -16]];
  inked(B, barrel, C.botan, { w: 1.9, off: [2, 1.5] });
  [[-10, 11], [24, 9], [52, 8]].forEach(([bx, bw]) => inked(B, [[bx, -22.5], [bx + bw, -21.5], [bx + bw, 4.5], [bx, 5.5]], C.yamabuki, { w: 1.3, off: [1.5, 1] }));
  // 筒の口と、中から覗く曲芸師の手
  inked(B, [[64, -21], [72, -23], [72, 5], [64, 3]], C.midori, { w: 1.5 });
  el("path", { d: wobble([[66, -18], [69, -18], [69, 0], [66, 0]], 0.3), fill: C.sumi }, B);
  // 筆のハイライト（かすれ）
  el("path", { d: stroke([[-18, -17], [20, -16], [56, -15]], 3, 1.2), fill: C.hinata, opacity: 0.55, filter: "url(#dry)" }, B);
  // 車輪
  const wx = -6, wy = 8, R = 22;
  inked(G, blob(wx, wy, R, R, 22, 0.03), C.yamabuki, { w: 2, off: [1.8, 1.4] });
  for (let k = 0; k < 9; k++) {
    const t = (k / 9) * Math.PI * 2 + 0.2 + j(0.05);
    el("path", { d: stroke([[wx, wy], [wx + Math.cos(t) * (R - 3), wy + Math.sin(t) * (R - 3)]], 3.6, 1.6, 0.2), fill: C.midori }, G);
  }
  el("path", { d: wobble(blob(wx, wy, R - 3, R - 3, 20, 0.03), 0.4), fill: "none", stroke: C.sumi, "stroke-width": 1 }, G);
  inked(G, blob(wx, wy, 5.5, 5.5, 10, 0.08), C.botan, { w: 1.3 });
  return G;
}
// 曲芸師（くるくる回っている途中。牡丹の衣装、山吹の帯）
function acrobat(g, x, y, rot, s = 1) {
  const G = el("g", { transform: `translate(${x},${y}) rotate(${rot}) scale(${s})` }, g);
  const torso = [[-6, -12], [6, -12], [7, 6], [-7, 6]];
  // 手足（広げた形）
  [[[-5, -8], [-18, -16], [-24, -14]], [[5, -8], [17, -2], [22, 4]], [[-4, 5], [-10, 18], [-8, 26]], [[4, 5], [14, 14], [22, 14]]].forEach((l, i) => {
    el("path", { d: stroke(l, 5.4, 4, 0.3), fill: i < 2 ? C.hinata : C.botan, transform: "translate(1.2,0.8)" }, G);
    el("path", { d: stroke(l, 5.4, 4, 0.3), fill: "none", stroke: C.sumi, "stroke-width": 1.2 }, G);
  });
  inked(G, torso, C.botan, { w: 1.4, off: [1.3, 0.9] });
  el("path", { d: wobble([[-7, -3], [7, -3], [7, 1], [-7, 1]], 0.3), fill: C.yamabuki }, G);
  inked(G, blob(0, -18, 6, 6.5, 12, 0.06), C.hinata, { w: 1.4, off: [1, 0.8] });
  el("path", { d: wobble([[-6, -21], [-2, -26], [5, -25], [6, -20], [0, -22]], 0.3), fill: C.sumi }, G);
  return G;
}
// 吊り砂袋（麻袋。触ってはいけない物の印として牡丹の×の縫い取り）
function sandbag(g, x, ropeTop, y, s = 1) {
  rope(g, line([x, ropeTop], [x + 2, y - 18 * s], 8), 2, C.sumi);
  const G = el("g", { transform: `translate(${x},${y}) scale(${s})` }, g);
  const bag = [[-6, -20], [6, -20], [9, -12], [15, 4], [13, 16], [0, 20], [-13, 16], [-15, 4], [-9, -12]];
  inked(G, bag, C.ita, { w: 1.7 });
  el("path", { d: wobble([[-7, -16], [7, -16], [7, -13], [-7, -13]], 0.3), fill: C.sumi }, G);
  // 危ない印: 日なた色の縫い取りの上に牡丹の×（袋の茶の上でも見える）
  el("path", { d: wobble(blob(0, 4, 10, 10, 12, 0.08), 0.5), fill: C.hinata }, G);
  el("path", { d: stroke([[-6, -2], [6, 10]], 3.8, 2.8), fill: C.botan }, G);
  el("path", { d: stroke([[6, -2], [-6, 10]], 3.8, 2.8), fill: C.botan }, G);
  for (let k = 0; k < 6; k++) { const sx = -10 + rnd() * 20, sy = -8 + rnd() * 22; el("path", { d: `M${sx},${sy} l${2 + rnd() * 2},${j(1)}`, stroke: C.sumi, "stroke-width": 0.7, opacity: 0.5 }, G); }
  return G;
}
// 綱渡りの演者（長い平均棒を持つ）
function walker(g, x, y, s = 1) {
  const G = el("g", { transform: `translate(${x},${y}) scale(${s})` }, g);
  el("path", { d: stroke(bez([-34, -18], [0, -26], [34, -16], 10), 2.4, 2.4, 0.2), fill: C.sumi }, G);
  [[-34, -18], [34, -16]].forEach(([px, py]) => el("path", { d: wobble(blob(px, py, 3, 3, 8, 0.1), 0.2), fill: C.botan, stroke: C.sumi, "stroke-width": 0.8 }, G));
  // スカートの演者
  inked(G, [[-4, -24], [4, -24], [10, -8], [-10, -8]], C.midori2, { w: 1.3 });
  [[[-2, -8], [-3, 0]], [[2, -8], [3, 0]]].forEach((l) => el("path", { d: stroke(l, 2.6, 2), fill: C.sumi }, G));
  inked(G, blob(0, -29, 4.5, 5, 10, 0.06), C.hinata, { w: 1.2 });
  el("path", { d: wobble([[-4, -32], [0, -36], [5, -33], [1, -31]], 0.2), fill: C.sumi }, G);
  return G;
}
// 火の輪（吊り輪。炎は上半分だけ4〜6本、全部が上へ立って先が片側へなびく。下半分は革巻きと煤の筋）
function fireRing(g, x, y, r, s = 1, lean = 1) {
  const G = el("g", { transform: `translate(${x},${y}) scale(${s})` }, g);
  // 下半分: 革巻き（斜めの帯を不揃いに）と、炎から垂れた煤の筋
  const ring = blob(0, 0, r, r * 1.05, 28, 0.02);
  el("path", { d: wobble(ring, 0.5), fill: "none", stroke: C.sumi, "stroke-width": 4.2 }, G);
  el("path", { d: wobble(ring, 0.4), fill: "none", stroke: C.ita, "stroke-width": 1.8 }, G);
  for (let k = 0; k < 7; k++) {
    const t = 0.25 + k * 0.38 + j(0.08);
    const cx = Math.cos(t) * r, cy = Math.sin(t) * r * 1.05;
    el("path", { d: `M${cx - 2.6},${cy - 1.6} l5,3.4`, stroke: C.hinata, "stroke-width": 1.1, opacity: 0.8 }, G);
  }
  [[-0.9, 9], [-0.35, 6], [-2.6, 7]].forEach(([t, L]) => {
    const cx = Math.cos(t) * r, cy = Math.sin(t) * r * 1.05;
    el("path", { d: stroke([[cx, cy], [cx + j(1), cy + L]], 1.8, 0.4), fill: C.sumi, opacity: 0.55 }, G);
  });
  // 上半分の炎（根元の間隔も長さも揃えない。中央ほど長い）
  const roots = [-2.5, -2.1, -1.75, -1.38, -1.0, -0.68].map((t) => t + j(0.06));
  roots.forEach((t, i) => {
    if (i === 4 && rnd() < 0.5) return;
    const bx = Math.cos(t) * r, by = Math.sin(t) * r * 1.05;
    const mid = 1 - Math.abs(t + 1.57) / 1.4;           // 真上で1、端で0
    const L = (6 + mid * 18) * (0.7 + rnd() * 0.6);
    const w = 4.5 + mid * 3 + rnd() * 1.5;
    const ln = lean * (0.5 + rnd() * 1.1);
    const tx = bx + ln * (2 + L * 0.22) + j(1.5), ty = by - L;
    const q = (v) => v.toFixed(1);
    // 根元はふくらみ、先は細く片側へ曲がる（二次曲線の舌。角を立てない）
    const d = `M${q(bx - w)},${q(by + 2)} Q${q(bx - w * 1.1)},${q(by - L * 0.5)} ${q(tx - lean * 2)},${q(ty + L * 0.12)} Q${q(tx)},${q(ty + 1)} ${q(tx + lean * 1.2)},${q(ty - 1)} Q${q(bx + w * 0.4 + lean * 3)},${q(by - L * 0.35)} ${q(bx + w)},${q(by + 2)} Z`;
    el("path", { d, fill: C.yamabuki, transform: "translate(1.4,1)" }, G);
    el("path", { d, fill: "none", stroke: C.sumi, "stroke-width": 1.2, "stroke-linejoin": "round" }, G);
  });
  return G;
}
// 発射の煙「ドン」: 山吹の煙のかたまり（丸を不揃いに寄せた形）を牡丹の版の上にずらして置く。輪郭は外側だけ
function puff(g, x, y, s = 1, word = "ドン") {
  const G = el("g", { transform: `translate(${x},${y}) scale(${s}) rotate(-8)` }, g);
  const lobes = [[0, 0, 26], [-26, 6, 17], [24, 8, 18], [-10, -20, 16], [14, -18, 15], [32, -8, 11], [-34, -10, 10], [6, 18, 14]];
  const shapes = lobes.map(([lx, ly, r]) => wobble(blob(lx, ly, r, r * 0.9, 12, 0.1), 0.8));
  shapes.forEach((d) => el("path", { d, fill: C.botan, transform: "translate(3.5,3)" }, G));
  shapes.forEach((d) => el("path", { d, fill: C.yamabuki, stroke: C.sumi, "stroke-width": 3, filter: "url(#dry)" }, G));
  shapes.forEach((d) => el("path", { d, fill: C.yamabuki }, G));
  // 煙の中の筆のかすれ（渦にしない。短い払いだけ）
  [[-30, 0, -22, -6], [18, -24, 26, -18], [-6, 22, 4, 26]].forEach(([a, b, c, d2]) => el("path", { d: stroke([[a, b], [c, d2]], 2, 0.4), fill: C.botan, opacity: 0.8 }, G));
  const t = el("text", { x: 0, y: 11, "text-anchor": "middle", "font-family": "'Rampart One', 'Hiragino Maru Gothic ProN', sans-serif", "font-size": 34, fill: C.sumi }, G);
  t.textContent = word;
  return G;
}
// シルクハット（ミスの残り）。看板の木の掛け釘に掛ける。落とした分は釘だけが残る
function silkHat(g, x, y, s = 1, lost = false, rot = 0) {
  const G = el("g", { transform: `translate(${x},${y}) rotate(${rot}) scale(${s})` }, g);
  // 掛け釘（帽子の上）
  el("path", { d: wobble([[-2, -28], [2, -28], [2.5, -22], [-2.5, -22]], 0.3), fill: C.ita, stroke: C.sumi, "stroke-width": 0.9 }, G);
  if (lost) {
    el("path", { d: stroke([[-1, -22], [1, -16]], 1.2, 0.5), fill: C.sumi, opacity: 0.7 }, G);
    return G;
  }
  const H = el("g", { transform: `rotate(${j(5)} 0 -22)` }, G);
  const crown = [[-9, -21], [9, -22], [8, -4], [-8, -4]];
  const brim = [[-15, -4], [-8, -6], [8, -6], [15, -4], [13, 0], [-13, 0]];
  el("path", { d: wobble(crown, 0.5), fill: C.sumi }, H);
  el("path", { d: wobble([[-8.5, -9], [8.5, -9.5], [8.2, -5], [-8.2, -5]], 0.3), fill: C.botan }, H);
  el("path", { d: wobble(brim, 0.5), fill: C.sumi }, H);
  el("path", { d: stroke([[-5, -19], [-5.5, -11]], 1.6, 0.6), fill: C.midori2 }, H);
  return G;
}
// 床に転がったシルクハット（ミスの瞬間の演出）
function fallenHat(g, x, y, rot) {
  const G = el("g", { transform: `translate(${x},${y}) rotate(${rot})` }, g);
  el("path", { d: wobble([[-9, -21], [9, -22], [8, -4], [-8, -4]], 0.5), fill: C.sumi }, G);
  el("path", { d: wobble([[-8.5, -9], [8.5, -9.5], [8.2, -5], [-8.2, -5]], 0.3), fill: C.botan }, G);
  el("path", { d: wobble([[-15, -4], [-8, -6], [8, -6], [15, -4], [13, 0], [-13, 0]], 0.5), fill: C.sumi }, G);
  return G;
}
// 客（頭と肩だけ。帽子・髪の形を毎回変える）
function spectator(g, x, y, s, kind, col, mood = 0) {
  const G = el("g", { transform: `translate(${x},${y}) scale(${s})` }, g);
  el("path", { d: wobble([[-11, 0], [-9, -10], [9, -11], [12, 0]], 0.7), fill: col }, G);
  el("path", { d: wobble(blob(0, -16, 6, 6.5, 10, 0.08), 0.4), fill: C.hinata }, G);
  if (kind === 0) el("path", { d: wobble([[-9, -20], [9, -21], [6, -22], [5, -29], [-5, -29], [-6, -22]], 0.4), fill: C.sumi }, G); // 山高帽
  if (kind === 1) el("path", { d: wobble([[-8, -18], [-7, -24], [0, -26], [8, -23], [10, -16], [6, -20], [-4, -21]], 0.4), fill: C.ita }, G); // 髪
  if (kind === 2) el("path", { d: wobble([[-11, -19], [11, -20], [8, -23], [3, -27], [-5, -26], [-8, -22]], 0.4), fill: C.midori2 }, G); // つばの広い帽子
  if (kind === 3) el("path", { d: wobble([[-7, -20], [-6, -25], [6, -25], [7, -20], [11, -19], [-10, -19]], 0.4), fill: C.botan }, G); // 鳥打帽
  // 目（退屈の度合い: 0 = 開いて見上げる / 1 = 半目 / 2 = あくび）
  if (mood === 0) { el("circle", { cx: -2.2, cy: -17, r: 0.9, fill: C.sumi }, G); el("circle", { cx: 2.4, cy: -17, r: 0.9, fill: C.sumi }, G); }
  if (mood >= 1) { el("path", { d: "M-3.4,-16.4 l2.4,0 M1.2,-16.4 l2.4,0", stroke: C.sumi, "stroke-width": 0.9 }, G); }
  if (mood === 2) el("path", { d: wobble(blob(0.3, -12.6, 1.6, 2.2, 8, 0.1), 0.1), fill: C.sumi }, G);
  return G;
}
// 最前段の客（顔あり）。型は帽子でなく姿勢で変える: sit / talk（横を向いて話す）/ shoulder（子を肩車）/ point（立って指さす）/ chin（頬杖）
function person(g, x, y, s, pose, col, hat = 0, flip = 1) {
  const G = el("g", { transform: `translate(${x},${y}) scale(${s * flip},${s})` }, g);
  const ty = pose === "point" ? -10 : 0;
  el("path", { d: wobble([[-11, 0], [-10, -9 + ty], [-4, -12 + ty], [5, -12 + ty], [10, -9 + ty], [12, 0]], 0.7), fill: col }, G);
  const hx = pose === "talk" ? 3 : 0, hy = -18 + ty;
  el("path", { d: wobble(blob(hx, hy, 5.8, 6.4, 10, 0.08), 0.4), fill: C.hinata }, G);
  if (pose === "talk") { el("path", { d: `M${hx + 5.5},${hy + 0.5} l2,1.4 l-2,0.6`, stroke: C.sumi, "stroke-width": 0.8, fill: "none" }, G); el("circle", { cx: hx + 3, cy: hy - 1, r: 0.8, fill: C.sumi }, G); }
  else { el("circle", { cx: hx - 2.1, cy: hy - 0.6, r: 0.8, fill: C.sumi }, G); el("circle", { cx: hx + 2.3, cy: hy - 0.8, r: 0.8, fill: C.sumi }, G); }
  if (hat === 1) el("path", { d: wobble([[hx - 8, hy - 3], [hx + 8, hy - 4], [hx + 5, hy - 5], [hx + 4, hy - 12], [hx - 5, hy - 12], [hx - 5, hy - 5]], 0.4), fill: C.sumi }, G);
  if (hat === 2) el("path", { d: wobble([[hx - 7, hy - 2], [hx - 6, hy - 7], [hx, hy - 9], [hx + 7, hy - 6], [hx + 8, hy], [hx + 5, hy - 4], [hx - 4, hy - 5]], 0.4), fill: C.ita }, G);
  if (hat === 3) el("path", { d: wobble([[hx - 11, hy - 3], [hx + 11, hy - 4], [hx + 7, hy - 6], [hx + 3, hy - 10], [hx - 4, hy - 10], [hx - 7, hy - 6]], 0.4), fill: C.midori2 }, G);
  if (pose === "point") el("path", { d: stroke([[6, -18], [16, -28], [22, -34]], 3.2, 2.2), fill: col }, G);
  if (pose === "chin") el("path", { d: stroke([[-9, -2], [-9, -10], [-5, -14]], 3.2, 2.6), fill: col }, G);
  if (pose === "shoulder") {
    el("path", { d: wobble([[-6, -24], [-4, -30], [4, -30], [6, -24]], 0.5), fill: C.midori2 }, G);
    el("path", { d: wobble(blob(0, -34, 4.4, 4.8, 9, 0.08), 0.3), fill: C.hinata }, G);
    el("path", { d: stroke([[-5, -27], [-9, -20]], 2.4, 2), fill: C.midori2 }, G);
    el("path", { d: stroke([[5, -27], [9, -20]], 2.4, 2), fill: C.midori2 }, G);
    el("path", { d: stroke([[4, -30], [10, -40]], 2, 1.6), fill: C.midori2 }, G);
  }
  return G;
}
// 奥の客（顔なし）: 頭と肩をつなげた影の塊を、連れの数だけ寄せる
function clump(g, x, y, n, s, col) {
  const G = el("g", { transform: `translate(${x},${y}) scale(${s})` }, g);
  let cx = 0;
  for (let i = 0; i < n; i++) {
    const hh = -16 - rnd() * 3 - (i % 2 ? 0 : 2), big = 1 + j(0.12);
    el("path", { d: wobble([[cx - 10 * big, 6], [cx - 9 * big, -6], [cx - 4, hh + 9], [cx + 4, hh + 9], [cx + 9 * big, -6], [cx + 10 * big, 6]], 0.6), fill: col }, G);
    el("path", { d: wobble(blob(cx + j(1.5), hh, 5.4 * big, 6 * big, 10, 0.07), 0.3), fill: col }, G);
    cx += 12 + rnd() * 4;
  }
  return G;
}
// 看板の板（道具馬車の側板: 深緑の板地、木目、山吹の細い縁線を筆で）
function board(g, x, y, w, h) {
  const G = el("g", {}, g);
  const pts = [[x, y + 2], [x + w * 0.5, y + j(1)], [x + w, y + 1], [x + w + 1, y + h - 1], [x + w * 0.5, y + h + 1], [x - 1, y + h]];
  el("path", { d: wobble(pts, 0.6), fill: C.midori, transform: "translate(2,2)", opacity: 0.6 }, G);
  el("path", { d: wobble(pts, 0.6), fill: C.midori }, G);
  for (let k = 0; k < 5; k++) { const yy = y + 6 + rnd() * (h - 12); el("path", { d: stroke(line([x + 6 + rnd() * 20, yy], [x + w - 6 - rnd() * 30, yy + j(2)], 8), 1.2, 0.5, 0.4), fill: C.midori2, opacity: 0.8 }, G); }
  el("path", { d: wobble([[x + 5, y + 5], [x + w - 5, y + 5.5], [x + w - 5.5, y + h - 5], [x + 5.5, y + h - 5.5]], 0.7), fill: "none", stroke: C.yamabuki, "stroke-width": 1.3, opacity: 0.9, filter: "url(#dry)" }, G);
  return G;
}
// 影つきの看板文字（山吹の文字の右下に深緑寄りの影版をずらす）
function signText(g, x, y, str, size, opt = {}) {
  const fam = opt.family || "'Rampart One', 'Hiragino Maru Gothic ProN', sans-serif";
  const base = { "font-family": fam, "font-size": size, "text-anchor": opt.anchor || "start", style: "font-variant-numeric: tabular-nums" };
  if (opt.shadow !== false) { const s = el("text", { ...base, x: x + size * 0.06, y: y + size * 0.06, fill: opt.shadowCol || C.sumi }, g); s.textContent = str; }
  const t = el("text", { ...base, x, y, fill: opt.fill || C.yamabuki }, g);
  t.textContent = str;
  return t;
}
