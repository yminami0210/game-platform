import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Chronicle } from '../server/chronicle.js';
import { Executor } from '../server/executor.js';
import { Simulation, STATE } from '../server/sim.js';
import { loadConfig } from '../server/config.js';

function setup(llm = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nanashi-'));
  const cfg = loadConfig({ llm: { mode: 'template', ...llm } });
  const chronicle = new Chronicle(dir);
  const events = [];
  chronicle.listeners.add((type, payload) => events.push([type, payload]));
  return { dir, cfg, chronicle, events };
}

function run(sim, gameMinutes, step = 0.25, speed = 4) {
  for (let t = 0; t < gameMinutes / speed; t += step) sim.tick(step, speed);
}

test('住民は世帯・住まい・勤め先と結びついている（住民台帳）', () => {
  const { cfg, chronicle } = setup();
  const sim = new Simulation({ seed: 7, population: 300, chronicle, executor: new Executor(cfg, { dataDir: chronicle.dir }) });
  const residents = sim.cps.filter((c) => c.resident);
  assert.ok(residents.length >= 300 && residents.length < 310);
  for (const c of residents) {
    const hh = sim.households.get(c.hh);
    assert.ok(hh && hh.members.includes(c.id), `${c.name} は世帯に属している`);
    assert.equal(c.surname, hh.surname, '家族は同じ名字');
    assert.equal(c.home, hh.house, '世帯の家に住む');
    assert.ok(sim.houseById[c.home], '住まいが実在する');
  }
  // 部屋の数より多くは住まない
  const perHouse = {};
  for (const hh of sim.households.values()) perHouse[hh.house] = (perHouse[hh.house] || 0) + 1;
  for (const [id, n] of Object.entries(perHouse)) assert.ok(n <= sim.houseById[id].units);
  // 働く人には勤め先がある。県庁の机は全部うまっている
  for (const c of sim.cps.filter((x) => x.role === 'worker')) assert.ok(c.work === 'home' || sim.placeById[c.work]);
  assert.equal(sim.cps.filter((c) => c.role === 'staff').length, sim.desks.length);
  assert.ok(sim.cps.filter((c) => c.dept === 'koho').length > 0);
});

test('ベッドタウン: 平日の昼は住民の半数以上が電車で県外にいて、夜には帰ってくる', () => {
  const { cfg, chronicle, events } = setup();
  const sim = new Simulation({ seed: 7, population: 420, commuteShare: 0.85, chronicle, executor: new Executor(cfg, { dataDir: chronicle.dir }) });
  // 2日目（火）の 12:00 まで進める
  while (sim.minutes < 1440 + 12 * 60) sim.tick(0.25, 2);
  const noon = sim.clock();
  assert.ok(noon.away / noon.population > 0.5, `昼に県外: ${noon.away}/${noon.population}`);
  while (sim.minutes < 1440 + 22 * 60) sim.tick(0.25, 2);
  const night = sim.clock();
  assert.ok(night.away / night.population < 0.05, `夜に県外: ${night.away}`);
  assert.ok(events.some(([t, e]) => t === 'log' && e.kind === 'train'), '電車の乗り降りが記録される');
  assert.ok(sim.cps.some((c) => c.incoming), '県外から通ってくる人もいる');
});

