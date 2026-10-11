// 霧笛の灯 見本用: 新版画（多色木版）風に SVG を組み立てる小さな道具（改訂2: 紙の余白・一文字ぼかし・和船）
const C = {
  ai: "#2b4660",      // 藍摺
  kiri: "#8d9ea3",    // 霧鼠
  odo: "#e3b04b",     // 灯の黄土
  koge: "#4b3a2e",    // 岩の焦茶（墨版の線もこれ）
  hosho: "#ebe2ca",   // 奉書白
  shu: "#b9452f",     // 舷灯の朱
  // 版の重ね（上の6色を摺り重ねた中間色。新しい色ではない）
  ai2: "#4a6275",     // 藍摺の上に霧鼠を1度
  ai3: "#6c8290",     // 霧鼠を2度
  kage: "#3c5266",    // 霧の中の船の影絵（藍摺＋霧鼠を薄く）
  odo2: "#c1a96e",    // 黄土に霧鼠を重ねた2段目
  odo3: "#a7a389",    // 3段目（霧に溶ける）
};
let seed = 7;
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
function circlePts(cx, cy, r, n = 40, rough = 0) {
  const a = [];
  for (let i = 0; i < n; i++) { const t = (i / n) * Math.PI * 2; const rr = r + j(rough); a.push([cx + Math.cos(t) * rr, cy + Math.sin(t) * rr]); }
  return a;
}
function defs(svg) {
  const d = el("defs", {}, svg);
  d.innerHTML = `
  <filter id="paper" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3"/>
    <feColorMatrix values="0 0 0 0 0.2  0 0 0 0 0.18  0 0 0 0 0.15  0 0 0 -1.1 0.62"/>
  </filter>
  <filter id="fiber" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.02 0.5" numOctaves="2" seed="21"/>
    <feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.38  0 0 0 0 0.28  0 0 0 2.2 -1.25"/>
  </filter>
  <filter id="grain" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.006 0.11" numOctaves="3" seed="11"/>
    <feColorMatrix values="0 0 0 0 0.29  0 0 0 0 0.2  0 0 0 0 0.1  0 0 0 2.4 -1.05"/>
  </filter>
  <filter id="grainLight" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.004 0.07" numOctaves="3" seed="5"/>
    <feColorMatrix values="0 0 0 0 0.11  0 0 0 0 0.19  0 0 0 0 0.27  0 0 0 2 -0.9"/>
  </filter>
  <filter id="kasure">
    <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="2" seed="9" result="n"/>
    <feColorMatrix in="n" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.5 1.42" result="m"/>
    <feComposite in="SourceGraphic" in2="m" operator="in"/>
  </filter>`;
  return d;
}
// 横の帯（下辺を揺らす）
function band(g, x0, x1, yTop, yBot, fill, op = 1, amp = 3) {
  const pts = [[x0, yTop]];
  for (let x = x0; x <= x1; x += 18 + rnd() * 14) pts.push([x, yBot + j(amp)]);
  pts.push([x1, yBot + j(amp)], [x1, yTop]);
  return el("path", { d: wobble(pts, 0.6), fill, opacity: op }, g);
}
// 摺り物の絵の部分: 一文字ぼかし（上だけ濃い藍、3段で霧へ）＋水平の霧の明るい帯＋下の藍（海）
function picture(svg, x, y, w, h, clipId = "pic") {
  const cp = el("clipPath", { id: clipId }, svg);
  const edge = [];
  for (let i = 0; i <= 10; i++) edge.push([x + (w * i) / 10, y + j(1.2)]);
  for (let i = 0; i <= 14; i++) edge.push([x + w + j(1.2), y + (h * i) / 14]);
  for (let i = 10; i >= 0; i--) edge.push([x + (w * i) / 10, y + h + j(1.2)]);
  for (let i = 14; i >= 0; i--) edge.push([x + j(1.2), y + (h * i) / 14]);
  el("path", { d: wobble(edge, 0.3) }, cp);
  const g = el("g", { "clip-path": `url(#${clipId})` }, svg);
  el("rect", { x, y, width: w, height: h, fill: C.kiri }, g);
  // 一文字ぼかし: 上端の濃い藍 → 3段で明るく
  band(g, x, x + w, y, y + h * 0.10, C.ai, 1, 2);
  band(g, x, x + w, y, y + h * 0.17, C.ai, 0.75, 3);
  band(g, x, x + w, y, y + h * 0.24, C.ai2, 0.6, 4);
  band(g, x, x + w, y, y + h * 0.31, C.ai3, 0.45, 4);
  // 下（手前の海）: 段で藍へ戻す
  const up = (yy, fill, op) => { const pts = [[x, y + h]]; for (let xx = x; xx <= x + w; xx += 20 + rnd() * 12) pts.push([xx, yy + j(3)]); pts.push([x + w, yy], [x + w, y + h]); el("path", { d: wobble(pts, 0.6), fill, opacity: op }, g); };
  up(y + h * 0.80, C.ai3, 0.55);
  up(y + h * 0.88, C.ai2, 0.75);
  up(y + h * 0.95, C.ai, 0.9);
  el("rect", { x, y, width: w, height: h, filter: "url(#grainLight)", opacity: 0.45 }, g);
  return g;
}
// 和船（横から）。kind: gyo(櫓漕ぎの漁船) / ho(弁才船) / hashi(菰掛けのはしけ)
// 寸法は scale 1 で幅およそ 46px。printed=true で色版＋墨版、false で影絵
function ship(g, x, y, s, kind, printed, lamp, flip = false) {
  const G = el("g", { transform: `translate(${x},${y}) scale(${flip ? -s : s},${s})` }, g);
  const parts = []; const lines = [];
  // 船体: 左が舳先（反り上がる）、右が艫
  const hull = kind === "hashi"
    ? [[-24, -4], [-21, 0], [-16, 5], [20, 5], [22, 0], [22, -3], [-18, -3]]
    : [[-25, -11], [-22, -6], [-17, 0], [-10, 4], [17, 4], [21, 0], [22, -4], [12, -3], [-14, -3], [-19, -6]];
  if (kind === "ho") {
    // 帆柱と筵の四角い帆（少しふくらむ）
    parts.push({ d: [[-1, -3], [-1, -40], [1.2, -40], [1.2, -3]], fill: C.koge });
    const sail = [[-13, -37], [14, -38], [15, -22], [14, -9], [-13, -9], [-12, -22]];
    parts.push({ d: sail, fill: C.hosho, sail: true });
    for (let i = 1; i <= 4; i++) { const sx = -13 + i * 5.4; lines.push([[sx, -37.5], [sx + 0.6, -22], [sx, -9]]); }
    lines.push([[-12.5, -30], [14.5, -31]]);
  }
  if (kind === "gyo") {
    // 艫に立つ漕ぎ手と、水に入る櫓
    parts.push({ d: [[12, -3], [11, -13], [15, -13], [15.5, -3]], fill: C.ai });
    parts.push({ d: circlePts(13.4, -16, 2.6, 8, 0.2), fill: C.hosho });
    parts.push({ d: [[14, -10], [28, 8], [29.5, 7], [15.5, -11]], fill: C.koge });
    // 舟の中の苫（とま）
    parts.push({ d: [[-12, -3], [-10, -9], [2, -10], [4, -3]], fill: C.odo2 });
  }
  if (kind === "hashi") {
    // 菰掛けの荷の山と竿
    parts.push({ d: [[-15, -3], [-13, -11], [-6, -15], [4, -15], [10, -10], [12, -3]], fill: C.odo2, komo: true });
    lines.push([[-11, -10], [9, -9]], [[-8, -13], [-5, -3]], [[0, -15], [1, -3]], [[6, -13], [7, -3]]);
    parts.push({ d: [[15, -3], [14, -12], [17, -12], [17.5, -3]], fill: C.ai });
    parts.push({ d: circlePts(15.6, -14.5, 2.3, 8, 0.2), fill: C.hosho });
    parts.push({ d: [[16, -9], [30, -30], [31, -29], [17.5, -8]], fill: C.koge });
  }
  parts.push({ d: hull, fill: C.koge, hull: true });
  if (printed) {
    const col = el("g", { transform: "translate(1.5,1.2)" }, G);
    parts.forEach((p) => el("path", { d: wobble(p.d, 0.4), fill: p.hull ? "#6b5240" : p.fill }, col));
    // 墨版: 輪郭（舳先で太く、艫で細く）＋船腹の板目2本＋帆の筵の継ぎ目
    parts.forEach((p) => el("path", { d: wobble(p.d, 0.5), fill: "none", stroke: C.koge, "stroke-width": p.hull ? 1.3 : 1.1, "stroke-linejoin": "round" }, G));
    if (kind !== "hashi") el("path", { d: wobble([[-25.5, -11.5], [-22, -6], [-17, -0.5], [-12, 2.5], [-13, -1], [-18, -4.5], [-23, -10]], 0.2), fill: C.koge }, G);
    else el("path", { d: wobble([[-24.5, -4.5], [-21, 0], [-16, 5], [-14, 3], [-18, -1], [-21, -4]], 0.2), fill: C.koge }, G);
    el("path", { d: wobble([[-16, -0.5], [19, -0.8]], 0.4, false), stroke: C.hosho, "stroke-width": 0.7, opacity: 0.55, fill: "none" }, G);
    el("path", { d: wobble([[-12, 2.4], [17, 2.1]], 0.4, false), stroke: C.hosho, "stroke-width": 0.6, opacity: 0.4, fill: "none" }, G);
    lines.forEach((l) => el("path", { d: wobble(l, 0.3, false), stroke: C.koge, "stroke-width": 0.8, fill: "none", opacity: 0.85 }, G));
  } else {
    parts.forEach((p) => el("path", { d: wobble(p.d, 0.7), fill: C.kage }, G));
  }
  if (lamp) {
    const r = lamp === "solid" ? 3.4 : 2.6;
    el("circle", { cx: 20, cy: -6, r: r + 1, fill: C.hosho, opacity: lamp === "dim" ? 0.6 : 1 }, G);
    el("circle", { cx: 20, cy: -6, r, fill: C.shu, opacity: lamp === "dim" ? 0.7 : 1 }, G);
  }
  return G;
}
// 光の帯: 不透明な3段の扇（黄土 → 黄土＋霧鼠 → 霧寄り）。縁は線でなく色版のずれ。外周は彫刻刀の不揃いな弧
function beam(g, cx, cy, ang, width, len, id = "b") {
  const sector = (L0, L1, a0, a1, n = 9) => {
    const pts = [];
    for (let i = 0; i <= n; i++) { const t = a0 + (a1 - a0) * (i / n); const r = L1 + j(L1 * 0.035); pts.push([cx + Math.cos(t) * r, cy + Math.sin(t) * r]); }
    if (L0 <= 0) pts.push([cx, cy]);
    else for (let i = n; i >= 0; i--) { const t = a0 + (a1 - a0) * (i / n); const r = L0 + j(L0 * 0.03); pts.push([cx + Math.cos(t) * r, cy + Math.sin(t) * r]); }
    return pts;
  };
  const a0 = ang - width / 2, a1 = ang + width / 2;
  const whole = sector(0, len, a0, a1, 11);
  // 色版のずれ（下に2pxずらした黄土の1枚）
  el("path", { d: wobble(sector(0, len * 0.42, a0, a1, 6), 0.5), fill: C.odo, transform: "translate(2,-2)" }, g);
  el("path", { d: wobble(whole, 0.6), fill: C.odo3 }, g);
  el("path", { d: wobble(sector(0, len * 0.70, a0 + 0.01, a1 - 0.01, 9), 0.6), fill: C.odo2 }, g);
  el("path", { d: wobble(sector(0, len * 0.42, a0 + 0.02, a1 - 0.02, 7), 0.5), fill: C.odo }, g);
  const clip = el("clipPath", { id: "clip" + id }, g);
  el("path", { d: wobble(whole, 0.2) }, clip);
  const gr = el("g", { "clip-path": `url(#clip${id})` }, g);
  el("rect", { x: cx - len, y: cy - len, width: len * 2, height: len * 2, filter: "url(#grain)", opacity: 0.85, transform: `rotate(${(ang * 180) / Math.PI} ${cx} ${cy})` }, gr);
}
function lighthouse(g, x, y, s = 1) {
  const G = el("g", { transform: `translate(${x},${y}) scale(${s})` }, g);
  const col = el("g", { transform: "translate(1.5,1.2)" }, G);
  const tower = [[-9, 0], [-6, -46], [6, -46], [9, 0]];
  const band1 = [[-8.2, -14], [-7.3, -24], [7.3, -24], [8.2, -14]];
  const lamp = [[-5, -46], [-5, -54], [5, -54], [5, -46]];
  const roof = [[-7, -54], [0, -62], [7, -54]];
  el("path", { d: wobble(tower, 0.5), fill: C.hosho }, col);
  el("path", { d: wobble(band1, 0.4), fill: C.shu }, col);
  el("path", { d: wobble(lamp, 0.4), fill: C.odo }, col);
  el("path", { d: wobble(roof, 0.4), fill: C.koge }, col);
  [tower, band1, lamp, roof].forEach((p) => el("path", { d: wobble(p, 0.6), fill: "none", stroke: C.koge, "stroke-width": 1.4, "stroke-linejoin": "round" }, G));
  return G;
}
function rockBlob(g, x, y, r, fill = C.koge) {
  el("path", { d: wobble(circlePts(x, y, r, 9, r * 0.28), 0.8), fill }, g);
}
// 落款の形の角印: 奉書白の短冊に朱の縦組み。かすれは外枠だけ
function seal(g, x, y, text, size, rot) {
  const G = el("g", { transform: `translate(${x},${y}) rotate(${rot})` }, g);
  const w = size * 1.5, h = size * text.length * 1.08 + size * 0.7;
  el("path", { d: wobble([[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]], 1), fill: C.hosho }, G);
  el("path", { d: wobble([[-w / 2 + 3, -h / 2 + 3], [w / 2 - 3, -h / 2 + 3], [w / 2 - 3, h / 2 - 3], [-w / 2 + 3, h / 2 - 3]], 0.8), fill: "none", stroke: C.shu, "stroke-width": 2.6, filter: "url(#kasure)" }, G);
  [...text].forEach((ch, i) => {
    const t = el("text", { x: 0, y: -h / 2 + size * 0.35 + size * (i + 1) * 1.04, "text-anchor": "middle", fill: C.shu, "font-family": "'Kaisei Decol', serif", "font-weight": 700, "font-size": size }, G);
    t.textContent = ch;
  });
  return G;
}
function cross(g, x, y, s, rough = true) {
  const G = el("g", rough ? { filter: "url(#kasure)" } : {}, g);
  el("path", { d: wobble([[x - s, y - s], [x + s, y + s]], 1, false), stroke: C.shu, "stroke-width": 4, "stroke-linecap": "round" }, G);
  el("path", { d: wobble([[x + s, y - s], [x - s, y + s]], 1, false), stroke: C.shu, "stroke-width": 4, "stroke-linecap": "round" }, G);
}
// 縁の目印: 朱の点（奉書白の縁）＋彫り跡の弧2本（向きは ang）
function edgeMark(g, x, y, ang) {
  const G = el("g", { transform: `translate(${x},${y}) rotate(${(ang * 180) / Math.PI})` }, g);
  el("circle", { cx: 0, cy: 0, r: 6.6, fill: C.hosho }, G);
  el("circle", { cx: 0, cy: 0, r: 5.4, fill: C.shu }, G);
  [11, 17].forEach((r, i) => el("path", { d: `M${r * 0.35},${-r * 0.8} Q${r * 1.15},0 ${r * 0.35},${r * 0.8}`, stroke: C.shu, "stroke-width": 2 - i * 0.5, fill: "none", "stroke-linecap": "round" }, G));
}
// 霧笛の目盛り: 焦茶の霧笛（ラッパ）から伸びる「ぼぉー」の波線を5節。溜まった節は黄土＋焦茶の版ずれ、残りは焦茶の細線
function hornGauge(g, x, y, filled, n = 5, seg = 26) {
  const G = el("g", { transform: `translate(${x},${y})` }, g);
  el("path", { d: wobble([[-14, -3], [0, -4], [8, -11], [10, -11], [10, 11], [8, 11], [0, 4], [-14, 3]], 0.4), fill: C.koge }, G);
  for (let i = 0; i < n; i++) {
    const x0 = 16 + i * seg, x1 = x0 + seg - 5, amp = 3 + i * 0.6;
    const d = `M${x0},0 C${x0 + (x1 - x0) * 0.3},${-amp * 2} ${x0 + (x1 - x0) * 0.7},${amp * 2} ${x1},0`;
    if (i < filled) {
      el("path", { d, stroke: C.koge, "stroke-width": 6, fill: "none", "stroke-linecap": "round", transform: "translate(1.3,1.2)" }, G);
      el("path", { d, stroke: C.odo, "stroke-width": 4.6, fill: "none", "stroke-linecap": "round" }, G);
    } else el("path", { d, stroke: C.koge, "stroke-width": 1.3, fill: "none", "stroke-linecap": "round", opacity: 0.65 }, G);
  }
}
function paper(svg, w, h, op = 0.5) {
  el("rect", { x: 0, y: 0, width: w, height: h, filter: "url(#paper)", opacity: op, "pointer-events": "none" }, svg);
}
