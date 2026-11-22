import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { createEngine, ZONES, TYPES } from '../src/core/battle.js';
import { createGame, step, actions, deploy, setPlace, togglePrinciple, chooseSpy, intervene, canDeploy, reportsOf, snapshot, clone } from '../src/core/game.js';
import { explain, learnedFrom } from '../src/core/explain.js';
import { load, save, record, KEY } from '../src/save.js';
import { createBots } from './bots.js';

const rd = (f) => JSON.parse(readFileSync(new URL('../src/data/' + f, import.meta.url)));
const B = rd('balance.json'), T = rd('text.json');
const data = { balance: B, text: T };
const eng = createEngine(B);
const plan = (place, principles, intervention = null) => ({ place, principles, intervention });
const P0 = plan({ inf: 'plain', arc: 'hill', cav: 'plain' }, ['high', 'fire']);

test('同じ入力+同じシードなら完全再現', () => {
  for (const seed of [1, 7, 42, 999]) {
    const sc = eng.makeScenario(seed);
    assert.deepEqual(sc, eng.makeScenario(seed));
    assert.deepEqual(eng.makeReports(sc, seed), eng.makeReports(sc, seed));
    assert.deepEqual(eng.resolveBattle(sc, P0, seed), eng.resolveBattle(sc, P0, seed));
  }
});

test('試作 studio/balance_prototype.mjs と結果が一致する（移植で挙動を変えていない）', async (t) => {
  const url = new URL('../../studio/balance_prototype.mjs', import.meta.url);
  if (!existsSync(url)) return t.skip('prototype なし');
  const proto = await import(url.href);
  for (let seed = 1; seed <= 40; seed++) {
    const sc = proto.makeScenario(seed); assert.deepEqual(eng.makeScenario(seed), sc);
    assert.deepEqual(eng.makeReports(sc, seed), proto.makeReports(sc, seed).map(({ truth, ...r }) => r));
    const pl = plan({ inf: ZONES[seed % 4], arc: ZONES[(seed >> 2) % 4], cav: ZONES[(seed >> 1) % 4] }, [['high', 'choke'], ['trap', 'fire'], ['fire', 'spy']][seed % 3], seed % 2 ? { unit: 'inf', zone: 'hill' } : null);
    assert.deepEqual(eng.resolveBattle(sc, pl, seed), proto.resolveBattle(sc, pl, seed));
  }
});

test('同配置・別シードでも結果が近い（揺らぎは小さい）', () => {
  const sc = eng.makeScenario(5);
  const left = [1, 2, 3, 4, 5, 6, 7, 8].map((s) => eng.resolveBattle(sc, P0, s).eLeft);
  assert.ok(Math.max(...left) - Math.min(...left) < 0.15);
});

test('報告の真偽: 信頼度ごとの的中率が設定に近く、不可能な報告は必ず偽', () => {
  const hit = { high: [0, 0], mid: [0, 0], low: [0, 0] };
  for (let seed = 1; seed <= 1500; seed++) {
    const sc = eng.makeScenario(seed);
    for (const r of eng.makeReports(sc, seed)) {
      const truth = r.subject === 'wind' ? sc.wind : sc.enemy.find((e) => e.type === r.subject).zone;
      if (!r.feasible) assert.notEqual(r.claim, truth);
      hit[r.source][0] += r.claim === truth; hit[r.source][1]++;
    }
  }
  for (const k of ['high', 'mid', 'low']) assert.ok(Math.abs(hit[k][0] / hit[k][1] - B.srcTrue[k]) < 0.06, k);
  assert.equal(eng.makeScenario(3).enemy.find((e) => e.type === 'cav').zone !== 'river', true);
});

test('用間: 指定した報告が確定の真実になり、他は変わらない', () => {
  for (let seed = 1; seed <= 50; seed++) {
    const sc = eng.makeScenario(seed), reps = eng.makeReports(sc, seed);
    const out = eng.applySpy(reps, sc, 'wind');
    const w = out.find((r) => r.subject === 'wind');
    assert.equal(w.claim, sc.wind); assert.equal(w.confirmed, true); assert.equal(w.source, 'high');
    assert.deepEqual(out.filter((r) => r.subject !== 'wind'), reps.filter((r) => r.subject !== 'wind'));
  }
});

// 条件を決め打ちしたシナリオで各原則の条件を確かめる
const sc0 = (zones, wind = 'E') => ({ enemy: TYPES.map((t) => ({ type: t, count: B.enemyCount[t], zone: zones[t] })), wind });
const run = (sc, pl) => eng.resolveBattle(sc, pl, 3);
const hasEv = (r, kind) => r.events.some((e) => e.kind === kind);

