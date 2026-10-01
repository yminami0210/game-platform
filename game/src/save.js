// 保存（端末内のみ）。壊れたデータでも落ちない。古い版は移行して引き継ぐ。
const KEY = 'game.save', VERSION = 2;
const DEFAULT = { v: VERSION, best: 0, bestLayer: 1, flowersTotal: 0, dex: [], colorsUnlocked: ['main'], color: 'main', muted: false, vibe: true, calm: false, tutorialDone: false };
const num = (x, d = 0) => (Number.isFinite(x) && x >= 0 ? Math.floor(x) : d);
const strs = x => (Array.isArray(x) ? [...new Set(x.filter(i => typeof i === 'string'))] : []);

// どんな入力（古い版・壊れた値）でも、現行の形に整えて返す（純粋関数。テスト対象）
export function migrate(raw) {
  const r = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const o = {
    v: VERSION,
    best: num(r.best), bestLayer: Math.max(1, num(r.bestLayer, 1)), flowersTotal: num(r.flowersTotal),
    dex: strs(r.dex), colorsUnlocked: strs(r.colorsUnlocked), color: typeof r.color === 'string' ? r.color : 'main',
    muted: r.muted === true, vibe: r.vibe !== false, calm: r.calm === true, tutorialDone: r.tutorialDone === true || num(r.best) > 0,
  };
  if (!o.colorsUnlocked.includes('main')) o.colorsUnlocked.unshift('main');
  if (!o.colorsUnlocked.includes(o.color)) o.color = 'main';
  return o;
}
export function load() {
  try { return migrate(JSON.parse(localStorage.getItem(KEY))); } catch { return { ...DEFAULT, dex: [], colorsUnlocked: ['main'] }; }
}
export function save(s) { try { localStorage.setItem(KEY, JSON.stringify({ ...s, v: VERSION })); } catch {} }
export const SAVE_VERSION = VERSION;
