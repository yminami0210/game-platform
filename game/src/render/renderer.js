// core の state を読んで描くだけ。state を書き換えない。揺らぎ・粒子は描画側の演出（Math.random 可）。
import { W, H, SWARM_Y, swarmOffsets, sight, balanceOf } from '../core/game.js';
const C = { bg: '#07080F', cave: '#1E2236', edge: '#3A4160', main: '#FFC94A', core: '#FFF3C4', reward: '#7FE0D4', danger: '#FF5A6E' };

export function createRenderer(canvas) {
  const g = canvas.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let scale = 1, ox = 0, oy = 0, R = 3, parts = [], time = 0, shake = 0, effects = !reduced;
  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
    scale = Math.min(canvas.width / W, canvas.height / H);
    ox = (canvas.width - W * scale) / 2; oy = (canvas.height - H * scale) / 2;
  }
  addEventListener('resize', resize); resize();
  // 事前生成した小さな glow
  const glow = document.createElement('canvas'); glow.width = glow.height = 64;
  { const c = glow.getContext('2d'), gr = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,200,90,0.9)'); gr.addColorStop(1, 'rgba(255,190,80,0)'); c.fillStyle = gr; c.fillRect(0, 0, 64, 64); }

  const dpr = () => canvas.width / innerWidth;
  const jig = (i, k) => Math.sin(time * (1.3 + (i % 5) * 0.37) + i * 1.7 + k) * 0.06;
  return {
    unitPx: () => scale / dpr(),
    setEffects(v) { effects = v && !reduced; },
    event(e, s) {
      if (!effects) return;
      if (e.type === 'scatter') for (let i = 0; i < Math.min(12, e.n * 2); i++) {
        const a = Math.random() * 6.283, v = 1 + Math.random() * 2.5;
        parts.push({ x: e.x, y: e.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.5, life: 1, col: C.main });
      }
      if (e.type === 'pickup') for (let i = 0; i < 8; i++) {
        const a = i * 0.785; parts.push({ x: s.x, y: SWARM_Y, vx: Math.cos(a) * 2, vy: Math.sin(a) * 2, life: 0.7, col: C.reward });
      }
    },
    draw(s, dt) {
      time += dt; shake = Math.max(0, shake - dt);
      const B = balanceOf(s.data), N = s.alive ? s.N : 0;
      const tr = sight(Math.max(1, N), B) * (N ? 1 : 0.4);
      R += (tr - R) * Math.min(1, dt / 0.1); // 約0.3秒で追従
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = C.bg; g.fillRect(0, 0, canvas.width, canvas.height);
      g.setTransform(scale, 0, 0, scale, ox, oy);
      const yOf = d => SWARM_Y - (d - s.dist);
      // 風穴（尖る・danger 色の斜線。色だけに頼らない）
      g.strokeStyle = C.danger; g.lineWidth = 0.05; g.globalAlpha = 0.5;
      for (const w of s.winds) {
        const y0 = yOf(w.d1), y1 = yOf(w.d0);
        for (let y = Math.max(-1, y0); y < Math.min(H, y1); y += 0.7) for (let x = 0.5; x < W; x += 1.5) {
          const o = (time * w.dir * 1.5) % 1.5;
          g.beginPath(); g.moveTo(x + o, y); g.lineTo(x + o + w.dir * 0.4, y + 0.25); g.lineTo(x + o, y + 0.5); g.stroke();
        }
      }
      g.globalAlpha = 1;
      // 岩壁
      const wall = (x0, x1, y) => { g.fillStyle = C.cave; g.fillRect(x0, y - 0.35, x1 - x0, 0.7); g.strokeStyle = C.edge; g.lineWidth = 0.06; g.strokeRect(x0, y - 0.35, x1 - x0, 0.7); };
      for (const w of s.walls) {
        const y = yOf(w.d); if (y < -1 || y > H + 1) continue;
        wall(-0.2, w.cx - w.gap / 2, y); wall(w.cx + w.gap / 2, W + 0.2, y);
      }
      // はぐれホタル
      for (const st of s.strays) {
        const y = yOf(st.d); if (y < -1 || y > H + 1) continue;
        g.strokeStyle = C.reward; g.globalAlpha = 0.5 + 0.4 * Math.sin(time * 2.5 + st.x);
        g.lineWidth = 0.05; g.beginPath(); g.arc(st.x, y, 0.28, 0, 6.283); g.stroke();
        g.globalAlpha = 1; g.fillStyle = C.reward;
        for (let i = 0; i < st.n; i++) { g.beginPath(); g.arc(st.x + (i - (st.n - 1) / 2) * 0.22, y, 0.1, 0, 6.283); g.fill(); }
      }
      // 闇マスク（群れ重心を中心にくり抜く）
      const px = s.x, py = SWARM_Y;
      const pulse = N > 0 && N <= 5 ? 1 + 0.04 * Math.sin(time * 4) : 1;
      const rr = Math.max(0.3, R * pulse);
      const gr = g.createRadialGradient(px, py, 0, px, py, rr);
      gr.addColorStop(0, 'rgba(7,8,15,0)'); gr.addColorStop(0.45, 'rgba(7,8,15,0.15)'); gr.addColorStop(1, 'rgba(7,8,15,0.96)');
      g.fillStyle = gr; g.fillRect(-1, -1, W + 2, H + 2);
      // 岩の縁取りだけは常時うっすら
      g.strokeStyle = C.edge; g.globalAlpha = 0.35; g.lineWidth = 0.04;
      for (const w of s.walls) { const y = yOf(w.d); if (y < -1 || y > H + 1) continue; g.strokeRect(-0.2, y - 0.35, w.cx - w.gap / 2 + 0.2, 0.7); g.strokeRect(w.cx + w.gap / 2, y - 0.35, W + 0.2 - w.cx - w.gap / 2, 0.7); }
      g.globalAlpha = 1;
      // ホタル（群れ）
      if (s.alive) {
        const offs = swarmOffsets(s.N, B);
        g.globalCompositeOperation = 'lighter';
        for (let i = 0; i < offs.length; i++) g.drawImage(glow, s.x + offs[i].dx + jig(i, 0) - 0.5, SWARM_Y + offs[i].dy + jig(i, 2) - 0.5, 1, 1);
        g.globalCompositeOperation = 'source-over';
        for (let i = 0; i < offs.length; i++) {
          const x = s.x + offs[i].dx + jig(i, 0), y = SWARM_Y + offs[i].dy + jig(i, 2);
          g.fillStyle = C.main; g.beginPath(); g.arc(x, y, 0.13, 0, 6.283); g.fill();
          g.fillStyle = C.core; g.beginPath(); g.arc(x, y, 0.06, 0, 6.283); g.fill();
        }
      }
      // 散る・拾う粒子
      parts = parts.filter(p => (p.life -= dt) > 0);
      for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; g.globalAlpha = Math.min(1, p.life); g.fillStyle = p.col; g.beginPath(); g.arc(p.x, p.y, 0.08, 0, 6.283); g.fill(); }
      g.globalAlpha = 1;
    },
  };
}
