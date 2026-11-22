// 画面のHTML文字列を作るだけ（状態は書き換えない）。文言はすべて data/text.json 由来。
const ICON = {
  hill: '<path d="M2 20 L9 8 L14 15 L18 10 L26 20 Z"/>',
  gorge: '<path d="M3 4 L10 12 L3 22 M25 4 L18 12 L25 22"/>',
  river: '<path d="M2 9 q4-5 8 0 t8 0 t8 0 M2 18 q4-5 8 0 t8 0 t8 0"/>',
  plain: '<path d="M2 8 H26 M5 14 H24 M2 20 H20"/>',
};
const SHAPE = {
  p: '<circle cx="24" cy="24" r="21"/>',
  e: '<polygon points="24,2 46,24 24,46 2,24"/>',
};
// 信頼度ごとの線種（実線/破線/点線）
const DASH = { high: '', mid: ' stroke-dasharray="6 3"', low: ' stroke-dasharray="2 4"' };
const OPA = { high: 1, mid: 0.6, low: 0.35 };

export function chip(T, side, type, count, o = {}) {
  const attr = o.act ? ` data-act="${o.act}" role="button" tabindex="0" aria-label="${T.types[type]}"` : '';
  const dash = o.src ? DASH[o.src] : '';
  const sty = o.src ? ` style="opacity:${OPA[o.src]}"` : '';
  const arc = side === 'p' && type === 'arc' ? '<path d="M10 10 Q24 0 38 10" fill="none"/>' : '';
  const cav = side === 'p' && type === 'cav' ? '<path d="M12 40 Q24 30 36 36" fill="none"/>' : '';
  return `<span class="chip ${side}${o.sel ? ' sel' : ''}${o.dead ? ' dead' : ''}"${attr}${sty}><svg viewBox="0 0 48 48" aria-hidden="true"><g${dash}>${SHAPE[side]}${arc}${cav}</g></svg><b>${T.typeChar[type]}</b>${count != null ? `<i>${count}</i>` : ''}</span>`;
}

export function zoneHTML(T, z, inner, o = {}) {
  const cls = `zone ${z}${o.target ? ' target' : ''}${o.flash ? ' flash' : ''}${o.fire ? ' fire' : ''}`;
  return `<div class="${cls}" data-act="${o.act ?? 'zone:' + z}" role="button" tabindex="0" aria-label="${T.zones[z]}"><span class="zname"><svg viewBox="0 0 28 28" aria-hidden="true">${ICON[z]}</svg>${T.zones[z]}</span><span class="units">${inner}</span></div>`;
}

export const ZORDER = ['hill', 'gorge', 'river', 'plain'];
export const board = (cells) => `<div class="board">${cells}</div>`;

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
