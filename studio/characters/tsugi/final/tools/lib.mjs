// ツギ 決定版 描画エンジン。単位: 全高(足裏〜髷の頂点)=100。y下向き、x右、z手前。
export const C = { ai: '#26426b', hana: '#5a7fb0', akane: '#b8372b', kinari: '#f0e6cf', karashi: '#d39a22', sumi: '#2b2420' };
const PI = Math.PI, rad = d => d * PI / 180;
const f = n => +n.toFixed(2);
function hash(s) { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function R(key) { let s = hash(key) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sstep = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
let uid = 0;
export function resetUid(n = 0) { uid = n; }

function rpoly(pts, r = 1.5, key = 'p', j = 0.25) {
  const rn = R(key); pts = pts.map(p => [p[0] + (rn() - .5) * 2 * j, p[1] + (rn() - .5) * 2 * j]);
  const n = pts.length; let d = '';
  const cut = (a, b, rr) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, t = Math.min(rr, L / 2) / L; return [a[0] + dx * t, a[1] + dy * t]; };
  for (let i = 0; i < n; i++) {
    const p = pts[(i + n - 1) % n], c = pts[i], q = pts[(i + 1) % n];
    const a = cut(c, p, r), b = cut(c, q, r);
    d += (i == 0 ? 'M' : 'L') + f(a[0]) + ',' + f(a[1]) + 'Q' + f(c[0]) + ',' + f(c[1]) + ' ' + f(b[0]) + ',' + f(b[1]);
  }
  return d + 'Z';
}
function smooth(pts, key = 's', j = 0.2) {
  const rn = R(key); pts = pts.map(p => [p[0] + (rn() - .5) * 2 * j, p[1] + (rn() - .5) * 2 * j]);
  const n = pts.length; let d = 'M' + f(pts[0][0]) + ',' + f(pts[0][1]);
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i + n - 1) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += 'C' + f(c1[0]) + ',' + f(c1[1]) + ' ' + f(c2[0]) + ',' + f(c2[1]) + ' ' + f(p2[0]) + ',' + f(p2[1]);
  }
  return d + 'Z';
}
function shape(d, fill, o = {}) {
  const { sw = 1.5, off = [.55, .45], inner = '', stroke = C.sumi, noStroke = false } = o;
  const id = 'c' + (uid++);
  return `<clipPath id="${id}"><path d="${d}"/></clipPath><g transform="translate(${off})"><path d="${d}" fill="${fill}"/><g clip-path="url(#${id})">${inner}</g></g>` +
    (noStroke ? '' : `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"/>`);
}
const line = (pts, stroke, w, extra = '') => `<path d="M${pts.map(p => f(p[0]) + ',' + f(p[1])).join('L')}" fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;

// ---- 視点 ----
export function mkView(deg) {
  const th = rad(deg), c = Math.cos(th), s = Math.sin(th);
  return { th, c, s, deg, P: (x, y, z) => [x * c + z * s, y, -x * s + z * c], D: (x, y, z) => [x * c + z * s, y, -x * s + z * c] };
}

// ---- 寸法（structure.md と同じ） ----
export const DIM = {
  top: 0, headTop: 9, headCy: 28, headBot: 47, rx: 20, rz: 17, ry: 19,
  shoulder: 49, bodyTop: 46, obiTop: 62, obiBot: 71, hem: 88, ankle: 95, ground: 100,
  bunCy: 7, bunR: 7, bunZ: -2.5,
  sleeveW: 15.5, sleeveL: 34, sleeveX: 15.5,
};
const bodyRx = y => 13.5 + (y - 46) / 42 * 3.4;
const bodyRz = y => 9.5 + (y - 46) / 42 * 2.4;

// ---- 頭 ----
const hairH = a => { const aa = Math.abs(a); return 21 + 17 * sstep((aa - 60) / 60); };
function headSP(V, a, y) {
  const { headCy: cy, ry, rx, rz } = DIM; const fy = Math.sqrt(Math.max(0, 1 - ((y - cy) / ry) ** 2));
  const X = rx * fy * Math.sin(rad(a)), Z = rz * fy * Math.cos(rad(a));
  return V.P(X, y, Z);
}
const POL = { smile: 0 };
const TEX = `<path d="M-2.6,-2L2.6,-3.6M-2.9,0.2L2.9,-1.4M-2.7,2.4L2.7,0.8M-1.6,4L1.8,2.8" stroke="#f0e6cf" stroke-width=".35" opacity=".3"/>`;
function eyeShape(kind) {
  const egg = 'M0,-4.8C2.9,-4.8 3.1,-1 3,1.7C2.9,3.8 1.7,4.8 0,4.8C-1.7,4.8 -2.9,3.8 -3,1.7C-3.1,-1 -2.9,-4.8 0,-4.8Z';
  switch (kind) {
    case 'smile': return `<path d="M-3.4,1.6Q0,-4.2 3.4,1.6" fill="none" stroke="${C.sumi}" stroke-width="1.7" stroke-linecap="round"/>`;
    case 'surprise': return `<g transform="scale(1.18)"><path d="${egg}" fill="${C.sumi}"/><path d="M1.1,-3.4L1.1,-1" stroke="${C.kinari}" stroke-width="1.2" stroke-linecap="round"/><path d="M-1.2,2.2L-1.2,3" stroke="${C.kinari}" stroke-width=".8" stroke-linecap="round" opacity=".7"/></g>`;
    case 'worry': return `<g transform="scale(1,1.02)"><path d="${egg}" fill="${C.sumi}"/><path d="M1.2,-3.3L1.2,-0.6" stroke="${C.kinari}" stroke-width="1.3" stroke-linecap="round"/><path d="M-1.3,1.6L-1.3,2.8" stroke="${C.kinari}" stroke-width="1" stroke-linecap="round" opacity=".8"/></g>`;
    case 'angry': return `<path d="M-3,-0.6L3.1,-3.4C3.1,-1 3.1,0.4 3,1.7C2.9,3.8 1.7,4.8 0,4.8C-1.7,4.8 -2.9,3.8 -3,1.7Z" fill="${C.sumi}"/><path d="M1.2,-1.6L1.2,0.2" stroke="${C.kinari}" stroke-width="1.1" stroke-linecap="round"/>`;
    case 'sleep': return `<path d="M-3.2,0.2L3.2,0.2C3.2,2.6 1.8,3.4 0,3.4C-1.8,3.4 -3.2,2.6 -3.2,0.2Z" fill="${C.sumi}"/><path d="M-3.8,0.2L3.8,0.2" stroke="${C.sumi}" stroke-width="1.5" stroke-linecap="round"/>`;
    default: return `<path d="${egg}" fill="${C.sumi}"/>${TEX}<path d="M1.15,-3.4L1.15,-1" stroke="${C.kinari}" stroke-width="1.2" stroke-linecap="round"/><path d="M-1.2,2.1L-1.2,3" stroke="${C.kinari}" stroke-width=".8" stroke-linecap="round" opacity=".6"/>`;
  }
}
const EXPR = {
  normal: { eye: 'normal', browY: -8, browRot: 0, browOff: 0, mouth: 'normal' },
  smile: { eye: 'smile', browY: -9.5, browRot: -4, browOff: 0, mouth: 'smile' },
  surprise: { eye: 'surprise', browY: -11, browRot: -5, browOff: 0, mouth: 'surprise' },
  worry: { eye: 'worry', browY: -8.5, browRot: 16, browOff: 0.3, mouth: 'worry' },
  angry: { eye: 'angry', browY: -6.5, browRot: -20, browOff: 0, mouth: 'angry' },
  sleep: { eye: 'sleep', browY: -6, browRot: 6, browOff: 0, mouth: 'sleep' },
};
function mouthShape(kind) {
  switch (kind) {
    case 'smile': return `<path d="M-3.2,-0.6Q0,5 3.2,-0.6Z" fill="${C.akane}" stroke="${C.sumi}" stroke-width="1.3" stroke-linejoin="round"/>`;
    case 'surprise': return `<ellipse rx="1.7" ry="2.3" fill="${C.sumi}"/><ellipse cy="0.7" rx="0.9" ry="0.9" fill="${C.akane}"/>`;
    case 'worry': return `<path d="M-3,0.4q1.5,-1.9 3,0t3,0" fill="none" stroke="${C.sumi}" stroke-width="1.3" stroke-linecap="round"/>`;
    case 'angry': return `<path d="M-2.6,1.2Q0,-1.4 2.6,1.2" fill="none" stroke="${C.sumi}" stroke-width="1.4" stroke-linecap="round"/>`;
    case 'sleep': return `<ellipse rx="1.1" ry="1.3" fill="none" stroke="${C.sumi}" stroke-width="1.2"/>`;
    default: return `<path d="M-2.4,-0.2Q0,1.9 2.4,-0.2" fill="none" stroke="${C.sumi}" stroke-width="1.4" stroke-linecap="round"/>`;
  }
}
function cross(x, y, sx, sy, col, w = 3.2, t = .75, op = .9) {
  return `<g transform="translate(${f(x)},${f(y)}) scale(${f(sx)},${f(sy)})" opacity="${op}"><rect x="${-w / 2}" y="${-t / 2}" width="${w}" height="${t}" fill="${col}"/><rect x="${-t / 2}" y="${-w / 2}" width="${t}" height="${w}" fill="${col}"/></g>`;
}
export function head(V, exprName = 'normal', o = {}) {
  const { headCy: cy, ry, rx, rz } = DIM, E = EXPR[exprName];
  const rxp = Math.hypot(rx * V.c, rz * V.s);
  const N = 40, op = [];
  for (let k = 0; k < N; k++) { const t = k / N * 2 * PI, cs = Math.cos(t), sn = Math.sin(t); const e = 2 / 2.35; op.push([rxp * Math.sign(cs) * Math.abs(cs) ** e, cy + ry * Math.sign(sn) * Math.abs(sn) ** e * (sn > 0 ? 0.97 : 1)]); }
  const dHead = smooth(op, 'head', .18);
  // 髪(頭巾)の生え際
  let hl = []; for (let a = -180; a <= 180; a += 9) { const p = headSP(V, a, hairH(a)); if (p[2] >= -0.01) hl.push([p[0], p[1], a]); }
  hl.sort((u, v) => u[0] - v[0]);
  const zig = hl.map((p, i) => [p[0], p[1] + (i % 2 ? 1.5 : -1.2)]);
  const xl = zig[0][0] - 30, xr = zig[zig.length - 1][0] + 30;
  const capPts = [[xl, -30], [xr, -30], [xr, zig[zig.length - 1][1]], ...zig.slice().reverse(), [xl, zig[0][1]]];
  const capD = 'M' + capPts.map(p => f(p[0]) + ',' + f(p[1])).join('L') + 'Z';
  // 頭巾の絣
  let capIn = '';
  const rr = R('cap');
  for (let row = 0; row < 5; row++) for (let a = -180; a < 180; a += 20) {
    const aa = a + (row % 2 ? 10 : 0) + (rr() - .5) * 4, y = 12 + row * 6.2 + (rr() - .5) * 1.2;
    if (y > hairH(aa) - 3.6) continue;
    const p = headSP(V, aa, y); if (p[2] < 0.5) continue;
    const k = clamp(p[2] / 12, 0.25, 1);
    capIn += cross(p[0], p[1], k, 1, C.kinari, 3, .75, .85);
  }
  // 頭巾の縁の運針
  const stitchPts = []; for (let a = -180; a <= 180; a += 6) { const p = headSP(V, a, hairH(a) - 3.4); if (p[2] >= 0) stitchPts.push([p[0], p[1]]); }
  stitchPts.sort((u, v) => u[0] - v[0]);
  // 顔布の縫い代（あご側）
  const jaw = []; for (let a = -180; a <= 180; a += 6) { const p = headSP(V, a, 43.6); if (p[2] >= 0) jaw.push([p[0], p[1]]); }
  jaw.sort((u, v) => u[0] - v[0]);

  let out = '';
  const id = 'c' + (uid++);
  out += `<clipPath id="${id}"><path d="${dHead}"/></clipPath>`;
  out += `<g transform="translate(.55,.45)"><path d="${dHead}" fill="${C.kinari}"/><g clip-path="url(#${id})">`;
  out += `<path d="${capD}" fill="${C.ai}"/>${capIn}`;
  out += line(stitchPts, C.kinari, .8, 'stroke-dasharray="2.1 1.7" opacity=".9"');
  out += line(jaw, C.sumi, .5, 'stroke-dasharray="1.6 1.5" opacity=".25"');
  out += `</g></g>`;
  // 生え際の輪郭
  out += `<g clip-path="url(#${id})">${line(zig, C.sumi, 1.3)}</g>`;
  // 頭巾の結び目（後ろ）
  const tieA = [168, 192];
  tieA.forEach((a, i) => {
    const sw = (o.sway || 0) * (i ? 1 : .7);
    const p0 = headSP(V, a, 36.5), p1 = headSP(V, a + (i ? 7 : -7), 47.5);
    if (p0[2] > -2) {
      const q = [[p0[0] - 1.8, p0[1]], [p0[0] + 1.8, p0[1]], [p1[0] + 2.6 + sw, p1[1] + 3], [p1[0] - 1 + sw, p1[1] + 4.2]];
      out += `<g>${shape(rpoly(q, .6, 'tie' + i, .15), C.ai, { sw: 1.1 })}</g>`;
    }
  });
  out += `<path d="${dHead}" fill="none" stroke="${C.sumi}" stroke-width="1.6" stroke-linejoin="round"/>`;
  // 顔
  const eyeA = 27, eyeY = 33.5;
  for (const sg of [-1, 1]) {
    const p = headSP(V, sg * eyeA, eyeY); const fy = Math.sqrt(1 - ((eyeY - cy) / ry) ** 2);
    const kk = p[2] / (rz * fy * Math.cos(rad(eyeA)));
    if (p[2] > 1.2) {
      const k = clamp(kk, .22, 1);
      const rot = sg * (E.eye == 'angry' ? 0 : -2.5);
      // 目: 内側が +x になるよう、左目(sg=-1)はそのまま、右目は鏡像
      out += `<g transform="translate(${f(p[0])},${f(p[1])}) scale(${f(k)},1)"><g transform="rotate(${rot}) scale(${-sg},1)">${eyeShape(E.eye)}</g></g>`;
      // まゆ（縫い目2針）
      const by = p[1] + E.browY, bx = p[0];
      const rotb = -sg * E.browRot * -1;
      out += `<g transform="translate(${f(bx + sg * E.browOff)},${f(by)}) scale(${f(k)},1)"><g transform="rotate(${f(sg * E.browRot)})"><path d="M-3.4,0.3L-0.8,-0.2M0.2,-0.3L3.3,0.3" fill="none" stroke="${C.sumi}" stroke-width="1.15" stroke-linecap="round" transform="scale(${-sg},1)"/></g></g>`;
    }
  }
  const mp = headSP(V, 0, 41.5); { const fy = Math.sqrt(1 - ((41.5 - cy) / ry) ** 2); const k = mp[2] / (rz * fy);
    if (mp[2] > 1.2) out += `<g transform="translate(${f(mp[0])},${f(mp[1])}) scale(${f(clamp(k, .25, 1))},1)">${mouthShape(E.mouth)}</g>`; }
  // 頬の縫い目はひとつだけ
  const cp = headSP(V, 42, 38.8); { const fy = Math.sqrt(1 - ((38.8 - cy) / ry) ** 2); const k = cp[2] / (rz * fy * Math.cos(rad(42)));
    if (cp[2] > 1) out += `<g transform="translate(${f(cp[0])},${f(cp[1])}) scale(${f(clamp(k, .2, 1))},1)"><path d="M-2.4,1.3L-1.4,-1.2M-0.4,1.6L0.6,-1.1M1.6,1.4L2.5,-1" stroke="${C.akane}" stroke-width="1.15" stroke-linecap="round" fill="none"/></g>`; }
  return out;
}

// ---- 髷・針・糸 ----
const NEEDLE_D = (() => { const v = [0.62, -0.62, -0.48]; const l = Math.hypot(...v); return v.map(x => x / l); })();
export function bun(V, o = {}) {
  const { bunCy: cy, bunR: r, bunZ: z } = DIM; const p = V.P(0, cy, z);
  const cx = p[0];
  const d = smooth(Array.from({ length: 14 }, (_, i) => { const t = i / 14 * 2 * PI; return [cx + (r + (i % 3 == 0 ? .35 : 0)) * Math.cos(t), cy + (r - .3) * Math.sin(t)]; }), 'bun', .2);
  let inn = '';
  [[20, 2.6], [78, 2.9], [128, 2.4], [168, 2.8]].forEach(([ang, ry], i) => { inn += `<ellipse cx="${f(cx)}" cy="${cy}" rx="${r + 1}" ry="${ry}" transform="rotate(${ang + V.deg * .25} ${f(cx)} ${cy})" fill="none" stroke="${C.sumi}" stroke-width=".65" opacity=".38"/>`; });
  inn += `<path d="M${f(cx - 4.6)},${cy - 1.2}Q${f(cx - 3)},${cy - 5} ${f(cx + .5)},${cy - 5.4}" fill="none" stroke="${C.kinari}" stroke-width="1.1" opacity=".55" stroke-linecap="round"/>`;
  inn += `<ellipse cx="${f(cx + 2)}" cy="${cy + 5.6}" rx="7" ry="3" fill="${C.sumi}" opacity=".16"/>`;
  let s = shape(d, C.karashi, { sw: 1.5, inner: inn });
  // ほつれた糸の端（揺れ物）
  const sw = (o.sway || 0);
  s += line([[cx + 3.8, cy + 5.6], [cx + 4.8 + sw * .4, cy + 8.4], [cx + 4.2 + sw, cy + 10.4]], C.sumi, 2.9) + line([[cx + 3.8, cy + 5.6], [cx + 4.8 + sw * .4, cy + 8.4], [cx + 4.2 + sw, cy + 10.4]], C.karashi, 1.2);
  return s;
}
export function needle(V, o = {}) {
  const { bunCy: cy, bunZ: z } = DIM, Cc = [0, cy, z], D = NEEDLE_D, Lc = 33, Lp = 9.5;
  const tip = Cc.map((v, i) => v + D[i] * Lc), pt = Cc.map((v, i) => v - D[i] * Lp);
  const P = V.P(...Cc), T = V.P(...tip), Q = V.P(...pt);
  const longSvg = () => {
    const mid = V.P(...Cc.map((v, i) => v + D[i] * 18));
    return { z: mid[2], svg: line([[P[0], P[1]], [T[0], T[1]]], C.sumi, 3.8) + line([[P[0], P[1]], [T[0], T[1]]], C.kinari, 1.7) + eyeRing(T, P) };
  };
  function eyeRing(T, P) {
    const dx = T[0] - P[0], dy = T[1] - P[1], L = Math.hypot(dx, dy) || 1, ang = Math.atan2(dy, dx) * 180 / PI;
    const lenK = clamp(L / 22, .5, 1);
    return `<g transform="translate(${f(T[0])},${f(T[1])}) rotate(${f(ang)})"><ellipse cx="1.8" rx="${f(3.6 * lenK + .8)}" ry="1.9" fill="none" stroke="${C.sumi}" stroke-width="3.6"/><ellipse cx="1.8" rx="${f(3.6 * lenK + .8)}" ry="1.9" fill="none" stroke="${C.kinari}" stroke-width="1.4"/></g>`;
  }
  const shortSvg = () => ({ z: Q[2], svg: line([[P[0], P[1]], [Q[0], Q[1]]], C.sumi, 3.8) + line([[P[0], P[1]], [Q[0], Q[1]]], C.kinari, 1.7) });
  // 糸: 針穴から出る茜の糸
  const tv = o.tvec || [0.18, 1]; const tl = Math.hypot(...tv); const sw = o.sway || 0;
  const e = [T[0] + tv[0] / tl * 25 + sw, T[1] + tv[1] / tl * 25];
  const m1 = [T[0] + 4.5 + tv[0] / tl * 8, T[1] + tv[1] / tl * 8 - 1], m2 = [e[0] - 5 + sw * .5, e[1] - 9];
  const thread = `<path d="M${f(T[0] + 1)},${f(T[1])}C${f(m1[0] + 4)},${f(m1[1])} ${f(m2[0])},${f(m2[1])} ${f(e[0])},${f(e[1])}" fill="none" stroke="${C.sumi}" stroke-width="3.3" stroke-linecap="round"/><path d="M${f(T[0] + 1)},${f(T[1])}C${f(m1[0] + 4)},${f(m1[1])} ${f(m2[0])},${f(m2[1])} ${f(e[0])},${f(e[1])}" fill="none" stroke="${C.akane}" stroke-width="1.6" stroke-linecap="round"/>` +
    `<path d="M${f(e[0])},${f(e[1])}l-1.6,3.6M${f(e[0])},${f(e[1])}l1.8,3.2" stroke="${C.akane}" stroke-width="1" stroke-linecap="round"/>`;
  return { long: longSvg(), short: shortSvg(), thread, bunZ: V.P(0, cy, z)[2], tipXY: T };
}

// ---- 胴 ----
export function body(V, o = {}) {
  const ys = [46, 52, 60, 70, 80, 88];
  const hw = y => Math.hypot(bodyRx(y) * V.c, bodyRz(y) * V.s);
  const left = ys.map(y => [-hw(y), y]), right = ys.slice().reverse().map(y => [hw(y), y]);
  const sag = 1.4 + 1.2 * Math.abs(V.s);
  const pts = [...left, [-hw(88) * .5, 88 + sag * .85], [0, 88 + sag], [hw(88) * .5, 88 + sag * .85], ...right];
  const d = rpoly(pts, 2.2, 'body', .25);
  const rr = R('sarasa');
  let inn = '';
  // 更紗: 小花
  for (let row = 0; row < 8; row++) for (let a = -180; a < 180; a += 26) {
    const aa = a + (row % 2 ? 13 : 0) + (rr() - .5) * 5, y = 51 + row * 5.6 + (rr() - .5) * 1.2;
    if (y > 59 && y < 72) continue; if (y > 84) continue;
    const X = bodyRx(y) * Math.sin(rad(aa)), Z = bodyRz(y) * Math.cos(rad(aa)); const p = V.P(X, y, Z); if (p[2] < 0.5) continue;
    const k = clamp(p[2] / 8, .2, 1);
    let fl = ''; for (let i = 0; i < 5; i++) { const t = i / 5 * 2 * PI + row; fl += `<circle cx="${f(Math.cos(t) * 1.45)}" cy="${f(Math.sin(t) * 1.45)}" r=".95" fill="${C.karashi}"/>`; }
    fl += `<circle r=".7" fill="${C.kinari}"/>`;
    inn += `<g transform="translate(${f(p[0])},${f(p[1])}) scale(${f(k)},1)">${fl}</g>`;
  }
  // 衿
  const lap = (a1, y1, a2, y2, wd) => {
    const g = (a, y) => V.P(bodyRx(y) * Math.sin(rad(a)), y, bodyRz(y) * Math.cos(rad(a)));
    const A = g(a1, y1), B = g(a2, y2), A2 = g(a1 + (a1 < 0 ? wd : -wd) * 1.0, y1), B2 = g(a2 + (a1 < 0 ? 3 : -3), y2 - 0.0 + 0);
    if (Math.min(A[2], B[2], A2[2], B2[2]) < 0.3) return '';
    return `<path d="M${f(A[0])},${f(A[1])}L${f(B[0])},${f(B[1] + 1.2)}L${f(B2[0])},${f(B2[1])}L${f(A2[0])},${f(A2[1])}Z" fill="${C.kinari}" stroke="${C.sumi}" stroke-width=".9" stroke-linejoin="round"/>`;
  };
  inn += lap(-30, 45.5, 0, 59.5, 12) + lap(30, 45.5, 0, 59.5, 12);
  // 後ろ襟の端（後ろ向き）
  const nb = V.P(0, 47, -bodyRz(47)); if (nb[2] > 0.5) inn += `<path d="M${f(nb[0] - 6)},46L${f(nb[0])},49.8L${f(nb[0] + 6)},46" fill="none" stroke="${C.kinari}" stroke-width="1.5" stroke-linecap="round"/>`;
  // 裾の運針
  inn += `<path d="M${f(-hw(84))},84.6Q0,${f(85.8 + sag * .5)} ${f(hw(84))},84.6" fill="none" stroke="${C.kinari}" stroke-width=".7" stroke-dasharray="2 1.6" opacity=".8"/>`;
  let s = shape(d, C.akane, { sw: 1.6, inner: inn });
  // 帯
  const h1 = hw(62) + .9, h2 = hw(71) + .9;
  const od = rpoly([[-h1, 62], [h1, 62], [h2, 71], [-h2, 71]], 1.6, 'obi', .2);
  let oin = line([[-h1 + 2, 66.5], [h1 - 2, 66.5]], C.kinari, .8, 'stroke-dasharray="2.4 1.8"') + `<rect x="${-h1}" y="62" width="${2 * h1}" height="2" fill="${C.sumi}" opacity=".14"/>`;
  // 帯の織り目
  s += shape(od, C.karashi, { sw: 1.5, inner: oin });
  return s;
}
export function obiBow(V, o = {}) {
  const z = -(bodyRz(66.5) + 2.2), P0 = V.P(0, 66.5, z); const U = V.D(1, 0, 0), W = V.D(0, 1, 0);
  const m = `matrix(${f(U[0])} ${f(U[1])} ${f(W[0])} ${f(W[1])} ${f(P0[0])} ${f(P0[1])})`;
  const t = V.D(0, 0, -5); // 厚み
  const lobes = (inner) => `<g transform="${m}">${inner}</g>`;
  const lobeD = smooth([[-12.5, 61.5 - 66.5], [-6, 58.5 - 66.5], [-1, 63 - 66.5], [-1, 70 - 66.5], [-6, 74.5 - 66.5], [-12.5, 71.5 - 66.5]], 'lobeL', .3);
  const lobeR = smooth([[12.5, 61.5 - 66.5], [6, 58.5 - 66.5], [1, 63 - 66.5], [1, 70 - 66.5], [6, 74.5 - 66.5], [12.5, 71.5 - 66.5]], 'lobeR', .3);
  const tailD = rpoly([[-4, 3], [-0.5, 3], [0, 17], [-5.5, 15]], .8, 'tl', .3), tail2 = rpoly([[0.5, 3], [4, 3], [6, 14], [0.8, 17]], .8, 'tr', .3);
  const knot = rpoly([[-2.4, -3.8], [2.4, -3.8], [2.4, 3.8], [-2.4, 3.8]], 1, 'kn', .2);
  let out = '';
  // 厚みの影

  // 本体は幾何を直接アフィンで描く（線の太さは不均一になるので細めの線）
  const stroke = (d, fill, key) => `<path d="${d}" fill="${fill}" stroke="${C.sumi}" stroke-width="${f(1.5 / Math.max(.35, Math.abs(V.c)))}" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>`;
  out += lobes(`<g transform="translate(0,0)">${tailD ? `<path d="${tailD}" fill="${C.karashi}" stroke="${C.sumi}" stroke-width="1.5" stroke-linejoin="round"/><path d="${tail2}" fill="${C.karashi}" stroke="${C.sumi}" stroke-width="1.5" stroke-linejoin="round"/>` : ''}` +
    `<path d="${lobeD}" fill="${C.karashi}" stroke="${C.sumi}" stroke-width="1.5" stroke-linejoin="round"/><path d="${lobeR}" fill="${C.karashi}" stroke="${C.sumi}" stroke-width="1.5" stroke-linejoin="round"/>` +
    line([[-9, -5], [-4, -3.5]], C.kinari, .7, 'stroke-dasharray="1.8 1.5"') + line([[9, -5], [4, -3.5]], C.kinari, .7, 'stroke-dasharray="1.8 1.5"') +
    `<path d="${knot}" fill="${C.akane}" stroke="${C.sumi}" stroke-width="1.4" stroke-linejoin="round"/></g>`);
  return { svg: out, z: P0[2] };
}

// ---- 袖 ----
export function sleeve(V, s, p = {}) {
  const w = DIM.sleeveW, L = DIM.sleeveL;
  const yaw = rad(p.yaw ?? 32), out = rad(p.out ?? 5) * 1, swing = rad(p.swing ?? 0);
  let U = [s * Math.cos(yaw), 0, -Math.sin(yaw)], Vv = [0, 1, 0], N = [s * Math.sin(yaw), 0, Math.cos(yaw)];
  const pivot = [s * (DIM.sleeveX - .8), DIM.shoulder, 0];
  let P0 = [s * (DIM.sleeveX + (w / 2) * Math.cos(yaw)), DIM.shoulder, -1 - 0];
  P0 = [P0[0], P0[1], -(w / 2) * Math.sin(yaw) * 0 + (-1) + (w / 2) * Math.sin(yaw) * 0];
  // 内縁がからだに沿うように、中心は内縁 + U*w/2
  const inner = [s * DIM.sleeveX, DIM.shoulder, 1.5]; P0 = [inner[0] + U[0] * w / 2, inner[1], inner[2] + U[2] * w / 2];
  const rotX = v => [v[0], v[1] * Math.cos(swing) - v[2] * Math.sin(swing) * -1 * -1, v[1] * Math.sin(swing) * -1 + v[2] * Math.cos(swing)];
  // swing>0 で下端が後ろ(-z)へ流れる
  const rx = v => [v[0], v[1] * Math.cos(swing) + v[2] * Math.sin(swing) * 0 - 0, v[2]];
  const rotXs = v => [v[0], v[1] * Math.cos(swing) - v[2] * Math.sin(swing), v[1] * (-Math.sin(swing)) + v[2] * Math.cos(swing)];
  // 回転: V=(0,1,0) -> (0,cos,-sin)
  const apX = v => [v[0], v[1] * Math.cos(swing) - v[2] * (-Math.sin(swing)) * 0 + v[2] * Math.sin(swing) * 0, 0];
  const Rx = v => [v[0], v[1] * Math.cos(swing) + v[2] * Math.sin(swing), -v[1] * Math.sin(swing) + v[2] * Math.cos(swing)];
  const Rz = v => { const a = -s * out; return [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a), v[2]]; };
  const T = v => Rz(Rx(v));
  U = T(U); Vv = T(Vv); N = T(N);
  const rel = [P0[0] - pivot[0], P0[1] - pivot[1], P0[2] - pivot[2]]; const rr = T(rel);
  P0 = [pivot[0] + rr[0], pivot[1] + rr[1], pivot[2] + rr[2]];
  const Pv = V.P(...P0), Uv = V.D(...U), Vw = V.D(...Vv), Nv = V.D(...N);
  const facing = Nv[2] >= 0;
  const map = (u, v) => [Pv[0] + u * Uv[0] + v * Vw[0], Pv[1] + u * Uv[1] + v * Vw[1]];
  const mat = `matrix(${f(Uv[0])} ${f(Uv[1])} ${f(Vw[0])} ${f(Vw[1])} ${f(Pv[0])} ${f(Pv[1])})`;
  const wob = (k) => { const r = R('sl' + s + k); return () => (r() - .5) * .9; };
  const jw = wob('a');
  const corners = [[-w / 2, 0], [w / 2, 0], [w / 2 + jw(), L * .5], [w / 2 + jw(), L + jw()], [0, L + .8 + jw()], [-w / 2 + jw(), L + jw()], [-w / 2 + jw(), L * .5]];
  const quad = corners.map(c => map(c[0], c[1]));
  const dFront = rpoly(quad, 3.2, 'sleeve' + s, .15);
  const tshift = [-Nv[0] * 3.2, -Nv[1] * 3.2];
  const quadB = quad.map(q => [q[0] + tshift[0], q[1] + tshift[1]]);
  const dBack = rpoly(quadB, 3.2, 'sleeveB' + s, .15);
  let inner1 = '';
  const cuffH = 8.5;
  if (facing) {
    // 外側: 藍の絣
    const rn = R('kasuri' + s); let g = '';
    for (let row = 0; row < 8; row++) for (let col = 0; col < 3; col++) {
      const u = -w / 2 + 2.4 + col * 4.9 + (row % 2 ? 2.4 : 0) + (rn() - .5) * .8, v = 2.8 + row * 3.4 + (rn() - .5) * .8;
      if (u > w / 2 - 1.4 || v > L - cuffH - 1.5) continue;
      g += `<g transform="translate(${f(u)},${f(v)})" opacity="${f(.78 + rn() * .2)}"><rect x="-1.8" y="-.38" width="3.6" height=".76" fill="${C.kinari}"/><rect x="-.38" y="-1.8" width=".76" height="3.6" fill="${C.kinari}"/></g>`;
    }
    // 袖口の折り返し（茜）
    g += `<rect x="${-w / 2 - 1}" y="${L - cuffH}" width="${w + 2}" height="${cuffH + 2}" fill="${C.akane}"/>`;
    g += `<rect x="${-w / 2 - 1}" y="${L - cuffH}" width="${w + 2}" height="1.6" fill="${C.sumi}" opacity=".2"/>`;
    g += `<path d="M${-w / 2},${L - cuffH}L${w / 2},${L - cuffH}" stroke="${C.kinari}" stroke-width=".8" stroke-dasharray="2 1.6" fill="none"/>`;
    for (let i = 0; i < 3; i++) g += `<circle cx="${-w / 2 + 3 + i * 4.2}" cy="${L - 3.2 + (i % 2)}" r="1" fill="${C.karashi}"/>`;
    // 内縁の生成り（裏地ののぞき）
    g += `<rect x="${-w / 2 - 1}" y="-1" width="3.4" height="${L + 2}" fill="${C.kinari}"/><path d="M${-w / 2 + 2.4},0L${-w / 2 + 2.4},${L - cuffH}" stroke="${C.sumi}" stroke-width=".6" opacity=".5" fill="none"/>`;
    inner1 = `<g transform="${mat}">${g}</g>`;
  } else {
    // 裏側: 生成りの裏地。縁に藍の表布、すそに茜
    let g = `<rect x="-${w}" y="-2" width="${w * 2}" height="${L + 4}" fill="${C.kinari}"/>`;
    g += `<rect x="${w / 2 - 2.2}" y="-1" width="3.6" height="${L + 2}" fill="${C.ai}"/>`;
    g += `<rect x="${-w / 2 - 1}" y="${L - 5.2}" width="${w + 2}" height="${7}" fill="${C.akane}"/>`;
    g += `<path d="M${-w / 2},${L - 5.2}L${w / 2},${L - 5.2}" stroke="${C.sumi}" stroke-width=".6" opacity=".4" fill="none"/>`;
    const rn = R('lin' + s);
    for (let i = 0; i < 4; i++) g += `<path d="M${-w / 2 + 2 + i * 3},${3 + rn() * 3}L${-w / 2 + 2.5 + i * 3},${L - 9}" stroke="${C.akane}" stroke-width=".5" stroke-dasharray="1.6 1.8" opacity=".5" fill="none"/>`;
    g += `<rect x="${-w / 2 - 1}" y="-1" width="3" height="${L + 2}" fill="${C.sumi}" opacity=".08"/>`;
    inner1 = `<g transform="${mat}">${g}</g>`;
  }
  const backFill = facing ? C.kinari : C.ai;
  const sv = shape(dBack, backFill, { sw: 1.5, off: [.3, .3] }) + shape(dFront, facing ? C.ai : C.kinari, { sw: 1.6, inner: inner1 });
  // 肩の縫い目の付け根
  return { svg: sv, z: V.P(...[P0[0] + Vv[0] * L / 2, P0[1] + Vv[1] * L / 2, P0[2] + Vv[2] * L / 2])[2], facing };
}

// ---- 足 ----
export function leg(V, sx, pl = {}) {
  const x = sx * 6.2, dx = pl.dx || 0, dy = pl.dy || 0, rot = pl.rot || 0;
  const pts = (y, zf, zb, hw) => [[-hw, zb], [hw, zb], [hw, zf], [-hw, zf]].map(([xx, zz]) => V.P(x + xx, y, zz));
  const mk = (y, zf, zb, hw) => rpoly(pts(y, zf, zb, hw).map(p => [p[0], p[1]]), 2.0, 'zori' + sx, .15);
  let s = '';
  const fp = pts(100, 9.5, -5.5, 5.3); const x0 = Math.min(...fp.map(p => p[0])), x1 = Math.max(...fp.map(p => p[0]));
  const sole = rpoly([[x0, 96], [x1, 96], [x1, 100], [x0, 100]], 1.8, 'zori' + sx, .15), top = '';
  const toe = V.P(x, 95.2, 4.6), rxT = Math.hypot(3.9 * V.c, 5.2 * V.s);
  const tabi = `<ellipse cx="${f(toe[0])}" cy="${f(toe[1])}" rx="${f(rxT)}" ry="3.1" fill="${C.kinari}" stroke="${C.sumi}" stroke-width="1.3"/>`;
  const legD = rpoly([[V.P(x, 0, 0)[0] - 4.2, 85], [V.P(x, 0, 0)[0] + 4.2, 85], [V.P(x, 0, 0)[0] + 3.9, 96.5], [V.P(x, 0, 0)[0] - 3.9, 96.5]], 1.4, 'leg' + sx, .15);
  s += shape(sole, C.ai, { sw: 1.5, inner: `<rect x="${x0}" y="96" width="${x1 - x0}" height="1.3" fill="${C.hana}"/>` });
  s += tabi;
  // 鼻緒（茜）
  s += `<path d="M${f(toe[0] - rxT * .6)},${f(toe[1] - 1.6)}L${f(toe[0])},${f(toe[1] - 3.6)}L${f(toe[0] + rxT * .6)},${f(toe[1] - 1.6)}" fill="none" stroke="${C.akane}" stroke-width="1.5" stroke-linecap="round"/>`;
  s += shape(legD, C.kinari, { sw: 1.4 });
  return `<g transform="translate(${dx},${dy}) rotate(${rot} ${f(V.P(x, 0, 0)[0])} 88)">${s}</g>`;
}

// ---- 全身 ----
export function tsugi(deg, expr = 'normal', pose = {}) {
  const V = mkView(deg);
  const sl = pose.sleeve || {};
  const sL = sleeve(V, -1, { ...sl, ...(sl.L || {}) }), sR = sleeve(V, 1, { ...sl, ...(sl.R || {}) });
  const bw = obiBow(V), bd = body(V, pose);
  const nd = needle(V, pose), bn = bun(V, pose);
  let upper = '';
  const items = [];
  // 帯の結びは胴より奥にあるなら先
  if (bw.z < 0) upper += bw.svg;
  [sL, sR].filter(s => s.z < 0).sort((a, b) => a.z - b.z).forEach(s => upper += s.svg);
  upper += bd;
  if (bw.z >= 0) upper += bw.svg;
  [sL, sR].filter(s => s.z >= 0).sort((a, b) => a.z - b.z).forEach(s => upper += s.svg);
  // 針・髷・頭
  const longBehind = nd.long.z < nd.bunZ;
  const headSvg = head(V, expr, pose);
  upper += (longBehind ? nd.long.svg : '') + (nd.short.z < nd.bunZ ? nd.short.svg : '');
  upper += headSvg;
  // 髷は頭の上
  upper += bn;
  upper += (!longBehind ? nd.long.svg : '') + (nd.short.z >= nd.bunZ ? nd.short.svg : '');
  upper += nd.thread;
  const lg = [-1, 1].map(sx => ({ z: V.P(sx * 6.2, 90, 0)[2], svg: leg(V, sx, (pose.legs || [])[sx < 0 ? 0 : 1] || {}) })).sort((a, b) => a.z - b.z).map(l => l.svg).join('');
  const lean = pose.lean || 0;
  return `<g>${lg}<g transform="translate(${pose.dx || 0},${pose.dy || 0}) rotate(${lean} 0 88)">${upper}</g></g>`;
}

// ---- 真上 ----
export function topView(o = {}) {
  const f2 = f; const rn = R('top');
  const w = DIM.sleeveW, yaw = rad(32);
  let out = '';
  for (const s of [-1, 1]) {
    const U = [s * Math.cos(yaw), -Math.sin(yaw)], N = [s * Math.sin(yaw), Math.cos(yaw)];
    const inner = [s * DIM.sleeveX, 1.5]; const P0 = [inner[0] + U[0] * w / 2, inner[1] + U[1] * w / 2];
    const a = [P0[0] - U[0] * w / 2, P0[1] - U[1] * w / 2], b = [P0[0] + U[0] * w / 2, P0[1] + U[1] * w / 2];
    const t = 3.2; const q = [a, b, [b[0] - N[0] * t, b[1] - N[1] * t], [a[0] - N[0] * t, a[1] - N[1] * t]];
    out += shape(rpoly(q, 1.2, 'top' + s, .12), C.ai, { sw: 1.5, inner: line([[a[0] + (b[0] - a[0]) * .12, a[1] + (b[1] - a[1]) * .12], [b[0] - (b[0] - a[0]) * .1, b[1] - (b[1] - a[1]) * .1]], C.kinari, .8, 'stroke-dasharray="2 1.6"') });
  }
  // 頭
  const dHead = smooth(Array.from({ length: 36 }, (_, i) => { const t = i / 36 * 2 * PI; return [DIM.rx * Math.cos(t), DIM.rz * Math.sin(t)]; }), 'th', .18);
  // 頭巾（前縁はギザギザ）
  const capPts = []; const N = 48;
  for (let i = 0; i < N; i++) {
    const t = i / N * 2 * PI; let rx = 19.4, rz = 15.4; let x = rx * Math.cos(t), y = -1.5 + rz * Math.sin(t);
    if (Math.sin(t) > 0.1) { const k = i % 2 ? 1.3 : -1.0; x *= 1; y += k * Math.sin(t); }
    capPts.push([x, y]);
  }
  const dCap = smooth(capPts, 'tc', .1);
  let cin = '';
  for (let r = -2; r <= 2; r++) for (let c = -3; c <= 3; c++) {
    const x = c * 5.8 + (r % 2 ? 2.9 : 0), y = -1.5 + r * 5.6; if ((x / 17) ** 2 + ((y + 1.5) / 13.2) ** 2 > 1) continue;
    cin += cross(x, y, 1, 1, C.kinari, 3, .75, .85);
  }
  out += shape(dHead, C.kinari, { sw: 1.6 }) + shape(dCap, C.ai, { sw: 1.3, inner: cin });
  // 髷と針
  const bz = DIM.bunZ; const D = NEEDLE_D;
  const tip = [D[0] * 33, bz + D[2] * 33], pt = [-D[0] * 9.5, bz - D[2] * -9.5];
  const bunD = smooth(Array.from({ length: 14 }, (_, i) => { const t = i / 14 * 2 * PI; return [7 * Math.cos(t), bz + 7 * Math.sin(t)]; }), 'tb', .2);
  let bin = ''; [[20, 2.6], [78, 2.9], [128, 2.4], [168, 2.8]].forEach(([ang, ry]) => { bin += `<ellipse cx="0" cy="${bz}" rx="8" ry="${ry}" transform="rotate(${ang} 0 ${bz})" fill="none" stroke="${C.sumi}" stroke-width=".65" opacity=".38"/>`; });
  out += shape(bunD, C.karashi, { sw: 1.5, inner: bin });
  out += line([[0, bz], tip], C.sumi, 3.8) + line([[0, bz], tip], C.kinari, 1.7);
  out += `<g transform="translate(${f(tip[0])},${f(tip[1])}) rotate(${f(Math.atan2(tip[1] - bz, tip[0]) * 180 / PI)})"><ellipse cx="1.8" rx="4.4" ry="1.9" fill="none" stroke="${C.sumi}" stroke-width="3.6"/><ellipse cx="1.8" rx="4.4" ry="1.9" fill="none" stroke="${C.kinari}" stroke-width="1.4"/></g>`;
  out += `<path d="M${f(tip[0] + 1)},${f(tip[1])}C${f(tip[0] + 6)},${f(tip[1] - 2)} ${f(tip[0] + 9)},${f(tip[1] + 4)} ${f(tip[0] + 5)},${f(tip[1] + 8)}" fill="none" stroke="${C.sumi}" stroke-width="3.3" stroke-linecap="round"/><path d="M${f(tip[0] + 1)},${f(tip[1])}C${f(tip[0] + 6)},${f(tip[1] - 2)} ${f(tip[0] + 9)},${f(tip[1] + 4)} ${f(tip[0] + 5)},${f(tip[1] + 8)}" fill="none" stroke="${C.akane}" stroke-width="1.6" stroke-linecap="round"/>`;
  out += line([[-3, bz], [-1, -1 + bz + 3]], C.sumi, 0);
  return out;
}

export function headOnly(deg, expr, pose = {}) {
  const V = mkView(deg), nd = needle(V, pose), bn = bun(V, pose);
  const longBehind = nd.long.z < nd.bunZ;
  return (longBehind ? nd.long.svg : '') + head(V, expr, pose) + bn + (!longBehind ? nd.long.svg : '') + nd.short.svg + nd.thread;
}
export const POSE_RUN = { lean: 9, sleeve: { yaw: 78, swing: 58, out: 0 }, tvec: [-1, .35], sway: -3,
  legs: [{ dx: 7, dy: -2, rot: -14 }, { dx: -8, dy: -5, rot: 22 }] };
export const POSE_GLIDE = { dy: -3, sleeve: { yaw: 0, out: 100, swing: 0 }, tvec: [.6, .5], sway: 3, legs: [{ dx: -2, dy: -3, rot: 8 }, { dx: 2, dy: -3, rot: -8 }] };
