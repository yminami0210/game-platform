// 水墨の絵（SVG文字列）。座標の揺らぎは決定的な関数で付け、起動時に一度だけ作ってキャッシュする（描画ごとの計算なし）。
// 色は design-system のトークンのみ。濃淡は不透明度。フィルタ(#zr/#zb/#zd)は index.html の defs にある。
const jit = (s, i, a) => { const x = Math.sin(s * 12.9898 + i * 78.233) * 43758.5453; return (x - Math.floor(x) - 0.5) * 2 * a; };
const f1 = (n) => Math.round(n * 10) / 10;
const pl = (pts) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${f1(x)} ${f1(y)}`).join('');
// 重なる稜線。close=下まで塗る
function ridge(s, base, amp, n, op, ph = 0) {
  const pts = [];
  for (let i = 0; i <= n; i++) pts.push([-5 + (170 * i) / n, base - amp * (0.5 + 0.5 * Math.sin(i * 1.15 + ph + s)) + jit(s, i, 2)]);
  return `<path d="${pl(pts)}L165 100L-5 100Z" fill="var(--ink)" fill-opacity="${op}"/>`;
}
// かすれ（短い筆の掃き）
function hatch(s, x0, y0, n, dx, dy, op, w = 1.3) {
  let d = '';
  for (let i = 0; i < n; i++) { const x = x0 + jit(s, i, 14) + (i * 7) % 40, y = y0 + jit(s + 1, i, 8) + (i * 5) % 30; d += `M${f1(x)} ${f1(y)}l${dx + jit(s + 2, i, 1.5)} ${dy}`; }
  return `<path d="${d}" fill="none" stroke="var(--ink)" stroke-opacity="${op}" stroke-width="${w}" stroke-linecap="round"/>`;
}
const frame = (s) => `<path d="${pl([[3, 3 + jit(s, 1, 1)], [80, 2.5], [157, 3 + jit(s, 2, 1)], [157.5, 48], [157, 93 + jit(s, 3, 1)], [80, 93.5], [3, 93], [2.5, 48]])}Z" fill="none" stroke="var(--ink)" stroke-opacity=".7" stroke-width="2" vector-effect="non-scaling-stroke" filter="url(#zr)"/>`;
const mist = (cx, cy, rx, ry, op) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="var(--paper)" fill-opacity="${op}" filter="url(#zb)"/>`;

function cliff(s, side, w, op) {
  const pts = [];
  for (let i = 0; i <= 8; i++) { const e = w + 10 * Math.sin(i * 0.9 + s) + jit(s, i, 3); pts.push([side < 0 ? e : 160 - e, i * 12]); }
  const edge = side < 0 ? [[-5, 100], [-5, -5]] : [[165, 100], [165, -5]];
  return `<path d="${pl(pts)}L${edge[0].join(' ')}L${edge[1].join(' ')}Z" fill="var(--ink)" fill-opacity="${op}" filter="url(#zb)"/>`;
}
const wave = (s, y, op, w) => {
  let d = `M${f1(-4 + jit(s, 0, 4))} ${f1(y)}`;
  for (let i = 0; i < 8; i++) d += `q5 ${f1(-5 + jit(s, i, 2))} 10 0t10 0`;
  return `<path d="${d}" fill="none" stroke="var(--indigo)" stroke-opacity="${op}" stroke-width="${w}" stroke-linecap="round"/>`;
};

