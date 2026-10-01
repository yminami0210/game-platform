// core の state を読んで描くだけ。state を書き換えない。揺らぎ・粒子は描画側の演出（Math.random 可）。
// 世界の約束: 光の中だけ岩の質感と苔が見える。光の外は輪郭がうっすら。
import { W, H, SWARM_Y, swarmOffsets, sight, balanceOf } from '../core/game.js';
const C = { bg: '#07080F', cave: '#1E2236', edge: '#3A4160', main: '#FFC94A', core: '#FFF3C4', reward: '#7FE0D4', danger: '#FF5A6E', text: '#F4F1EA' };
const MOSS = ['#6C7396', '#5FA86A', '#4FA3C7', '#A8704F', '#9A7FD6']; // 層ごとの苔・岩の色
const TAU = 6.283185;
const hash = (a, k) => { const v = Math.sin(a * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };

export function createRenderer(canvas) {
  const g = canvas.getContext('2d');
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  let osReduced = mq.matches, userReduced = false;
  mq.addEventListener?.('change', e => { osReduced = e.matches; });
  const calm = () => osReduced || userReduced;
  let scale = 1, ox = 0, oy = 0, R = 3, parts = [], time = 0, layerGlow = 0, fade = 1, lastN = 5, lastX = 4.5;
  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
    scale = Math.min(canvas.width / W, canvas.height / H);
    ox = (canvas.width - W * scale) / 2; oy = (canvas.height - H * scale) / 2;
  }
  addEventListener('resize', resize); resize();
  const mkGlow = (rgb) => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 64;
    const c = cv.getContext('2d'), gr = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, `rgba(${rgb},0.9)`); gr.addColorStop(1, `rgba(${rgb},0)`); c.fillStyle = gr; c.fillRect(0, 0, 64, 64); return cv;
  };
  const glow = mkGlow('255,200,90'), glowR = mkGlow('127,224,212');

  const dpr = () => canvas.width / innerWidth;
  const jig = (i, k) => calm() ? 0 : Math.sin(time * (1.3 + (i % 5) * 0.37) + i * 1.7 + k) * 0.06;
  const circle = (x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, TAU); };

  return {
    unitPx: () => scale / dpr(),
    setReducedMotion(v) { userReduced = !!v; },
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
      if (alive) { fade = 1; lastN = s.N; lastX = s.x; } else fade = Math.max(0, fade - dt / 0.8); // 0.8秒で闇に溶ける
      const N = alive ? s.N : lastN;
      const dim = s.dimT > 0 ? 0.55 : 1;
      const lg = Math.sin(Math.min(1, layerGlow / 1.6) * Math.PI); // 層到達: ふわっと明るく
      const tr = (sight(Math.max(1, N), B) * dim * (1 + 0.45 * lg)) * (0.25 + 0.75 * fade);
      R += (tr - R) * Math.min(1, dt / 0.1);
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = C.bg; g.fillRect(0, 0, canvas.width, canvas.height);
      g.setTransform(scale, 0, 0, scale, ox, oy);
      const yOf = d => SWARM_Y - (d - s.dist);
      const px = alive ? s.x : lastX, py = SWARM_Y;
      const lit = (x, y) => Math.max(0, 1 - Math.hypot(x - px, y - py) / Math.max(0.5, R));
      const vis = (y, m = 1) => y > -m && y < H + m;
      const L = B.layers.length;

      // 水たまり（reward 寄りの青。横の波線で水と分かる）
      for (const p of s.puddles ?? []) {
        const y0 = yOf(p.d1), y1 = yOf(p.d0); if (y1 < -1 || y0 > H + 1) continue;
        g.fillStyle = 'rgba(70,150,200,0.35)'; g.fillRect(p.x0, y0, p.x1 - p.x0, y1 - y0);
        g.strokeStyle = 'rgba(160,230,235,0.7)'; g.lineWidth = 0.05;
        for (let y = Math.max(y0 + 0.3, -1); y < Math.min(y1, H + 1); y += 0.6) {
          g.beginPath();
          for (let x = p.x0; x <= p.x1; x += 0.25) { const yy = y + (calm() ? 0 : Math.sin(time * 1.5 + x * 3 + y) * 0.05) + Math.sin(x * 3 + y) * 0.05; x === p.x0 ? g.moveTo(x, yy) : g.lineTo(x, yy); }
          g.stroke();
        }
      }
      // 風の筋（細い流線。向きは矢羽根で示す）
      g.strokeStyle = '#CFE3FF'; g.lineWidth = 0.05; g.globalAlpha = 0.4;
      for (const w of s.winds) {
        const y0 = yOf(w.d1), y1 = yOf(w.d0);
        for (let y = Math.max(-1, y0); y < Math.min(H, y1); y += 0.7) for (let x = 0.5; x < W; x += 1.5) {
          const o = calm() ? 0 : (time * w.dir * 1.5) % 1.5, xx = x + o + hash(y, x) * 0.5;
          g.beginPath(); g.moveTo(xx - w.dir * 0.5, y); g.lineTo(xx, y); g.lineTo(xx - w.dir * 0.15, y - 0.15); g.moveTo(xx, y); g.lineTo(xx - w.dir * 0.15, y + 0.15); g.stroke();
        }
      }
      g.globalAlpha = 1;

      // 岩壁（質感と苔は光の強さに応じて見える）
      for (const w of s.walls) {
        const y = yOf(w.d); if (!vis(y)) continue;
        const li = Math.min(B.layers.count - 1, Math.floor(w.d / L)), moss = MOSS[li] ?? MOSS[0];
        const sides = [[-0.2, w.cx - w.gap / 2, 1], [w.cx + w.gap / 2, W + 0.2, -1]];
        for (const [x0, x1, face] of sides) {
          const wd = x1 - x0; if (wd <= 0) continue;
          g.fillStyle = C.cave; g.fillRect(x0, y - 0.35, wd, 0.7);
          g.strokeStyle = C.edge; g.lineWidth = 0.06; g.strokeRect(x0, y - 0.35, wd, 0.7);
          const n = Math.min(14, Math.floor(wd * 2.2));
          for (let i = 0; i < n; i++) { // 割れ目と粒
            const x = x0 + hash(w.d, i) * wd, yy = y + (hash(w.d, i + 40) - 0.5) * 0.55, a = lit(x, yy); if (a < 0.05) continue;
            g.globalAlpha = a * 0.9; g.strokeStyle = '#59628A'; g.lineWidth = 0.035;
            g.beginPath(); g.moveTo(x, yy); g.lineTo(x + (hash(w.d, i + 80) - 0.5) * 0.5, yy + (hash(w.d, i + 90) - 0.5) * 0.2); g.stroke();
          }
          const xe = face > 0 ? x1 : x0; // 隙間に面した縁に苔
          for (let i = 0; i < 6; i++) {
            const x = xe - face * (0.05 + hash(w.d, i + 120) * Math.min(1.2, wd)), yy = y + (hash(w.d, i + 130) - 0.5) * 0.7, a = lit(x, yy); if (a < 0.05) continue;
            g.globalAlpha = a; g.fillStyle = moss; circle(x, yy, 0.09 + hash(w.d, i + 140) * 0.1); g.fill();
          }
          g.globalAlpha = 1;
        }
      }
      // 根のカーテン（danger 色の尖った縦の帯。先端が下を向く）
      for (const r of s.roots ?? []) {
        const yT = yOf(r.d + r.len), yB = yOf(r.d); if (yB < -1 || yT > H + 1) continue;
        g.fillStyle = 'rgba(255,90,110,0.35)'; g.strokeStyle = C.danger; g.lineWidth = 0.06;
        const hw = 0.35;
        for (let k = -1; k <= 1; k++) {
          const cx = r.x + k * 0.5, sway = calm() ? 0 : Math.sin(time * 0.8 + k + r.d) * 0.05;
          g.beginPath(); g.moveTo(cx - hw, yT); g.lineTo(cx + hw, yT); g.lineTo(cx + sway, yB + 0.3); g.closePath(); g.fill(); g.stroke();
        }
      }
      // 黒石（光を吸う黒い結晶）
      for (const k of s.stones ?? []) {
        const y = yOf(k.d); if (!vis(y, 2)) continue;
        g.fillStyle = '#020308'; g.strokeStyle = '#5B4F86'; g.lineWidth = 0.05;
        g.beginPath(); for (let i = 0; i < 6; i++) { const a = i * TAU / 6 - 1.57, rr = k.r * (i % 2 ? 0.75 : 1.1); i ? g.lineTo(k.x + Math.cos(a) * rr, y + Math.sin(a) * rr) : g.moveTo(k.x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
        g.closePath(); g.fill(); g.stroke();
      }
      // ねむり花（未点灯は暗い蕾。点灯した花は闇の後に描く）
      for (const f of s.flowers ?? []) {
        if (f.lit) continue; const y = yOf(f.d); if (!vis(y)) continue;
        g.fillStyle = '#2A3050'; g.strokeStyle = '#4B5580'; g.lineWidth = 0.05;
        g.beginPath(); g.moveTo(f.x, y - 0.42); g.quadraticCurveTo(f.x + 0.3, y, f.x, y + 0.25); g.quadraticCurveTo(f.x - 0.3, y, f.x, y - 0.42); g.fill(); g.stroke();
      }
      // はぐれホタル
      for (const st of s.strays) {
        const y = yOf(st.d); if (!vis(y)) continue;
        g.strokeStyle = C.reward; g.globalAlpha = 0.6 + (calm() ? 0 : 0.3 * Math.sin(time * 2 * Math.PI * 1.2 + st.x)); // 毎秒約1.2回
        g.lineWidth = 0.05; circle(st.x, y, 0.3); g.stroke();
        g.globalAlpha = 0.5; g.drawImage(glowR, st.x - 0.7, y - 0.7, 1.4, 1.4);
        g.globalAlpha = 1; g.fillStyle = C.reward;
        for (let i = 0; i < st.n; i++) { circle(st.x + (i - (st.n - 1) / 2) * 0.22, y, 0.1); g.fill(); }
      }

      // 闇マスク（群れ重心を中心にくり抜く。外側はほぼ闇だが、岩の輪郭はうっすら残る）
      const pulse = !calm() && N > 0 && N <= 5 && alive ? 1 + 0.03 * Math.sin(time * 2 * Math.PI * 1.5) : 1;
      const rr = Math.max(0.4, R * pulse);
      const gr = g.createRadialGradient(px, py, 0, px, py, rr);
      gr.addColorStop(0, 'rgba(7,8,15,0)'); gr.addColorStop(0.5, 'rgba(7,8,15,0.05)'); gr.addColorStop(0.8, 'rgba(7,8,15,0.55)'); gr.addColorStop(1, 'rgba(7,8,15,0.9)');
      g.fillStyle = gr; g.fillRect(-1, -1, W + 2, H + 2);
      // 光のあたたかさ（加算）
      const wa = (0.16 + 0.1 * lg) * fade;
      if (wa > 0.01) {
        g.globalCompositeOperation = 'lighter';
        const wg = g.createRadialGradient(px, py, 0, px, py, rr * 0.9);
        wg.addColorStop(0, `rgba(255,190,80,${wa})`); wg.addColorStop(1, 'rgba(255,190,80,0)');
        g.fillStyle = wg; g.fillRect(-1, -1, W + 2, H + 2);
        g.globalCompositeOperation = 'source-over';
      }
      // 黒石のまわりは暗い（光を吸う）
      for (const k of s.stones ?? []) {
        const y = yOf(k.d); if (!vis(y, 3)) continue;
        const sg = g.createRadialGradient(k.x, y, k.r * 0.8, k.x, y, k.r * 3);
        sg.addColorStop(0, 'rgba(2,3,8,0.85)'); sg.addColorStop(1, 'rgba(2,3,8,0)'); g.fillStyle = sg; g.fillRect(k.x - k.r * 3, y - k.r * 3, k.r * 6, k.r * 6);
      }
      // 岩の縁取りは常時うっすら
      g.strokeStyle = C.edge; g.globalAlpha = 0.45; g.lineWidth = 0.04;
      for (const w of s.walls) { const y = yOf(w.d); if (!vis(y)) continue; g.strokeRect(-0.2, y - 0.35, w.cx - w.gap / 2 + 0.2, 0.7); g.strokeRect(w.cx + w.gap / 2, y - 0.35, W + 0.2 - w.cx - w.gap / 2, 0.7); }
      g.globalAlpha = 1;
      // 点灯したねむり花（自ら光る）
      for (const f of s.flowers ?? []) {
        if (!f.lit) continue; const y = yOf(f.d); if (!vis(y, 2)) continue;
        g.globalCompositeOperation = 'lighter'; g.drawImage(glowR, f.x - 1.1, y - 1.1, 2.2, 2.2); g.globalCompositeOperation = 'source-over';
        g.fillStyle = C.reward;
        for (let i = 0; i < 6; i++) { const a = i * TAU / 6; circle(f.x + Math.cos(a) * 0.22, y + Math.sin(a) * 0.22, 0.15); g.fill(); }
        g.fillStyle = C.core; circle(f.x, y, 0.1); g.fill();
      }
      // ホタル（群れ）。全滅時は 0.8 秒でとけて消える
      if (fade > 0) {
        const offs = swarmOffsets(N, B);
        const beat = calm() ? 1 : 0.88 + 0.12 * Math.sin(time * 2 * Math.PI * 1.1); // やわらかい明滅（毎秒約1回）
        g.globalAlpha = fade * beat;
        g.globalCompositeOperation = 'lighter';
        for (let i = 0; i < offs.length; i++) g.drawImage(glow, px + offs[i].dx + jig(i, 0) - 0.7, py + offs[i].dy + jig(i, 2) - 0.7, 1.4, 1.4);
        g.globalCompositeOperation = 'source-over';
        g.globalAlpha = fade;
        for (let i = 0; i < offs.length; i++) {
          const x = px + offs[i].dx + jig(i, 0), y = py + offs[i].dy + jig(i, 2);
          g.fillStyle = C.main; circle(x, y, 0.13); g.fill();
          g.fillStyle = C.core; circle(x, y, 0.06); g.fill();
        }
        g.globalAlpha = 1;
      }
      // 散る・拾う粒子
      parts = parts.filter(p => (p.life -= dt) > 0);
      g.globalCompositeOperation = 'lighter';
      for (const p of parts) {
        p.x += p.vx * dt; p.y += p.vy * dt; if (p.k === 'mote') { p.vx *= 1 - dt * 0.8; p.vy *= 1 - dt * 0.8; }
        const a = p.life / p.max; g.globalAlpha = a * (p.k === 'mote' ? 0.9 : 1);
        const sz = p.r * (p.k === 'mote' ? 1 : 0.6 + a * 0.4); g.drawImage(p.k === 'mote' ? glow : glowR, p.x - sz, p.y - sz, sz * 2, sz * 2);
      }
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    },
  };
}
