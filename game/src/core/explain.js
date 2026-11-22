// reasons[] → 解説（孫子の短い引用＋自作の現代語）。文言は data/text.json。純関数。
const PRIORITY = { uncovered: 0, fire_backfire: 1, unused: 2, idle: 3, trap: 4, fire_ok: 5, high: 6, choke: 7, spy: 8, plain: 9 };

export function explain(result, plan, text, max = 3) {
  const out = [];
  const fill = (s, v) => s.replace('{z}', v.z ?? '').replace('{p}', v.p ?? '').replace('{why}', v.why ?? '');
  // 同じ種類の理由は地形をまとめて1行にする
  const groups = new Map();
  for (const r of result.reasons) {
    const [key, arg] = r.split(':');
    if (!text.reasons[key]) continue;
    if (!groups.has(key)) groups.set(key, []);
    if (arg) groups.get(key).push(text.zones[arg]);
    else groups.get(key).push('');
  }
  for (const [k, zs] of groups) {
    const t = text.reasons[k];
    const body = result.win && t.winText ? t.winText : t.text; // 勝敗と矛盾しない文面
    out.push({ key: k, kind: t.kind, quote: t.quote, src: t.src, body: fill(body, { z: zs.filter(Boolean).join('・') }) });
  }
  const fired = new Set(result.reasons.map((r) => r.split(':')[0]));
  for (const p of plan.principles) {
    if (p === 'spy') { out.push({ key: 'spy', ...pick(text.reasons.spy), body: text.reasons.spy.text }); continue; }
    const hit = p === 'fire' ? fired.has('fire_ok') || fired.has('fire_backfire') : fired.has(p);
    if (!hit) out.push({ key: 'unused', ...pick(text.reasons.unused), body: fill(text.reasons.unused.text, { p: text.principles[p].name, why: text.unmet[p] }) });
  }
  if (!out.length) out.push({ key: 'plain', ...pick(text.reasons.plain), body: text.reasons.plain.text });
  out.sort((a, b) => PRIORITY[a.key] - PRIORITY[b.key]);
  return out.slice(0, max);
}
const pick = (t) => ({ kind: t.kind, quote: t.quote, src: t.src });

// 習得した原則（効いた原則。用間は善戦以上で使った時）
export function learnedFrom(result, plan) {
  const has = (k) => result.reasons.some((r) => r.split(':')[0] === k);
  const out = [];
  if (has('high') && plan.principles.includes('high')) out.push('high');
  if (has('choke') && plan.principles.includes('choke')) out.push('choke');
  if (has('trap') && plan.principles.includes('trap')) out.push('trap');
  if (has('fire_ok') && plan.principles.includes('fire')) out.push('fire');
  if (plan.principles.includes('spy') && result.score >= 1) out.push('spy');
  return out;
}

// 軍議中の原則札の印。斥候報告の主張を信じた場合に、条件が満たされそうか。
// ok=効く見込み / maybe=敵の位置しだい / no=今の配置では不発 / na=配置待ち
export function principleStatus(p, place, reports, exit) {
  const placed = Object.values(place);
  if (p === 'spy') return 'maybe';
  if (!placed.length) return 'na';
  const ours = (z) => placed.includes(z);
  const claimed = (z) => reports.some((r) => r.subject !== 'wind' && r.claim === z);
  if (p === 'high' || p === 'choke') { const z = p === 'high' ? 'hill' : 'gorge'; return !ours(z) ? 'no' : claimed(z) ? 'ok' : 'maybe'; }
  if (p === 'trap') {
    let any = false;
    for (const z of Object.keys(exit)) if (ours(z) && claimed(z)) { any = true; if (ours(exit[z])) return 'ok'; }
    return any ? 'no' : placed.some((z) => exit[z] && ours(exit[z])) ? 'maybe' : 'no';
  }
  if (p === 'fire') { const w = reports.find((r) => r.subject === 'wind'); return !place.arc ? 'na' : w && w.claim === 'E' ? 'ok' : 'no'; }
  return 'na';
}

// 斥候報告の答え合わせ（戦闘後のみ呼ぶ）。rawReports は用間前の元の報告。
export function checkReports(rawReports, sc, spyTarget, text) {
  const rows = rawReports.map((r) => {
    const truth = r.subject === 'wind' ? sc.wind : sc.enemy.find((e) => e.type === r.subject).zone;
    const name = (v) => (r.subject === 'wind' ? text.wind[v] : text.zones[v]);
    const subj = r.subject === 'wind' ? '風' : text.types[r.subject];
    return { source: r.source, label: text.source[r.source].label, mark: text.source[r.source].mark, hit: r.claim === truth, spied: r.subject === spyTarget,
      claim: `${subj}は${name(r.claim)}`, truth: name(truth) };
  });
  const tally = {};
  for (const r of rows) { const t = (tally[r.source] ??= [0, 0]); t[0] += r.hit; t[1]++; }
  return { rows, tally };
}
