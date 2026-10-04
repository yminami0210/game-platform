// core の state を読んで描くだけ。state を書き換えない。
import { W, H } from '../core/game.js';
export function createRenderer(canvas) {
  const g = canvas.getContext('2d');
  let scale = 1, ox = 0, oy = 0, shake = 0;
  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
    scale = Math.min(canvas.width / W, canvas.height / H);
    ox = (canvas.width - W * scale) / 2; oy = (canvas.height - H * scale) / 2;
  }
  addEventListener('resize', resize); resize();
  return {
    hit() { shake = 0.3; },
    draw(s, dt) {
      g.fillStyle = '#101018'; g.fillRect(0, 0, canvas.width, canvas.height);
      shake = Math.max(0, shake - dt);
      const sx = shake ? (Math.sin(s.t * 90) * shake * 12) : 0;
      g.save(); g.translate(ox + sx, oy); g.scale(scale, scale);
      g.fillStyle = '#1a1a28'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#ff5470';
      for (const b of s.blocks) g.fillRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
      g.fillStyle = s.alive ? '#ffb000' : '#666';
      g.beginPath(); g.arc(s.player.x, H - 1.5, 0.45, 0, Math.PI * 2); g.fill();
      g.restore();
    }
  };
}