test('原則: 高所 は山で会敵した時だけ効く', () => {
  const sc = sc0({ inf: 'hill', arc: 'plain', cav: 'plain' });
  const on = run(sc, plan({ inf: 'hill', arc: 'plain', cav: 'plain' }, ['high', 'choke']));
  assert.ok(on.reasons.includes('high') && hasEv(on, 'high_ground'));
  const miss = run(sc, plan({ inf: 'plain', arc: 'plain', cav: 'plain' }, ['high', 'choke']));
  assert.ok(!miss.reasons.includes('high'));
  const gain = run(sc, plan({ inf: 'hill', arc: 'plain', cav: 'plain' }, ['choke', 'spy']));
  assert.ok(eng.resolveBattle(sc, plan({ inf: 'hill', arc: 'plain', cav: 'plain' }, ['high', 'spy']), 3).eLeft < gain.eLeft);
});

test('原則: 険所 は谷で会敵した時だけ効く', () => {
  const sc = sc0({ inf: 'gorge', arc: 'plain', cav: 'plain' });
  assert.ok(run(sc, plan({ inf: 'gorge', arc: 'plain', cav: 'plain' }, ['choke', 'spy'])).reasons.includes('choke'));
  assert.ok(!run(sc, plan({ inf: 'hill', arc: 'plain', cav: 'plain' }, ['choke', 'spy'])).reasons.includes('choke'));
  const a = run(sc, plan({ inf: 'gorge', arc: 'plain', cav: 'plain' }, ['choke', 'spy']));
  const b = run(sc, plan({ inf: 'gorge', arc: 'plain', cav: 'plain' }, ['high', 'spy']));
  assert.ok(a.pLeft > b.pLeft);
});

test('原則: 死地に追い込む は退路にも自軍がいる時だけ効く', () => {
  const sc = sc0({ inf: 'gorge', arc: 'gorge', cav: 'gorge' });
  assert.ok(run(sc, plan({ inf: 'gorge', arc: 'plain', cav: 'plain' }, ['trap', 'spy'])).reasons.includes('trap:gorge'));
  assert.ok(!run(sc, plan({ inf: 'gorge', arc: 'hill', cav: 'hill' }, ['trap', 'spy'])).reasons.some((r) => r.startsWith('trap')));
});

test('原則: 火攻は 東風で効き、西風では自滅する。弓がいて3R目以降', () => {
  const pl = plan({ inf: 'plain', arc: 'plain', cav: 'hill' }, ['fire', 'spy']);
  const east = run(sc0({ inf: 'river', arc: 'river', cav: 'plain' }, 'E'), pl);
  assert.ok(east.reasons.includes('fire_ok'));
  assert.equal(east.events.find((e) => e.kind === 'fire').t, B.fireFrom);
  const west = run(sc0({ inf: 'river', arc: 'river', cav: 'plain' }, 'W'), pl);
  assert.ok(west.reasons.includes('fire_backfire') && hasEv(west, 'backfire') && !west.reasons.includes('fire_ok'));
  assert.ok(!run(sc0({ inf: 'river', arc: 'river', cav: 'plain' }, 'E'), plan(pl.place, ['high', 'spy'])).reasons.includes('fire_ok'));
});

test('敵のいる所に自軍がいないと本陣が削られ、遊兵は idle になる', () => {
  const r = run(sc0({ inf: 'hill', arc: 'hill', cav: 'hill' }), plan({ inf: 'river', arc: 'river', cav: 'river' }, ['high', 'choke']));
  assert.ok(r.reasons.includes('uncovered:hill') && r.reasons.includes('idle:river') && hasEv(r, 'base_hit'));
  assert.equal(r.score, 0);
});

test('介入: 第3ラウンドの頭に部隊が動き、1〜2ラウンドは変わらない', () => {
  const sc = eng.makeScenario(11);
  const a = eng.resolveBattle(sc, P0, 11), b = eng.resolveBattle(sc, plan(P0.place, P0.principles, { unit: 'inf', zone: 'hill' }), 11);
  const iv = b.events.find((e) => e.kind === 'intervene');
  assert.equal(iv.t, B.interveneRound + 1);
  assert.deepEqual(a.events.filter((e) => e.t <= B.interveneRound), b.events.filter((e) => e.t <= B.interveneRound));
});

test('スコア閾値: 0敗 / 1善戦 / 2勝利 / 3完勝', () => {
  const seen = new Set();
  for (let seed = 1; seed <= 300; seed++) {
    const sc = eng.makeScenario(seed);
    const pl = plan({ inf: ZONES[seed % 4], arc: ZONES[(seed * 3) % 4], cav: ZONES[(seed * 5 + 1) % 4] }, [['high', 'choke'], ['trap', 'fire']][seed % 2]);
    const r = eng.resolveBattle(sc, pl, seed); seen.add(r.score);
    const end = r.events.at(-1);
    const ok = r.baseHp > 0;
    const expect = !ok || r.eLeft > B.goodEnemyLeft ? 0 : r.eLeft > B.winEnemyLeft ? 1 : r.eLeft <= B.perfectEnemyLeft && r.pLeft >= B.perfectOwn ? 3 : 2;
    assert.equal(r.score, expect); assert.equal(end.score, r.score); assert.equal(r.win, r.score >= 2);
  }
  assert.ok(seen.has(0) && seen.has(1) && seen.has(2));
});

