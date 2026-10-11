// ポイ一枚 見本用の描画道具
// 借りる物: 昭和の夏祭りの金魚すくいの屋台を「真上から」見た物だけ。
//   水色のペンキを刷毛で塗ったトタンの浅い水槽（剥げ・錆・ハンダの継ぎ目）、針金の枠に薄紙を張ったポイ、
//   白い樹脂のお椀、ボール紙にマジックの値札、裸電球1個の光。提灯・のれん・和柄・夜空は描かない。
const C = {
  tutan: "#8cc3c9",   // トタンの水浅葱（地。水槽の底のペンキを水越しに見た色）
  hi: "#e0482a",      // 金魚の緋（主役。金魚と得点の数字だけ）
  usugami: "#e9ece3", // ポイの薄紙（障子紙より青みのある白。クリームにしない）
  rantou: "#f2c14e",  // 裸電球の卵黄（電球の映り込み・金色の一匹）
  sabi: "#8a4b2d",    // 錆の赤茶（水槽の縁の錆・値札の枠線）
  sumi: "#233038",    // 夜店の墨藍（輪郭と文字。面としては出目金と主の影だけ）
  // 重ね色（上の色を重ねた結果。新しい色を足さない）
  kage: "#5f9aa2",    // 屋台の庇の影に入った水（水浅葱＋墨）
  fukami: "#4d8790",  // 水槽の隅の深い所
  aen: "#a9b5ad",     // ペンキが剥げて出た亜鉛メッキの地（水越し）
  terasu: "#c4dcc4",  // 電球の光が乗った水（水浅葱＋卵黄）
  board: "#c9a56f",   // ボール紙（卵黄＋錆）
  ita: "#4a3a30",     // 屋台の台の板（錆＋墨）
  ita2: "#5b483a",
};
let seed = 7;
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
function path(pts, amt = 1, close = true) {
  return pts.map((p, i) => `${i ? "L" : "M"}${f1(p[0] + j(amt))},${f1(p[1] + j(amt))}`).join("") + (close ? "Z" : "");
}
// なめらかな閉曲線（Catmull-Rom → ベジェ）
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
function blobPts(cx, cy, rx, ry, n = 12, rough = 0.18, rot = 0) {
  const a = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2 + j(0.15), k = 1 + j(rough);
    const x = Math.cos(t) * rx * k, y = Math.sin(t) * ry * k;
    a.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
  }
  return a;
}
const blob = (...a) => smooth(blobPts(...a));
// マジックの線（太さほぼ一定、端が丸い、少しかすれる）
function marker(g, pts, w, color, op = 1) {
  el("path", { d: smooth(pts.map((p) => [p[0] + j(0.6), p[1] + j(0.6)]), false), fill: "none", stroke: color, "stroke-width": w, "stroke-linecap": "round", "stroke-linejoin": "round", opacity: op }, g);
}

// ---- 共通の defs（紙の目・刷毛のむら・ぼかし） ----
function defs(svg) {
  const d = el("defs", {}, svg);
  d.innerHTML = `
  <filter id="grain" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3"/>
    <feColorMatrix values="0 0 0 0 0.14  0 0 0 0 0.19  0 0 0 0 0.22  0 0 0 0.55 -0.12"/>
    <feComposite in2="SourceGraphic" operator="in"/>
  </filter>
  <filter id="hake" x="-5%" y="-5%" width="110%" height="110%">
    <feTurbulence type="fractalNoise" baseFrequency="0.006 0.09" numOctaves="3" seed="9"/>
    <feColorMatrix values="0 0 0 0 0.14  0 0 0 0 0.19  0 0 0 0 0.22  0 0 0 0.7 -0.28"/>
    <feComposite in2="SourceGraphic" operator="in"/>
  </filter>
  <filter id="hake2" x="-5%" y="-5%" width="110%" height="110%">
    <feTurbulence type="fractalNoise" baseFrequency="0.08 0.007" numOctaves="3" seed="21"/>
    <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 0.95  0 0 0 0.6 -0.25"/>
    <feComposite in2="SourceGraphic" operator="in"/>
  </filter>
  <filter id="fiber" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.05 0.6" numOctaves="2" seed="5"/>
    <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.9 -0.35"/>
    <feComposite in2="SourceGraphic" operator="in"/>
  </filter>
  <filter id="wood" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.004 0.12" numOctaves="3" seed="13"/>
    <feColorMatrix values="0 0 0 0 0.1  0 0 0 0 0.07  0 0 0 0 0.05  0 0 0 0.9 -0.3"/>
    <feComposite in2="SourceGraphic" operator="in"/>
  </filter>
  <filter id="soft"><feGaussianBlur stdDeviation="3"/></filter>
  <filter id="soft1"><feGaussianBlur stdDeviation="1.2"/></filter>
  <filter id="soft2"><feGaussianBlur stdDeviation="2"/></filter>
  <filter id="soft3"><feGaussianBlur stdDeviation="3"/></filter>
  <filter id="soft6"><feGaussianBlur stdDeviation="6"/></filter>
  <filter id="soft14"><feGaussianBlur stdDeviation="14"/></filter>
  <filter id="soft30"><feGaussianBlur stdDeviation="30"/></filter>`;
  return d;
}

