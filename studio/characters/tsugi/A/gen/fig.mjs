// ツギ A案「三角頭巾の端切れ」 図形ジェネレータ（座標: 足元中央が原点、上が -y）
export const C = { aka: '#b8372b', kinari: '#f0e6cf', ai: '#26426b', sumi: '#2b2420', kera: '#d39a22' };
let seed = 7;
const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const j = (a) => (rnd() - 0.5) * 2 * a;
const f = (n) => Math.round(n * 10) / 10;

function cr(pts, closed = false, seg = 6) {
  const n = pts.length, out = [];
  const g = (i) => closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
  const N = closed ? n : n - 1;
  for (let i = 0; i < N; i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    for (let s = 0; s < seg; s++) {
      const t = s / seg, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map(k => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
    }
  }
  if (!closed) out.push(pts[n - 1]);
  return out;
}
function zig(a, b, n, amp) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L, out = [];
  for (let k = 0; k < n; k++) {
    out.push([a[0] + dx * k / n, a[1] + dy * k / n]);
    const a2 = amp * (0.85 + rnd() * 0.3);
    out.push([a[0] + dx * (k + 0.5) / n + nx * a2, a[1] + dy * (k + 0.5) / n + ny * a2]);
  }
  out.push(b); return out;
}
const wob = (pts, a = 0.9) => pts.map(p => [p[0] + j(a), p[1] + j(a)]);
const D = (pts, close = true) => 'M' + pts.map(p => f(p[0]) + ' ' + f(p[1])).join('L') + (close ? 'Z' : '');
const ell = (cx, cy, rx, ry, n = 10) => Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2; return [cx + Math.cos(a) * rx * (1 + j(0.03)), cy + Math.sin(a) * ry * (1 + j(0.03))]; });

// 版ずれ: 色面を少しずらして、輪郭は墨でその上
function shape(pts, fill, { sw = 3.2, tex = true, off = [2, 1.5] } = {}) {
  const d = D(pts);
  return `<path d="${d}" fill="${fill}" transform="translate(${off[0]} ${off[1]})"/>` +
    (tex ? `<path d="${d}" fill="url(#kas)"/>` : '') +
    `<path d="${d}" fill="none" stroke="${C.sumi}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"/>`;
}
const cap = (p, q, w, fill) => `<path d="M${f(p[0])} ${f(p[1])}L${f(q[0])} ${f(q[1])}" stroke="${C.sumi}" stroke-width="${w + 6}" stroke-linecap="round"/><path d="M${f(p[0])} ${f(p[1])}L${f(q[0])} ${f(q[1])}" stroke="${fill}" stroke-width="${w}" stroke-linecap="round" transform="translate(1.5 1)"/><path d="M${f(p[0])} ${f(p[1])}L${f(q[0])} ${f(q[1])}" stroke="url(#kas)" stroke-width="${w}" stroke-linecap="round"/>`;

export const defs = `<defs><pattern id="kas" width="13" height="13" patternUnits="userSpaceOnUse"><path d="M3 6.5h5M5.5 4v5" stroke="${C.sumi}" stroke-width="1.3" stroke-linecap="round" opacity=".22"/></pattern></defs>`;

// ---- 表情 ----
const EMO = {
  normal:   { tail: 'normal', eye: 'bar', h: 24, tilt: 0, brow: [0, 0], mouth: 'flat' },
  smile:    { tail: 'bounce', eye: 'arch', h: 24, tilt: 0, brow: [-3, 0], mouth: 'smile' },
  surprise: { tail: 'up', eye: 'bar', h: 34, tilt: 0, brow: [-9, 0], mouth: 'o' },
  trouble:  { tail: 'droop', eye: 'bar', h: 22, tilt: 11, brow: [-2, 14], mouth: 'wavy' },
  angry:    { tail: 'stiff', eye: 'bar', h: 17, tilt: -10, brow: [3, -16], mouth: 'down' },
  sleepy:   { tail: 'limp', eye: 'closed', h: 24, tilt: 0, brow: [5, -3], mouth: 'tiny' },
};
// 角の先の位置（front）と房の広がり
const TAILS = {
  front: { normal: [38, -190], bounce: [32, -210], up: [6, -222], droop: [52, -158], stiff: [48, -182], limp: [58, -134] },
  side:  { normal: [-72, -162], bounce: [-76, -184], up: [-52, -204], droop: [-70, -134], stiff: [-84, -172], limp: [-66, -118] },
  back:  { normal: [34, -150], bounce: [30, -172], up: [4, -206], droop: [30, -120], stiff: [46, -160], limp: [26, -106] },
};
const TUFT = {
  normal: { sp: 62, len: 36, g: 5 }, bounce: { sp: 96, len: 42, g: -3 }, up: { sp: 120, len: 46, g: 0 },
  droop: { sp: 34, len: 34, g: 14 }, stiff: { sp: 12, len: 44, g: 0 }, limp: { sp: 22, len: 30, g: 20 },
};

