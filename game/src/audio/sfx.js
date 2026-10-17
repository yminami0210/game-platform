// 音はすべて Web Audio でその場で作る（外部音源なし）。
// 効果音: 木の糸巻き・鈴・ばね。曲: 足踏みオルガン風の和音＋爪弾く旋律（オリジナル）。
let ac = null, master = null, sfxBus = null, musicBus = null, noiseBuf = null;
let muted = false, musicVol = 0.32;

export function unlock() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  ac = new AC();
  master = ac.createGain(); master.gain.value = muted ? 0 : 0.8; master.connect(ac.destination);
  sfxBus = ac.createGain(); sfxBus.gain.value = 0.7; sfxBus.connect(master);
  musicBus = ac.createGain(); musicBus.gain.value = musicVol; musicBus.connect(master);
  noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
  const d = noiseBuf.getChannelData(0); let s = 7;
  for (let i = 0; i < d.length; i++) { s = (s * 16807) % 2147483647; d[i] = s / 1073741823.5 - 1; }
}
export function setMuted(m) { muted = m; if (master) master.gain.setTargetAtTime(m ? 0 : 0.8, ac.currentTime, 0.02); }
export const isMuted = () => muted;

const NOTE = n => { const m = /^([A-G])(#?)(\d)$/.exec(n); const i = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] ? 1 : 0); return 440 * Math.pow(2, (i + (Number(m[3]) - 4) * 12 - 9) / 12); };

function tone({ f, f2, type = 'square', t = 0, dur = 0.1, vol = 0.2, a = 0.005, bus = sfxBus, lp = 0 }) {
  if (!ac) return;
  const now = ac.currentTime + t;
  const o = ac.createOscillator(), gn = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, now);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, now + dur);
  gn.gain.setValueAtTime(0, now); gn.gain.linearRampToValueAtTime(vol, now + a); gn.gain.exponentialRampToValueAtTime(0.0008, now + dur);
  let node = o;
  if (lp) { const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; o.connect(fl); node = fl; }
  node.connect(gn); gn.connect(bus); o.start(now); o.stop(now + dur + 0.02);
}
function noise({ t = 0, dur = 0.08, vol = 0.2, hp = 800, lp = 8000, bus = sfxBus }) {
  if (!ac) return;
  const now = ac.currentTime + t;
  const src = ac.createBufferSource(); src.buffer = noiseBuf;
  const h = ac.createBiquadFilter(); h.type = 'highpass'; h.frequency.value = hp;
  const l = ac.createBiquadFilter(); l.type = 'lowpass'; l.frequency.value = lp;
  const gn = ac.createGain(); gn.gain.setValueAtTime(vol, now); gn.gain.exponentialRampToValueAtTime(0.0008, now + dur);
  src.connect(h); h.connect(l); l.connect(gn); gn.connect(bus); src.start(now, Math.random() * 0.3); src.stop(now + dur + 0.02);
}
const bell = (f, t = 0, vol = 0.12, dur = 0.35) => { tone({ f, type: 'sine', t, dur, vol }); tone({ f: f * 2.76, type: 'sine', t, dur: dur * 0.4, vol: vol * 0.3 }); };
const wood = (t = 0, vol = 0.18, f = 1800) => { noise({ t, dur: 0.035, vol, hp: f, lp: f * 2.5 }); tone({ f: f / 3, type: 'triangle', t, dur: 0.04, vol: vol * 0.6 }); };

