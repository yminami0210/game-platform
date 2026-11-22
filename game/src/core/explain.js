// reasons[] → 解説（孫子の短い引用＋自作の現代語）。文言は data/text.json。純関数。
const PRIORITY = { uncovered: 0, fire_backfire: 1, unused: 2, idle: 3, trap: 4, fire_ok: 5, high: 6, choke: 7, spy: 8, plain: 9 };

export function explain(result, plan, text, max = 3) {
  const out = [];
  const fill = (s, v) => s.replace('{z}', v.z ?? '').replace('{p}', v.p ?? '');
  for (const r of result.reasons) {
    const [key, arg] = r.split(':');
    const k = key === 'fire_backfire' || key === 'fire_ok' ? key : key;
    const t = text.reasons[k];
    if (!t) continue;
    out.push({ key: k, kind: t.kind, quote: t.quote, src: t.src, body: fill(t.text, { z: text.zones[arg] }) });
  }
  const fired = new Set(result.reasons.map((r) => r.split(':')[0]));
  for (const p of plan.principles) {
    if (p === 'spy') { out.push({ key: 'spy', ...pick(text.reasons.spy), body: text.reasons.spy.text }); continue; }
    const hit = p === 'fire' ? fired.has('fire_ok') || fired.has('fire_backfire') : fired.has(p);
    if (!hit) out.push({ key: 'unused', ...pick(text.reasons.unused), body: fill(text.reasons.unused.text, { p: text.principles[p].name }) });
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
