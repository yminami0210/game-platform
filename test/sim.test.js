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

test('人口が設定どおりに生成され、県庁の各部署に職員がいる', () => {
  const { cfg, chronicle } = setup();
  const sim = new Simulation({ seed: 7, population: 300, chronicle, executor: new Executor(cfg, { dataDir: chronicle.dir }) });
  assert.equal(sim.cps.length, 300);
  assert.ok(sim.cps.filter((c) => c.dept === 'koho').every((c) => c.skills.includes('sns_post')));
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

test('住民課の手続きで CP とアバターが増える。アバターは token でのみ動かせる', () => {
  const { cfg, chronicle, events, dir } = setup();
  const sim = new Simulation({ seed: 5, population: 100, chronicle, executor: new Executor(cfg, { dataDir: dir }) });
  sim.requestTask('resident_register', { name: '試験 花子' });
  sim.requestTask('resident_register', { human: true, name: 'みなみ', color: '#ff0000', token: 'abc' });
  run(sim, 500, 0.25, 1);
  assert.equal(sim.cps.length, 102);
  const human = sim.cps.find((c) => c.role === 'human');
  assert.equal(human.name, 'みなみ');
  assert.equal(sim.moveHuman(human.id, 'wrong', 0, 0), false);
  assert.equal(sim.moveHuman(human.id, 'abc', 10, 10), true);
  assert.ok(events.some(([t, p]) => t === 'registered' && p.human));
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
