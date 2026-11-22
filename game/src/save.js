// 保存（端末内のみ）。壊れたデータ・保存不可でも落ちない。
export const KEY = 'sangoku_gunshi_v1', VERSION = 1;
const DEFAULT = () => ({ v: VERSION, best: 0, learned: [], recent: [] });
export function load(storage = globalThis.localStorage) {
  try {
    const s = JSON.parse(storage.getItem(KEY));
    if (!s || s.v !== VERSION) return DEFAULT();
    const d = DEFAULT();
    return {
      v: VERSION, fx: s.fx !== false,
      best: Number.isFinite(s.best) ? Math.max(0, Math.min(3, s.best)) : 0,
      learned: Array.isArray(s.learned) ? s.learned.filter((x) => typeof x === 'string') : d.learned,
      recent: Array.isArray(s.recent) ? s.recent.slice(-10) : d.recent,
    };
  } catch { return DEFAULT(); }
}
export function save(s, storage = globalThis.localStorage) { try { storage.setItem(KEY, JSON.stringify({ ...s, v: VERSION })); return true; } catch { return false; } }
// 戦績を反映した新しい保存データを返す
export function record(s, score, principles, learnedNow) {
  return {
    ...s,
    best: Math.max(s.best, score),
    learned: [...new Set([...s.learned, ...learnedNow])],
    recent: [...s.recent, { score, principles }].slice(-10),
  };
}
