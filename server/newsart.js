// 県民だよりの一面に載せる絵。サーバーでもブラウザ単体でも動く（画像ファイルを作らず SVG の data URL を返す）。
//   1. ポスター・チラシ・貼り紙の出来事 → そのポスターを壁に貼った絵（題名は出来事の文から取る）
//   2. その出来事を 3D で撮った写真があれば、その写真
//   3. それ以外 → 場所の建物の絵（イラスト）
// 文字はコードで組むので、AI 画像のような崩れた文字にはならない。

const POSTER = /ポスター|チラシ|貼り紙|張り紙|掲示/;
const PALETTES = [
  ['#f4efe2', '#c8432b', '#2b3a55'], ['#eaf2ec', '#2f6f4e', '#c98a1b'], ['#fdf3d8', '#1f4e79', '#d1495b'],
  ['#f6e7e4', '#7a2e39', '#3a6b7c'], ['#e8eef6', '#27466b', '#e0a43a'],
];

function hash(s) {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.codePointAt(0), 16777619);
  return h >>> 0;
}
const escXml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function svgDataUrl(svg) {
  // encodeURIComponent が残す ( ) ' * ! も符号にする（Markdown の括弧や強調と混ざらないように）
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg).replace(/[()'*!]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

// 出来事の文からポスターの題名を取る：「…」があればその中、なければ「〜のポスター」の〜（場所の言い回しは落とす）
export function posterTitle(text) {
  const q = text.match(/「([^」]+)」/);
  if (q) return q[1];
  const m = text.match(/([^、。]+?)の(?:ポスター|チラシ|貼り紙|張り紙)/);
  if (!m) return 'お知らせ';
  return m[1].replace(/^.*?(?:に|で|の前に|の横に)、?/, '').replace(/^.*、/, '').trim() || 'お知らせ';
}

function lines(s, n) {
  const out = [];
  for (let i = 0; i < s.length; i += n) out.push(s.slice(i, i + n));
  return out.slice(0, 3);
}

function posterSvg(title, seed) {
  const [paper, main, sub] = PALETTES[seed % PALETTES.length];
  const rot = ((seed >> 4) % 5) - 2;
  const tl = lines(title, title.length > 12 ? 7 : 6);
  const fs = tl.length > 2 ? 46 : 56;
  const deco = seed % 3 === 0
    ? `<circle cx="300" cy="560" r="120" fill="${main}" opacity="0.18"/><circle cx="210" cy="610" r="70" fill="${sub}" opacity="0.2"/>`
    : seed % 3 === 1
      ? `<path d="M90 640 L200 500 L290 600 L380 470 L510 640 Z" fill="${sub}" opacity="0.25"/><path d="M90 640 L210 560 L330 640 Z" fill="${main}" opacity="0.25"/>`
      : `<rect x="110" y="480" width="380" height="16" fill="${main}" opacity="0.5"/><rect x="110" y="512" width="300" height="16" fill="${sub}" opacity="0.4"/><rect x="110" y="544" width="340" height="16" fill="${main}" opacity="0.3"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
<defs><pattern id="w" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#cfc7b6"/><rect width="8" height="8" fill="#d6cebd"/></pattern>
<filter id="s" x="-10%" y="-10%" width="130%" height="130%"><feDropShadow dx="6" dy="8" stdDeviation="6" flood-opacity="0.35"/></filter></defs>
<rect width="800" height="600" fill="url(#w)"/>
<g transform="translate(178 34) rotate(${rot} 222 260) scale(0.74)" filter="url(#s)">
<rect x="0" y="0" width="600" height="700" fill="${paper}"/>
<rect x="0" y="0" width="600" height="90" fill="${main}"/>
<text x="300" y="60" font-size="34" text-anchor="middle" fill="${paper}" font-family="sans-serif" font-weight="700">ナナシ県</text>
${tl.map((l, i) => `<text x="300" y="${190 + i * (fs + 18)}" font-size="${fs}" text-anchor="middle" fill="${main}" font-family="serif" font-weight="700">${escXml(l)}</text>`).join('')}
${deco}
<rect x="40" y="660" width="520" height="2" fill="${sub}" opacity="0.6"/>
</g>
<rect x="345" y="22" width="110" height="30" fill="#efe4c4" opacity="0.85" transform="rotate(-4 400 37)"/>
</svg>`;
}

const SKY = ['#bcd6e8', '#cfe0ea', '#e3d9c6'];
function placeSvg(place, seed) {
  const color = place?.color || '#d8cfc0';
  const name = place?.sign || place?.name || '';
  const kind = place?.kind || '';
  const open = ['park', 'bokujo', 'tanbo'].includes(kind);
  const sky = SKY[seed % SKY.length];
  const ground = open ? '#8fb36b' : '#b9b3a6';
  let body;
  if (kind === 'park') body = `<circle cx="220" cy="330" r="90" fill="#5f8f4e"/><rect x="212" y="330" width="16" height="120" fill="#6b4f35"/><circle cx="560" cy="350" r="70" fill="#6f9a57"/><rect x="553" y="350" width="14" height="100" fill="#6b4f35"/><rect x="340" y="400" width="140" height="10" fill="#7a5a3c"/><rect x="350" y="410" width="8" height="40" fill="#7a5a3c"/><rect x="462" y="410" width="8" height="40" fill="#7a5a3c"/>`;
  else if (kind === 'bokujo') body = `<path d="M0 380 Q200 330 400 370 T800 360 L800 460 L0 460 Z" fill="#7fa65f"/>${[120, 300, 480, 660].map((x) => `<rect x="${x}" y="380" width="6" height="60" fill="#8a6a48"/>`).join('')}<rect x="100" y="395" width="590" height="5" fill="#8a6a48"/><ellipse cx="420" cy="420" rx="60" ry="30" fill="#f4f1ea"/><ellipse cx="400" cy="415" rx="20" ry="14" fill="#3b332c"/><rect x="380" y="440" width="8" height="24" fill="#3b332c"/><rect x="450" y="440" width="8" height="24" fill="#3b332c"/>`;
  else if (kind === 'tanbo') body = `${[0, 1, 2, 3, 4].map((i) => `<rect x="0" y="${380 + i * 22}" width="800" height="12" fill="#a9c65f" opacity="0.6"/>`).join('')}`;
  else {
    const h = kind === 'kencho' || kind === 'mall' ? 260 : kind === 'station' || kind === 'school' ? 200 : 170;
    const w = kind === 'kencho' || kind === 'mall' || kind === 'school' ? 560 : 400;
    const x = (800 - w) / 2, y = 450 - h;
    const wins = [];
    for (let r = 0; r < Math.floor((h - 70) / 50); r++) for (let c = 0; c < Math.floor(w / 70); c++) wins.push(`<rect x="${x + 25 + c * 70}" y="${y + 70 + r * 50}" width="36" height="28" fill="#eef3f5" opacity="0.85"/>`);
    body = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}" stroke="#7d7568" stroke-width="3"/>
<rect x="${x - 10}" y="${y - 14}" width="${w + 20}" height="18" fill="#8d8579"/>
<rect x="${x + w / 2 - Math.min(170, w / 2 - 20)}" y="${y + 18}" width="${Math.min(340, w - 40)}" height="40" fill="#fbf8f0" stroke="#7d7568" stroke-width="2"/>
<text x="400" y="${y + 47}" font-size="26" text-anchor="middle" fill="#3a332b" font-family="sans-serif" font-weight="700">${escXml(name)}</text>
${wins.join('')}<rect x="${400 - 30}" y="${450 - 70}" width="60" height="70" fill="#6b5a48"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
<rect width="800" height="600" fill="${sky}"/>
<path d="M0 300 Q150 220 300 280 T600 250 T800 270 L800 600 L0 600 Z" fill="#9aae96" opacity="0.6"/>
<rect x="0" y="450" width="800" height="150" fill="${ground}"/>
${body}
</svg>`;
}

// top: ダイジェストの1件目（text, placeId, photo）。photoUrl: 写真IDから URL を返す関数。place: 場所の定義
export function newsPicture(top, { photoUrl = () => '', place = null } = {}) {
  if (!top) return null;
  const seed = hash(top.text);
  if (POSTER.test(top.text)) {
    const title = posterTitle(top.text);
    return { src: svgDataUrl(posterSvg(title, seed)), caption: `貼り出された「${title}」のポスター` };
  }
  const url = top.photo ? photoUrl(top.photo) : '';
  if (url) return { src: url, caption: `${top.place || ''}（広報課撮影）` };
  return { src: svgDataUrl(placeSvg(place, seed)), caption: `${top.place || place?.name || ''}（イラスト）` };
}