export function play(name, o = {}) {
  if (!ac || muted) return;
  switch (name) {
    case 'jump': tone({ f: 330, f2: 560, type: 'triangle', dur: 0.12, vol: 0.13 }); wood(0, 0.06, 2600); break;
    case 'land': noise({ dur: 0.06, vol: 0.05 + 0.12 * (o.k ?? 0.5), hp: 120, lp: 900 }); break;
    case 'skid': noise({ dur: 0.1, vol: 0.06, hp: 1500, lp: 5000 }); break;
    case 'stomp': tone({ f: 220, f2: 90, type: 'square', dur: 0.09, vol: 0.12, lp: 1400 }); bell(NOTE('E6') * Math.pow(2, Math.min(6, (o.combo ?? 1) - 1) / 12), 0.03, 0.08, 0.25); break;
    case 'coin': bell(NOTE('B5'), 0, 0.07, 0.18); bell(NOTE('E6'), 0.05, 0.07, 0.3); break;
    case 'medal': ['C6', 'E6', 'G6', 'C7'].forEach((n, i) => bell(NOTE(n), i * 0.07, 0.09, 0.5)); break;
    case 'spring': tone({ f: 180, f2: 720, type: 'sine', dur: 0.28, vol: 0.2 }); tone({ f: 186, f2: 740, type: 'triangle', dur: 0.22, vol: 0.06 }); break;
    case 'box': wood(0, 0.2, 900); wood(0.04, 0.12, 1200); break;
    case 'power': ['G5', 'C6', 'D6', 'G6', 'C7'].forEach((n, i) => tone({ f: NOTE(n), type: 'triangle', t: i * 0.05, dur: 0.16, vol: 0.09 })); break;
    case 'powerdown': ['G5', 'D5', 'B4', 'G4'].forEach((n, i) => tone({ f: NOTE(n), type: 'triangle', t: i * 0.06, dur: 0.14, vol: 0.1 })); noise({ dur: 0.3, vol: 0.08, hp: 2000 }); break;
    case 'die': tone({ f: 520, f2: 110, type: 'square', dur: 0.6, vol: 0.1, lp: 1500 }); noise({ dur: 0.25, vol: 0.1, hp: 1500 }); break;
    case 'checkpoint': bell(NOTE('G5'), 0, 0.1, 0.3); bell(NOTE('D6'), 0.1, 0.1, 0.5); break;
    case 'clear': ['C5', 'E5', 'G5', 'C6', 'G5', 'C6', 'E6'].forEach((n, i) => tone({ f: NOTE(n), type: 'triangle', t: i * 0.09, dur: i === 6 ? 0.8 : 0.16, vol: 0.12 })); break;
    case 'switch': wood(0, 0.25, 3000); tone({ f: 900, f2: 600, type: 'square', dur: 0.05, vol: 0.06, lp: 2500 }); break;
    case 'crumbleStart': noise({ dur: 0.15, vol: 0.05, hp: 3000 }); break;
    case 'crumble': noise({ dur: 0.25, vol: 0.09, hp: 600, lp: 3000 }); break;
    case 'shoot': noise({ dur: 0.08, vol: 0.1, hp: 900, lp: 3000 }); tone({ f: 700, f2: 300, type: 'triangle', dur: 0.08, vol: 0.06 }); break;
    case 'hop': tone({ f: 260, f2: 420, type: 'square', dur: 0.06, vol: 0.05, lp: 1800 }); break;
    case 'bonk': wood(0, 0.12, 700); break;
    case 'bosshit': tone({ f: 160, f2: 60, type: 'square', dur: 0.25, vol: 0.18, lp: 1200 }); bell(NOTE('A5'), 0.05, 0.1, 0.4); noise({ dur: 0.2, vol: 0.12, hp: 400 }); break;
    case 'bossland': noise({ dur: 0.2, vol: 0.18, hp: 60, lp: 500 }); break;
    case 'swoop': noise({ dur: 0.35, vol: 0.07, hp: 500, lp: 2500 }); break;
    case 'bossdown': ['E5', 'C5', 'A4', 'E4', 'C4'].forEach((n, i) => tone({ f: NOTE(n), type: 'square', t: i * 0.12, dur: 0.2, vol: 0.08, lp: 1500 })); break;
    case 'knot': ['C5', 'G5', 'E6', 'C6', 'G6', 'C7'].forEach((n, i) => bell(NOTE(n), i * 0.11, 0.1, 0.8)); break;
    case 'select': wood(0, 0.12, 2200); break;
    case 'ok': bell(NOTE('A5'), 0, 0.08, 0.2); bell(NOTE('E6'), 0.05, 0.07, 0.3); break;
    case 'sew': tone({ f: 1400, f2: 1100, type: 'triangle', dur: 0.04, vol: 0.05 }); break;
    case 'step': wood(0, 0.06, 2400); break;
  }
}

