// 大型タイトル向けの自動ゲート。 node game/tools/adventure_gate.mjs [--gate slice|release] [--no-browser]
// 1. npm test と規約  2. クリア確認ボット（ゴール・隠し出口・金ボタン3枚）  3. 初心者ボット（死亡数・詰まり・時間）
// 4. 実ブラウザで通し（起動・流れ・全ステージを本物のループでクリア・FPS・エラー）
// 基準は studio/gates.json。結果は studio/.gate/report.json
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkStage, stageIds } from './clearbot.mjs';
import { noviceStage } from './novice.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const GAME = join(HERE, '..');
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const gate = arg('gate', 'slice');
const cfg = JSON.parse(readFileSync('studio/gates.json', 'utf8'));
const fails = [], notes = [];
const check = (ok, msg) => { if (!ok) fails.push(msg); };
const report = { gate, at: new Date().toISOString(), stages: {} };

// 1. テストと規約
const t = spawnSync('npm', ['test'], { cwd: GAME, encoding: 'utf8' });
check(t.status === 0, `テスト失敗: ${(t.stdout + t.stderr).split('\n').filter(l => /not ok|Error/.test(l)).slice(0, 2).join(' / ')}`);
const b = spawnSync('node', ['.claude/game-studio/scripts/check_build.mjs', 'game'], { encoding: 'utf8' });
check(b.status === 0, `規約違反: ${b.stdout.split('\n').filter(l => l.startsWith('ERROR')).slice(0, 3).join(' / ')}`);

// 対象ステージ
const world = JSON.parse(readFileSync(join(GAME, 'src/data/world1.json'), 'utf8'));
const ready = stageIds();
const want = cfg[gate]?.stages === 'all' ? world.nodes.filter(n => n.stage).map(n => n.stage) : (cfg[gate]?.stages ?? ready);
if (cfg[gate]?.requireWorldComplete) for (const id of want) check(ready.includes(id), `ステージ ${id} がまだ無い`);
const ids = want.filter(id => ready.includes(id));

// 2. クリア確認ボット
let worldBotMin = 0;
for (const id of ids) {
  const r = checkStage(id, { medals: cfg.medalsReachable });
  const goal = r.targets.find(x => x.target === 'goal' || x.target === 'boss');
  report.stages[id] = { clear: r.targets };
  check(goal?.ok, `${id}: クリア確認ボットがゴールに届かない（${goal?.stuckAt ? `x=${goal.stuckAt.x}, y=${goal.stuckAt.y} 付近で止まる` : '?'}）`);
  if (goal?.ok && goal.target === 'goal') check(goal.botSeconds >= cfg.expertSecondsMin && goal.botSeconds <= cfg.expertSecondsMax, `${id}: 上手なボットのクリア時間 ${goal.botSeconds}秒（基準 ${cfg.expertSecondsMin}〜${cfg.expertSecondsMax}秒）`);
  for (const m of r.targets.filter(x => x.target.startsWith('medal'))) check(m.ok, `${id}: 金ボタン${+m.target.slice(5) + 1} に届かない`);
  const sec = r.targets.find(x => x.target === 'secret');
  if (sec && cfg.secretReachable) check(sec.ok, `${id}: 隠し出口に届かない`);
  worldBotMin += (goal?.botSeconds ?? 0) / 60;
}

