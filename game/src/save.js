// 保存（端末内のみ）。壊れたデータでも落ちない。
const KEY = 'game.save', VERSION = 1;
const DEFAULT = { v: VERSION, best: 0, muted: false };
export function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    return s && s.v === VERSION ? { ...DEFAULT, ...s } : { ...DEFAULT };
  } catch { return { ...DEFAULT }; }
}
export function save(s) { try { localStorage.setItem(KEY, JSON.stringify({ ...s, v: VERSION })); } catch {} }
