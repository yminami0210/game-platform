import { figure, defs, C } from './fig.mjs';
import fs from 'fs';
const W = 1600, H = 1640, BG = '#9ccbc4';
const FONT = `font-family="Kaisei Decol,'Hiragino Mincho ProN','Yu Mincho',IPAGothic,serif"`;
const tag = (x, y, t) => `<g transform="translate(${x} ${y})"><rect x="0" y="0" width="${t.length * 22 + 26}" height="34" fill="${C.ai}" transform="translate(3 3)" opacity=".35"/><rect x="0" y="0" width="${t.length * 22 + 26}" height="34" fill="${C.ai}"/><text x="13" y="25" font-size="20" fill="${C.kinari}" ${FONT}>${t}</text></g>`;
const place = (view, emo, pose, x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})">${figure(view, emo, pose)}</g>`;
const ground = (x, y, w) => `<path d="M${x - w / 2} ${y + 6}L${x + w / 2} ${y + 6}" stroke="${C.ai}" stroke-width="3" stroke-dasharray="9 6" stroke-linecap="round" opacity=".55"/>`;

export function build({ sil = false } = {}) {
  let g = '';
  // 4方向
  const views = [['front', '正面'], ['q3', '斜め'], ['side', '横'], ['back', '後ろ']];
  const poseStand = { leg: [[0, 0], [0, 0]] };
  views.forEach(([v, n], i) => {
    const x = 210 + i * 395, y = 440;
    g += ground(x, y, 280) + place(v, 'normal', v === 'side' ? { leg: [[7, 0], [-7, 0]], arm: 22 } : poseStand, x, y, 1.45) + tag(x - 40, 478, n);
  });
  // 表情
  const emos = [['normal', 'ふつう'], ['smile', '笑う'], ['surprise', '驚く'], ['trouble', '困る'], ['angry', '怒る'], ['sleepy', '眠い']];
  emos.forEach(([e, n], i) => {
    const x = 140 + i * 263, y = 790;
    g += `<svg x="${x - 118}" y="${y - 250}" width="236" height="269" viewBox="-100 -282 200 228" overflow="hidden"><rect x="-100" y="-282" width="200" height="228" fill="${sil ? 'none' : '#b4d8d2'}"/><g>${figure('front', e, {})}</g></svg>` + tag(x - 30, y + 36, n);
  });
  // 決めポーズ
  g += ground(430, 1410, 520) + place('side', 'smile', { arm: -118, leg: [[34, -6], [-34, -2]], lean: 1 }, 0, 0, 0).replace(/.*/, '');
  g += `<g transform="translate(430 1410) scale(2.05)"><g transform="rotate(6)">${figure('side', 'smile', { arm: 62, leg: [[17, -1], [-19, -8]] })}</g></g>` + tag(260, 1500, '決めポーズ はしる');
  g += ground(1170, 1410, 520) + `<g transform="translate(1170 1342) scale(2.05)">${figure('front', 'smile', { arm: [-40, 120], leg: [[-8, -12], [14, -4]], needle: 'held' })}</g>` + tag(1000, 1500, '決めポーズ 針をかかげる');
  const bgr = sil ? '#ffffff' : BG;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${defs}<rect width="${W}" height="${H}" fill="${bgr}"/>`;
  if (!sil) {
    svg += `<text x="48" y="64" font-size="40" fill="${C.sumi}" ${FONT}>ツギ A案　三角頭巾の端切れ</text><text x="49.5" y="65.5" font-size="40" fill="${C.aka}" opacity=".35" ${FONT}>ツギ A案　三角頭巾の端切れ</text>`;
    svg += `<text x="52" y="108" font-size="20" fill="${C.sumi}" ${FONT}>茜の端切れを一枚折った人形。角の先の糸の房が気持ちで跳ねる。</text>`;
  }
  svg += g + '</svg>';
  return svg;
}