test('管理者: 建てる・移す・取り壊す。道路や線路の上には置けない', () => {
  const { cfg, chronicle, events } = setup();
  const sim = new Simulation({ seed: 7, population: 120, chronicle, executor: new Executor(cfg, { dataDir: chronicle.dir }) });
  assert.match(sim.adminAdd({ item: 'conbini', x: 0, z: 90 }).error, /道路/);
  assert.match(sim.adminAdd({ item: 'house_niko', x: 90, z: 27 }).error, /線路/);
  assert.match(sim.adminMove({ id: 'station', x: 100, z: 100 }).error, /動かせません/);
  // 空いている所を探して建てる
  let added = null;
  for (let x = -230; x < 230 && !added; x += 4) for (let z = -230; z < 230 && !added; z += 4) {
    const r = sim.adminAdd({ item: 'clinic', x, z });
    if (r.ok) added = r.id;
  }
  assert.ok(added, '診療所が建った');
  assert.ok(events.some(([t]) => t === 'layout'));
  const clinic = sim.placeById[added];
  assert.ok(sim.cps.some((c) => c.work === added), '新しい働き口が埋まる');
  assert.ok(sim.adminMove({ id: added, x: clinic.x, z: clinic.z, rot: 0 }).ok);
  // 人が住む家を取り壊すと、世帯は空き家へ引っ越すか町を出る
  const hh = [...sim.households.values()][0];
  const before = hh.house;
  assert.ok(sim.adminRemove({ id: before }).ok);
  assert.ok(!sim.houseById[before]);
  const moved = sim.households.get(hh.id);
  assert.ok(!moved || moved.house !== before);
  assert.ok(sim.adminRemove({ id: added }).ok);
  assert.ok(!sim.cps.some((c) => c.work === added));
});

test('保存して復元すると、住民台帳とレイアウトが同じになる', () => {
  const { cfg, chronicle } = setup();
  const sim = new Simulation({ seed: 7, population: 150, chronicle, executor: new Executor(cfg, { dataDir: chronicle.dir }) });
  run(sim, 600, 0.25, 2);
  const data = JSON.parse(JSON.stringify(sim.serialize()));
  const again = new Simulation({ seed: 7, population: 150, chronicle, executor: new Executor(cfg, { dataDir: chronicle.dir }), saved: data });
  assert.equal(again.cps.length, sim.cps.length);
  assert.equal(again.households.size, sim.households.size);
  assert.equal(again.layout.houses.length, sim.layout.houses.length);
  const c = sim.cps.find((x) => x.resident);
  assert.equal(again.cpById(c.id).home, c.home);
});

test('1日回すと SNS 投稿・新聞・スナップショットが LLM なし（トークン0）でできる', async () => {
  const { cfg, chronicle, events, dir } = setup();
  const executor = new Executor(cfg, { dataDir: dir });
  const sim = new Simulation({ seed: 3, population: 200, chronicle, executor });
  run(sim, 33 * 60);
  await new Promise((r) => setTimeout(r, 50));
  assert.ok(events.some(([t]) => t === 'sns'), 'SNS 投稿がある');
  assert.ok(events.some(([t]) => t === 'news'), '新聞が発行された');
  assert.ok(fs.readdirSync(path.join(dir, 'snapshots')).length >= 20);
  assert.equal(executor.status().tokens, 0);
  const posts = events.filter(([t]) => t === 'sns').map(([, p]) => p);
  assert.ok(posts.every((p) => p.via === 'template'));
});

test('作業中の CP はタスク状態になり、Claude Code からの完了報告で投稿される', async () => {
  const { cfg, chronicle, events, dir } = setup();
  const sim = new Simulation({ seed: 5, population: 120, chronicle, executor: new Executor(cfg, { dataDir: dir }) });
  const t = sim.requestTask('sns_post', { external: true, event: { text: 'テストの話題', placeName: '県庁' } });
  for (let i = 0; i < 4000 && t.status !== 'working'; i++) sim.tick(0.25, 1);
  run(sim, 60, 0.25, 1);
  const cp = sim.cps.find((c) => c.id === t.assignee);
  assert.equal(t.status, 'working');
  assert.equal(cp.state, STATE.task);
  assert.ok(t.progress <= 0.95, '外部結果待ちで止まる');
  assert.ok(sim.completeExternal(t.id, 'Claude Code が書いた投稿 #ナナシ県'));
  run(sim, 5);
  await new Promise((r) => setTimeout(r, 20));
  const post = events.find(([type, p]) => type === 'sns' && p.via === 'claude-code');
  assert.ok(post);
  assert.match(post[1].text, /Claude Code/);
});

