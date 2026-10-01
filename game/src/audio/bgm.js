// 層別BGM。Web Audio 合成で静かなループを生成
let ctx = null, masterGain = null, muted = false;
let currentLayer = -1;
let currentGain = null;
let oscillators = [];
let loopInterval = null;

export function initBgm(audioCtx, masterVolume) {
  ctx = audioCtx;
  masterGain = masterVolume;
}

export function setMuted(m) {
  muted = m;
  if (currentGain) {
    currentGain.gain.value = m ? 0 : 0.15;
  }
}

export function startBgm(layerIndex) {
  if (!ctx) return;

  // 同じ層なら何もしない
  if (currentLayer === layerIndex) return;

  // 前の層を止める
  stopBgm();

  currentLayer = layerIndex;

  // 層別の周波数セット（ペンタトニック: C, D, E, G, A）
  const baseFreqs = [264, 297, 330, 396, 440]; // C4-A4

  // 層が深いほど低い
  const layerOffsets = [0, -12, -24, -36, -48]; // セント単位
  const offset = layerOffsets[layerIndex] || 0;
  const freqs = baseFreqs.map(f => f * Math.pow(2, offset / 1200));

  // 現在のゲイン（ボリューム）
  currentGain = ctx.createGain();
  currentGain.gain.value = muted ? 0 : 0.15;
  currentGain.connect(masterGain);

  // BGMループを開始
  playBgmLoop(freqs);
}

export function setBgmLayer(layerIndex) {
  if (!ctx || layerIndex === currentLayer) return;

  // クロスフェード（前の層をフェードアウト、新しい層をフェードイン）
  if (currentGain) {
    const t = ctx.currentTime;
    currentGain.gain.setValueAtTime(currentGain.gain.value, t);
    currentGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
  }

  // 新しい層を開始（0.5秒の遅延でスムーズに）
  setTimeout(() => startBgm(layerIndex), 500);
}

export function stopBgm() {
  if (loopInterval) {
    clearInterval(loopInterval);
    loopInterval = null;
  }

  oscillators.forEach(o => {
    try { o.stop(); } catch {}
  });
  oscillators = [];

  if (currentGain) {
    const t = ctx.currentTime;
    currentGain.gain.setValueAtTime(currentGain.gain.value, t);
    currentGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    currentGain.disconnect();
    currentGain = null;
  }

  currentLayer = -1;
}

function playBgmLoop(freqs) {
  // ~60 BPM = 1 beat per second = 4 beats per loop
  // 層が深いほど更新間隔が広い
  const intervals = [800, 900, 1200, 1500, 2000]; // ミリ秒
  const interval = intervals[currentLayer] || 1000;

  // ループ内で随時パッドを再生
  function playLoop() {
    if (!ctx || !currentGain || currentLayer < 0) return;

    const t = ctx.currentTime;

    // パッド音（ドローン。ゆっくり変わる）
    if (Math.random() < 0.3) {
      const freq = freqs[Math.floor(Math.random() * freqs.length)];
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.08, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + interval / 500);
      o.connect(g).connect(currentGain);
      o.start(t);
      o.stop(t + interval / 500);
      oscillators.push(o);
    }

    // 稀な鈴音（層が深いほど稀）
    const bellChance = [0.15, 0.12, 0.08, 0.05, 0.03][currentLayer] || 0.1;
    if (Math.random() < bellChance) {
      const freq = freqs[Math.floor(Math.random() * freqs.length)] * 2; // 高音
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.05, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      o.connect(g).connect(currentGain);
      o.start(t);
      o.stop(t + 0.5);
      oscillators.push(o);
    }
  }

  loopInterval = setInterval(playLoop, interval);
  playLoop(); // 即座に最初の音を生成
}
