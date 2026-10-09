// LLM を使わない文章テンプレート（トークン 0）。ブラウザ単体モードでもそのまま使う。
import { HASHTAGS, NEWSPAPER_NAME } from './lore.js';

const pick = (arr, rnd) => arr[Math.floor(rnd() * arr.length)];

export const templates = {
  sns_post({ event, author }, rnd) {
    const openers = ['【県庁広報課より】', '【ナナシ県だより】', '【今日のナナシ県】', '【広報課の小さな発見】'];
    const closers = ['皆さまもお出かけの際はぜひ。', '県庁広報課は今日も見ています。', '詳しくは県民新聞で。', 'またお知らせします。'];
    const tags = [HASHTAGS[0], pick(HASHTAGS.slice(1), rnd)].join(' ');
    return `${pick(openers, rnd)}${event.text}。${pick(closers, rnd)}（担当: ${author}） ${tags}`;
  },
  newspaper({ day, dateLabel, digest, stats }, rnd) {
    const [top, ...rest] = digest;
    const head = top ? top.text : '県内はおおむね平穏';
    const lines = [
      `# ${NEWSPAPER_NAME}　第${day}号`,
      `*${dateLabel}*`,
      '',
      `## 一面　${head}`,
      top ? `${top.place}で${top.time}ごろ、${top.text}。目撃した${top.who}さんは「まさかと思った」と話している。` : '大きな出来事はなかった。',
      '',
      '## 県内のうごき',
      ...rest.map((e) => `- ${e.time} ${e.place}：${e.text}`),
      '',
      '## 県庁だより',
      `- 本日の人口 ${stats.population}人（転入 ${stats.arrivals}人）`,
      `- 広報課のSNS投稿 ${stats.posts}件、写真 ${stats.photos}枚`,
      '',
      `> ${pick(['ないのに、ありそう。', '明日もナナシ県は続く。', '県民の皆さまの声をお待ちしています。'], rnd)}`,
      '',
    ];
    return lines.join('\n');
  },
};