function tail(view, kind, base) {
  const E = TAILS[view][kind], [bx, by] = base;
  const mid = [(bx + E[0]) / 2, (by + E[1]) / 2 - (kind === 'limp' || kind === 'droop' ? 2 : 16)];
  const w = 9, B1 = [bx - w, by + 2], B2 = [bx + w, by + 2];
  const q = (A, Cc, B, n = 8) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n; return [(1 - t) ** 2 * A[0] + 2 * (1 - t) * t * Cc[0] + t * t * B[0], (1 - t) ** 2 * A[1] + 2 * (1 - t) * t * Cc[1] + t * t * B[1]]; });
  const c1 = [mid[0] - 5, mid[1] + 3], c2 = [mid[0] + 5, mid[1] - 3];
  const pts = [...q(B1, c1, [E[0] - 3.5, E[1] + 1]), ...q([E[0] + 3.5, E[1] - 1], c2, B2)];
  const ang = Math.atan2(E[1] - mid[1], E[0] - mid[0]);
  // 房
  const T = TUFT[kind]; let s = shape(wob(pts, .5), C.aka, { sw: 3 });
  const N = 7, strands = [];
  for (let i = 0; i < N; i++) {
    const off = (i / (N - 1) - 0.5) * T.sp * Math.PI / 180, len = T.len * (0.78 + rnd() * 0.4) * (1 - Math.abs(i / (N - 1) - 0.5) * 0.35);
    let a = ang + off, x = E[0], y = E[1]; const p = [[x, y]];
    const sgn = Math.cos(a) >= 0 ? 1 : -1;
    for (let k = 0; k < 8; k++) {
      x += Math.cos(a) * len / 8; y += Math.sin(a) * len / 8; p.push([x, y]);
      const down = Math.PI / 2; let d = down - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      a += Math.sign(d) * Math.min(Math.abs(d), Math.abs(T.g) * Math.PI / 180) * (T.g < 0 ? -0.6 * sgn : 1);
    }
    strands.push(D(cr(p, false, 3), false));
  }
  const dd = strands.join('');
  const tuft = strands.map(d => `<path d="${d}" fill="none" stroke="${C.sumi}" stroke-width="6.4" stroke-linecap="round"/>`).join('') +
    strands.map(d => `<path d="${d}" fill="none" stroke="${C.kera}" stroke-width="3.2" stroke-linecap="round"/>`).join('');
  // 結び目（巻いた糸）
  const kn = `<g transform="translate(${f(E[0])} ${f(E[1])}) rotate(${f(ang * 180 / Math.PI)})"><rect x="-9" y="-6.5" width="12" height="13" rx="3" fill="${C.kera}" stroke="${C.sumi}" stroke-width="2.6"/><path d="M-5 -5.5v11M-1 -5.5v11" stroke="${C.sumi}" stroke-width="1.4" opacity=".6"/></g>`;
  return { back: s, front: tuft + kn };
}

