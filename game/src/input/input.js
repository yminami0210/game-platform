// キーボード・ゲームパッド・タッチ（横持ちの仮想ボタン）を、同じ「押されている状態」にまとめる。
// held: { l, r, u, d, j, b }、menu 用には pressed() で押した瞬間を取る。
const KEYS = {
  ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r', ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd',
  KeyZ: 'j', Space: 'j', KeyK: 'j', KeyX: 'b', ShiftLeft: 'b', ShiftRight: 'b', KeyJ: 'b',
  Enter: 'start', Escape: 'start', KeyP: 'start',
};
const NAMES = ['l', 'r', 'u', 'd', 'j', 'b', 'start'];

export function createInput(padRoot) {
  const kb = {}, touch = {};
  let prev = {}, cur = {};
  let lastDevice = 'keyboard';
  addEventListener('keydown', e => {
    const k = KEYS[e.code]; if (!k) return;
    kb[k] = true; lastDevice = 'keyboard'; e.preventDefault();
  });
  addEventListener('keyup', e => { const k = KEYS[e.code]; if (k) kb[k] = false; });
  addEventListener('blur', () => { for (const k in kb) kb[k] = false; });

  // タッチ: data-k の付いたボタン。十字は指を滑らせても追従する
  if (padRoot) {
    const active = new Map(); // pointerId -> key
    const keyAt = (x, y) => document.elementFromPoint(x, y)?.closest('[data-k]')?.dataset.k ?? null;
    const sync = () => { for (const n of NAMES) touch[n] = false; for (const k of active.values()) if (k) for (const n of k.split(',')) touch[n] = true; };
    padRoot.addEventListener('pointerdown', e => { const k = keyAt(e.clientX, e.clientY); if (!k) return; active.set(e.pointerId, k); lastDevice = 'touch'; sync(); e.preventDefault(); padRoot.setPointerCapture?.(e.pointerId); });
    padRoot.addEventListener('pointermove', e => { if (!active.has(e.pointerId)) return; const k = keyAt(e.clientX, e.clientY); const was = active.get(e.pointerId); if (k && k !== was && isDir(k) && isDir(was)) { active.set(e.pointerId, k); sync(); } });
    const up = e => { active.delete(e.pointerId); sync(); };
    padRoot.addEventListener('pointerup', up); padRoot.addEventListener('pointercancel', up);
  }
  const isDir = k => k && /^[lrud](,[lrud])?$/.test(k);

  function readPad() {
    const out = {};
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of pads) {
      if (!gp) continue;
      const b = i => gp.buttons[i]?.pressed;
      const ax = gp.axes[0] ?? 0, ay = gp.axes[1] ?? 0;
      const any = (o, k, v) => { if (v) { o[k] = true; lastDevice = 'pad'; } };
      any(out, 'l', b(14) || ax < -0.4); any(out, 'r', b(15) || ax > 0.4);
      any(out, 'u', b(12) || ay < -0.5); any(out, 'd', b(13) || ay > 0.5);
      any(out, 'j', b(0) || b(3)); any(out, 'b', b(1) || b(2) || b(7) || b(6));
      any(out, 'start', b(9) || b(8));
    }
    return out;
  }

  return {
    // 毎フレーム1回呼ぶ
    poll() {
      prev = cur;
      const pad = readPad();
      cur = {};
      for (const n of NAMES) cur[n] = !!(kb[n] || touch[n] || pad[n]);
      return cur;
    },
    get held() { return cur; },
    pressed: n => cur[n] && !prev[n],
    // メニュー用の「決定」「戻る」
    confirm() { return (cur.j && !prev.j) || (cur.start && !prev.start && false); },
    get device() { return lastDevice; },
    clear() { for (const k in kb) kb[k] = false; for (const k in touch) touch[k] = false; },
  };
}
