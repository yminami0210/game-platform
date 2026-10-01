// core の state を読んで描くだけ。state を書き換えない。揺らぎ・粒子は描画側の演出（Math.random 可）。
// 世界の約束: 墨で塗りつぶされた和紙の洞窟。ホタルの光の輪の中だけ墨がぬぐわれて紙の地が見える。光の外は岩の輪郭だけうっすら。
// 人の手の跡: 岩・罠は座標にばらつき、色を1〜2px ずらして重ね刷り（版ずれ）、紙の質感は resize 時に1回だけ作って使い回す。
import { W, H, SWARM_Y, swarmOffsets, sight, balanceOf } from '../core/game.js';
// 名前つきパレット（design-system.md と同じ）: 墨 / 楮(こうぞ紙) / 蛍 / 朱 / 藍 / 薄紅
const C = { ink: '#1C1915', paper: '#DDD4B8', main: '#C6DA3C', core: '#F2F7B4', shu: '#D2432B', ai: '#2F4F7A', usu: '#E8A3A0' };
const PIG = ['#6F8FA8', '#6E9A74', '#6FA3A8', '#A8714A', '#7C6488']; // 層ごとの顔料（点苔・岩の版ずれ）
const TAU = 6.283185;
const hash = (a, k) => { const v = Math.sin(a * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };
const J = (d, i, a) => (hash(d, i) - 0.5) * a; // 手のばらつき

export function createRenderer(canvas) {
  const g = canvas.getContext('2d');
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  let osReduced = mq.matches, userReduced = false;
  mq.addEventListener?.('change', e => { osReduced = e.matches; });
  const calm = () => osReduced || userReduced;
  let paperCv = null, grainCv = null, scale = 1, ox = 0, oy = 0, R = 3, parts = [], time = 0, layerGlow = 0, fade = 1, lastN = 5, lastX = 4.5;
  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
    scale = Math.min(canvas.width / W, canvas.height / H);
    ox = (canvas.width - W * scale) / 2; oy = (canvas.height - H * scale) / 2;
    buildTextures(canvas.width, canvas.height, dpr);
  }
  // 紙の質感（地・繊維・むら）と粒子（全面に薄く重ねる）。サイズ変更時にだけ作る。
  function buildTextures(w, h, d) {
    let seed = 20261001; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
    const mk = () => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; return cv; };
    paperCv = mk(); let c = paperCv.getContext('2d');
    c.fillStyle = C.paper; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 34; i++) { // 漉きむら
      const x = rnd() * w, y = rnd() * h, r = (0.12 + rnd() * 0.3) * Math.max(w, h), gr = c.createRadialGradient(x, y, 0, x, y, r), dark = rnd() < 0.55;
      gr.addColorStop(0, dark ? 'rgba(120,100,60,.10)' : 'rgba(255,250,230,.12)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.fillRect(x - r, y - r, r * 2, r * 2);
    }
    c.lineWidth = Math.max(1, d * 0.8); c.lineCap = 'round';
    for (let i = 0, n = Math.min(1800, (w * h) / 600); i < n; i++) { // 楮の繊維
      const x = rnd() * w, y = rnd() * h, a = rnd() * TAU, l = (6 + rnd() * 26) * d, bend = (rnd() - 0.5) * l * 0.7;
      c.strokeStyle = rnd() < 0.5 ? 'rgba(255,250,232,.30)' : 'rgba(110,92,55,.16)';
      c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + Math.cos(a) * l / 2 - Math.sin(a) * bend, y + Math.sin(a) * l / 2 + Math.cos(a) * bend, x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke();
    }
    grainCv = mk(); c = grainCv.getContext('2d');
    for (let i = 0, n = Math.min(6000, (w * h) / 250); i < n; i++) { // 紙の斑点（墨の粒）
      const x = rnd() * w, y = rnd() * h, sz = (0.6 + rnd() * 1.2) * d;
      c.fillStyle = 'rgba(28,25,21,.14)'; c.fillRect(x, y, sz, sz * (0.6 + rnd() * 0.8));
    }
    c.lineWidth = d; c.strokeStyle = 'rgba(217,208,182,.045)'; c.lineCap = 'round'; // 墨のかすれ（点ではなく短い筋。星に見せない）
    for (let i = 0, n = Math.min(1600, (w * h) / 1000); i < n; i++) {
      const x = rnd() * w, y = rnd() * h, a = (rnd() - 0.5) * 0.5, l = (5 + rnd() * 16) * d;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke();
    }
  }
  addEventListener('resize', resize); resize();
  const mkGlow = (rgb) => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 64;
    const c = cv.getContext('2d'), gr = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, `rgba(${rgb},0.9)`); gr.addColorStop(1, `rgba(${rgb},0)`); c.fillStyle = gr; c.fillRect(0, 0, 64, 64); return cv;
  };
  let glow = mkGlow('198,218,60'); const glowF = mkGlow('232,163,160'), glowP = mkGlow('217,208,182');

  const dpr = () => canvas.width / innerWidth;
  const jig = (i, k) => calm() ? 0 : Math.sin(time * (1.3 + (i % 5) * 0.37) + i * 1.7 + k) * 0.06;
  const circle = (x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, TAU); };

  return {
    unitPx: () => scale / dpr(),
    setReducedMotion(v) { userReduced = !!v; },
    setColor(hex) { // 群れの色（見た目のみ）
      const n = parseInt(String(hex).replace('#', ''), 16); if (!Number.isFinite(n)) return;
      C.main = '#' + n.toString(16).padStart(6, '0'); glow = mkGlow(`${n >> 16},${(n >> 8) & 255},${n & 255}`);
    },
    setEffects(v) { userReduced = !v; }, // 旧API互換
    event(e, s) {
      if (parts.length > 160) parts.splice(0, 40);
      const m = calm() ? 0 : 1;
      if (e.type === 'scatter') for (let i = 0; i < Math.min(14, e.n * 3); i++) { // 光の粒がふわっと漂って消える
        const a = Math.random() * TAU, v = (0.2 + Math.random() * 0.7) * m;
        parts.push({ k: 'mote', x: e.x + (Math.random() - 0.5) * 0.6, y: e.y + (Math.random() - 0.5) * 0.6, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.35 * m, life: 1.8, max: 1.8, r: 0.35 + Math.random() * 0.3 });
      }
      if (e.type === 'pickup') for (let i = 0; i < 8; i++) { // 輪になって群れへ吸い込まれる
        const a = i * TAU / 8, x = s.x + Math.cos(a) * 1.3, y = SWARM_Y + Math.sin(a) * 1.3;
        parts.push({ k: 'pick', x: m ? x : s.x + Math.cos(a) * 0.5, y: m ? y : SWARM_Y + Math.sin(a) * 0.5, vx: -Math.cos(a) * 2.6 * m, vy: -Math.sin(a) * 2.6 * m, life: 0.5, max: 0.5, r: 0.3 });
      }
      if (e.type === 'layer') layerGlow = 1.6;
    },
    draw(s, dt) {
      time += dt; layerGlow = Math.max(0, layerGlow - dt);
      const B = balanceOf(s.data), alive = s.alive;
      if (alive) { fade = 1; lastN = s.N; lastX = s.x; } else fade = Math.max(0, fade - dt / 0.8); // 0.8秒で光が静まる（墨が閉じる）
      const N = alive ? s.N : lastN;
      const dim = s.dimT > 0 ? 0.55 : 1;
      const lg = Math.sin(Math.min(1, layerGlow / 1.6) * Math.PI); // 層到達: ふわっと輪がひろがる
      const tr = (sight(Math.max(1, N), B) * dim * (1 + 0.45 * lg)) * (0.25 + 0.75 * fade);
      R += (tr - R) * Math.min(1, dt / 0.1);
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.drawImage(paperCv, 0, 0); // 紙の地（世界はまず紙の上に墨で描かれている）
      g.setTransform(scale, 0, 0, scale, ox, oy);
      const yOf = d => SWARM_Y - (d - s.dist);
      const px = alive ? s.x : lastX, py = SWARM_Y;
      const vis = (y, m = 1) => y > -m && y < H + m;
      const L = B.layers.length;
      const trace = pts => { g.beginPath(); for (let i = 0; i < pts.length; i++) i ? g.lineTo(pts[i][0], pts[i][1]) : g.moveTo(pts[i][0], pts[i][1]); g.closePath(); };

      // 水たまり（藍のにじみ。横の波線が水のしるし。波線は版ずれで2度刷り）
      for (const p of s.puddles ?? []) {
        const y0 = yOf(p.d1), y1 = yOf(p.d0); if (y1 < -1 || y0 > H + 1) continue;
        g.fillStyle = 'rgba(47,79,122,0.5)'; g.fillRect(p.x0, y0, p.x1 - p.x0, y1 - y0);
        for (const [dx, col] of [[0.04, 'rgba(221,212,184,0.7)'], [0, 'rgba(28,25,21,0.55)']]) {
          g.strokeStyle = col; g.lineWidth = 0.05;
          for (let y = Math.max(y0 + 0.3, -1); y < Math.min(y1, H + 1); y += 0.6) {
            g.beginPath();
            for (let x = p.x0; x <= p.x1; x += 0.25) { const yy = y + (calm() ? 0 : Math.sin(time * 1.5 + x * 3 + y) * 0.05) + Math.sin(x * 3 + y) * 0.05 + dx; x === p.x0 ? g.moveTo(x + dx, yy) : g.lineTo(x + dx, yy); }
            g.stroke();
          }
        }
      }
      // 風の筋（墨の細い流線。向きは矢羽根で示す）
      g.strokeStyle = '#3A352B'; g.lineWidth = 0.05; g.globalAlpha = 0.45;
      for (const w of s.winds) {
        const y0 = yOf(w.d1), y1 = yOf(w.d0);
        for (let y = Math.max(-1, y0); y < Math.min(H, y1); y += 0.7) for (let x = 0.5; x < W; x += 1.5) {
          const o = calm() ? 0 : (time * w.dir * 1.5) % 1.5, xx = x + o + hash(y, x) * 0.5;
          g.beginPath(); g.moveTo(xx - w.dir * 0.5, y); g.lineTo(xx, y); g.lineTo(xx - w.dir * 0.15, y - 0.15); g.moveTo(xx, y); g.lineTo(xx - w.dir * 0.15, y + 0.15); g.stroke();
        }
      }
      g.globalAlpha = 1;

      // 岩（墨のかたまり。縁はごつごつ、層の顔料が少しずれて下に覗く。苔は点苔）
      const rocks = [];
      for (const w of s.walls) {
        const y = yOf(w.d); if (!vis(y)) continue;
        const li = Math.min(B.layers.count - 1, Math.floor(w.d / L)), pig = PIG[li] ?? PIG[0];
        const sides = [[-0.2, w.cx - w.gap / 2, 1], [w.cx + w.gap / 2, W + 0.2, -1]];
        for (const [x0, x1, face] of sides) {
          const wd = x1 - x0; if (wd <= 0) continue;
          const inner = face > 0 ? x1 : x0, outer = face > 0 ? x0 : x1, dir = face > 0 ? 1 : -1, n = Math.max(2, Math.round(wd / 0.8)), k = w.d * (face > 0 ? 1 : 1.7);
          const pts = [];
          for (let i = 0; i <= n; i++) { const x = outer + (inner - outer) * (i / n); pts.push([i === n ? x - dir * hash(k, 50) * 0.08 : x, y - 0.35 + J(k, i, 0.1)]); }
          for (let j = 1; j <= 3; j++) pts.push([inner - dir * hash(k, 60 + j) * 0.12, y - 0.35 + 0.7 * j / 4]); // 当たり判定より内側にだけ欠ける
          for (let i = n; i >= 0; i--) { const x = outer + (inner - outer) * (i / n); pts.push([i === n ? x - dir * hash(k, 70) * 0.08 : x, y + 0.35 + J(k, i + 20, 0.1)]); }
          rocks.push(pts);
          g.save(); g.translate(0.07, 0.06); g.fillStyle = pig; g.globalAlpha = 0.6; trace(pts); g.fill(); g.restore(); // 版ずれ
          g.fillStyle = C.ink; trace(pts); g.fill();
          g.strokeStyle = C.paper; g.lineWidth = 0.03; g.globalAlpha = 0.22; // かすれ
          for (let i = 0; i < Math.min(5, Math.floor(wd * 1.2)); i++) {
            const x = x0 + hash(k, i + 100) * wd, yy = y + J(k, i + 110, 0.5), l = 0.3 + hash(k, i + 120) * 0.7;
            g.beginPath(); g.moveTo(x, yy); g.lineTo(x + l, yy + J(k, i + 130, 0.06)); g.stroke();
          }
          g.globalAlpha = 1; g.fillStyle = pig;
          for (let i = 0; i < 5; i++) { // 点苔
            const x = inner - dir * (0.04 + hash(k, i + 140) * Math.min(1.1, wd)), yy = y + J(k, i + 150, 0.6);
            circle(x, yy, 0.03 + hash(k, i + 160) * 0.045); g.fill();
          }
        }
      }
      // 根のカーテン（朱の尖った帯。先端が下を向く。墨の版ずれ）
      for (const r of s.roots ?? []) {
        const yT = yOf(r.d + r.len), yB = yOf(r.d); if (yB < -1 || yT > H + 1) continue;
        const hw = 0.35;
        for (let k = -1; k <= 1; k++) {
          const cx = r.x + k * 0.5, sway = calm() ? 0 : Math.sin(time * 0.8 + k + r.d) * 0.05, j = J(r.d, k + 5, 0.1);
          for (const [d, col] of [[0.05, C.ink], [0, C.shu]]) {
            g.fillStyle = col; g.beginPath(); g.moveTo(cx - hw + d + j, yT + d); g.lineTo(cx + hw + d, yT + d + j); g.lineTo(cx + sway + d, yB + 0.3 + d); g.closePath(); g.fill();
          }
        }
      }
      // 黒石（光を吸う。尖った墨の結晶に、藍が少しずれて覗く）
      for (const k of s.stones ?? []) {
        const y = yOf(k.d); if (!vis(y, 2)) continue;
        const pts = []; for (let i = 0; i < 7; i++) { const a = i * TAU / 7 - 1.57 + J(k.d, i, 0.3), rr = k.r * (i % 2 ? 0.7 : 1.12) * (0.92 + hash(k.d, i + 9) * 0.16); pts.push([k.x + Math.cos(a) * rr, y + Math.sin(a) * rr]); }
        g.save(); g.translate(0.07, 0.05); g.fillStyle = C.ai; trace(pts); g.fill(); g.restore();
        g.fillStyle = C.ink; trace(pts); g.fill();
        g.strokeStyle = C.paper; g.globalAlpha = 0.35; g.lineWidth = 0.03; g.beginPath(); g.moveTo(pts[5][0], pts[5][1]); g.lineTo(k.x - 0.05, y - 0.02); g.lineTo(pts[0][0], pts[0][1]); g.stroke(); g.globalAlpha = 1;
        g.fillStyle = C.shu; circle(k.x + 0.04, y, 0.06); g.fill();
      }
      // ねむり花（未点灯は紙色の蕾。点灯した花は墨のあとに描く）
      for (const f of s.flowers ?? []) {
        if (f.lit) continue; const y = yOf(f.d); if (!vis(y)) continue;
        g.fillStyle = '#B3AA90'; g.strokeStyle = C.ink; g.globalAlpha = 0.85; g.lineWidth = 0.06;
        g.beginPath(); g.moveTo(f.x, y - 0.42); g.quadraticCurveTo(f.x + 0.3, y, f.x + 0.02, y + 0.25); g.quadraticCurveTo(f.x - 0.3, y + 0.02, f.x, y - 0.42); g.fill(); g.stroke(); g.globalAlpha = 1;
      }
      // はぐれホタル（紙色と墨の二重の輪。明るい紙の上でも暗い墨の上でも見える）
      for (const st of s.strays) {
        const y = yOf(st.d); if (!vis(y)) continue;
        const bl = 0.7 + (calm() ? 0 : 0.3 * Math.sin(time * 2 * Math.PI * 1.2 + st.x)); // 毎秒約1.2回
        g.globalAlpha = 0.55 * bl; g.drawImage(glow, st.x - 0.7, y - 0.7, 1.4, 1.4);
        g.globalAlpha = bl; g.lineWidth = 0.06; g.strokeStyle = C.ink; circle(st.x + 0.03, y + 0.03, 0.31); g.stroke();
        g.strokeStyle = C.paper; circle(st.x, y, 0.3); g.stroke();
        g.globalAlpha = 1;
        for (let i = 0; i < st.n; i++) {
          const x = st.x + (i - (st.n - 1) / 2) * 0.22;
          g.fillStyle = C.ink; circle(x, y, 0.12); g.fill(); g.fillStyle = C.main; circle(x + 0.025, y - 0.02, 0.09); g.fill();
        }
      }

      // 墨のぬり（群れ重心の外側を墨でぬりつぶす。縁は円ではなく、にじんだ手ぬりの形）
      g.setTransform(1, 0, 0, 1, 0, 0);
      const pulse = !calm() && N > 0 && N <= 5 && alive ? 1 + 0.03 * Math.sin(time * 2 * Math.PI * 1.5) : 1;
      const rr = Math.max(0.4, R * pulse), cx = ox + px * scale, cy = oy + py * scale, rp = rr * scale, cw = canvas.width, ch = canvas.height;
      const gr = g.createRadialGradient(cx, cy, rp * 0.55, cx, cy, rp);
      gr.addColorStop(0, 'rgba(28,25,21,0)'); gr.addColorStop(1, 'rgba(28,25,21,0.38)');
      g.fillStyle = gr; g.fillRect(0, 0, cw, ch);
      const wob = calm() ? 0 : time * 0.25;
      const blob = k => { // 輪郭がゆがんだ閉曲線（外側 evenodd でぬる）
        const M = 28;
        g.beginPath(); g.rect(0, 0, cw, ch);
        for (let i = 0; i <= M; i++) {
          const a = (i % M) / M * TAU, r = rp * k * (1 + 0.05 * Math.sin(3 * a + 1.3 + wob) + 0.035 * Math.sin(5 * a + 0.4 - wob * 1.3) + 0.02 * Math.sin(11 * a + 2));
          const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; i ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.closePath();
      };
      for (const [k, al] of [[1.12, 0.38], [1.0, 0.96]]) { g.save(); blob(k); g.clip('evenodd'); g.fillStyle = `rgba(28,25,21,${al})`; g.fillRect(0, 0, cw, ch); g.restore(); }
      g.setTransform(scale, 0, 0, scale, ox, oy);
      // 黒石のまわりは墨がにじむ（光を吸う）
      for (const k of s.stones ?? []) {
        const y = yOf(k.d); if (!vis(y, 3)) continue;
        const sg = g.createRadialGradient(k.x, y, k.r * 0.8, k.x, y, k.r * 3);
        sg.addColorStop(0, 'rgba(28,25,21,0.85)'); sg.addColorStop(1, 'rgba(28,25,21,0)'); g.fillStyle = sg; g.fillRect(k.x - k.r * 3, y - k.r * 3, k.r * 6, k.r * 6);
      }
      // 岩の縁は闇の中でも紙色の細線でうっすら（白抜き）
      g.strokeStyle = C.paper; g.globalAlpha = 0.3; g.lineWidth = 0.05;
      for (const pts of rocks) { trace(pts); g.stroke(); }
      g.globalAlpha = 1;
      // 点灯したねむり花（薄紅。墨の線が少しずれる）
      for (const f of s.flowers ?? []) {
        if (!f.lit) continue; const y = yOf(f.d); if (!vis(y, 2)) continue;
        g.globalAlpha = 0.55; g.drawImage(glowF, f.x - 1.1, y - 1.1, 2.2, 2.2); g.globalAlpha = 1;
        for (const [d, col] of [[0.035, C.ink], [0, C.usu]]) {
          g.fillStyle = col;
          for (let i = 0; i < 5; i++) { const a = i * TAU / 5 + J(f.d, i, 0.3); g.beginPath(); g.ellipse(f.x + d + Math.cos(a) * 0.22, y + d + Math.sin(a) * 0.22, 0.2, 0.11, a, 0, TAU); g.fill(); }
        }
        g.fillStyle = C.main; circle(f.x, y, 0.09); g.fill();
      }
      // ホタル（群れ）。蛍の黄緑を、墨の輪郭からわずかにずらして重ね刷り。全滅時は 0.8 秒でとけて消える
      if (fade > 0) {
        const offs = swarmOffsets(N, B);
        const beat = calm() ? 1 : 0.88 + 0.12 * Math.sin(time * 2 * Math.PI * 1.1); // やわらかい明滅（毎秒約1回）
        g.globalAlpha = fade * 0.6 * beat;
        for (let i = 0; i < offs.length; i++) g.drawImage(glow, px + offs[i].dx + jig(i, 0) - 0.65, py + offs[i].dy + jig(i, 2) - 0.65, 1.3, 1.3);
        g.globalAlpha = fade;
        for (let i = 0; i < offs.length; i++) {
          const x = px + offs[i].dx + jig(i, 0), y = py + offs[i].dy + jig(i, 2);
          g.fillStyle = C.ink; circle(x, y, 0.165); g.fill();
          g.fillStyle = C.main; circle(x + 0.035, y - 0.03, 0.125); g.fill();
          g.fillStyle = C.core; circle(x + 0.04, y - 0.035, 0.05); g.fill();
        }
        g.globalAlpha = 1;
      }
      // 散る・拾う粒子
      parts = parts.filter(p => (p.life -= dt) > 0);
      for (const p of parts) {
        p.x += p.vx * dt; p.y += p.vy * dt; if (p.k === 'mote') { p.vx *= 1 - dt * 0.8; p.vy *= 1 - dt * 0.8; }
        const a = p.life / p.max, sz = p.r * (p.k === 'mote' ? 1 : 0.6 + a * 0.4);
        g.globalAlpha = a * 0.7; g.drawImage(p.k === 'mote' ? glow : glowP, p.x - sz * 1.6, p.y - sz * 1.6, sz * 3.2, sz * 3.2);
        g.globalAlpha = a; g.fillStyle = C.ink; circle(p.x + 0.025, p.y + 0.025, sz * 0.45); g.fill(); g.fillStyle = p.k === 'mote' ? C.main : C.paper; circle(p.x, p.y, sz * 0.4); g.fill();
      }
      g.globalAlpha = 1;
      // 紙のざらつきを全体に薄く重ねる
      g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(grainCv, 0, 0);
    },
  };
}
