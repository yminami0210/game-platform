// ぺったん二人前 見本用の描画道具（SVG）
// 借りる物: 年の瀬に公民館の駐車場で開く町内会の餅つきの「会場の道具」そのもの
//   （青いブルーシートとハトメ・橙のビールケース・白い軍手と青い縁かがり・ステンレスの手水ボウル・
//    白木の蒸籠と晒しの布巾・取り粉の粉だまり・ブロック塀）を、
//   公民館の廊下に貼り出される子ども会の「色画用紙の切り貼り絵」で描く
//   （はさみで切った直線の辺と、手でちぎった毛羽立つ辺が混ざる／紙が重なった所の影／マジックの描き足し）。
//   紅白・金・松竹梅・富士・青海波・門松・日の出は描かない。
// 実装メモ: 紙の1枚ごとに「影（墨を3〜4pxずらす）→ ちぎり辺の芯（明るい縁）→ 塗り → 紙の目」を
//   offscreen canvas に1回だけ描いて drawImage で使い回す。ctx.filter と shadowBlur は使わない。
const C = {
  ao: "#2b6cb5",      // ブルーシートの青（地。床）
  aoL: "#4f8bd0",     // 同じシートの光が当たる折り目（重ね色）
  aoD: "#1d5193",     // 同じシートの折り目の谷・物の影（重ね色）。軍手の縁かがりの糸も
  block: "#b8b1a3",   // ブロック塀のセメント（奥の塀）
  blockD: "#958e80",  // 塀の笠木・駐車場の地面（重ね色）
  blockL: "#d9d5cc",  // ステンレスの縁（重ね色）
  keyaki: "#8b5632",  // 欅の臼（臼・杵）
  keyakiL: "#b07a4c", // 臼の縁の木口・蒸籠の白木・のし台・縄（重ね色）
  keyakiD: "#5f3a20", // 臼の内側・杵の頭（重ね色）
  mochi: "#fcfbf6",   // 餅の白（主役。真っ白に近く、灰色にしない）
  mochiS: "#dfe8f2",  // 餅のくぼみの陰（青みの白。灰色で濁らせない）
  grain: "#c9d5e3",   // 残った米粒（青みの薄い色）
  dai: "#e8761f",     // ビールケースの橙（差し色。拍の札・危ない手の縁・ケース）
  usudai: "#f3c7a4",  // 顔の紙（橙の薄い画用紙。重ね色）
  sumi: "#33251c",    // 焦げた蒸籠の茶黒（墨の代わり。マジック・影・文字）
};
let seed = 9;
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
const ptsD = (p, close = true) => p.map((q, i) => `${i ? "L" : "M"}${f1(q[0])},${f1(q[1])}`).join("") + (close ? "Z" : "");
// はさみで切った辺: 直線、角だけ少しずれる
const cut = (pts, amt = 1) => ptsD(pts.map((p) => [p[0] + j(amt), p[1] + j(amt)]));
// 手でちぎった辺: 細かく刻んで垂直に揺らす（ぎざぎざ。揺れの大きさは不揃い）
function densify(pts, step = 4, amp = 1.5, close = true) {
  const out = [];
  const n = pts.length;
  for (let i = 0; i < (close ? n : n - 1); i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
    const k = Math.max(1, Math.round(len / step));
    const nx = -dy / len, ny = dx / len;
    for (let t = 0; t < k; t++) {
      const u = t / k, w = j(amp) * (rnd() < 0.12 ? 2.2 : 1);
      out.push([a[0] + dx * u + nx * w, a[1] + dy * u + ny * w]);
    }
  }
  if (!close) out.push(pts[n - 1]);
  return out;
}
const torn = (pts, amp = 1.5, step = 4) => ptsD(densify(pts, step, amp));
function ell(cx, cy, rx, ry, n = 32, a0 = 0, a1 = Math.PI * 2, rough = 0) {
  const a = [];
  const full = Math.abs(a1 - a0 - Math.PI * 2) < 1e-6;
  for (let i = 0; i < (full ? n : n + 1); i++) {
    const t = a0 + ((a1 - a0) * i) / n, k = 1 + j(rough);
    a.push([cx + Math.cos(t) * rx * k, cy + Math.sin(t) * ry * k]);
  }
  return a;
}
function smooth(pts, close = true) {
  const n = pts.length; let d = `M${f1(pts[0][0])},${f1(pts[0][1])}`;
  const P = (i) => pts[close ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
  for (let i = 0; i < (close ? n : n - 1); i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    d += `C${f1(p1[0] + (p2[0] - p0[0]) / 6)},${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)},${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])},${f1(p2[1])}`;
  }
  return d + (close ? "Z" : "");
}
// 紙1枚: 影 → ちぎり辺の芯 → 塗り → 紙の目
function piece(g, d, fill, o = {}) {
  const sh = o.sh === undefined ? [3, 3.5] : o.sh;
  if (sh) el("path", { d, fill: C.sumi, opacity: o.shOp ?? 0.3, transform: `translate(${sh[0]},${sh[1]})` }, g);
  if (o.edge) el("path", { d, fill: "none", stroke: o.edge, "stroke-width": o.ew ?? 3.2, "stroke-linejoin": "round" }, g);
  const p = el("path", { d, fill }, g);
  if (o.op !== undefined) p.setAttribute("opacity", o.op);
  if (o.tex) el("path", { d, fill: `url(#${o.tex})`, opacity: o.texOp ?? 1 }, g);
  if (o.line) el("path", { d, fill: "none", stroke: o.line, "stroke-width": o.lw ?? 2.4, "stroke-linejoin": "round" }, g);
  return p;
}
// マジックの描き足し: 揺れのある線（ときどき途切れる）
function marker(g, pts, w = 2.6, color = C.sumi, amp = 0.7, close = false) {
  const q = pts.map((p) => [p[0] + j(amp), p[1] + j(amp)]);
  return el("path", { d: smooth(q, close), fill: "none", stroke: color, "stroke-width": w, "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
}
// 1回だけ作る質感（紙の目・木の筋）。実装でも offscreen canvas で1回作って pattern にする
function defs(svg) {
  const d = el("defs", {}, svg);
  const mk = (id, w, h, n, fn) => {
    const p = el("pattern", { id, width: w, height: h, patternUnits: "userSpaceOnUse" }, d);
    for (let i = 0; i < n; i++) fn(p, i);
  };
  setSeed(101);
  // 画用紙の目: 短い繊維がまばらに。密度を場所でそろえないよう、タイルは大きめで偏りをつける
  mk("fib", 157, 139, 52, (p, i) => {
    const x = rnd() * 157, y = rnd() * 139 * (i % 3 ? 1 : 0.45), a = rnd() * Math.PI, l = 3 + rnd() * 8;
    el("path", { d: `M${f1(x)},${f1(y)}q${f1(Math.cos(a) * l * 0.5 + j(2))},${f1(Math.sin(a) * l * 0.5 + j(2))} ${f1(Math.cos(a) * l)},${f1(Math.sin(a) * l)}`, stroke: i % 2 ? "#ffffff" : C.sumi, "stroke-opacity": i % 2 ? 0.22 : 0.1, "stroke-width": 0.9, fill: "none" }, p);
  });
  // 欅の筋: 縦に長い不揃いの筋（等間隔にしない）
  mk("wood", 131, 97, 15, (p) => {
    const x = rnd() * 131, y = rnd() * 97, l = 18 + rnd() * 50;
    el("path", { d: `M${f1(x)},${f1(y)}c${f1(j(4))},${f1(l * 0.3)} ${f1(j(5))},${f1(l * 0.7)} ${f1(j(3))},${f1(l)}`, stroke: C.sumi, "stroke-opacity": 0.16 + rnd() * 0.1, "stroke-width": 0.8 + rnd() * 1.1, fill: "none" }, p);
  });
  return d;
}

// ===== 物 =====
// 白い軍手（命の札にも使う）。cuff=縁かがりの青、danger=橙の縁取り
function gunte(g, x, y, s = 1, rot = 0, o = {}) {
  const t = el("g", { transform: `translate(${x},${y}) rotate(${rot}) scale(${s})` }, g);
  const palm = [[-15, -4], [16, -6], [18, 20], [-14, 22]];
  const fingers = [[-13, -4, -17, -30], [-4, -6, -5, -36], [5, -6, 6, -34], [13, -5, 17, -26]];
  const parts = [];
  for (const [ax, ay, bx, by] of fingers) {
    const w = 4.6 + j(0.5);
    const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy), nx = (-dy / L) * w, ny = (dx / L) * w;
    parts.push(smooth([[ax - nx, ay - ny], [bx - nx * 0.9, by - ny * 0.9], [bx + dx / L * 3.5, by + dy / L * 3.5], [bx + nx * 0.9, by + ny * 0.9], [ax + nx, ay + ny]]));
  }
  parts.push(smooth([[-12, 12], [-26, 2], [-31, -6], [-25, -9], [-16, 0], [-10, 4]])); // 親指
  const body = torn(palm, 1.1, 3);
  if (o.danger) {
    for (const d of [...parts, body]) el("path", { d, fill: "none", stroke: C.sumi, "stroke-width": 11, "stroke-linejoin": "round" }, t);
    for (const d of [...parts, body]) el("path", { d, fill: "none", stroke: C.dai, "stroke-width": 7, "stroke-linejoin": "round" }, t);
  }
  for (const d of [...parts, body]) el("path", { d, fill: C.sumi, opacity: o.flip ? 0 : 0.28, transform: "translate(2.5,3)" }, t);
  const col = o.flip ? "none" : C.mochi;
  for (const d of parts) el("path", { d, fill: col, stroke: o.flip ? C.sumi : "none", "stroke-width": 2, "stroke-dasharray": o.flip ? "4 3" : "" }, t);
  el("path", { d: body, fill: col, stroke: o.flip ? C.sumi : "none", "stroke-width": 2, "stroke-dasharray": o.flip ? "4 3" : "" }, t);
  if (!o.flip) {
    // 縁かがり（青い糸）と、編み目の印を2〜3か所だけ
    el("path", { d: cut([[-15, 17], [18, 15], [19, 25], [-14, 27]], 0.8), fill: C.aoD }, t);
    marker(t, [[-12, 21], [-2, 20.5], [8, 21], [16, 20]], 1.2, C.mochi, 0.4);
    marker(t, [[-6, 6], [-3, 7]], 1.3, C.grain, 0.3);
    marker(t, [[6, 2], [9, 3.5]], 1.3, C.grain, 0.3);
  }
  return t;
}
// 臼（斜め上から）。st: grains 0..1, dent, puni, glossK, hand(危ない)
function usu(g, cx, cy, s, st = {}) {
  const t = el("g", { transform: `translate(${cx},${cy}) scale(${s})` }, g);
  // シートに落ちる影（シートの谷の青を一段濃く）
  piece(t, torn(ell(10, 104, 132, 44, 30), 2, 6), C.aoD, { sh: null, op: 0.85 });
  // はさみで切った曲線（丸太や切り株に見えないよう、低く・くびれ・縁は滑らかに）
  const front = ell(0, 98, 112, 40, 14, Math.PI, 0); // 手前の弧（左→右）
  const bodyPts = [[-124, 0], [-121, 22], [-107, 56], [-110, 80], ...front.slice(1, -1), [110, 80], [107, 56], [121, 22], ...ell(0, 0, 124, 50, 10, 0, -Math.PI).slice(0, -1)];
  const bodyD = smooth(bodyPts.map((p) => [p[0] + j(0.6), p[1] + j(0.6)]));
  piece(t, bodyD, C.keyaki, { tex: "wood", sh: [4, 4], shOp: 0.35 });
  const clipId = "uc" + Math.floor(rnd() * 1e6);
  el("path", { d: bodyD }, el("clipPath", { id: clipId }, t));
  const fg = el("g", { "clip-path": `url(#${clipId})` }, t);
  // 円筒に見せる: 左寄りに明るい帯、右端に暗い帯（どちらも曲線で切った1枚）
  piece(fg, smooth([[-92, -5], [-60, -5], [-58, 60], [-62, 150], [-96, 150], [-98, 60]]), C.keyakiL, { sh: null, op: 0.55 });
  piece(fg, smooth([[84, -5], [140, -5], [140, 150], [80, 150], [88, 60]]), C.keyakiD, { sh: null, op: 0.6 });
  // 腰のくびれの陰と、手斧の跡を2つだけ
  piece(fg, smooth([[-130, 50], [0, 60], [130, 50], [130, 64], [0, 74], [-130, 64]]), C.keyakiD, { sh: null, op: 0.28 });
  marker(fg, [[-30, 22], [-24, 34], [-27, 44]], 1.6, C.keyakiD, 0.5);
  marker(fg, [[40, 84], [47, 96]], 1.6, C.keyakiD, 0.5);
  // 木口（縁）と内側
  piece(t, smooth(ell(0, 0, 125, 56, 20, 0, Math.PI * 2, 0.006)), C.keyakiL, { tex: "wood", sh: [0, 3], shOp: 0.4 });
  piece(t, smooth(ell(1, 3, 101, 42, 20, 0, Math.PI * 2, 0.006)), C.keyakiD, { sh: null });
  marker(t, ell(0, 0, 125, 56, 14, 0.15 * Math.PI, 0.85 * Math.PI), 1.4, C.keyakiD, 0.5);
  // 餅
  const puni = st.puni || 0;
  const mr = st.dent ? [96, 38] : [92 + puni * 3, 35 + puni * 6];
  const my = 5 - puni * 8;
  el("path", { d: smooth(ell(1, my + 4, mr[0] - 2, mr[1] - 2, 18, 0, Math.PI * 2, 0.01)), fill: C.sumi, opacity: 0.32 }, t);
  el("path", { d: smooth(ell(0, my, mr[0], mr[1], 18, 0, Math.PI * 2, 0.012)), fill: C.mochi }, t);
  // 残った米粒（縁ほど多い。大きさ・向きをそろえない）
  setSeed(77);
  const G = [];
  for (let i = 0; i < 70; i++) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(0.18 + rnd() * 0.82);
    G.push([Math.cos(a) * r * (mr[0] - 9), my + Math.sin(a) * r * (mr[1] - 6), 2 + rnd() * 2.6, rnd() * 180, r]);
  }
  G.sort((a, b) => b[4] - a[4]);
  const nG = Math.round(G.length * (st.grains ?? 0.5));
  for (const [x, y, r, a] of G.slice(0, nG)) el("ellipse", { cx: f1(x), cy: f1(y), rx: f1(r), ry: f1(r * 0.55), fill: C.grain, transform: `rotate(${f1(a)} ${f1(x)} ${f1(y)})` }, t);
  if (st.dent) {
    // 杵の当たった所のくぼみ（青みの白の三日月。灰色にしない）
    el("path", { d: smooth([[18, my - 22], [52, my - 18], [66, my + 2], [50, my + 22], [16, my + 24], [30, my + 2]]), fill: C.mochiS }, t);
  }
  // つや: 白い紙の細い切れ端（黄色い光の塊にしない）
  const gk = st.glossK ?? 0.6;
  if (gk > 0) {
    piece(t, cut([[-62, my - 20], [-28, my - 30 - gk * 3], [-20, my - 26], [-56, my - 14]], 0.6), "#ffffff", { sh: null, op: 0.6 + gk * 0.4 });
    if (gk > 0.7) piece(t, cut([[-14, my - 31], [-4, my - 33], [-3, my - 30], [-13, my - 28]], 0.4), "#ffffff", { sh: null });
  }
  return t;
}
// 横杵: (hx,hy)=頭の下端の中心、len=柄の長さ、ang=柄の向き
function kine(g, hx, hy, s = 1, ang = 30, o = {}) {
  const t = el("g", { transform: `translate(${hx},${hy}) scale(${s})` }, g);
  const a = (ang * Math.PI) / 180, L = o.len ?? 190, cx = 0, cy = -46;
  const ex = cx + Math.cos(a) * L, ey = cy + Math.sin(a) * L;
  const nx = -Math.sin(a) * 8, ny = Math.cos(a) * 8;
  piece(t, cut([[cx + nx, cy + ny], [ex + nx, ey + ny], [ex - nx, ey - ny], [cx - nx, cy - ny]], 0.8), C.keyakiL, { tex: "wood", sh: [6, 8], shOp: 0.3 });
  // 頭（円柱を縦に。下端は餅に隠れ、上端の木口が見える）
  const head = smooth([[-29, -88], [0, -92], [29, -88], [30, -48], [29, -6], [0, -2], [-29, -6], [-30, -48]]);
  piece(t, head, C.keyakiD, { tex: "wood", sh: [5, 5], shOp: 0.35 });
  piece(t, smooth([[-24, -84], [-12, -86], [-11, -48], [-12, -8], [-24, -9], [-25, -48]]), C.keyaki, { sh: null, op: 0.95 });
  piece(t, smooth(ell(0, -89, 29, 10, 12)), C.keyakiL, { sh: null, tex: "wood" });
  marker(t, ell(0, -89, 29, 10, 10, 0.1, Math.PI - 0.1), 1.4, C.keyakiD, 0.4);
  if (o.grip) gunte(t, ex - Math.cos(a) * 18, ey - Math.sin(a) * 18 - 4, 0.95, ang + 70);
  return t;
}
// 縄と8つの結び目。cur=いまの拍（橙の札が立つ）
function nawa(g, cx, cy, rx, ry, cur = 2, o = {}) {
  const t = el("g", {}, g);
  const a0 = 0.14 * Math.PI, a1 = 0.86 * Math.PI;
  const pts = ell(cx, cy, rx, ry, 30, a0, a1, 0.004);
  el("path", { d: smooth(pts, false), stroke: C.sumi, "stroke-width": 9, fill: "none", opacity: 0.3, transform: "translate(2,3)", "stroke-linecap": "round" }, t);
  el("path", { d: smooth(pts, false), stroke: C.keyakiL, "stroke-width": 7, fill: "none", "stroke-linecap": "round" }, t);
  // 撚りの印（間隔と向きをそろえない）
  for (let i = 1; i < pts.length - 1; i += 1) {
    if (rnd() < 0.35) continue;
    const [x, y] = pts[i];
    marker(t, [[x - 2 + j(1), y - 3], [x + 2 + j(1), y + 3]], 1.2, C.keyakiD, 0.3);
  }
  const K = [];
  for (let i = 0; i < 8; i++) {
    const u = (i + 0.5 + j(0.12)) / 8, ang = a1 - (a1 - a0) * u;
    K.push([cx + Math.cos(ang) * rx, cy + Math.sin(ang) * ry]);
  }
  K.forEach(([x, y], i) => {
    piece(t, smooth(ell(x, y, 7 + j(1), 6 + j(1), 7, 0, Math.PI * 2, 0.15)), i < cur ? C.keyaki : C.keyakiD, { sh: [1.5, 2] });
    if (i === cur) {
      const tg = el("g", { transform: `translate(${x},${y - 6}) rotate(${-8 + j(4)})` }, t);
      piece(tg, cut([[-9, -30], [9, -31], [10, -2], [-8, -1]], 0.8), C.dai, { line: C.sumi, lw: 2 });
      marker(tg, [[-1, -1], [0, 5]], 1.6);
    }
  });
  return K;
}
// 吹き出し（ちぎった白い紙）
function fukidashi(g, x, y, w, h, tail, o = {}) {
  const pts = [[x, y], [x + w, y + j(2)], [x + w + j(2), y + h], ...(tail ? [[tail[0] + 14, y + h], tail, [tail[0] + 2, y + h]] : []), [x + j(2), y + h + j(1)]];
  return piece(g, torn(pts, 1.4, 4), o.fill || C.mochi, { edge: o.edge, sh: [3, 4], shOp: 0.32 });
}
// 切り抜き文字（1字ずつ傾け、影を落とす）。stroke で紙の縁を太らせる
function kiriMoji(g, str, x, y, size, o = {}) {
  const t = el("g", {}, g);
  let cx = x;
  for (const ch of str) {
    const r = j(o.tilt ?? 6), dy = j(o.bob ?? 3);
    const attrs = { x: f1(cx), y: f1(y + dy), "font-family": "Stick, 'Zen Kurenaido', sans-serif", "font-size": size, transform: `rotate(${f1(r)} ${f1(cx + size / 2)} ${f1(y)})`, "stroke-linejoin": "round" };
    const sw = size > 40 ? size * 0.09 : size * 0.16;
    el("text", { ...attrs, fill: C.sumi, stroke: C.sumi, "stroke-width": sw, opacity: o.shOp ?? 0.35, transform: attrs.transform + ` translate(${size * 0.06},${size * 0.07})` }, t).textContent = ch;
    el("text", { ...attrs, fill: o.fill || C.mochi, stroke: o.fill || C.mochi, "stroke-width": sw }, t).textContent = ch;
    if (o.ink) el("text", { ...attrs, fill: o.ink }, t).textContent = ch;
    cx += size * (o.adv ?? (/[ゃゅょっー]/.test(ch) ? 0.78 : 0.95));
  }
  return t;
}