function eyes(cx, cy, e, { gap = 17, sq = 1, side = false } = {}) {
  const st = `stroke="${C.sumi}" stroke-width="3.3" stroke-linecap="round" fill="none"`;
  const one = (x, y, tilt, mirror) => {
    const h = e.h; let g = '';
    if (e.eye === 'bar') {
      for (let k = -1; k <= 1; k++) { const hh = h * (k === 0 ? 1 : 0.8); g += `<path d="M${k * 5.2 * sq} ${f(-hh / 2)}Q${f(k * 5.8 * sq)} 0 ${k * 5.2 * sq} ${f(hh / 2)}" ${st}/>`; }
    } else if (e.eye === 'arch') {
      for (let k = -1; k <= 1; k++) g += `<path d="M${k * 6 * sq} ${k === 0 ? 3 : 6}L${k * 9 * sq} ${k === 0 ? -9 : -4}" ${st}/>`;
    } else {
      g += `<path d="M${-11 * sq} -3Q0 7 ${11 * sq} -3" ${st}/>`;
      for (let k = -1; k <= 1; k++) g += `<path d="M${k * 6.5 * sq} ${f(2 + (k ? 0 : 1.6))}l${k * 1.5} 5" ${st} stroke-width="2.6"/>`;
    }
    return `<g transform="translate(${f(x)} ${f(y)}) rotate(${mirror ? -tilt : tilt})">${g}</g>`;
  };
  const dash = `stroke="${C.sumi}" stroke-width="3" stroke-linecap="round" stroke-dasharray="6 2.6" fill="none"`;
  const by = e.h / 2 + 11 + (e.eye === 'closed' ? -4 : 0);
  const brow = (x, dy, mirror) => `<path d="M${f(x - 9 * sq)} ${f(cy - by + dy * (mirror ? 1 : -1) * 0.5 + (mirror ? 0 : 0))}L${f(x + 9 * sq)} ${f(cy - by - dy * (mirror ? 1 : -1) * 0.5)}" ${dash}/>`;
  const bl = e.brow[0] + e.brow[1] * 0.3, br = e.brow[0] - e.brow[1] * 0.3;
  let out = '';
  const hasB = true;
  const brw = (x, lift, slant) => `<path d="M${f(x - 9 * sq)} ${f(cy - by + lift - slant)}L${f(x + 9 * sq)} ${f(cy - by + lift + slant)}" ${dash}/>`;
  const slant = e.brow[1] / 4; // 正: 内側が上がる（困る）  負: 内側が下がる（怒る）
  if (side) { out += one(cx, cy, e.tilt, false) + brw(cx, e.brow[0], -slant); }
  else {
    out += one(cx - gap, cy, e.tilt, false) + one(cx + gap * (sq < 1 ? 1.15 : 1), cy, e.tilt, true);
    out += brw(cx - gap, e.brow[0], -slant);
    out += brw(cx + gap * (sq < 1 ? 1.15 : 1), e.brow[0], slant);
  }
  return out;
}
function mouth(x, y, m) {
  const st = `stroke="${C.sumi}" stroke-width="2.8" stroke-linecap="round" fill="none" stroke-dasharray="5 2.2"`;
  const P = {
    flat: `<path d="M${x - 7} ${y}Q${x} ${y + 3} ${x + 7} ${y}" ${st}/>`,
    smile: `<path d="M${x - 11} ${y - 2}Q${x} ${y + 12} ${x + 11} ${y - 2}" ${st}/>`,
    o: `<ellipse cx="${x}" cy="${y + 2}" rx="4.6" ry="5.6" stroke="${C.sumi}" stroke-width="2.8" fill="none" stroke-dasharray="4 2"/>`,
    wavy: `<path d="M${x - 9} ${y + 1}q4.5 -5 9 0t9 0" ${st}/>`,
    down: `<path d="M${x - 8} ${y + 3}Q${x} ${y - 4} ${x + 8} ${y + 3}" ${st}/>`,
    tiny: `<path d="M${x - 4} ${y + 1}L${x + 4} ${y + 1}" ${st}/>`,
  };
  return P[m];
}

function needle(p, q, thread = true) {
  const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  const at = (t, w) => [p[0] + ux * L * t + nx * w, p[1] + uy * L * t + ny * w];
  const poly = [at(0, 5), at(0.82, 3.2), q, at(0.82, -3.2), at(0, -5)];
  const eye = at(0.1, 0);
  let s = '';
  if (thread) {
    const th = D([eye, [eye[0] - 14 - ux * 4, eye[1] + 26], [eye[0] - 30, eye[1] + 38], [eye[0] - 22, eye[1] + 56]].length ? cr([eye, [eye[0] - 6, eye[1] + 8], [eye[0] - 1, eye[1] + 15], [eye[0] - 12, eye[1] + 19]], false, 5) : [], false);
    s += `<path d="${th}" fill="none" stroke="${C.sumi}" stroke-width="5.4" stroke-linecap="round"/><path d="${th}" fill="none" stroke="${C.kera}" stroke-width="2.8" stroke-linecap="round"/>`;
  }
  s += `<path d="${D(poly)}" fill="${C.kinari}" stroke="${C.sumi}" stroke-width="2.8" stroke-linejoin="round"/>`;
  s += `<ellipse cx="${f(eye[0])}" cy="${f(eye[1])}" rx="2.1" ry="4.4" fill="${C.sumi}" transform="rotate(${f(Math.atan2(dy, dx) * 180 / Math.PI)} ${f(eye[0])} ${f(eye[1])})"/>`;
  return s;
}
const patch = (x, y, r = 5, s = 1) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})"><rect x="-14" y="-14" width="28" height="28" fill="${C.ai}" stroke="${C.sumi}" stroke-width="2.6" transform="translate(1.6 1.2)"/><rect x="-14" y="-14" width="28" height="28" fill="none" stroke="${C.sumi}" stroke-width="2.6"/><rect x="-10.5" y="-10.5" width="21" height="21" fill="none" stroke="${C.kinari}" stroke-width="2" stroke-dasharray="4.4 3" stroke-linecap="round"/></g>`;

