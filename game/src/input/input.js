// タッチ/マウス/キーを「行動」に変換する。押している間その方向に動く。
export function createInput(canvas) {
  let held = 'none';
  const dir = x => (x < window.innerWidth / 2 ? 'left' : 'right');
  canvas.addEventListener('pointerdown', e => { held = dir(e.clientX); e.preventDefault(); });
  canvas.addEventListener('pointermove', e => { if (e.buttons) held = dir(e.clientX); });
  const up = () => { held = 'none'; };
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
  window.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') held = 'left'; if (e.key === 'ArrowRight') held = 'right'; });
  window.addEventListener('keyup', up);
  return { get action() { return held; } };
}