// ---- 曲 ----
// 1小節 = 8分音符×8。chords は小節ごと。mel は '.' で休み、'-' で前の音を伸ばす（作曲: 社内オリジナル）
const SONGS = {
  meadow: { bpm: 112, chords: ['C', 'Am', 'F', 'G', 'C', 'Am', 'F', 'G'],
    mel: 'E5 . G5 . A5 G5 E5 . | D5 . E5 . C5 - . . | A4 . C5 . D5 C5 A4 . | G4 . A4 . C5 - D5 . | E5 . G5 . C6 . A5 G5 | E5 . D5 . C5 . A4 . | C5 . D5 E5 G5 . E5 D5 | C5 - - - . . . .' },
  valley: { bpm: 104, chords: ['D', 'Bm', 'G', 'A', 'D', 'Bm', 'Em', 'A'], swing: true,
    mel: 'F#5 . A5 - B5 . A5 F#5 | E5 - . . D5 . B4 . | D5 . E5 . G5 . F#5 E5 | E5 - - . . . A4 . | F#5 . A5 . D6 . B5 A5 | F#5 . E5 . D5 . B4 . | G4 . B4 . E5 . D5 B4 | A4 - - - . . . .' },
  plateau: { bpm: 120, chords: ['F', 'Dm', 'Bb', 'C', 'F', 'Dm', 'Bb', 'C'],
    mel: 'A5 . . F5 G5 . A5 . | D5 - . . F5 . D5 . | D5 . F5 . G5 F5 D5 . | E5 . . . G5 - . . | A5 . C6 . A5 . G5 F5 | D5 . F5 . A5 . F5 . | G5 . F5 . D5 . F5 G5 | F5 - - - . . . .' },
  secret: { bpm: 96, chords: ['G', 'Em', 'C', 'D'],
    mel: 'D6 . B5 . G5 . B5 . | E6 . . B5 G5 . E5 . | E5 . G5 . C6 . B5 A5 | A5 - - . F#5 . . .' },
  fort: { bpm: 96, chords: ['Am', 'F', 'E', 'Am', 'Dm', 'F', 'E', 'E'],
    mel: 'A4 . C5 . E5 . D5 C5 | D5 . . C5 A4 - . . | B4 . D5 . E5 . G#4 . | A4 - - . . . . . | D5 . F5 . A5 . G5 F5 | F5 . E5 . C5 - . . | B4 . C5 . D5 . E5 . | G#4 - - - B4 - - - ' },
  boss: { bpm: 144, chords: ['Dm', 'Dm', 'Bb', 'A', 'Dm', 'Dm', 'Gm', 'A'], drive: true,
    mel: 'D5 . D5 F5 . A5 . F5 | E5 . D5 . C#5 . . . | D5 . F5 . Bb5 . A5 . | A5 - G5 . E5 - . . | D5 . D5 F5 . A5 . D6 | C6 . A5 . F5 . . . | G5 . Bb5 . D6 . C6 Bb5 | A5 - - - C#5 - E5 - ' },
  map: { bpm: 88, chords: ['C', 'F', 'C', 'G', 'C', 'F', 'G', 'C'], box: true,
    mel: 'G5 . E5 . C5 . E5 . | A5 . F5 . C5 . . . | G5 . E5 . C6 . B5 . | D5 - - . . . . . | E5 . G5 . C6 . G5 . | A5 . C6 . F5 . . . | D5 . G5 . B5 . D6 . | C6 - - - . . . .' },
  ending: { bpm: 76, chords: ['F', 'G', 'Em', 'Am', 'F', 'G', 'C', 'C'],
    mel: 'A5 - - . G5 . F5 . | G5 - - . D5 . . . | E5 . G5 . B5 - A5 G5 | A5 - - . . . . . | C6 - - . A5 . F5 . | D6 - - . B5 . G5 . | E5 . G5 . C6 - - - | C6 - - - . . . .' },
  title: { bpm: 84, chords: ['Am', 'F', 'C', 'G'], box: true,
    mel: 'E5 . . A5 . . G5 . | F5 . . C5 . . . . | E5 . . G5 . . C6 . | B5 - - - D5 - - - ' },
};
const CHORD = {
  C: ['C3', 'E3', 'G3'], Am: ['A2', 'C3', 'E3'], F: ['F2', 'A2', 'C3'], G: ['G2', 'B2', 'D3'], D: ['D3', 'F#3', 'A3'], Bm: ['B2', 'D3', 'F#3'],
  Em: ['E3', 'G3', 'B3'], A: ['A2', 'C#3', 'E3'], Dm: ['D3', 'F3', 'A3'], Bb: ['A#2', 'D3', 'F3'], E: ['E3', 'G#3', 'B3'], Gm: ['G2', 'A#2', 'D3'],
};
const parse = s => s.split('|').map(b => b.trim().split(/\s+/));
let song = null, songName = null, nextT = 0, stepI = 0, timer = null;