test('ゲーム状態機械: 軍議→開戦→介入→結果。用間は外せず、未完了では開戦できない', () => {
  const s = createGame({ seed: 4, data });
  assert.equal(canDeploy(s), false); assert.equal(deploy(s), false);
  for (const t of TYPES) setPlace(s, t, 'plain');
  assert.ok(togglePrinciple(s, 'spy')); assert.ok(togglePrinciple(s, 'fire'));
  assert.equal(togglePrinciple(s, 'high'), false); // 3つ目は選べない
  assert.equal(canDeploy(s), false); // 用間の対象が未選択
  const before = reportsOf(s).find((r) => r.subject === 'wind');
  assert.ok(chooseSpy(s, 'wind'));
  assert.equal(reportsOf(s).find((r) => r.subject === 'wind').claim, s.sc.wind);
  assert.equal(chooseSpy(s, 'inf'), false); assert.equal(togglePrinciple(s, 'spy'), false);
  assert.ok(before);
  assert.ok(deploy(s)); assert.equal(s.phase, 'battle');
  const ev = step(s, 'skip');
  assert.equal(s.phase, 'result'); assert.equal(s.alive, false);
  assert.equal(ev.at(-1).type, s.result.win ? 'clear' : 'fail');
  assert.ok(Array.isArray(actions(s)));
  assert.equal(JSON.stringify(snapshot(s)).includes('"sc"'), false);
  assert.ok(clone(s));
});

test('解説: 原因ごとに孫子の言葉と現代語が出る。スコア0〜3の導線テキストが揃う', () => {
  const bad = run(sc0({ inf: 'hill', arc: 'hill', cav: 'hill' }), plan({ inf: 'river', arc: 'river', cav: 'river' }, ['high', 'choke']));
  const ex = explain(bad, plan({ inf: 'river', arc: 'river', cav: 'river' }, ['high', 'choke']), T);
  assert.equal(ex[0].key, 'uncovered');
  assert.ok(ex.every((e) => e.quote && e.src.endsWith('篇') && e.body.length > 10));
  assert.ok(ex.some((e) => e.key === 'unused'));
  assert.ok(!ex.some((e) => /[{}]/.test(e.body)));
  assert.equal(T.scoreLabel.length, 4); assert.equal(T.scoreLead.length, 4);
  for (const k of ['fire_ok', 'fire_backfire', 'trap', 'high', 'choke', 'idle']) assert.ok(T.reasons[k].quote && T.reasons[k].src);
  const good = run(sc0({ inf: 'hill', arc: 'plain', cav: 'plain' }), plan({ inf: 'hill', arc: 'plain', cav: 'plain' }, ['high', 'spy']));
  assert.deepEqual(learnedFrom(good, plan({ inf: 'hill', arc: 'plain', cav: 'plain' }, ['high', 'spy'])).includes('high'), true);
});

test('保存: 壊れたデータ・保存不可でも落ちない。往復できる', () => {
  const mem = { d: {}, getItem(k) { return this.d[k] ?? null; }, setItem(k, v) { this.d[k] = v; } };
  assert.equal(KEY, 'sangoku_gunshi_v1');
  assert.deepEqual(load(mem).learned, []);
  mem.d[KEY] = '{broken'; assert.equal(load(mem).best, 0);
  const s = record(load(mem), 2, ['high', 'fire'], ['high']);
  assert.ok(save(s, mem)); const l = load(mem);
  assert.equal(l.best, 2); assert.deepEqual(l.learned, ['high']); assert.equal(l.recent.length, 1);
  assert.equal(save(s, { setItem() { throw new Error('quota'); } }), false);
  assert.equal(load({ getItem() { throw new Error('denied'); } }).best, 0);
});

test('スコア: 上達者ボットは初心者ボットの1.5倍以上勝つ（少数回の確認。全数は studio/balance_sim.mjs）', () => {
  const bots = createBots(eng, B); const runs = 120;
  const tally = (name) => {
    let win = 0, mean = 0;
    for (let seed = 1; seed <= runs; seed++) {
      const sc = eng.makeScenario(seed), reps = eng.makeReports(sc, seed);
      const pl = bots[name](sc, reps, seed);
      if (name === 'expert') pl.intervention = bots.bestIntervention(sc, pl, seed);
      const r = eng.resolveBattle(sc, pl, seed); win += r.win; mean += r.score;
    }
    return { win: win / runs, mean: mean / runs };
  };
  const nov = tally('novice'), exp = tally('expert'), rnd = tally('random');
  assert.ok(exp.win / Math.max(nov.win, 1e-9) >= 1.5, JSON.stringify({ nov, exp }));
  assert.ok(exp.mean / Math.max(nov.mean, 1e-9) >= 1.5);
  assert.ok(rnd.win <= 0.2);
});

test('データJSONがすべて読める', () => {
  const dir = new URL('../src/data/', import.meta.url);
  for (const f of readdirSync(dir)) if (f.endsWith('.json')) JSON.parse(readFileSync(new URL(f, dir)));
});