const hoodFront = (dx = 0) => {
  const hem = zig([-56 + dx, -80], [56 + dx, -80], 8, 10).reverse();
  const top = cr([[56 + dx, -80], [61 + dx, -112], [44 + dx, -152], [8 + dx, -190], [-26 + dx, -162], [-54 + dx, -128], [-60 + dx, -100], [-56 + dx, -80]], false, 6);
  return wob([...top, ...hem.slice(1)].filter((_, i, a) => i < a.length - 0), 0.5);
};
const foldShade = (pts, d = '') => `<path d="${d}" fill="${C.sumi}" opacity=".13"/>`;

// ---- 正面 / 斜め ----
function front(emo, pose, yaw) {
  const e = EMO[emo], dx = yaw * 7, fx = yaw * 15;
  const arms = pose.arm || [-22, 22]; // 左(画面左)・右 の腕角度（0=真下、+で画面右へ）
  const legs = pose.leg || [[0, 0], [0, 0]];
  const bw = yaw ? 0.9 : 1;
  let s = '';
  const sh = (L, a) => [L[0] + Math.sin(a * Math.PI / 180) * 24, L[1] + Math.cos(a * Math.PI / 180) * 24];
  const shL = [-33 * bw + dx * .5, -68], shR = [33 * bw + dx * .5, -68];
  if (pose.needle !== 'held') s += needle([-62 + dx, -8], [80 + dx, -138]);
  s += cap([-19 + dx * .4, -26], [-19 + legs[0][0] + dx * .4, -13 + legs[0][1]], 26, C.aka);
  s += cap([19 + dx * .4, -26], [19 + legs[1][0] + dx * .4, -13 + legs[1][1]], 26, C.aka);
  const bodyP = cr([[-29 * bw + dx * .5, -82], [0 + dx * .5, -84], [29 * bw + dx * .5, -82], [35 + dx * .5, -55], [41 * bw + dx * .5, -27], [0 + dx * .5, -25], [-41 * bw + dx * .5, -27], [-35 + dx * .5, -55]], true, 5);
  s += cap(shL, sh(shL, arms[0]), 21, C.aka);
  s += shape(wob(bodyP, .6), C.aka);
  s += patch(5 + dx * .5, -52, 6, bw);
  s += cap(shR, sh(shR, arms[1]), 21, C.aka);
  if (pose.needle === 'held') { const h = sh(shR, arms[1]); s += needle([h[0] - 28, h[1] + 40], [h[0] + 30, h[1] - 54]); }
  const t = tail('front', e.tail, [2 + dx, -176]);
  s = s.replace('', '');
  let hood = t.back;
  const hp = hoodFront(dx);
  hood += shape(hp, C.aka);
  hood += `<path d="M${f(8 + dx)} -186L${f(-6 + dx)} -142" stroke="${C.sumi}" stroke-width="2.2" opacity=".5" stroke-linecap="round"/><path d="${D([[8 + dx, -186], [58 + dx, -108], [52 + dx, -82], [-6 + dx, -142]])}" fill="${C.sumi}" opacity=".1"/>`;
  const face = ell(fx, -112, 39, 31, 12);
  hood += shape(wob(face, .6), C.kinari, { sw: 2.8, tex: false });
  hood += eyes(fx, -111, e, { gap: yaw ? 15 : 18, sq: yaw ? 0.85 : 1 });
  hood += mouth(fx + yaw * 3, -90, e.mouth);
  hood += t.front;
  return s + hood;
}

