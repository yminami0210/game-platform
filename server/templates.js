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
  // 一面記事だけ。写真（またはポスター・場所の絵）は sim が見出しの下に入れる
  newspaper({ day, dateLabel, digest }, rnd) {
    const [top] = digest;
    const head = top ? top.text : '大きな出来事はなし';
    const who = top?.who && !/駅員|係|課$/.test(top.who) ? `居合わせた${top.who}さんは「${pick(['朝から並んでいた', '知らなかった', '来週もあるらしい', '帰りにまた寄る'], rnd)}」と話した。` : '';
    const lines = [
      `# ${NEWSPAPER_NAME}　第${day}号`,
      `*${dateLabel}*`,
      '',
      `## ${head}`,
      top ? `${top.place}で${String(top.time).replace(/^0/, '')}ごろ、${top.text}。${who}` : '大きな出来事はなかった。',
      '',
    ];
    return lines.join('\n');
  },
};
