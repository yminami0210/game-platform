// ワールドマップの進行（純粋なロジック）。どの道が開いているか、どこへ動けるか、クリアの記録。
export function edgeOpen(edge, prog) {
  if (!edge.need) return true;
  return !!prog.stages[edge.need[0]]?.exits?.[edge.need[1]];
}
export function openNodes(world, prog) {
  const open = new Set([world.nodes[0].id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const e of world.edges) if (edgeOpen(e, prog) && (open.has(e.a) !== open.has(e.b))) { open.add(e.a); open.add(e.b); grew = true; }
  }
  return open;
}
// dir = {x, y}（-1..1）。開いている道で、向きがいちばん合う先のノード
export function moveFrom(world, prog, from, dir) {
  const node = id => world.nodes.find(n => n.id === id);
  const a = node(from);
  let best = null, bestDot = 0.35;
  for (const e of world.edges) {
    if (!edgeOpen(e, prog) || (e.a !== from && e.b !== from)) continue;
    const b = node(e.a === from ? e.b : e.a);
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
    const dot = (dx * dir.x + dy * dir.y) / d / (Math.hypot(dir.x, dir.y) || 1);
    if (dot > bestDot) { bestDot = dot; best = b.id; }
  }
  return best;
}
export function emptyProgress() {
  return { stages: {}, coins: 0, deaths: 0, at: 'home', seenIntro: false, seenEnding: false, playTime: 0 };
}
// クリア（または途中で戻った）結果を記録し、新しく開いた道を返す
export function recordResult(world, prog, stageId, r) {
  const before = new Set(world.edges.filter(e => edgeOpen(e, prog)).map(e => e.a + '>' + e.b));
  const st = prog.stages[stageId] ??= { exits: {}, medals: [false, false, false], best: null, deaths: 0, clears: 0 };
  r.medals?.forEach((m, i) => { if (m) st.medals[i] = true; });
  st.deaths += r.deaths ?? 0; prog.deaths += r.deaths ?? 0;
  prog.coins += r.coins ?? 0; prog.playTime += r.time ?? 0;
  if (r.exit) {
    const ex = r.exit === 'knot' ? 'goal' : r.exit;
    st.exits[ex] = true; st.clears++;
    if (st.best == null || r.time < st.best) st.best = +r.time.toFixed(2);
  }
  return world.edges.filter(e => edgeOpen(e, prog) && !before.has(e.a + '>' + e.b));
}
export function medalTotal(prog) { return Object.values(prog.stages).reduce((n, s) => n + s.medals.filter(Boolean).length, 0); }

// ワールドの解放は必ずここで判定する（収益モデル: ワールド3までは無料。4以降の条件は未定で、課金・広告は実装しない）
// studio/legal/2026-10-04-monetization-minors.md「設計で今やっておくこと」
export const FREE_WORLDS = 3;
export function worldUnlocked(worldId, prog) { return worldId <= FREE_WORLDS || !!prog.unlocks?.[worldId]; }
