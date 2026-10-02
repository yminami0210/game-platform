// 保存（端末内のみ）。バージョン付きで、壊れていても落ちない。
import { emptyProgress } from './core/world.js';
const KEY = 'tsugi.save', VERSION = 2;
export function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && s.v === VERSION && s.prog && typeof s.prog.stages === 'object') return { muted: false, ...s, prog: { ...emptyProgress(), ...s.prog } };
  } catch {}
  return { v: VERSION, muted: false, prog: emptyProgress() };
}
export function save(s) { try { localStorage.setItem(KEY, JSON.stringify({ ...s, v: VERSION })); } catch {} }
export function hasSave() { try { const s = JSON.parse(localStorage.getItem(KEY)); return !!(s && s.v === VERSION && s.prog?.seenIntro); } catch { return false; } }
export function wipe() { try { localStorage.removeItem(KEY); } catch {} }