// ---- 金魚（真上から見た和金型。1匹ごとに曲がり・長さ・尾・斑・輪郭の揺れを seed で固定） ----
// kind: koaka 小赤 / sarasa 更紗 / demekin 出目金 / kin 金色。depth: 0 浅い 〜 1 深い（影のずれと濃さが変わる）
function fishSpine(x, y, ang, len, bend, N) {
  const sp = []; let a = ang, px = x, py = y;
  for (let i = 0; i <= N; i++) {
    const t = i / N; sp.push([px, py, a]);
    // 緩い S 字: 前半は逆向き、後半で強く曲がる
    a += (bend * (t < 0.35 ? -0.6 : 2.6) * 1) / N;
    px -= Math.cos(a) * (len / N); py -= Math.sin(a) * (len / N);
  }
  return sp;
}
function fish(g, o) {
  const { x, y, ang = 0, len = 40, bend = 0.3, kind = "koaka", s = 1, shadow = true, tailOpen = 1, depth = 0.4 } = o;
  setSeed(s);
  const wide = kind === "demekin" ? 0.3 : kind === "kin" ? 0.2 : 0.22;
  const N = 12, spine = fishSpine(x, y, ang, len, bend, N);
  const W = (t) => len * wide * (t < 0.3 ? 0.6 + 0.4 * Math.sin((t / 0.3) * Math.PI / 2) : 1 - 0.8 * Math.pow((t - 0.3) / 0.7, 1.2));
  const L = [], R = [];
  spine.forEach(([sx, sy, sa], i) => {
    const w = W(i / N) * (1 + j(0.05));
    L.push([sx - Math.sin(sa) * w, sy + Math.cos(sa) * w]);
    R.unshift([sx + Math.sin(sa) * w, sy - Math.cos(sa) * w]);
  });
  const h = spine[0];
  const nose = [h[0] + Math.cos(h[2]) * len * 0.1, h[1] + Math.sin(h[2]) * len * 0.1];
  const body = [nose, ...L, ...R];
  const bodyD = smooth(body);
  const tb = spine[N], ta = tb[2];
  // 尾びれ: 左右で大きさ・開きを変え、先端はちぎれたように不揃い
  const tails = [-1, 1].map((sd, q) => {
    const spread = (0.45 + rnd() * 0.35) * tailOpen, tl = len * (0.5 + rnd() * 0.3) * (q ? 0.85 + rnd() * 0.3 : 1);
    const b0 = [tb[0] + Math.sin(ta) * sd * 1.2, tb[1] - Math.cos(ta) * sd * 1.2];
    const pts = [b0];
    const M = 9;
    for (let k = 0; k <= M; k++) {
      const u = k / M, aa = ta + Math.PI + sd * (0.05 + spread * u);
      const r = tl * (u > 0.85 ? 0.5 + rnd() * 0.25 : 0.72 + 0.28 * Math.sin(u * Math.PI * 0.9)) * (1 + j(0.13));
      pts.push([b0[0] + Math.cos(aa) * r, b0[1] + Math.sin(aa) * r]);
    }
    return pts;
  });
  const col = { koaka: C.hi, sarasa: "#eef0e8", demekin: "#2b343a", kin: C.rantou }[kind];
  const fin = { koaka: C.hi, sarasa: "#f2f2ea", demekin: "#3a454b", kin: "#f5d27c" }[kind];
  const gg = el("g", {}, g);
  if (shadow) {
    // 落ち影: 深いほど小さく近く濃く、浅いほど大きくずれて淡い（全匹同じドロップシャドウにしない）
    const off = 4 + (1 - depth) * 12, op = 0.18 + depth * 0.3, bl = depth > 0.6 ? "soft1" : depth > 0.3 ? "soft2" : "soft3";
    const sh = el("g", { transform: `translate(${f1(off * 0.6)},${f1(off)})`, opacity: f1(op), filter: `url(#${bl})` }, gg);
    el("path", { d: bodyD, fill: C.sumi }, sh);
    tails.forEach((t) => el("path", { d: smooth(t), fill: C.sumi, opacity: 0.55 }, sh));
  }
  // 胸びれ
  [-1, 1].forEach((sd) => {
    const p = spine[3];
    const fa = p[2] + Math.PI - sd * (0.9 + rnd() * 0.5);
    const fx = p[0] - Math.sin(p[2]) * sd * W(0.25) * 0.85, fy = p[1] + Math.cos(p[2]) * sd * W(0.25) * 0.85;
    el("path", { d: smooth(blobPts(fx + Math.cos(fa) * len * 0.09, fy + Math.sin(fa) * len * 0.09, len * 0.12, len * 0.05, 7, 0.2, fa)), fill: fin, opacity: 0.6, stroke: C.sumi, "stroke-width": 0.8, "stroke-opacity": 0.5 }, gg);
  });
  tails.forEach((t) => {
    // 付け根は濃く、先へ行くほど透明（2枚重ね）
    el("path", { d: smooth(t), fill: fin, opacity: kind === "demekin" ? 0.6 : 0.38 }, gg);
    const inner = t.map((p, i) => (i === 0 ? p : [t[0][0] + (p[0] - t[0][0]) * 0.55, t[0][1] + (p[1] - t[0][1]) * 0.55]));
    el("path", { d: smooth(inner), fill: fin, opacity: kind === "demekin" ? 0.5 : 0.42 }, gg);
    el("path", { d: smooth(t), fill: "none", stroke: C.sumi, "stroke-width": 0.9, opacity: 0.55, "stroke-dasharray": `${f1(len * 0.5)} ${f1(3 + rnd() * 4)} ${f1(len * 0.3)} 5` }, gg);
    // 筋は2〜3本、長さ不揃い
    const n = 2 + Math.floor(rnd() * 2);
    for (let k = 1; k <= n; k++) {
      const q = t[1 + Math.floor((k / (n + 1)) * 9)], u = 0.45 + rnd() * 0.45;
      el("path", { d: `M${f1(t[0][0])},${f1(t[0][1])}L${f1(t[0][0] + (q[0] - t[0][0]) * u)},${f1(t[0][1] + (q[1] - t[0][1]) * u)}`, stroke: kind === "demekin" ? "#6a7880" : C.sumi, "stroke-width": 0.8, opacity: 0.45, fill: "none" }, gg);
    }
  });
  // 版ずれ: 緋の版を少し大きく、2px ずらして先に刷る（輪郭の外に緋がはみ出す）
  if (kind !== "demekin") {
    const cx = spine[4][0], cy = spine[4][1];
    el("path", { d: bodyD, fill: C.hi, opacity: kind === "kin" ? 0.55 : 1, transform: `translate(${f1(2 + j(0.4))},${f1(-1.6 + j(0.4))}) translate(${f1(cx)},${f1(cy)}) scale(1.05) translate(${f1(-cx)},${f1(-cy)})` }, gg);
  }
  el("path", { d: bodyD, fill: col }, gg);
  const id = "f" + s + "_" + Math.floor(rnd() * 1e6);
  const cp = el("clipPath", { id }, gg); el("path", { d: bodyD }, cp);
  const inb = el("g", { "clip-path": `url(#${id})` }, gg);
  if (kind === "sarasa") {
    const n = 2 + Math.floor(rnd() * 3);
    for (let k = 0; k < n; k++) {
      const p = spine[1 + Math.floor(rnd() * 10)];
      el("path", { d: blob(p[0] + j(len * 0.1), p[1] + j(len * 0.1), len * (0.1 + rnd() * 0.14), len * (0.07 + rnd() * 0.1), 9, 0.35, rnd() * 3), fill: C.hi }, inb);
    }
  }
  if (kind === "kin") el("path", { d: smooth(spine.slice(1, 10).map((p) => [p[0], p[1]]), false), stroke: C.hi, "stroke-width": len * 0.08, fill: "none", opacity: 0.5 }, inb);
  if (kind === "koaka" && o.nosePatch) el("path", { d: blob(h[0] + Math.cos(h[2]) * len * 0.04, h[1] + Math.sin(h[2]) * len * 0.04, len * 0.08, len * 0.06, 7, 0.25), fill: "#f1efe6" }, inb);
  // 塗りのむら: 背骨の濃い線（墨を薄く重ねる）と、刷毛の塗り残し1か所
  if (kind !== "demekin") {
    el("path", { d: smooth(spine.slice(2, 10).map((p) => [p[0] + j(0.5), p[1] + j(0.5)]), false), stroke: C.sumi, "stroke-width": len * 0.06, fill: "none", opacity: kind === "sarasa" ? 0.12 : 0.22, "stroke-linecap": "round" }, inb);
    const p = spine[5 + Math.floor(rnd() * 3)], sd = rnd() < 0.5 ? -1 : 1;
    const bx = p[0] - Math.sin(p[2]) * sd * W(0.45) * 0.55, by = p[1] + Math.cos(p[2]) * sd * W(0.45) * 0.55;
    el("path", { d: blob(bx, by, len * 0.11, len * 0.025, 7, 0.3, p[2] + j(0.2)), fill: "#f6f1e6", opacity: kind === "sarasa" ? 0 : 0.55 }, inb);
  } else {
    el("path", { d: smooth(spine.slice(2, 8).map((p) => [p[0] - Math.sin(p[2]) * 1.5, p[1] + Math.cos(p[2]) * 1.5]), false), stroke: "#66757e", "stroke-width": len * 0.05, fill: "none", opacity: 0.55, "stroke-linecap": "round" }, inb);
  }
  // 輪郭: 頭側は太く（筆圧）、尾の付け根で細く。切れ目を2か所以上
  const head = [...R.slice(-5), nose, ...L.slice(0, 5)];
  const tailSide = [...L.slice(4), ...R.slice(0, R.length - 4)];
  el("path", { d: path(head, 0.4, false), fill: "none", stroke: C.sumi, "stroke-width": kind === "demekin" ? 1.4 : 2, opacity: 0.9, "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-dasharray": `${f1(len * 0.38)} ${f1(2.5 + rnd() * 2)} 400` }, gg);
  el("path", { d: path(tailSide, 0.4, false), fill: "none", stroke: C.sumi, "stroke-width": kind === "demekin" ? 1 : 1.4, opacity: 0.85, "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-dasharray": `${f1(len * 0.55)} ${f1(3 + rnd() * 3)} ${f1(len * 0.4)} ${f1(2.5 + rnd() * 2)} 400` }, gg);
  // 目: 頭の付け根寄り・輪郭の内側に小さく（出目金だけ外に出る）
  [-1, 1].forEach((sd) => {
    const p = spine[kind === "demekin" ? 1 : 2];
    const off = kind === "demekin" ? W(0.1) * 1.08 : W(0.15) * 0.55;
    const ex = p[0] - Math.sin(p[2]) * sd * off, ey = p[1] + Math.cos(p[2]) * sd * off;
    if (kind === "demekin") { el("path", { d: blob(ex, ey, len * 0.11, len * 0.095, 9, 0.08, p[2]), fill: "#38434a", stroke: C.sumi, "stroke-width": 1 }, gg); el("path", { d: blob(ex - 1.5, ey - 1.5, len * 0.04, len * 0.025, 6, 0.2, 0.6), fill: "#8796a0", opacity: 0.7 }, gg); }
    el("circle", { cx: f1(ex), cy: f1(ey), r: f1(kind === "demekin" ? len * 0.04 : Math.max(1.1, len * 0.026)), fill: kind === "demekin" ? "#11181c" : C.sumi }, gg);
  });
  return { spine, len };
}

