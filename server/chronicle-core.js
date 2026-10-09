// 記録係の共通部分（ファイルシステムに依存しない）。Node 版とブラウザ版がこれを継承し、保存先だけを変える。
export class ChronicleCore {
  constructor({ sns = [] } = {}) {
    this.recent = [];   // 画面表示用の直近ログ
    this.day = [];      // 当日の重要ログ（新聞の素材）
    this.sns = sns.slice(-50);
    this.listeners = new Set();
  }

  // 保存フック（継承先で実装）
  persistLog(_e) {}
  persistSnapshot(_name, _state) {}
  persistSns(_post) {}
  persistNews(_file, _issue) {}
  persistPhoto(_file, _dataUrl) {}

  emit(type, payload) {
    for (const fn of this.listeners) fn(type, payload);
  }

  // importance: 0=雑多 1=日常 2=話題 3=ニュース
  log(entry) {
    const e = { ...entry };
    this.persistLog(e);
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
    this.persistSnapshot(name, state);
    return name;
  }

  // ローカルで要約した「ダイジェスト」。LLM に渡す場合もこれだけを渡す（入力トークン節約）。
  digest(limit = 8) {
    const byText = new Map();
    for (const e of this.day) {
      const cur = byText.get(e.text) || { ...e, count: 0 };
      cur.count++;
      byText.set(e.text, cur);
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
    this.persistSns(post);
    this.sns.push(post);
    if (this.sns.length > 50) this.sns.shift();
    this.emit('sns', post);
  }

  publishNews(issue) {
    const file = `news/day-${String(issue.day).padStart(4, '0')}.md`;
    this.news = { file: file.slice(5), markdown: issue.markdown };
    this.persistNews(file, issue);
    this.emit('news', issue);
    return file;
  }

  latestNews() {
    return this.news || null;
  }

  // dataUrl: "data:image/jpeg;base64,..."
  savePhoto(id, dataUrl) {
    const file = `photos/${id}.jpg`;
    this.persistPhoto(file, dataUrl, id);
    return file;
  }

  photoUrl(id) {
    return `data/photos/${id}.jpg`;
  }
}