test('住民課の手続きで世帯とアバターが増える。アバターは token でのみ動かせる', () => {
  const { cfg, chronicle, events, dir } = setup();
  const sim = new Simulation({ seed: 5, population: 100, chronicle, executor: new Executor(cfg, { dataDir: dir }) });
  const before = sim.residentCount();
  sim.requestTask('resident_register', { name: '試験 花子' });
  sim.requestTask('resident_register', { human: true, name: 'みなみ', color: '#ff0000', token: 'abc' });
  for (let i = 0; i < 4000 && sim.tasks.some((t) => t.type === 'resident_register' && t.status !== 'done'); i++) sim.tick(0.25, 1);
  assert.equal(sim.residentCount(), before + 2);
  const human = sim.cps.find((c) => c.role === 'human');
  assert.equal(human.name, 'みなみ');
  assert.ok(sim.houseById[human.home], 'アバターにも住まいがある');
  assert.equal(sim.moveHuman(human.id, 'wrong', 0, 0), false);
  assert.equal(sim.moveHuman(human.id, 'abc', 10, 10), true);
  assert.ok(events.some(([t, p]) => t === 'registered' && p.human));
  const hana = sim.cps.find((c) => c.name === '試験 花子');
  assert.equal(sim.households.get(hana.hh).surname, '試験');
});

test('omniroute モード: 上限回数を超えたらテンプレートに落ち、キャッシュで再課金しない', async () => {
  const { cfg, dir } = setup({ mode: 'omniroute', maxCallsPerGameDay: { sns_post: 1 } });
  delete process.env.OMNIROUTE_API_KEY; // 運用設定: 127.0.0.1 の OmniRoute はキーなしで呼ぶ
  const roles = JSON.parse(fs.readFileSync(new URL('../tools/omni_models.json', import.meta.url), 'utf8'));
  let calls = 0;
  const fetchImpl = async (url, opts) => {
    calls++;
    assert.equal(url, 'http://127.0.0.1:20128/v1/chat/completions');
    assert.equal(opts.headers.authorization, undefined);
    const body = JSON.parse(opts.body);
    assert.equal(body.model, roles.writer, 'role:writer は omni_models.json の writer に置き換わる');
    assert.ok(body.max_tokens <= 220);
    return { ok: true, json: async () => ({ choices: [{ message: { content: 'LLM の投稿' } }], usage: { total_tokens: 90 } }) };
  };
  const ex = new Executor(cfg, { dataDir: dir, fetchImpl });
  const input = { event: { text: '子牛が生まれた', placeName: '名無牧場' }, author: '佐藤' };
  const a = await ex.run('sns_post', input, 1);
  assert.equal(a.via, 'omniroute');
  const b = await ex.run('sns_post', { ...input, event: { text: '別の話題', placeName: '駅' } }, 1);
  assert.equal(b.via, 'template', '1日1回の上限');
  assert.equal(calls, 1);
  assert.equal(ex.status().tokens, 90);
});

test('omniroute モード: 失敗時はテンプレートに落ちる', async () => {
  const { cfg, dir } = setup({ mode: 'omniroute' });
  process.env.OMNIROUTE_API_KEY = 'test-key';
  const ex = new Executor(cfg, { dataDir: dir, fetchImpl: async () => ({ ok: false, status: 503 }) });
  const r = await ex.run('sns_post', { event: { text: 'x', placeName: 'y' }, author: 'z' }, 1);
  assert.equal(r.via, 'template');
  assert.match(r.error, /503/);
  delete process.env.OMNIROUTE_API_KEY;
});