// ---- 水槽の主（大きな黒い鯉）: 真上から見た影。胸びれ・腹びれの4枚が左右に出る ----
function nushi(g, x, y, ang, len, s = 4, op = 0.42, bend = 0.25) {
  setSeed(s);
  const gg = el("g", { opacity: op, filter: "url(#soft2)" }, g);
  const N = 16, sp = [];
  let a = ang, px = x, py = y;
  for (let i = 0; i <= N; i++) {
    const t = i / N; sp.push([px, py, a]);
    a += bend * Math.sin(t * Math.PI * 2) * 0.35; // S 字
    px -= Math.cos(a) * len / N; py -= Math.sin(a) * len / N;
  }
  // 体幅: 頭は丸く平たく幅広、最大は 30%、尾の付け根で細くくびれる
  const Wd = (t) => len * (t < 0.3 ? 0.07 + 0.03 * Math.sin((t / 0.3) * Math.PI / 2) : t < 0.86 ? 0.1 - 0.068 * Math.pow((t - 0.3) / 0.56, 1.05) : 0.032);
  const L = [], R = [];
  sp.forEach(([sx, sy, sa], i) => { const w = Wd(i / N); L.push([sx - Math.sin(sa) * w, sy + Math.cos(sa) * w]); R.unshift([sx + Math.sin(sa) * w, sy - Math.cos(sa) * w]); });
  const h = sp[0];
  const head = [[h[0] + Math.cos(h[2] + 0.5) * len * 0.06, h[1] + Math.sin(h[2] + 0.5) * len * 0.06], [h[0] + Math.cos(h[2]) * len * 0.075, h[1] + Math.sin(h[2]) * len * 0.075], [h[0] + Math.cos(h[2] - 0.5) * len * 0.06, h[1] + Math.sin(h[2] - 0.5) * len * 0.06]];
  el("path", { d: smooth([head[1], ...L, ...R, head[0]].slice(0)), fill: C.sumi }, gg);
  // 尾びれ: 付け根より幅の広い扇、切れ込みは浅い
  const tb = sp[N], ta = tb[2] + Math.PI;
  const fan = [[tb[0], tb[1]]];
  for (let k = 0; k <= 6; k++) {
    const u = k / 6, aa = ta - 0.62 + 1.24 * u, r = len * (Math.abs(u - 0.5) < 0.1 ? 0.15 : 0.21 - 0.03 * Math.abs(u - 0.5));
    fan.push([tb[0] + Math.cos(aa) * r, tb[1] + Math.sin(aa) * r]);
  }
  el("path", { d: smooth(fan), fill: C.sumi }, gg);
  // 胸びれ（大きい・体長の 13%）と腹びれ（小さい）
  [[0.24, 0.15, 0.045, 1.0], [0.52, 0.08, 0.028, 0.85]].forEach(([t, fl, fw, spread]) => {
    const p = sp[Math.round(t * N)];
    [-1, 1].forEach((sd) => {
      const w = Wd(t) * 0.8, fa = p[2] + Math.PI - sd * spread;
      const bx = p[0] - Math.sin(p[2]) * sd * w, by = p[1] + Math.cos(p[2]) * sd * w;
      el("path", { d: smooth(blobPts(bx + Math.cos(fa) * len * fl * 0.5, by + Math.sin(fa) * len * fl * 0.5, len * fl * 0.52, len * fw, 8, 0.12, fa)), fill: C.sumi }, gg);
    });
  });
}

