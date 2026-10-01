// 相対ドラッグ（指の横移動量で目標 x を動かす）と ←→ キーを「行動」に変換する。
// 目標 x との差から left / right / none を返す（ボットの press と同じ経路で step に渡る）。
export function createInput(canvas, { getX, unitPx }) {
  let target = null, startPx = 0, startTarget = 0, key = null;
  canvas.addEventListener('pointerdown', e => {
    startPx = e.clientX; startTarget = getX(); target = startTarget;
    canvas.setPointerCapture?.(e.pointerId); e.preventDefault();
  });
  canvas.addEventListener('pointermove', e => { if (target !== null) target = startTarget + (e.clientX - startPx) / unitPx(); });
  const up = () => { target = null; };
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
  window.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') key = 'left'; if (e.key === 'ArrowRight') key = 'right'; });
  window.addEventListener('keyup', e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') key = null; });
  return {
    action(x) {
      if (key) return key;
      if (target === null) return 'none';
      const d = target - x;
      return d > 0.06 ? 'right' : d < -0.06 ? 'left' : 'none';
    },
  };
}