test('見た目は部品の組み合わせで台帳に残り、店・家の詳細と店の利用が記録される', async () => {
  const { LOOK_PARTS, cleanLook } = await import('../server/looks.js');
  const { createApi } = await import('../server/api.js');
  const { cfg, chronicle } = setup();
  const executor = new Executor(cfg, { dataDir: chronicle.dir });
  const sim = new Simulation({ seed: 7, population: 300, chronicle, executor });
  for (const c of sim.cps) for (const k of Object.keys(LOOK_PARTS)) assert.ok(LOOK_PARTS[k].some(([id]) => id === c.look[k]), `${c.name} の ${k}`);
  assert.ok(new Set(sim.cps.map((c) => JSON.stringify(c.look))).size > sim.cps.length * 0.9, '見た目はほぼ全員ちがう');
  // 保存して戻しても同じ見た目
  const back = new Simulation({ seed: 7, chronicle, executor, saved: JSON.parse(JSON.stringify(sim.serialize())) });
  assert.deepEqual(back.cps[5].look, sim.cps[5].look);
  // 台帳と人の詳細に見た目の説明
  const m = sim.registry().households[0].members[0];
  assert.ok(m.look && m.lookText.length > 4);
  assert.ok(sim.cpDetail(sim.cps[0].id).lookText);
  // 使えない部品は捨てる
  assert.deepEqual(cleanLook({ hair: 'mohawk', body: 'round' }, { hair: 'short', body: 'slim' }), { hair: 'short', body: 'round' });
  run(sim, 120);
  const api = createApi({ sim, chronicle, executor, seed: 7 });
  const kissa = sim.places(['kissa'])[0];
  const d = api.place(kissa.id);
  assert.equal(d.name, kissa.name);
  assert.ok(d.hours && typeof d.open === 'boolean' && d.staffCount >= 1);
  assert.equal(d.hereCount, sim.cps.filter((c) => !c.away && c.place === kissa.id && c.state !== STATE.walk && c.state !== STATE.sleep).length);
  assert.ok(api.place('kencho').staffCount >= 30, '県庁は執務フロアの職員');
  const house = sim.layout.houses.find((h) => [...sim.households.values()].some((hh) => hh.house === h.id));
  const hd = api.house(house.id);
  assert.ok(hd.address && hd.households[0].members.length >= 1);
  // 店の利用（ミニゲームの結果）
  const before = d.visitsToday;
  assert.equal(api.useShop(kissa.id, { player: 'テスト<script>', text: '「ナポリタンを運べ」で遊んだ', score: 120 }).ok, true);
  assert.equal(api.place(kissa.id).visitsToday, before + 1);
  assert.match(chronicle.recent.at(-1).text, /テストscript.*ナポリタン.*120点/);
  assert.equal(api.useShop('nope', {}).ok, false);
  // アバターは選んだ見た目で登録される
  const { task } = api.avatars({ name: '旅人', look: { hair: 'bun', body: 'tall', top: '#c8463a', extra: 'bogus' } });
  for (let i = 0; i < 200 && !sim.tasks.find((t) => t.id === task.id)?.result; i++) run(sim, 10);
  const av = sim.cpById(sim.tasks.find((t) => t.id === task.id).result.cpId);
  assert.equal(av.look.hair, 'bun'); assert.equal(av.look.body, 'tall'); assert.notEqual(av.look.extra, 'bogus');
});