// ---- 裸電球の映り込み: さざ波で割れた細長い光の筋（グローなし。長さ:幅 6:1 以上、端はギザ） ----
function reflect(g, x, y, s = 90, scale = 1) {
  setSeed(s);
  const gg = el("g", {}, g);
  const pcs = [[0, 0, 44, 2.2], [14, 7, 28, 1.7], [-16, -6, 22, 1.4], [6, 13, 17, 1.2], [-9, 19, 11, 0.9]];
  pcs.forEach(([dx, dy, l, w]) => {
    l *= scale; w *= scale;
    const cx = x + dx * scale + j(2), cy = y + dy * scale, rot = -0.12 + j(0.08);
    const mk = (L, Wd) => {
      const top = [], bot = [];
      const n = 11;
      for (let i = 0; i <= n; i++) {
        const u = i / n, xx = -L / 2 + L * u, ww = Wd * Math.sin(Math.PI * (0.08 + 0.84 * u)) * (0.75 + rnd() * 0.5);
        top.push([xx, -ww]); bot.unshift([xx + j(0.8), ww]);
      }
      // 端をギザに
      const pts = [[-L / 2 - 2 - rnd() * 3, j(1)], ...top, [L / 2 + 2 + rnd() * 4, j(1)], ...bot];
      return pts.map(([px, py]) => [cx + px * Math.cos(rot) - py * Math.sin(rot), cy + px * Math.sin(rot) + py * Math.cos(rot)]);
    };
    el("path", { d: path(mk(l * 1.05, w * 1.8), 0.2), fill: C.usugami, opacity: 0.9 }, gg);
    el("path", { d: path(mk(l * 0.8, w * 0.8), 0.2), fill: C.rantou }, gg);
  });
  return gg;
}