// 3. 初心者ボット
let worldNoviceMin = 0;
for (const id of ids) {
  const n = noviceStage(id, { runs: cfg.noviceRuns, noise: cfg.noviceNoise });
  report.stages[id].novice = n;
  check(n.clearRate >= cfg.noviceClearRateMin, `${id}: 初心者ボットのクリア率 ${(n.clearRate * 100).toFixed(0)}%（基準 ${cfg.noviceClearRateMin * 100}%）→ 難しすぎる`);
  check(n.deathsMedian <= cfg.noviceDeathsMedianMax, `${id}: 初心者ボットの死亡数 中央値 ${n.deathsMedian}回（基準 ${cfg.noviceDeathsMedianMax}回以下）`);
  const isBoss = id.endsWith('F');
  if (!isBoss && n.deathsMedian >= 3) check(n.stuckShare <= cfg.stuckShareMax, `${id}: 詰まり — ミスの${(n.stuckShare * 100).toFixed(0)}%が ${n.stuckBand} に集中（基準 ${cfg.stuckShareMax * 100}%）`);
  worldNoviceMin += ((n.timeMedian ?? 0) + n.deathsMedian * 2) / 60;
  notes.push(`${id}: 上手 ${report.stages[id].clear.find(x => x.target === 'goal' || x.target === 'boss')?.botSeconds}秒 / 初心者 クリア率${(n.clearRate * 100).toFixed(0)}% 死亡${n.deathsMedian}回 ${n.timeMedian}秒`);
}
const estMin = worldNoviceMin * cfg.humanFactor;
report.estimate = { worldBotMin: +worldBotMin.toFixed(1), worldNoviceMin: +worldNoviceMin.toFixed(1), humanEstimateMin: +estMin.toFixed(1) };
notes.push(`遊ぶ時間の見積もり: 初心者ボット ${worldNoviceMin.toFixed(1)}分 × 人の係数 ${cfg.humanFactor} ≒ ${estMin.toFixed(0)}分（物語・地図・金ボタン探しを除く）`);
if (gate === 'release') check(estMin >= cfg.worldMinutesMin && estMin <= cfg.worldMinutesMax, `ワールド1の遊ぶ時間の見積もり ${estMin.toFixed(0)}分（基準 ${cfg.worldMinutesMin}〜${cfg.worldMinutesMax}分）`);

// 4. 実ブラウザ
if (!process.argv.includes('--no-browser')) {
  const out = join('studio', '.gate', 'browser');
  const p = spawnSync('node', [join(HERE, 'browsercheck.mjs'), '--out', out, '--stages', ids.join(',')], { encoding: 'utf8', timeout: 1800000 });
  if (p.status === 2) notes.push('playwright 未導入のためブラウザ確認を省略');
  else {
    try {
      const s = JSON.parse(p.stdout.trim().split('\n').filter(l => l.startsWith('{')).pop());
      report.browser = s;
      check(!s.consoleErrors.length, `コンソールエラー: ${s.consoleErrors.slice(0, 2).join(' / ')}`);
      check(s.readyMs <= cfg.readyMsMax, `起動が遅い: ${s.readyMs}ms（基準 ${cfg.readyMsMax}ms）`);
      check(s.flow, 'タイトル → 物語 → 地図 → 1-1 の流れがキー操作で通らない');
      check((s.fpsMinWorst ?? 0) >= cfg.fpsMinWorst, `FPS低下: 最低 ${s.fpsMinWorst}（基準 ${cfg.fpsMinWorst}）`);
      for (const [id, r] of Object.entries(s.stages)) check(r.cleared, `${id}: ブラウザの本物のループでクリアできない`);
      check(s.mobilePad, 'スマホ横持ちで仮想ボタンが出ない');
      notes.push(`ブラウザ: 起動 ${s.readyMs}ms / FPS 平均${s.fpsAvg} 最低${s.fpsMinWorst} / スクショ ${out}`);
    } catch (e) { fails.push(`ブラウザ確認に失敗: ${(p.stderr || String(e)).split('\n')[0]}`); }
  }
}

mkdirSync(join('studio', '.gate'), { recursive: true });
report.fails = fails; report.notes = notes;
writeFileSync(join('studio', '.gate', 'report.json'), JSON.stringify(report, null, 2));
for (const n of notes) console.log(`NOTE ${n}`);
for (const f of fails) console.log(`FAIL ${f}`);
console.log(fails.length ? `AUTO-GATE(${gate}): FAIL ${fails.length}件` : `AUTO-GATE(${gate}): PASS`);
process.exit(fails.length ? 1 : 0);
