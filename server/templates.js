// LLM を使わない文章テンプレート（トークン 0）。ブラウザ単体モードでもそのまま使う。
import { NEWSPAPER_NAME } from './lore.js';

const pick = (arr, rnd) => arr[Math.floor(rnd() * arr.length)];

export const templates = {
  // 文体は正本のバイブルに合わせる: 数字・時刻・地名を入れ、感想やまとめで終えない。絵文字・ハッシュタグは使わない
  sns_post({ event }, rnd) {
    const when = event.time ? `${String(event.time).replace(/^0/, '')}ごろ、` : '';
    const tail = pick(['', '', '県庁広報課が確認しました。', '詳しくは県民だよりに載せます。'], rnd);
    return `【ナナシ県庁 広報課】${when}${event.text}。${tail}`;
  },
  newspaper({ day, dateLabel, digest, stats }, rnd) {
    const [top, ...rest] = digest;
    const head = top ? top.text : '大きな出来事はなし';
    const lines = [
      `# ${NEWSPAPER_NAME}　第${day}号`,
      `*${dateLabel}*`,
      '',
      `## 一面　${head}`,
      top ? `${top.place}で${top.time}ごろ、${top.text}。居合わせた${top.who}さんは「${pick(['朝から並んでいた', '知らなかった', '来週もあるらしい', '帰りにまた寄る'], rnd)}」と話した。` : '大きな出来事はなかった。',
      '',
      '## 県内のうごき',
      ...rest.map((e) => `- ${e.time} ${e.place}：${e.text}`),
      '',
      '## 県庁だより',
      `- 本日の人口 ${stats.population}人（転入 ${stats.arrivals}人）`,
      `- 広報課のSNS投稿 ${stats.posts}件、写真 ${stats.photos}枚`,
      '',
      '',
    ];
    return lines.join('\n');
  },
};
