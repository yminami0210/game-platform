// Web Audio で合成する効果音（外部音源なし）。gs-sound が拡張する。
let ctx = null, muted = false;
export function unlock() { try { ctx ??= new AudioContext(); ctx.resume(); } catch {} }
export function setMuted(m) { muted = m; }
export function play(name, { pitch = 1, vol = 0.2 } = {}) {
  if (!ctx || muted) return;
  const presets = { score: [660, 0.06, 'square'], fail: [220, 0.5, 'sine'], start: [440, 0.12, 'triangle'], pickup: [880, 0.1, 'sine'], scatter: [330, 0.18, 'sine'] };
  const [f, dur, type] = presets[name] ?? presets.score;
  const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
  o.type = type; o.frequency.setValueAtTime(f * pitch, t);
  if (name === 'fail') o.frequency.exponentialRampToValueAtTime(110, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur);
}
