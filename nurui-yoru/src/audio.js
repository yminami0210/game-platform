// ぬるい夜 — 全音を Web Audio で合成（音声ファイル・外部ライブラリなし）
// 常駐ノードは unlock 時に1回だけ作り、update では AudioParam.setTargetAtTime のみ使う。
// 環境音（虫・車・布ずれ・「ん…」）も常駐ノードのゲート操作で鳴らすので update はノードを作らない。

export function createAudio() {
  let ctx = null, master = null, noiseBuf = null, muted = false;
  let N = null; // 常駐ノード群
  let t0 = 0, lastAlert = 0, nextCricket = 0, nextCar = 0, nextRustle = 0, groaned = false;
  const MASTER = 0.6;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

  function makeNoise() {
    const len = ctx.sampleRate * 2;
    const b = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  function noiseSrc() {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf; s.loop = true;
    s.loopStart = Math.random(); // 位相をずらす
    return s;
  }
  function g(v = 0) { const n = ctx.createGain(); n.gain.value = v; return n; }
  function filt(type, f, q = 1) { const n = ctx.createBiquadFilter(); n.type = type; n.frequency.value = f; n.Q.value = q; return n; }
  function osc(type, f) { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; return o; }
  function pan() { return ctx.createStereoPanner ? ctx.createStereoPanner() : g(1); }

  function build() {
    master = g(muted ? 0 : MASTER);
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    master.connect(comp); comp.connect(ctx.destination);
    noiseBuf = makeNoise();
    N = {};

    // --- 羽音 ---
    N.wingOut = g(0); N.wingPan = pan();
    N.wingLP = filt('lowpass', 1200, 0.6);
    N.wingPeak = filt('peaking', 1300, 2); N.wingPeak.gain.value = 2;
    N.saw1 = osc('sawtooth', 520); N.saw2 = osc('sawtooth', 523);
    N.saw2g = g(0.5);
    N.vib = osc('sine', 7); N.vibAmt = g(4);
    N.vib.connect(N.vibAmt); N.vibAmt.connect(N.saw1.frequency); N.vibAmt.connect(N.saw2.frequency);
    // 羽ばたきの細かい AM
    N.am = osc('sine', 38); N.amAmt = g(0.18); N.wingAM = g(0.82);
    N.am.connect(N.amAmt); N.amAmt.connect(N.wingAM.gain);
    N.saw1.connect(N.wingPeak); N.saw2.connect(N.saw2g); N.saw2g.connect(N.wingPeak);
    N.wingPeak.connect(N.wingLP); N.wingLP.connect(N.wingAM); N.wingAM.connect(N.wingOut);
    // かすれ（hp 低下）
    N.hoarseSrc = noiseSrc(); N.hoarseBP = filt('bandpass', 1500, 3); N.hoarse = g(0);
    N.hoarseSrc.connect(N.hoarseBP); N.hoarseBP.connect(N.hoarse); N.hoarse.connect(N.wingOut);
    N.wingOut.connect(N.wingPan); N.wingPan.connect(master);

    // --- 虫（短いチリチリ：高い正弦をゲート） ---
    N.crk = osc('sine', 4300); N.crkTrem = osc('square', 60); N.crkTremAmt = g(0.5); N.crkAM = g(0.5);
    N.crkTrem.connect(N.crkTremAmt); N.crkTremAmt.connect(N.crkAM.gain);
    N.crkGate = g(0); N.crkPan = pan();
    N.crk.connect(N.crkAM); N.crkAM.connect(N.crkGate); N.crkGate.connect(N.crkPan); N.crkPan.connect(master);

    // --- 遠くの車 ---
    N.carSrc = noiseSrc(); N.carLP = filt('lowpass', 350, 0.5); N.car = g(0); N.carPan = pan();
    N.carSrc.connect(N.carLP); N.carLP.connect(N.car); N.car.connect(N.carPan); N.carPan.connect(master);

    // --- 扇風機 ---
    N.fanHum = osc('triangle', 100); N.fanHum2 = osc('sine', 200); N.fanHumG = g(0.5); N.fanHum2G = g(0.2);
    N.fanWindSrc = noiseSrc(); N.fanWindLP = filt('lowpass', 900, 0.4); N.fanWindG = g(0.6);
    N.fanWob = osc('sine', 0.35); N.fanWobAmt = g(0.25); N.fanWobGain = g(0.75);
    N.fanWob.connect(N.fanWobAmt); N.fanWobAmt.connect(N.fanWobGain.gain); // 首振り
    N.fan = g(0);
    N.fanHum.connect(N.fanHumG); N.fanHum2.connect(N.fanHum2G); N.fanHumG.connect(N.fan); N.fanHum2G.connect(N.fan);
    N.fanWindSrc.connect(N.fanWindLP); N.fanWindLP.connect(N.fanWindG); N.fanWindG.connect(N.fanWobGain); N.fanWobGain.connect(N.fan);
    N.fan.connect(master);

    // --- 吸う「ちゅー」 ---
    N.suckSrc = noiseSrc(); N.suckBP = filt('bandpass', 900, 6); N.suck = g(0);
    N.suckLFO = osc('sine', 3); N.suckLFOAmt = g(120);
    N.suckLFO.connect(N.suckLFOAmt); N.suckLFOAmt.connect(N.suckBP.frequency);
    N.suckSrc.connect(N.suckBP); N.suckBP.connect(N.suck); N.suck.connect(master);

    // --- 布ずれ ---
    N.rusSrc = noiseSrc(); N.rusHP = filt('bandpass', 2200, 0.6); N.rus = g(0);
    N.rusSrc.connect(N.rusHP); N.rusHP.connect(N.rus); N.rus.connect(master);

    // --- 低い声「ん…」 ---
    N.voice = osc('sawtooth', 110); N.voiceF = filt('lowpass', 500, 4); N.voiceG = g(0);
    N.voice.connect(N.voiceF); N.voiceF.connect(N.voiceG); N.voiceG.connect(master);

    [N.saw1, N.saw2, N.vib, N.am, N.hoarseSrc, N.crk, N.crkTrem, N.carSrc, N.fanHum, N.fanHum2,
      N.fanWindSrc, N.fanWob, N.suckSrc, N.suckLFO, N.rusSrc, N.voice].forEach((s) => s.start());
    N.music = g(0); N.music.connect(master);
    N.musicLP = filt('lowpass', 6000, 0.7); N.musicLP.connect(N.music);
    t0 = ctx.currentTime;
    startScheduler();
    nextCricket = t0 + 1; nextCar = t0 + rnd(8, 20); nextRustle = t0 + 3;
  }


  // ================= 音楽（ミッション風・lookahead スケジューラ） =================
  let active = 0; // 鳴っている単発ソース数
  function track(src) { active++; src.onended = () => { active--; }; }
  const BPM = [92, 104, 118, 134, 150];
  // 面ごとのキー（ルートの MIDI）と音色
  const MOODS = [null,
    { root: 38, wave: 'square' }, { root: 40, wave: 'square' }, { root: 41, wave: 'sawtooth' }, { root: 36, wave: 'square' },
    { root: 43, wave: 'sawtooth' }, { root: 39, wave: 'square' }, { root: 42, wave: 'sawtooth' }, { root: 37, wave: 'square' },
    { root: 44, wave: 'sawtooth' }, { root: 33, wave: 'sawtooth', final: true }];
  const M = { bpm: 92, target: 92, step: 0, next: 0, timer: 0, on: false, alert: 0, landed: false, sucking: false,
    blood: 0, stage: 1, breakUntil: 0, done: false, cutUntil: 0 };
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  // ベースのオスティナート（短調、ルートからの半音）
  const BASS = [0, 0, 12, 0, 3, 0, 12, 1];
  const ARP = [12, 15, 19, 15, 13, 15, 19, 22];
  function setStageMood(n) { M.stage = Math.max(1, Math.min(10, n | 0)); }

  function mNote({ type = 'square', f, t, dur, vol, lp = 2000, glide = null }) {
    const o = osc(type, f), fl = filt('lowpass', lp, 1), gg = g(0);
    if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + dur);
    gg.gain.setValueAtTime(0, t); gg.gain.linearRampToValueAtTime(vol, t + 0.005);
    gg.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(fl); fl.connect(gg); gg.connect(N.musicLP);
    track(o); o.start(t); o.stop(t + dur + 0.03);
  }
  function mNoise({ t, dur, vol, type = 'highpass', f = 7000, q = 0.7 }) {
    const s = noiseSrc(), fl = filt(type, f, q), gg = g(0);
    gg.gain.setValueAtTime(vol, t); gg.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(gg); gg.connect(N.musicLP);
    track(s); s.start(t, Math.random()); s.stop(t + dur + 0.03);
  }
  function pad(t, root, dur, dissonant) {
    const iv = dissonant ? [0, 1, 6, 10] : [0, 3, 7, 10];
    iv.forEach((i) => {
      const o = osc('sawtooth', mtof(root + 24 + i)), fl = filt('lowpass', 900, 0.5), gg = g(0);
      gg.gain.setValueAtTime(0, t); gg.gain.linearRampToValueAtTime(0.012, t + dur * 0.4);
      gg.gain.linearRampToValueAtTime(0, t + dur);
      o.connect(fl); fl.connect(gg); gg.connect(N.musicLP);
      track(o); o.start(t); o.stop(t + dur + 0.03);
    });
  }
  function scheduleStep(i, t) {
    const sp = 60 / M.bpm / 4; // 16分
    if (t < M.breakUntil || t < M.cutUntil || M.done) return;
    const mood = MOODS[M.stage];
    const root = mood.root + (M.blood > 0.6 ? 1 : 0) + (M.blood > 0.9 ? 1 : 0); // 欲張るほど半音上げる
    const al = M.alert, thin = M.landed, s16 = i % 16;
    // ベース（8分）
    if (i % 2 === 0) {
      const b = BASS[(i / 2) % 8];
      if (!thin || s16 % 4 === 0) mNote({ type: 'triangle', f: mtof(root + b), t, dur: sp * 1.6, vol: 0.11, lp: 500 });
    }
    // 吸っている間：心拍風の低音パルス（ドクン、ドクン）
    if (M.sucking && (s16 === 0 || s16 === 3)) mNote({ type: 'sine', f: mtof(root - 12), glide: mtof(root - 14), t, dur: 0.18, vol: s16 ? 0.1 : 0.15, lp: 300 });
    // スタッカートのシンセ
    if (!thin && (s16 % 4 === 2 || (al >= 1 && s16 % 4 === 3 && i % 32 > 16))) {
      mNote({ type: mood.wave, f: mtof(root + ARP[(i >> 1) % 8]), t, dur: sp * 0.5, vol: 0.035, lp: 1800 + al * 300 });
    }
    // ハイハット（0〜1:8分 / 2以上:16分）、リム
    const hh = al >= 2 ? true : i % 2 === 0;
    if (hh && !(thin && i % 4)) mNoise({ t, dur: 0.03, vol: (i % 4 === 2 ? 0.03 : 0.018) });
    if (s16 === 4 || s16 === 12) mNoise({ t, dur: 0.05, vol: thin ? 0.02 : 0.045, type: 'bandpass', f: 1700, q: 4 });
    // パッド（2小節ごと）、3以上で不協和＋ティンパニ風
    if (i % 32 === 0 && (al >= 1 || mood.final)) pad(t, root, sp * 32, al >= 3 || mood.final);
    if (al >= 3 && s16 === 0) mNote({ type: 'sine', f: mtof(root - 5), glide: mtof(root - 7), t, dur: 0.5, vol: 0.14, lp: 400 });
    if (mood.final && s16 === 8) mNote({ type: 'sine', f: mtof(root - 12), t, dur: 0.4, vol: 0.1, lp: 300 });
  }
  function startScheduler() {
    M.next = ctx.currentTime + 0.1;
    M.timer = setInterval(() => {
      if (!ctx || ctx.state !== 'running') return;
      // テンポはなめらかに
      M.bpm += (M.target - M.bpm) * 0.06;
      while (M.next < ctx.currentTime + 0.1) {
        if (M.on) scheduleStep(M.step, M.next);
        M.step++;
        M.next += 60 / M.bpm / 4;
      }
    }, 25);
  }
  function musicUpdate(s, t) {
    const al = Math.max(0, Math.min(4, s.alertMax | 0));
    if (al === 4 && M.alert < 4) M.breakUntil = t + 0.6; // 一瞬ブレイク
    M.alert = al; M.target = BPM[al] + (MOODS[M.stage].final ? 6 : 0);
    M.landed = !!s.landed; M.sucking = !!s.sucking; M.blood = clamp(s.blood01);
    if (s.playing && !M.on) { M.done = false; M.cutUntil = 0; }
    M.on = !!s.playing;
    const v = s.playing && t >= M.cutUntil ? (M.landed ? 0.75 : 1) : 0;
    N.music.gain.setTargetAtTime(v, t, s.playing ? 0.3 : 1.2);
  }
  function musicCut(len = 0) {
    const t = ctx.currentTime;
    N.music.gain.cancelScheduledValues(t); N.music.gain.setValueAtTime(0, t);
    M.cutUntil = t + 1.5;
    if (len) N.music.gain.setValueAtTime(0, t);
  }
  function snareRoll() {
    const t = ctx.currentTime;
    for (let k = 0; k < 12; k++) {
      const s = noiseSrc(), fl = filt('bandpass', 2500, 1), gg = g(0), tt = t + k * 0.05;
      gg.gain.setValueAtTime(0.02 + k * 0.008, tt); gg.gain.exponentialRampToValueAtTime(0.0001, tt + 0.045);
      s.connect(fl); fl.connect(gg); gg.connect(master);
      track(s); s.start(tt, Math.random()); s.stop(tt + 0.06);
    }
  }

  function unlock() {
    try {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ctx = new AC();
        build();
      }
      if (ctx.state !== 'running') ctx.resume();
      // iOS Safari 用：ごく短い無音バッファ
      const b = ctx.createBuffer(1, 1, 22050);
      const s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0);
    } catch (e) { /* 音が出なくてもゲームは続く */ }
  }

  function setMuted(m) {
    muted = !!m;
    if (master) master.gain.setTargetAtTime(muted ? 0 : MASTER, ctx.currentTime, 0.05);
  }

  // ゲート（常駐ノードの音量を山型に動かす。ノードは作らない）
  function gate(param, t, peak, att, dur) {
    param.cancelScheduledValues(t);
    param.setTargetAtTime(peak, t, att);
    param.setTargetAtTime(0, t + dur, dur * 0.5 + 0.02);
  }

  function update(s) {
    if (!ctx || !N) return;
    const t = ctx.currentTime;
    const p = s.playing;
    // 羽音
    const flying = p && !s.landed && !s.glide;
    const sp = clamp(s.speed01), nr = clamp(s.near01);
    const f = 450 + 200 * sp;
    N.saw1.frequency.setTargetAtTime(f, t, 0.08);
    N.saw2.frequency.setTargetAtTime(f * 1.006, t, 0.08);
    N.wingLP.frequency.setTargetAtTime(1000 + 300 * nr, t, 0.1);
    const wv = flying ? (0.012 + 0.012 * sp) * (0.7 + 0.5 * nr) : 0;
    N.wingOut.gain.setTargetAtTime(wv, t, flying ? 0.04 : 0.03);
    const hp = clamp(s.hp01 == null ? 1 : s.hp01);
    N.hoarse.gain.setTargetAtTime(hp < 0.5 ? (0.5 - hp) * 0.08 : 0, t, 0.2);
    N.saw2g.gain.setTargetAtTime(0.5 - (hp < 0.5 ? (0.5 - hp) * 0.6 : 0), t, 0.2);
    if (N.wingPan.pan) N.wingPan.pan.setTargetAtTime(Math.sin((t - t0) * 0.7) * 0.25 + Math.sin((t - t0) * 1.9) * 0.08, t, 0.1);

    // 吸う
    const b = clamp(s.blood01);
    N.suckBP.frequency.setTargetAtTime(950 - 350 * b, t, 0.2);
    N.suck.gain.setTargetAtTime(p && s.sucking ? 0.05 : 0, t, 0.06);

    // 扇風機
    N.fan.gain.setTargetAtTime(p && s.fanOn ? 0.015 + 0.06 * clamp(s.fanNear01) : 0, t, 0.3);

    // 虫（不規則なチリチリ）
    if (t >= nextCricket) {
      N.crk.frequency.setTargetAtTime(rnd(3900, 4700), t, 0.01);
      N.crkTrem.frequency.setTargetAtTime(rnd(45, 75), t, 0.01);
      if (N.crkPan.pan) N.crkPan.pan.setTargetAtTime(rnd(-0.8, 0.8), t, 0.01);
      gate(N.crkGate.gain, t + 0.02, rnd(0.008, 0.02), 0.01, rnd(0.08, 0.35));
      nextCricket = t + (Math.random() < 0.3 ? rnd(0.15, 0.4) : rnd(0.8, 3));
    }
    // 遠くの車
    if (t >= nextCar) {
      const dur = rnd(3, 5);
      N.car.gain.cancelScheduledValues(t);
      N.car.gain.setTargetAtTime(0.05, t, dur * 0.3);
      N.car.gain.setTargetAtTime(0, t + dur * 0.6, dur * 0.25);
      if (N.carPan.pan) { const d = Math.random() < 0.5 ? -1 : 1; N.carPan.pan.setTargetAtTime(-0.7 * d, t, 0.01); N.carPan.pan.setTargetAtTime(0.7 * d, t + 0.05, dur * 0.4); }
      nextCar = t + rnd(18, 40);
    }
    // 布ずれ・声
    const al = s.alertMax | 0;
    if (p && al >= 2 && t >= nextRustle) {
      N.rusHP.frequency.setTargetAtTime(rnd(1500, 3000), t, 0.05);
      gate(N.rus.gain, t, rnd(0.03, 0.06), 0.08, rnd(0.4, 0.9));
      nextRustle = t + rnd(4, 9);
    }
    if (al < 2) nextRustle = Math.max(nextRustle, t + 1.5);
    if (p && al >= 3 && lastAlert < 3 && !groaned) { groan(t); groaned = true; }
    if (al < 3) groaned = false;
    lastAlert = al;
    musicUpdate(s, t);
  }

  function groan(t, pitch = 1) {
    N.voice.frequency.cancelScheduledValues(t);
    N.voice.frequency.setTargetAtTime(115 * pitch, t, 0.01);
    N.voice.frequency.setTargetAtTime(92 * pitch, t + 0.1, 0.25);
    N.voiceF.frequency.setTargetAtTime(450, t, 0.05);
    gate(N.voiceG.gain, t, 0.06, 0.06, 0.45);
  }

  // ---- 単発音（短く、終わったら自動で消える） ----
  function ready() { return ctx && N && ctx.state === 'running'; }
  function burst({ type = 'bandpass', f = 1000, q = 1, vol = 0.2, dur = 0.1, att = 0.002, fEnd = null, pan: pv = 0 }) {
    const t = ctx.currentTime;
    const s = noiseSrc(), fl = filt(type, f, q), gg = g(0);
    if (fEnd) fl.frequency.exponentialRampToValueAtTime(fEnd, t + dur);
    gg.gain.setValueAtTime(0, t);
    gg.gain.linearRampToValueAtTime(vol, t + att);
    gg.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(gg);
    if (pv && ctx.createStereoPanner) { const pn = ctx.createStereoPanner(); pn.pan.value = pv; gg.connect(pn); pn.connect(master); }
    else gg.connect(master);
    track(s); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  function tone({ type = 'sine', f = 440, fEnd = null, vol = 0.1, dur = 0.2, at = 0, att = 0.01 }) {
    const t = ctx.currentTime + at;
    const o = osc(type, f), gg = g(0);
    if (fEnd) o.frequency.exponentialRampToValueAtTime(fEnd, t + dur);
    gg.gain.setValueAtTime(0, t);
    gg.gain.linearRampToValueAtTime(vol, t + att);
    gg.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(gg); gg.connect(master);
    track(o); o.start(t); o.stop(t + dur + 0.05);
  }

  function land() { if (!ready()) return; tone({ type: 'sine', f: 900, fEnd: 500, vol: 0.03, dur: 0.06 }); burst({ f: 3000, q: 2, vol: 0.02, dur: 0.04 }); }
  function bounce() { if (!ready()) return; tone({ type: 'triangle', f: 700, fEnd: 1100, vol: 0.05, dur: 0.09 }); burst({ f: 2000, q: 1.5, vol: 0.04, dur: 0.06 }); }
  function swatWarn() { if (!ready()) return; snareRoll(); burst({ type: 'bandpass', f: 400, fEnd: 1400, q: 0.8, vol: 0.12, dur: 0.35, att: 0.25 }); }
  function miss() { if (!ready()) return; burst({ type: 'lowpass', f: 2500, q: 0.7, vol: 0.22, dur: 0.12, pan: rnd(-0.5, 0.5) }); tone({ f: 160, fEnd: 70, vol: 0.08, dur: 0.1 }); }
  function slap() {
    if (!ready()) return;
    N.wingOut.gain.cancelScheduledValues(ctx.currentTime); N.wingOut.gain.setValueAtTime(0, ctx.currentTime);
    musicCut();
    burst({ type: 'highpass', f: 900, q: 0.7, vol: 0.5, dur: 0.15, att: 0.001 });
    tone({ f: 180, fEnd: 55, vol: 0.25, dur: 0.18 });
  }
  function clear() {
    if (!ready()) return;
    musicCut(0.15); M.done = true;
    // 控えめな3音（夜明け寄りの柔らかいサイン）
    [[392, 0], [523, 0.12], [659, 0.24], [784, 0.36]].forEach(([f, at]) => tone({ type: 'triangle', f, vol: 0.09, dur: 0.3, at, att: 0.01 }));
    [523, 659, 784].forEach((f) => tone({ f, vol: 0.05, dur: 1.0, at: 0.5, att: 0.02 }));
  }
  function sleepTalk() {
    if (!ready()) return;
    const t = ctx.currentTime;
    // もごもご：声帯っぽいのこぎりをフォルマント風ローパスで2〜3回うねらせる
    N.voice.frequency.cancelScheduledValues(t);
    N.voiceF.frequency.cancelScheduledValues(t);
    N.voiceG.gain.cancelScheduledValues(t);
    let at = 0;
    const n = 2 + (Math.random() * 2 | 0);
    for (let i = 0; i < n; i++) {
      const d = rnd(0.12, 0.22);
      N.voice.frequency.setTargetAtTime(rnd(120, 160), t + at, 0.04);
      N.voiceF.frequency.setTargetAtTime(rnd(350, 800), t + at, 0.05);
      N.voiceG.gain.setTargetAtTime(0.05, t + at, 0.03);
      N.voiceG.gain.setTargetAtTime(0.01, t + at + d, 0.03);
      at += d + rnd(0.03, 0.08);
    }
    N.voiceG.gain.setTargetAtTime(0, t + at, 0.06);
  }

  return {
    unlock, setMuted, update, land, bounce, swatWarn, miss, slap, clear, sleepTalk,
    setStageMood, get context() { return ctx; },
    get stats() { return { active, bpm: M.bpm, targetBpm: M.target, stage: M.stage, playing: M.on }; },
  };
}