// ---- 横 ----
function side(emo, pose) {
  const e = EMO[emo], legs = pose.leg || [[8, 0], [-8, 0]];
  const arm = pose.arm ?? 25;
  let s = '';
  s += cap([-6, -26], [-6 + legs[1][0], -13 + legs[1][1]], 24, C.aka);
  const bodyP = cr([[-22, -82], [0, -84], [22, -82], [28, -55], [30, -27], [0, -25], [-30, -27], [-28, -55]], true, 5);
  s += shape(wob(bodyP, .6), C.aka);
  s += patch(2, -50, 4, .85);
  s += cap([10, -26], [10 + legs[0][0], -13 + legs[0][1]], 24, C.aka);
  const sh = [0, -68]; const hand = [sh[0] + Math.sin(arm * Math.PI / 180) * 24, sh[1] + Math.cos(arm * Math.PI / 180) * 24];
  const t = tail('side', e.tail, [-44, -168]);
  let hood = t.back;
  const hem = zig([34, -80], [-40, -80], 7, 10);
  const top = cr([[34, -80], [46, -112], [40, -148], [14, -174], [-20, -184], [-48, -174], [-56, -148], [-52, -112], [-40, -80]], false, 6);
  const hp = wob([...top.slice(0, -1), ...hem.reverse().reverse().reverse()].length ? [...top.slice(0, -1).reverse(), ...hem.slice().reverse().reverse()] : [], .5);
  // top は前→後ろ、hem は 前→後ろ なので輪郭は top(前→後) + hem(後→前)
  const outline = wob([...top, ...zig([-40, -80], [34, -80], 7, 10).slice(1)], .5);
  // 針（背中に斜め）
  s += pose.needle === 'held' ? '' : needle([-52, -14], [-8, -132]);
  hood += shape(outline, C.aka);
  hood += `<path d="${D([[-20, -184], [40, -148], [34, -80], [-14, -140]])}" fill="${C.sumi}" opacity=".1"/><path d="M-20 -183L-12 -140" stroke="${C.sumi}" stroke-width="2.2" opacity=".5" stroke-linecap="round"/>`;
  const face = cr([[46, -112], [38, -138], [14, -142], [2, -112], [10, -84], [34, -84]], true, 6);
  hood += shape(wob(face, .6), C.kinari, { sw: 2.8, tex: false });
  hood += eyes(26, -112, e, { side: true, sq: .85 });
  hood += mouth(36, -92, e.mouth);
  hood += t.front;
  const armS = cap(sh, hand, 21, C.aka);
  return s + hood.replace(/$/, '') + armS;
}

// ---- 後ろ ----
function back(emo, pose) {
  const e = EMO[emo], legs = pose.leg || [[0, 0], [0, 0]];
  let s = '';
  s += cap([-19, -26], [-19 + legs[0][0], -13 + legs[0][1]], 26, C.aka) + cap([19, -26], [19 + legs[1][0], -13 + legs[1][1]], 26, C.aka);
  const bodyP = cr([[-29, -82], [0, -84], [29, -82], [35, -55], [41, -27], [0, -25], [-41, -27], [-35, -55]], true, 5);
  s += cap([-33, -68], [-33 - 6, -68 + 23], 21, C.aka);
  s += shape(wob(bodyP, .6), C.aka);
  s += cap([33, -68], [39, -45], 21, C.aka);
  // 背中の縫い目（背筋に運針）
  s += `<path d="M0 -76L1 -34" stroke="${C.kinari}" stroke-width="2.4" stroke-dasharray="5 4" stroke-linecap="round"/>`;
  s += needle([-52, -10], [70, -128]);
  const t = tail('back', e.tail, [8, -170]);
  const hp = [...cr([[56, -80], [61, -112], [44, -152], [4, -190], [-30, -162], [-56, -128], [-60, -100], [-56, -80]], false, 6), ...zig([-56, -80], [56, -80], 8, 10).slice(1).reverse().reverse()];
  const hem = zig([-56, -80], [56, -80], 8, 10).reverse();
  const outline = wob([...cr([[56, -80], [61, -112], [44, -152], [4, -190], [-30, -162], [-56, -128], [-60, -100], [-56, -80]], false, 6), ...hem.slice(1)], .5);
  let hood = shape(outline, C.aka);
  // 折り目: 三角を折った線（中央の縦と斜め）
  hood += `<path d="M4 -188L2 -84" stroke="${C.sumi}" stroke-width="2.4" opacity=".55" stroke-linecap="round"/><path d="M4 -188L-48 -110" stroke="${C.sumi}" stroke-width="2" opacity=".35" stroke-linecap="round"/><path d="${D([[4, -188], [58, -108], [52, -82], [2, -84]])}" fill="${C.sumi}" opacity=".1"/>`;
  hood += `<path d="M-20 -108l10 -7 10 7M8 -108l10 -7 10 7" fill="none" stroke="${C.kinari}" stroke-width="2.4" opacity=".0"/>`;
  // 垂れる角（背中側へ）
  hood += t.back + t.front;
  return s + hood;
}

export function figure(view, emo = 'normal', pose = {}) {
  seed = 7 + view.length * 13 + emo.length;
  const body = view === 'front' ? front(emo, pose, 0) : view === 'q3' ? front(emo, pose, 1) : view === 'side' ? side(emo, pose) : back(emo, pose);
  return `<g>${body}</g>`;
}
export { EMO };
