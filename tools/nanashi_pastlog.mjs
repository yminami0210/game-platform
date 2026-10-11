// ナナシ県の SNS アカウント（観光課・住人A・住人B・ふじや）の「過去ログ」を作る。
// 構想書のネクストステップ 3「数週間、誰にも気づかれない状態で街の過去ログをためる」のための下書き。
// 町を早回しして、テンプレートだけで投稿を作る（LLM 不使用・トークン 0）。外には何も投稿しない。
//
//   node tools/nanashi_pastlog.mjs [--days 21] [--out data/arg/pastlog] [--check]
//
// - 今日から --days 日前の 0 時から、昨日の 24 時まで町を動かす（日付は現実の暦と同じ）
// - 出力: <out>/timeline.md（全アカウントの時系列）と <out>/<アカウント>.md
// - --check: 実在の都道府県名・不安をあおる言葉が入っていないか、同じ文のくり返しが多すぎないかを調べる（だめなら終了コード 1）
import fs from 'node:fs';
import path from 'node:path';
import { ChronicleCore } from '../server/chronicle-core.js';
import { Simulation, dateLabel } from '../server/sim.js';
import { PERSONAS } from '../server/personas.js';
import { templates } from '../server/templates.js';
import { mulberry32, realMinutes } from '../server/world.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const DAYS = Number(arg('--days', 21));
const OUT = path.resolve(ROOT, arg('--out', 'data/arg/pastlog'));
const CHECK = process.argv.includes('--check');
const SEED = JSON.parse(fs.readFileSync(path.join(ROOT, 'nanashi.config.json'), 'utf8')).seed;

const posts = [];
const chronicle = new ChronicleCore();
chronicle.persistSns = (p) => { if (p.persona) posts.push(p); };
const rnd = mulberry32(SEED);
const executor = { run: async (type, input) => ({ text: templates[type](input, rnd), via: 'template' }), status: () => ({ mode: 'template', tokens: 0 }) };

const today = Math.floor(realMinutes() / 1440);
const start = (today - DAYS) * 1440;
const sim = new Simulation({ seed: SEED, chronicle, executor, startMinutes: start });
const t0 = Date.now();
while (sim.minutes < today * 1440) sim.tick(0.25, 8); // 1 回で 2 分ずつ進める
await new Promise((r) => setTimeout(r, 10)); // 非同期のタスクを流しきる

fs.mkdirSync(OUT, { recursive: true });
const label = (p) => `${PERSONAS[p.persona].label}（${p.author} ${p.handle}）`;
const timeline = [`# ナナシ県 SNS 過去ログ（下書き・未投稿）`, '', `${dateLabel(sim.day - DAYS)} 〜 ${dateLabel(sim.day - 1)}。${posts.length}件。町の早回しとテンプレートで作成（トークン 0）`, ''];
let lastDay = null;
for (const p of posts) {
  if (p.day !== lastDay) { timeline.push('', `## ${dateLabel(p.day)}`, ''); lastDay = p.day; }
  timeline.push(`- **${p.time}** ${label(p)}: ${p.text.replace(/\n/g, ' ／ ')}`);
}
fs.writeFileSync(path.join(OUT, 'timeline.md'), timeline.join('\n') + '\n');
for (const id of Object.keys(PERSONAS)) {
  const mine = posts.filter((p) => p.persona === id);
  const lines = [`# ${PERSONAS[id].label} ${PERSONAS[id].handle}`, '', `プロフィール: ${PERSONAS[id].profile}`, '', ...mine.map((p) => `- ${dateLabel(p.day)} ${p.time}　${p.text.replace(/\n/g, ' ／ ')}`)];
  fs.writeFileSync(path.join(OUT, `${id}.md`), lines.join('\n') + '\n');
}
const count = Object.fromEntries(Object.keys(PERSONAS).map((id) => [id, posts.filter((p) => p.persona === id).length]));
console.log(`${DAYS}日分 ${posts.length}件（${JSON.stringify(count)}）→ ${path.relative(ROOT, OUT)}/  ${((Date.now() - t0) / 1000).toFixed(1)}秒`);

if (CHECK) {
  const PREFS = '北海道 青森 岩手 宮城 秋田 山形 福島 茨城 栃木 群馬 埼玉 千葉 東京 神奈川 新潟 富山 石川 福井 山梨 長野 岐阜 静岡 愛知 三重 滋賀 京都 大阪 兵庫 奈良 和歌山 鳥取 島根 岡山 広島 山口 徳島 香川 愛媛 高知 福岡 佐賀 長崎 熊本 大分 宮崎 鹿児島 沖縄'.split(' ');
  const SCARY = ['失踪', '行方不明', '心霊', '呪', '死', '殺', '地震', '津波', '予言', '事故'];
  const bad = posts.filter((p) => PREFS.some((w) => p.text.includes(w)) || SCARY.some((w) => p.text.includes(w)));
  const texts = posts.map((p) => p.text);
  const dupRate = 1 - new Set(texts).size / Math.max(1, texts.length);
  const silent = Object.entries(count).filter(([, n]) => n < DAYS * 0.3).map(([id]) => id);
  console.log(`チェック: 使えない言葉 ${bad.length}件／同じ文のくり返し ${(dupRate * 100).toFixed(0)}%／投稿が少なすぎるアカウント ${silent.join(', ') || 'なし'}`);
  for (const p of bad) console.log(`  ✗ ${p.handle} ${p.text}`);
  if (bad.length || silent.length) process.exit(1);
}
