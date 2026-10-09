// 記録係（Node 版）: 行動ログ（JSONL）、断面スナップショット、発信物（SNS・新聞・写真）をファイルに保存する。
import fs from 'node:fs';
import path from 'node:path';
import { DATA } from './config.js';
import { ChronicleCore } from './chronicle-core.js';

function loadJsonl(p) {
  if (!fs.existsSync(p)) return [];
  return fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

export class Chronicle extends ChronicleCore {
  constructor(dir = DATA) {
    for (const d of ['logs', 'snapshots', 'sns', 'news', 'photos']) fs.mkdirSync(path.join(dir, d), { recursive: true });
    super({ sns: loadJsonl(path.join(dir, 'sns/posts.jsonl')) });
    this.dir = dir;
    const news = fs.readdirSync(path.join(dir, 'news')).filter((f) => f.endsWith('.md')).sort().pop();
    if (news) this.news = { file: news, markdown: fs.readFileSync(path.join(dir, 'news', news), 'utf8') };
  }

  persistLog(e) {
    fs.appendFileSync(path.join(this.dir, `logs/day-${String(e.day).padStart(4, '0')}.jsonl`), JSON.stringify(e) + '\n');
  }
  persistSnapshot(name, state) {
    fs.writeFileSync(path.join(this.dir, 'snapshots', name), JSON.stringify(state));
  }
  persistSns(post) {
    fs.appendFileSync(path.join(this.dir, 'sns/posts.jsonl'), JSON.stringify(post) + '\n');
  }
  persistNews(file, issue) {
    fs.writeFileSync(path.join(this.dir, file), issue.markdown);
  }
  persistPhoto(file, dataUrl) {
    fs.writeFileSync(path.join(this.dir, file), Buffer.from(dataUrl.replace(/^data:image\/jpeg;base64,/, ''), 'base64'));
  }
}
