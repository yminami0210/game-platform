import { ART, FIRE, SPLASH } from './ink.js';
// 画面のHTML文字列を作るだけ（状態は書き換えない）。文言はすべて data/text.json 由来。
const ICON = {
  hill: '<path d="M2 20 L9 8 L14 15 L18 10 L26 20 Z"/>',
  gorge: '<path d="M3 4 L10 12 L3 22 M25 4 L18 12 L25 22"/>',
  river: '<path d="M2 9 q4-5 8 0 t8 0 t8 0 M2 18 q4-5 8 0 t8 0 t8 0"/>',
  plain: '<path d="M2 8 H26 M5 14 H24 M2 20 H20"/>',
};
// 味方=丸+旗(丸い幟) / 敵=尖り(菱形+棘)+旗(燕尾)。色が無くても形で分かる
const SHAPE = {
  p: '<circle cx="22" cy="26" r="19"/><path class="flag" d="M42 16V2h6q-2 4 0 8h-6"/>',
  e: '<polygon points="22,5 43,26 22,47 1,26"/><path d="M22 5v-3M1 26h-3M43 26h3" fill="none"/><path class="flag" d="M42 16V2h6l-3 4 3 4h-6"/>',
};
// 信頼度ごとの線種（実線/破線/点線）
const DASH = { high: '', mid: ' stroke-dasharray="6 3"', low: ' stroke-dasharray="2 4"' };
const OPA = { high: 1, mid: 0.6, low: 0.35 };

export function chip(T, side, type, count, o = {}) {
  const attr = o.act ? ` data-act="${o.act}" role="button" tabindex="0" aria-label="${T.types[type]}"` : '';
  const dash = o.src ? DASH[o.src] : '';
  const sty = o.src ? (o.ghost ? ` style="--o:${OPA[o.src]}"` : ` style="opacity:${OPA[o.src]}"`) : '';
  const arc = side === 'p' && type === 'arc' ? '<path d="M9 14 Q22 3 35 14" fill="none"/>' : '';
  const cav = side === 'p' && type === 'cav' ? '<path d="M10 42 Q22 33 34 39" fill="none"/>' : '';
  const mist = o.src && o.src !== 'high' ? (o.src === 'mid' ? ' m' : ' l') : '';
  return `<span class="chip ${side}${mist}${o.ghost ? ' ghost' : ''}${o.hl ? ' hl' : ''}${o.bad ? ' bad' : ''}${o.sel ? ' sel' : ''}${o.dead ? ' dead' : ''}"${attr}${sty}><svg viewBox="0 0 48 48" aria-hidden="true"><g filter="url(#rc)"${dash}>${SHAPE[side]}${arc}${cav}</g></svg><b>${T.typeChar[type]}</b>${count != null ? `<i>${count}</i>` : ''}</span>`;
}

// 1枚の盤の領域。駒は固定スロット（兵科ごとに決まった升）に置くので重ならない。
// inner = { e: {inf:html,...}, p: {inf:html,...} }。細い領域は敵が上段・味方が下段の3x2、横長の領域は6x1（敵・味方が兵科ごとに並ぶ）
const TY = ['inf', 'arc', 'cav'];
const WIDE = { river: 1, plain: 1 };
function slotsHTML(z, inner) {
  const cell = (side, t) => `<span class="slot ${side}">${inner[side]?.[t] ?? ''}</span>`;
  const e = TY.map((t) => cell('e', t)), p = TY.map((t) => cell('p', t));
  return (WIDE[z] ? TY.flatMap((_, i) => [e[i], p[i]]) : [...e, ...p]).join('');
}
export function zoneHTML(T, z, inner, o = {}) {
  const cls = `zone ${z}${WIDE[z] ? ' wide' : ''}${o.target ? ' target' : ''}${o.flash ? ' flash' : ''}${o.fire ? ' fire' : ''}`;
  const fx = (o.fire ? FIRE : '') + (o.flash && o.splash ? SPLASH : '');
  const act = o.act === null ? '' : ` data-act="${o.act ?? 'zone:' + z}" role="button" tabindex="0" aria-label="${T.zones[z]}"`;
  return `<div class="${cls}"${act}>${ART[z]}<span class="zname"><svg viewBox="0 0 28 28" aria-hidden="true">${ICON[z]}</svg>${T.zones[z]}</span><span class="units">${slotsHTML(z, inner)}</span>${fx}</div>`;
}

export const ZORDER = ['hill', 'gorge', 'river', 'plain'];
export const board = (cells, extra = '', cls = '') => `<div class="board${cls ? ' ' + cls : ''}">${cells}${extra}</div>`;

export function reportText(T, r) {
  if (r.subject === 'wind') return `風は${T.wind[r.claim]}`;
  return `${T.types[r.subject]}は${T.zones[r.claim]}にいる`;
}

export function reportRow(T, r, o = {}) {
  const s = T.source[r.source];
  const note = r.confirmed ? '間者が確かめた' : !r.feasible ? `${T.types[r.subject]}は${T.zones.river}に入れぬ。偽の報せ` : `出所の信頼度: ${s.label}`;
  const btn = o.spy ? `<button class="mini" data-act="spy:${r.subject}" aria-label="間者を送る">確かめる</button>` : '';
  return `<div class="rep${!r.feasible ? ' bad' : ''}"><span class="badge ${r.source}" aria-label="信頼度${s.label}">${s.mark}</span><span class="txt">${reportText(T, r)}<small>${note}</small></span>${btn}</div>`;
}

// 盤の下に並べるコンパクトな報告チップ（タップで盤上の残像を強調。用間の選択中は「確かめる」）
export function reportChip(T, r, o = {}) {
  const s = T.source[r.source];
  const txt = r.subject === 'wind' ? T.wind[r.claim] : `${T.typeChar[r.subject]}→${T.zones[r.claim]}`;
  const act = o.spy ? `spy:${r.subject}` : `hl:${r.subject}`;
  const lab = r.subject === 'wind' ? `風は${T.wind[r.claim]}` : reportText(T, r);
  return `<button class="rchip ${r.source}${!r.feasible ? ' bad' : ''}${o.hl ? ' on' : ''}${o.spy ? ' spy' : ''}" data-act="${act}" aria-pressed="${!!o.hl}" aria-label="${lab}。信頼度${s.label}${!r.feasible ? '。ありえない偽の報せ' : ''}${o.spy ? '。間者を送って確かめる' : ''}"><span class="badge ${r.source}">${s.mark}</span><span>${txt}</span></button>`;
}
