// 記録係: 行動ログ（JSONL）、断面スナップショット、発信物（SNS・新聞・写真）の保存。
import fs from 'node:fs';
import path from 'node:path';
import { DATA } from './config.js';

export class Chronicle {
  constructor(dir = DATA) {
    this.dir = dir;
    for (const d of ['logs', 'snapshots', 'sns', 'news', 'photos']) fs.mkdirSync(path.join(dir, d), { recursive: true });
    this.recent = [];   // クライアント表示用の直近ログ
    this.day = [];      // 当日の重要ログ（新聞の素材）
    this.sns = this.#loadJsonl('sns/posts.jsonl').slice(-50);
    this.listeners = new Set();
  }

  #loadJsonl(rel) {
    const p = path.join(this.dir, rel);
    if (!fs.existsSync(p)) return [];
    return fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  }

  #append(rel, obj) {
    fs.appendFileSync(path.join(this.dir, rel), JSON.stringify(obj) + '\n');
  }

  emit(type, payload) {
    for (const fn of this.listeners) fn(type, payload);
  }

  // importance: 0=雑多 1=日常 2=話題 3=ニュース
  log(entry) {
    const e = { ...entry };
    this.#append(`logs/day-${String(e.day).padStart(4, '0')}.jsonl`, e);
    if ((e.importance ?? 0) >= 1) {
      this.recent.push(e);
      if (this.recent.length > 120) this.recent.shift();
      this.emit('log', e);
    }
    if ((e.importance ?? 0) >= 2) this.day.push(e);
    return e;
  }

  snapshot(day, hour, state) {
    const name = `day-${String(day).padStart(4, '0')}-${String(hour).padStart(2, '0')}.json`;
    fs.writeFileSync(path.join(this.dir, 'snapshots', name), JSON.stringify(state));
    return name;
  }

  // ローカルで要約した「ダイジェスト」。LLM に渡す場合もこれだけを渡す（入力トークン節約）。
  digest(limit = 8) {
    const byText = new Map();
    for (const e of this.day) {
      const k = e.text;
      const cur = byText.get(k) || { ...e, count: 0 };
      cur.count++;
      byText.set(k, cur);
    }
    return [...byText.values()]
      .sort((a, b) => b.importance - a.importance || b.count - a.count)
      .slice(0, limit)
      .map((e) => ({ time: e.time, who: e.who, place: e.placeName, text: e.text, importance: e.importance }));
  }

  resetDay() {
    this.day = [];
  }

  postSns(post) {
    this.#append('sns/posts.jsonl', post);
    this.sns.push(post);
    if (this.sns.length > 50) this.sns.shift();
    this.emit('sns', post);
  }

  publishNews(issue) {
    const file = `news/day-${String(issue.day).padStart(4, '0')}.md`;
    fs.writeFileSync(path.join(this.dir, file), issue.markdown);
    this.emit('news', issue);
    return file;
  }

  latestNews() {
    const dir = path.join(this.dir, 'news');
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort();
    if (!files.length) return null;
    const f = files[files.length - 1];
    return { file: f, markdown: fs.readFileSync(path.join(dir, f), 'utf8') };
  }

  savePhoto(id, buf) {
    const file = `photos/${id}.jpg`;
    fs.writeFileSync(path.join(this.dir, file), buf);
    return file;
  }
}
