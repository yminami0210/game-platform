// 固定ステップの時間配分。一時停止中は時間を進めない（DOM非依存）。
export function advance(acc, dt, paused, DT) {
  if (paused) return { acc: 0, steps: 0 };
  acc += dt;
  const steps = Math.floor(acc / DT + 1e-9);
  return { acc: acc - steps * DT, steps };
}
