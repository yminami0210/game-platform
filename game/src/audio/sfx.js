// Web Audio で合成する効果音（外部音源なし）
let ctx = null, muted = false, masterGain = null;
const MAX_VOICES = 8; // 同時発音制限
const activeOscillators = [];

export function unlock() {
  try {
    ctx ??= new AudioContext();
    if (!masterGain) {
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.5;
      masterGain.connect(ctx.destination);
    }
    ctx.resume();
  } catch {}
}

export const getAudio = () => (ctx && masterGain ? { ctx, masterGain } : null);

export function setMuted(m) {
  muted = m;
  if (masterGain) {
    masterGain.gain.value = m ? 0 : 0.5;
  }
}

function play(name, { pitch = 1, vol = 0.2 } = {}) {
  if (!ctx || muted) return;

  // 同時発音数を制限
  while (activeOscillators.length >= MAX_VOICES) {
    const oldest = activeOscillators.shift();
    if (oldest) oldest.stop();
  }

  const t = ctx.currentTime;

  // ピッチにランダム微調整を加える（耳が疲れないように）
  const pitchVar = pitch * (0.98 + Math.random() * 0.04);

  // 音の種類ごとに生成
  switch (name) {
    case 'start': return playStart(t, pitchVar, vol);
    case 'pickup': return playPickup(t, pitchVar, vol);
    case 'scatter': return playScatter(t, vol);
    case 'gate': return playGate(t, vol);
    case 'bloom': return playBloom(t, vol);
    case 'layer': return playLayer(t, vol);
    case 'fail': return playFail(t, vol);
    case 'puddle': return playPuddle(t, vol);
    default: return playPickup(t, pitchVar, vol); // fallback
  }
}

function playStart(t, pitch, vol) {
  // 低→高の2音鈴。440Hz → 660Hz
  const o1 = ctx.createOscillator(), g1 = ctx.createGain();
  o1.type = 'sine';
  o1.frequency.setValueAtTime(440 * pitch, t);
  o1.frequency.exponentialRampToValueAtTime(660 * pitch, t + 0.15);
  g1.gain.setValueAtTime(vol, t);
  g1.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
  o1.connect(g1).connect(masterGain);
  o1.start(t);
  o1.stop(t + 0.3);
  activeOscillators.push(o1);
}

function playPickup(t, pitch, vol) {
  // 高い鈴。880Hz
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(880 * pitch, t);
  g.gain.setValueAtTime(vol * 0.8, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
  o.connect(g).connect(masterGain);
  o.start(t);
  o.stop(t + 0.15);
  activeOscillators.push(o);
}

function playScatter(t, vol) {
  // 短い水滴の下降音。330Hz → 110Hz
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(330, t);
  o.frequency.exponentialRampToValueAtTime(110, t + 0.2);
  g.gain.setValueAtTime(vol * 0.5, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
  o.connect(g).connect(masterGain);
  o.start(t);
  o.stop(t + 0.2);
  activeOscillators.push(o);
}

function playGate(t, vol) {
  // 小さな水滴。短い高音パルス 550Hz
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(550, t);
  g.gain.setValueAtTime(vol * 0.4, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
  o.connect(g).connect(masterGain);
  o.start(t);
  o.stop(t + 0.08);
  activeOscillators.push(o);
}

function playBloom(t, vol) {
  // 五音階の3音上昇アルペジオ。ペンタトニック: C(264), E(330), G(396)
  const notes = [264, 330, 396];
  notes.forEach((freq, i) => {
    const delay = i * 0.08;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq, t + delay);
    g.gain.setValueAtTime(vol, t + delay);
    g.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.3);
    o.connect(g).connect(masterGain);
    o.start(t + delay);
    o.stop(t + delay + 0.3);
    activeOscillators.push(o);
  });
}

function playLayer(t, vol) {
  // ゆっくり広がる和音ドローン＋鈴。低い周波数でふんわり
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(110, t); // 低音ドローン
  g.gain.setValueAtTime(vol * 0.6, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
  o.connect(g).connect(masterGain);
  o.start(t);
  o.stop(t + 1.0);
  activeOscillators.push(o);

  // 高音を少し遅れて
  setTimeout(() => {
    if (!ctx || muted) return;
    const t2 = ctx.currentTime;
    const o2 = ctx.createOscillator(), g2 = ctx.createGain();
    o2.type = 'sine';
    o2.frequency.setValueAtTime(440, t2);
    g2.gain.setValueAtTime(vol * 0.4, t2);
    g2.gain.exponentialRampToValueAtTime(0.0001, t2 + 0.8);
    o2.connect(g2).connect(masterGain);
    o2.start(t2);
    o2.stop(t2 + 0.8);
    activeOscillators.push(o2);
  }, 100);
}

function playFail(t, vol) {
  // 低い単音が減衰して消える。やさしく下降、怖くしない
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(220, t);
  o.frequency.exponentialRampToValueAtTime(110, t + 0.8);
  g.gain.setValueAtTime(vol * 0.6, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
  o.connect(g).connect(masterGain);
  o.start(t);
  o.stop(t + 0.8);
  activeOscillators.push(o);
}

function playPuddle(t, vol) {
  // 水たまりの音。複数の短い音が降りる
  const freqs = [440, 330, 220];
  freqs.forEach((freq, i) => {
    const delay = i * 0.05;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq, t + delay);
    o.frequency.exponentialRampToValueAtTime(freq * 0.6, t + delay + 0.12);
    g.gain.setValueAtTime(vol * 0.5, t + delay);
    g.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.12);
    o.connect(g).connect(masterGain);
    o.start(t + delay);
    o.stop(t + delay + 0.12);
    activeOscillators.push(o);
  });
}

export { play }