const WRAP = (inner) => `<svg class="zart" viewBox="0 0 160 96" preserveAspectRatio="none" aria-hidden="true">${inner}</svg>`;
export const ART = {
  // 山地: 三層の稜線＋崖の影（斜めのかすれ）
  hill: WRAP(`<g filter="url(#zb)">${ridge(1, 40, 22, 9, 0.1)}${ridge(2, 54, 22, 9, 0.16, 2)}${ridge(3, 70, 18, 9, 0.22, 4)}</g>${mist(60, 52, 55, 8, 0.55)}<g filter="url(#zd)">${hatch(5, 70, 48, 14, -5, 9, 0.5)}${hatch(6, 100, 62, 10, -4, 8, 0.4)}</g>${frame(1)}`),
  // 谷: 向かい合う崖と、間の靄
  gorge: WRAP(`${cliff(1, -1, 38, 0.12)}${cliff(2, 1, 38, 0.1)}${cliff(3, -1, 26, 0.18)}${cliff(4, 1, 26, 0.15)}<g filter="url(#zd)">${hatch(7, 14, 8, 12, 9, 1.5, 0.55, 1.5)}${hatch(8, 112, 6, 12, -9, 1.5, 0.5, 1.5)}</g>${mist(80, 70, 22, 22, 0.6)}${frame(2)}`),
  // 江: 藍の筆の波。かすれと、にじむ濃淡
  river: WRAP(`<g filter="url(#zb)">${wave(1, 20, 0.45, 2.6)}${wave(2, 36, 0.3, 1.6)}${wave(3, 52, 0.5, 3)}${wave(4, 68, 0.3, 1.6)}${wave(5, 84, 0.45, 2.4)}</g><g filter="url(#zd)">${wave(6, 28, 0.5, 2)}${wave(7, 60, 0.5, 2)}</g>${frame(3)}`),
  // 平地: 横の掃き筆、草の点、遠い低い丘
  plain: WRAP(`<g filter="url(#zb)">${ridge(9, 26, 5, 12, 0.08)}</g><g filter="url(#zd)">${[0, 1, 2, 3, 4, 5].map((i) => `<path d="M${f1(8 + jit(9, i, 8))} ${24 + i * 13}h${70 + ((i * 23) % 50)}" stroke="var(--ink)" stroke-opacity="${0.14 + (i % 3) * 0.05}" stroke-width="${3 + (i % 2) * 2}" stroke-linecap="round" fill="none"/>`).join('')}</g>${hatch(11, 10, 50, 9, 2, -5, 0.45, 1)}${frame(4)}`),
};

// 火攻: 朱の炎（揺れ）と墨の煙（昇る）。transform/opacity のアニメのみ
export const FIRE = `<svg class="zfire" viewBox="0 0 160 96" preserveAspectRatio="none" aria-hidden="true">
<g class="smoke"><ellipse cx="40" cy="40" rx="20" ry="12" fill="var(--ink)" fill-opacity=".28"/><ellipse cx="100" cy="30" rx="26" ry="14" fill="var(--ink)" fill-opacity=".2"/><ellipse cx="135" cy="42" rx="14" ry="9" fill="var(--ink)" fill-opacity=".25"/></g>
<g filter="url(#zr)" fill="var(--vermilion)">${[[22, 1], [52, 1.4], [88, 1.15], [122, 1.5], [146, 0.9]].map(([x, k], i) => `<path class="fl f${i % 3}" d="M${x - 9} 94Q${x - 10} 78 ${x - 2} 72Q${x - 2} 82 ${x + 2} 80Q${x + 4} 66 ${x - 1} ${(66 - k * 4)}Q${x + 14} 66 ${x + 9} 94Z" fill-opacity=".62"/>`).join('')}</g>
<g fill="var(--paper)" fill-opacity=".7">${[[22, 82], [88, 84], [146, 84]].map(([x, y]) => `<path d="M${x - 2} 94Q${x - 3} ${y} ${x} ${y - 6}Q${x + 3} ${y} ${x + 2} 94Z"/>`).join('')}</g></svg>`;

// 墨の飛沫（衝突）
export const SPLASH = `<svg class="zsplash" viewBox="0 0 160 96" preserveAspectRatio="none" aria-hidden="true"><g fill="var(--ink)" fill-opacity=".55" filter="url(#zb)"><circle cx="80" cy="48" r="9"/>${[[58, 30, 3], [104, 28, 2.4], [112, 62, 3.2], [50, 66, 2.2], [82, 20, 2], [80, 76, 2.6], [128, 46, 1.8]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g></svg>`;

// 墨の軌跡（軍勢の移動）。zone中心は2x2盤の中心
export const CENTER = { hill: [25, 25], gorge: [75, 25], river: [25, 75], plain: [75, 75] };
export function trail(from, to) {
  const [x1, y1] = CENTER[from], [x2, y2] = CENTER[to];
  const mx = (x1 + x2) / 2 + (y2 - y1) * 0.18, my = (y1 + y2) / 2 - (x2 - x1) * 0.18;
  const d = `M${x1} ${y1}Q${f1(mx)} ${f1(my)} ${x2} ${y2}`;
  return `<svg class="trail" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><g filter="url(#zb)"><path class="tr1" pathLength="100" d="${d}" fill="none" stroke="var(--ink)" stroke-opacity=".7" stroke-width="3" stroke-linecap="round" vector-effect="non-scaling-stroke"/><path class="tr1 t2" pathLength="100" d="${d}" fill="none" stroke="var(--ink)" stroke-opacity=".3" stroke-width="9" stroke-linecap="round" vector-effect="non-scaling-stroke"/></g><circle cx="${x2}" cy="${y2}" r="2.4" fill="var(--ink)" fill-opacity=".6"/></svg>`;
}