test('SNS は正本の4アカウント（県庁・ナナシ放送・まるやす・ナナシくん）で、正本の文体を守る（トークン 0）', async () => {
  const { weatherOf } = await import('../server/personas.js');
  const { cfg, chronicle } = setup();
  // 2026-10-01（木）から 2026-10-14 まで（正本の 10 月の出来事がある期間）
  const start = (Date.UTC(2026, 9, 1) - Date.UTC(2026, 2, 30)) / 60000;
  const sim = new Simulation({ seed: 7, population: 300, chronicle, executor: new Executor(cfg, { dataDir: chronicle.dir }), startMinutes: start });
  const posts = [];
  chronicle.listeners.add((type, p) => type === 'sns' && p.persona && posts.push(p));
  run(sim, 1440 * 14, 0.25, 8);
  const by = (id) => posts.filter((p) => p.persona === id);
  for (const id of ['kencho', 'housou', 'maruyasu', 'nanashikun']) assert.ok(by(id).length >= 2, `${id} が投稿していない`);
  assert.equal(by('maruyasu').length, 14, 'まるやすは毎日1回');
  // お天気には日付・最高／最低気温・降水確率・風速・時刻が必ず入る
  for (const p of by('housou').filter((p) => p.text.includes('お天気'))) assert.match(p.text, /\d+月\d+日（.）.*最高-?\d+℃／最低-?\d+℃、降水確率\d+%.*\d+時.*\d+m\/s/);
  // 正本の出来事が正しい日に出る（10月12日は県民駅伝、10月1日はナナシくんの衣替え）
  const dayOf = (p) => new Date(Date.UTC(2026, 2, 30) + (p.day - 1) * 86400000).getUTCDate();
  assert.ok(by('maruyasu').some((p) => dayOf(p) === 12 && p.text.includes('県民駅伝')));
  assert.ok(by('nanashikun').some((p) => dayOf(p) === 1 && p.text.includes('衣替え')));
  // 絵文字・ハッシュタグ・「なぜか」「不思議と」は使わない。実在の都道府県名も出さない
  for (const p of posts) {
    assert.doesNotMatch(p.text, /[\u{1F300}-\u{1FAFF}]|#|なぜか|不思議と|どこか/u, p.text);
    assert.doesNotMatch(p.text, /東京|大阪|北海道|ナナミ|オトギ|まるなな|ななっしー/, p.text);
  }
  assert.ok(posts.every((p) => p.via === 'template' && p.draft === true), 'すべて下書き（人間の承認待ち）');
  // 正本の投稿例の天気（11月5日）
  const w = weatherOf(new Date(Date.UTC(2026, 10, 5)));
  assert.deepEqual([w.sky, w.hi, w.lo, w.oroshi.from, w.oroshi.gust], ['晴れのちくもり', 14, 3, 13, 18]);
});

test('正本の登場人物が町の住人に配役される（西村ハル・丸山保・戸田由佳・三浦勝・佐藤恵・北村課長）', async () => {
  const { CAST } = await import('../server/personas.js');
  const { cfg, chronicle } = setup();
  const sim = new Simulation({ seed: 7, population: 420, chronicle, executor: new Executor(cfg, { dataDir: chronicle.dir }), startMinutes: 0 });
  const b = sim.personas.bound;
  for (const id of ['haru', 'maruyama', 'toda', 'miura', 'sato', 'kitamura']) {
    const c = b[id], k = CAST[id];
    assert.ok(c, `${id} の住人がいない`);
    assert.equal(c.surname, k.surname);
    if (k.given) assert.equal(c.given, k.given);
    assert.equal(c.age, k.age);
    assert.equal(c.sex, k.sex);
    if (k.work) assert.equal(c.work, k.work);
    if (k.dept) assert.equal(c.dept, k.dept);
  }
  // ハルは母と祖母の3人暮らしで、県立中ノ町商業に通う
  const fam = sim.households.get(b.haru.hh).members.map((id) => sim.cpById(id));
  assert.equal(fam.length, 3);
  assert.ok(fam.every((m) => m.sex === 'f' && m.surname === '西村'));
  assert.equal(sim.cpDetail(b.haru.id).workLabel, '県立中ノ町商業高校');
  assert.equal(b.kitamura.title, '課長');
  // 保存して開き直しても同じ人
  const again = new Simulation({ seed: 7, chronicle, executor: new Executor(cfg, { dataDir: chronicle.dir }), saved: JSON.parse(JSON.stringify(sim.serialize())) });
  assert.equal(again.personas.bound.haru.id, b.haru.id);
  assert.equal(again.personas.bound.maruyama.name, '丸山 保');
});