// ---- トタンの継ぎ目: 板金の重なりの段（明るい線＋影の帯）。ハンダは2〜3か所だけ ----
function seamBand(g, x0, x1, y, s = 77) {
  setSeed(s);
  const pts = []; for (let x = x0; x <= x1; x += 40) pts.push([x, y + j(1.5)]);
  el("path", { d: smooth(pts.map(([x, yy]) => [x, yy + 3]), false), stroke: "#3f6f78", "stroke-width": 5, fill: "none", opacity: 0.35 }, g);
  el("path", { d: smooth(pts, false), stroke: "#cfe4df", "stroke-width": 1.2, fill: "none", opacity: 0.75 }, g);
  [x0 + (x1 - x0) * (0.18 + rnd() * 0.1), x0 + (x1 - x0) * (0.62 + rnd() * 0.12)].forEach((sx) => {
    el("path", { d: blob(sx, y + 1, 9 + rnd() * 6, 3.2, 8, 0.3), fill: C.aen, opacity: 0.85 }, g);
    el("path", { d: blob(sx - 2, y, 4, 1.2, 6, 0.3), fill: "#e4ebe6", opacity: 0.7 }, g);
  });
}

// ---- ポイ（針金の枠＋薄紙）。wet: 0 新しい 〜 1、torn: 破れ ----
function poiFrame(x, y, r, s) {
  setSeed(s);
  // 楕円寄りの滑らかな枠＋1か所だけ平たく潰れた所
  const n = 40, flatAt = rnd() * Math.PI * 2, rx = r * (1.02 + rnd() * 0.03), ry = r * (0.96 - rnd() * 0.02), rot = rnd() * 3;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    let d = Math.abs(((t - flatAt + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    const k = d < 0.45 ? 1 - 0.07 * Math.cos((d / 0.45) * Math.PI / 2) : 1;
    const ex = Math.cos(t) * rx * k, ey = Math.sin(t) * ry * k;
    pts.push([x + ex * Math.cos(rot) - ey * Math.sin(rot), y + ex * Math.sin(rot) + ey * Math.cos(rot)]);
  }
  return smooth(pts);
}
function poi(g, o) {
  const { x, y, r = 46, ang = 0.7, wet = 0, torn = false, s = 30, handle = 1 } = o;
  const frame = poiFrame(x, y, r, s);
  setSeed(s + 1000);
  const gg = el("g", {}, g);
  const hx = x + Math.cos(ang) * r, hy = y + Math.sin(ang) * r;
  const ex = x + Math.cos(ang) * (r + 62 * handle), ey = y + Math.sin(ang) * (r + 62 * handle);
  el("path", { d: `M${f1(hx)},${f1(hy)}L${f1(ex)},${f1(ey)}`, stroke: C.sumi, "stroke-width": 5.5, "stroke-linecap": "round", opacity: 0.85 }, gg);
  el("path", { d: `M${f1(hx)},${f1(hy)}L${f1(ex)},${f1(ey)}`, stroke: "#9aa39e", "stroke-width": 3, "stroke-linecap": "round", "stroke-dasharray": "3 2.2" }, gg);
  const id = "p" + s;
  const cp = el("clipPath", { id }, gg); el("path", { d: frame }, cp);
  const pg = el("g", { "clip-path": `url(#${id})` }, gg);
  const holePts = torn ? blobPts(x + j(4), y + j(4), r * 0.5, r * 0.42, 11, 0.38, rnd() * 3) : null;
  const sq = `M${x - r * 1.2},${y - r * 1.2}h${r * 2.4}v${r * 2.4}h${-r * 2.4}Z`;
  const paperD = sq + (holePts ? path(holePts, 1.5) : "");
  el("path", { d: paperD, fill: C.usugami, "fill-rule": "evenodd", opacity: 0.94 - wet * 0.38 }, pg);
  // ふやけ: 面のむらが主。濡れた所が大きく濃く透ける
  if (wet > 0.1) {
    const n = 1 + Math.round(wet * 3);
    for (let k = 0; k < n; k++) {
      const a0 = rnd() * 6.28, rr = r * rnd() * 0.45;
      el("path", { d: blob(x + Math.cos(a0) * rr, y + Math.sin(a0) * rr, r * (0.35 + wet * 0.35 + rnd() * 0.15), r * (0.28 + wet * 0.3 + rnd() * 0.12), 10, 0.22, rnd() * 3), fill: C.kage, opacity: 0.2 + wet * 0.32, filter: "url(#soft1)" }, pg);
    }
  }
  el("path", { d: paperD, fill: "#fff", "fill-rule": "evenodd", filter: "url(#fiber)", opacity: 0.4 - wet * 0.2 }, pg);
  // シワ: 分岐しない短い波線。繊維の向き（ほぼ一方向）にそろえて不規則に置く
  const fibre = rnd() * Math.PI, nw = Math.round(2 + wet * 12);
  for (let k = 0; k < nw; k++) {
    const a0 = rnd() * Math.PI * 2, rr = Math.sqrt(rnd()) * r * 0.85;
    const cx = x + Math.cos(a0) * rr, cy = y + Math.sin(a0) * rr, l = 6 + rnd() * 9, da = fibre + j(0.3);
    const p0 = [cx - Math.cos(da) * l / 2, cy - Math.sin(da) * l / 2], p2 = [cx + Math.cos(da) * l / 2, cy + Math.sin(da) * l / 2];
    const nx = -Math.sin(da) * (1.2 + rnd()), ny = Math.cos(da) * (1.2 + rnd());
    el("path", { d: `M${f1(p0[0])},${f1(p0[1])}Q${f1((p0[0] * 3 + p2[0]) / 4 + nx)},${f1((p0[1] * 3 + p2[1]) / 4 + ny)} ${f1(cx)},${f1(cy)}T${f1(p2[0])},${f1(p2[1])}`, fill: "none", stroke: C.sumi, "stroke-width": 0.8, opacity: 0.22 + wet * 0.25, "stroke-linecap": "round" }, pg);
  }
  if (wet > 0.55 && !torn) {
    const a0 = rnd() * 6.28, rr = r * (0.35 + rnd() * 0.4);
    const cx = x + Math.cos(a0) * rr, cy = y + Math.sin(a0) * rr;
    el("path", { d: path([[cx - 5, cy - 1], [cx - 1, cy + 1.5], [cx + 3, cy - 0.5], [cx + 6, cy + 1.2]], 0.4, false), stroke: C.sumi, "stroke-width": 1.6, fill: "none", opacity: 0.8, "stroke-linecap": "round" }, pg);
  }
  if (torn) {
    holePts.forEach((p, i) => {
      const q = holePts[(i + 1) % holePts.length];
      for (let k = 0; k < 3; k++) {
        const t = rnd(), bx = p[0] + (q[0] - p[0]) * t, by = p[1] + (q[1] - p[1]) * t, ia = Math.atan2(y - by, x - bx);
        el("path", { d: `M${f1(bx)},${f1(by)}l${f1(Math.cos(ia + j(0.6)) * (2 + rnd() * 4))},${f1(Math.sin(ia + j(0.6)) * (2 + rnd() * 4))}`, stroke: C.usugami, "stroke-width": 1, opacity: 0.85 }, pg);
      }
    });
    el("path", { d: path(holePts, 1.2), fill: "none", stroke: C.sumi, "stroke-width": 1.6, opacity: 0.75, "stroke-linejoin": "round" }, pg);
  }
  el("path", { d: frame, fill: "none", stroke: C.sumi, "stroke-width": 3.4, opacity: 0.85 }, gg);
  el("path", { d: frame, fill: "none", stroke: "#b7bfba", "stroke-width": 1.6 }, gg);
  el("path", { d: `M${f1(hx - 3)},${f1(hy - 3)}l6,6M${f1(hx - 5)},${f1(hy)}l6,5`, stroke: C.sumi, "stroke-width": 1.2, opacity: 0.8 }, gg);
  return gg;
}

// ---- お椀（白い樹脂。真上から見る） ----
function bowl(g, x, y, r, fishes = [], s = 50) {
  setSeed(s);
  const gg = el("g", {}, g);
  el("ellipse", { cx: x + 6, cy: y + 9, rx: r + 2, ry: r - 1, fill: C.sumi, opacity: 0.28, filter: "url(#soft6)" }, gg);
  const rim = blobPts(x, y, r, r * 0.97, 18, 0.012);
  el("path", { d: smooth(rim), fill: "#eef0ea", stroke: C.sumi, "stroke-width": 1.4, "stroke-opacity": 0.7 }, gg);
  // 樹脂の厚みの影（内側の縁）
  el("path", { d: smooth(blobPts(x, y, r * 0.87, r * 0.85, 16, 0.01)), fill: "#cfd8d2", opacity: 0.9 }, gg);
  // 中の水
  const id = "b" + s;
  const cp = el("clipPath", { id }, gg); el("path", { d: smooth(blobPts(x + 1, y + 1, r * 0.82, r * 0.8, 16, 0.01)) }, cp);
  const w = el("g", { "clip-path": `url(#${id})` }, gg);
  el("rect", { x: x - r, y: y - r, width: 2 * r, height: 2 * r, fill: "#a8d1d1" }, w);
  el("path", { d: blob(x - r * 0.3, y - r * 0.35, r * 0.5, r * 0.25, 9, 0.2, -0.5), fill: "#fff", opacity: 0.35, filter: "url(#soft)" }, w);
  fishes.forEach((f) => fish(w, { ...f, shadow: true }));
  // 縁の欠け・使い込みの擦れ
  el("path", { d: `M${f1(x + r * 0.5)},${f1(y - r * 0.82)}q4,-2 8,1`, stroke: C.sumi, "stroke-width": 0.8, fill: "none", opacity: 0.5 }, gg);
  el("path", { d: smooth(blobPts(x, y, r * 0.93, r * 0.91, 16, 0.01)), fill: "none", stroke: "#fff", "stroke-width": 1.2, opacity: 0.6, "stroke-dasharray": "40 18 12 30" }, gg);
  return gg;
}

// ---- 剥げ: 縁の線に沿った細長いめくれ（中は亜鉛の灰）。錆は中心から下流へ滲む筋だけ ----
// (x0,y0)→(x1,y1) の線に沿って、幅 w の細長い形
function peel(g, x0, y0, x1, y1, w, s, rustSide = 1) {
  setSeed(s);
  const L = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / L, uy = (y1 - y0) / L, nx = -uy, ny = ux;
  const n = Math.max(6, Math.round(L / 5)), top = [], bot = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, ww = w * Math.pow(Math.sin(Math.PI * u), 0.6) * (0.6 + rnd() * 0.6);
    const px = x0 + (x1 - x0) * u, py = y0 + (y1 - y0) * u;
    top.push([px + nx * ww * 0.5, py + ny * ww * 0.5]); bot.unshift([px - nx * ww * 0.5 + j(0.6), py - ny * ww * 0.5 + j(0.6)]);
  }
  el("path", { d: path([...top, ...bot], 0.3), fill: C.aen, opacity: 0.95 }, g);
  el("path", { d: path(top, 0.3, false), fill: "none", stroke: "#e2ebe6", "stroke-width": 0.9, opacity: 0.7 }, g);
  // 錆の筋（剥げの中心から片側へ、線に沿って細長く滲む）
  const mu = 0.35 + rnd() * 0.3, mx = x0 + (x1 - x0) * mu + nx * rustSide * w * 0.5, my = y0 + (y1 - y0) * mu + ny * rustSide * w * 0.5;
  const rl = L * (0.3 + rnd() * 0.2), ra = Math.atan2(uy, ux);
  el("path", { d: blob(mx, my, rl * 0.5, w * 0.35, 9, 0.25, ra), fill: C.sabi, opacity: 0.6 }, g);
}

// ---- ボール紙の札（マジック書き） ----
function board(g, x, y, w, h, rot, s) {
  setSeed(s);
  const gg = el("g", { transform: `rotate(${rot} ${x + w / 2} ${y + h / 2})` }, g);
  el("path", { d: path([[x + 3, y + 5], [x + w + 4, y + 7], [x + w + 3, y + h + 6], [x + 2, y + h + 5]], 1.5), fill: C.sumi, opacity: 0.35, filter: "url(#soft)" }, gg);
  // はさみで切った縁（角が少しずつ違う）
  const pts = [[x, y + j(1)], [x + w * 0.4, y + j(1.5)], [x + w, y + j(1)], [x + w + j(1.5), y + h * 0.5], [x + w + j(1), y + h], [x + w * 0.55, y + h + j(1.5)], [x + j(1), y + h], [x + j(1.5), y + h * 0.45]];
  el("path", { d: path(pts, 0.6), fill: C.board }, gg);
  el("path", { d: path(pts, 0), fill: "#000", filter: "url(#grain)", opacity: 0.5 }, gg);
  // 段ボールの波（表から薄く透ける。間隔はわずかに不揃い）
  for (let xx = x + 4; xx < x + w - 2; xx += 7.5 + j(1.2)) el("path", { d: `M${f1(xx)},${f1(y + 2)}L${f1(xx + j(1))},${f1(y + h - 2)}`, stroke: "#a98856", "stroke-width": 1.4, opacity: 0.18 }, gg);
  return gg;
}
// セロハンテープ
function tape(g, x, y, w, rot) {
  el("rect", { x, y, width: w, height: 13, fill: "#e8e2c4", opacity: 0.55, transform: `rotate(${rot} ${x + w / 2} ${y + 6})` }, g);
}