export function music(name) {
  if (songName === name) return;
  songName = name;
  if (!name) { song = null; return; }
  song = SONGS[name] ? { ...SONGS[name], bars: parse(SONGS[name].mel.replace(/Bb/g, 'A#')) } : null;
  stepI = 0;
  if (!ac) return;
  nextT = ac.currentTime + 0.08;
  if (!timer) timer = setInterval(schedule, 25);
}
export const currentMusic = () => songName;

function schedule() {
  if (!ac || !song) return;
  const spb = 60 / song.bpm / 2; // 8分音符
  if (nextT < ac.currentTime - 0.3) nextT = ac.currentTime + 0.02; // 復帰時に溜めない
  while (nextT < ac.currentTime + 0.12) {
    const bar = Math.floor(stepI / 8) % song.bars.length, st = stepI % 8;
    const t = nextT - ac.currentTime + (song.swing && st % 2 ? spb * 0.18 : 0);
    const chord = CHORD[song.chords[bar % song.chords.length]];
    const n = song.bars[bar][st];
    if (n && n !== '.' && n !== '-') {
      let len = 1; while (song.bars[bar][st + len] === '-') len++;
      const f = NOTE(n);
      if (song.box) { tone({ f, type: 'sine', t, dur: 0.6, vol: 0.09, bus: musicBus }); tone({ f: f * 4, type: 'sine', t, dur: 0.15, vol: 0.02, bus: musicBus }); }
      else { tone({ f, type: 'triangle', t, dur: spb * len * 1.1 + 0.05, vol: 0.11, bus: musicBus, a: 0.01 }); tone({ f: f * 2, type: 'sine', t, dur: 0.08, vol: 0.025, bus: musicBus }); }
    }
    // 和音（足踏みオルガン風）: 小節頭と5拍目
    if (st === 0 || (st === 4 && !song.box)) for (const c of chord) tone({ f: NOTE(c) * 2, type: 'sawtooth', t, dur: spb * 3.6, vol: 0.022, a: 0.06, bus: musicBus, lp: 900 });
    // ベース
    if (st % (song.drive ? 1 : 2) === 0) {
      const root = NOTE(chord[0]) / 2, alt = st % 4 === 2 ? NOTE(chord[2]) / 2 : root;
      tone({ f: song.drive ? (st % 2 ? root * 2 : root) : alt, type: 'triangle', t, dur: spb * 0.9, vol: song.box ? 0.07 : 0.12, bus: musicBus });
    }
    // 糸巻きの打楽器
    if (!song.box) {
      if (st % 4 === 0) noiseM(t, 0.05, 0.07, 150, 700);
      if (st % 4 === 2) noiseM(t, 0.03, 0.05, 2500, 7000);
      if (song.drive && st % 2 === 1) noiseM(t, 0.02, 0.03, 5000, 9000);
    }
    nextT += spb; stepI++;
  }
}
function noiseM(t, dur, vol, hp, lp) { noise({ t, dur, vol, hp, lp, bus: musicBus }); }

document.addEventListener('visibilitychange', () => { if (!ac) return; if (document.hidden) ac.suspend(); else ac.resume(); });
