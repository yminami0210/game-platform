// 自動ゲート判定（エージェントを呼ばずに数値で判定する）。
// node gate_check.mjs [--gate slice|release] [--no-browser]
// テスト → 規約 → シミュレーション（初心者/上達者）→ ブラウザ短時間プレイ を実行し、
// studio/gates.json の基準（無ければ既定値）と照合して、失敗項目と最終判定だけを表示する。
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const gate = arg('gate', 'slice');
const noBrowser = process.argv.includes('--no-browser');
const game = existsSync('game/index.html') ? 'game' : '.';
const DEFAULTS = {
  runSecondsMin: 20, runSecondsMax: 180,   // 上達者ボットの1ラン中央値（concept の狙いに合わせて gates.json で変える）
  skillRatioMin: 1.5,                      // 上達者 / 初心者 のスコア中央値
  firstGoalScore: 1, noviceReachMin: 0.5,  // 初心者の何割が最初の小さな達成に届くか
  stuckShareMax: 0.4,                      // 同じ10秒帯に失敗が集中する割合（release のみ）
  readyMsMax: 3000, retryGapSecMax: 3, fpsMinWorst: 30,
  simRuns: 1000, lookaheadRuns: 60, playRuns: 3, playSeconds: 40,
};
const cfg = { ...DEFAULTS, ...(existsSync('studio/gates.json') ? JSON.parse(readFileSync('studio/gates.json', 'utf8')) : {}) };
const fails = [], notes = [];
const check = (ok, msg) => { if (!ok) fails.push(msg); };

// 1. テストと規約
const t = spawnSync('npm', ['test'], { cwd: game, encoding: 'utf8' });
check(t.status === 0, `テスト失敗: ${(t.stdout + t.stderr).split('\n').filter(l => /not ok|Error/.test(l)).slice(0, 2).join(' / ')}`);
const b = spawnSync('node', [join(HERE, 'check_build.mjs'), game], { encoding: 'utf8' });
check(b.status === 0, `規約違反: ${b.stdout.split('\n').filter(l => l.startsWith('ERROR')).slice(0, 3).join(' / ')}`);

// 2. シミュレーション
const sim = (policy, runs) => {
  const r = spawnSync('node', [join(HERE, 'simulate.mjs'), '--game', game, '--policy', policy, '--runs', String(runs), '--max-seconds', String(cfg.runSecondsMax * 2)], { encoding: 'utf8' });
  try { return JSON.parse(r.stdout.trim().split('\n').pop()); } catch { fails.push(`シミュレーション失敗(${policy}): ${r.stderr.split('\n')[0]}`); return null; }
};
const novice = sim('sticky', cfg.simRuns);
const hasClone = /export\s+function\s+clone/.test(readFileSync(join(game, 'src/core/game.js'), 'utf8'));
const expert = hasClone ? sim('lookahead', cfg.lookaheadRuns) : null;
if (!hasClone) notes.push('core に clone が無いため上達者ボットを省略（上達の余地は未判定）');
if (novice && expert) {
  const ratio = (expert.score.median + 1) / (novice.score.median + 1);
  check(ratio >= cfg.skillRatioMin, `上達の余地不足: 上達者/初心者 = ${ratio.toFixed(2)}（基準 ${cfg.skillRatioMin}）→ 運の比重が高すぎる`);
  const len = expert.runSeconds.median;
  check(len >= cfg.runSecondsMin && len <= cfg.runSecondsMax, `1ランの長さ: 上達者 ${len}秒（基準 ${cfg.runSecondsMin}〜${cfg.runSecondsMax}秒）`);
  notes.push(`sim 初心者 中央値${novice.score.median}点/${novice.runSeconds.median}秒, 上達者 ${expert.score.median}点/${expert.runSeconds.median}秒`);
}
if (novice) {
  // 初心者の到達率は --out の詳細から計算
  const tmp = join('studio', '.gate'); mkdirSync(tmp, { recursive: true });
  spawnSync('node', [join(HERE, 'simulate.mjs'), '--game', game, '--policy', 'sticky', '--runs', '300', '--out', join(tmp, 'novice.json')], { encoding: 'utf8' });
  try {
    const d = JSON.parse(readFileSync(join(tmp, 'novice.json'), 'utf8'));
    const reach = d.results.filter(r => r.score >= cfg.firstGoalScore).length / d.results.length;
    check(reach >= cfg.noviceReachMin, `初心者の到達率 ${(reach * 100).toFixed(0)}%（基準 ${cfg.noviceReachMin * 100}%、最初の達成=${cfg.firstGoalScore}点）→ 序盤が難しすぎる`);
    if (gate === 'release') {
      const h = Object.values(novice.failTimeHistogram10s); const total = h.reduce((a, c) => a + c, 0);
      const share = total ? Math.max(...h) / total : 0;
      check(share <= cfg.stuckShareMax || cfg.stuckShareMax >= 1, `詰まり: 失敗の${(share * 100).toFixed(0)}%が同じ10秒帯に集中（基準 ${cfg.stuckShareMax * 100}%）`);
    }
  } catch {}
}

// 3. ブラウザで短時間プレイ
if (!noBrowser) {
  const out = join('studio', '.gate', 'play');
  const p = spawnSync('node', [join(HERE, 'playtest.mjs'), '--url', join(game, 'index.html'), '--runs', String(cfg.playRuns), '--seconds', String(cfg.playSeconds), '--out', out], { encoding: 'utf8', timeout: 600000 });
  if (p.status === 2) notes.push('playwright 未導入のためブラウザ確認を省略（cd game && npm install && npx playwright install chromium）');
  else {
    try {
      const s = JSON.parse(p.stdout.trim().split('\n').find(l => l.startsWith('{')));
      check(!s.consoleErrors.length, `コンソールエラー: ${s.consoleErrors.slice(0, 2).join(' / ')}`);
      check((s.readyMsMedian ?? 1e9) <= cfg.readyMsMax, `起動が遅い: ${s.readyMsMedian}ms（基準 ${cfg.readyMsMax}ms）`);
      check(s.retryGapSecMedian == null || s.retryGapSecMedian <= cfg.retryGapSecMax, `リトライまで ${s.retryGapSecMedian}秒（基準 ${cfg.retryGapSecMax}秒）`);
      check((s.fpsMinWorst ?? 0) >= cfg.fpsMinWorst, `FPS低下: 最低 ${s.fpsMinWorst}（基準 ${cfg.fpsMinWorst}）`);
    } catch { fails.push(`ブラウザ確認に失敗: ${(p.stderr || '').split('\n')[0]}`); }
  }
}

for (const n of notes) console.log(`NOTE ${n}`);
for (const f of fails) console.log(`FAIL ${f}`);
console.log(fails.length ? `AUTO-GATE(${gate}): FAIL ${fails.length}件` : `AUTO-GATE(${gate}): PASS`);
process.exit(fails.length ? 1 : 0);
