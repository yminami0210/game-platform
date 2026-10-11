// 人の見た目（顔・体型・髪・服・小物）を部品の組み合わせで表す。住民台帳に記録し、地図・3D・似顔絵で同じ見た目を描く。
// 部品は昭和の町の人らしく（角刈り・パーマ・七三・おかっぱ・割烹着の色など）。
export const LOOK_PARTS = {
  face: [['round', '丸顔'], ['oval', '面長'], ['square', '四角顔'], ['egg', 'たまご顔']],
  eyes: [['dot', 'つぶらな目'], ['droop', 'たれ目'], ['sharp', 'つり目'], ['smile', '細目']],
  brows: [['thin', '細まゆ'], ['thick', '太まゆ']],
  mouth: [['smile', 'にっこり'], ['flat', 'きりっと'], ['open', 'おしゃべり']],
  hair: [['crop', '角刈り'], ['short', '短髪'], ['parted', '七三'], ['perm', 'パーマ'], ['bob', 'おかっぱ'], ['long', '長髪'], ['bun', 'おだんご'], ['bald', 'つるつる']],
  hairColor: [['#1f1b18', '黒'], ['#3d2f26', 'こげ茶'], ['#6b4a32', '茶'], ['#9a9a9a', '白まじり'], ['#d8d4cc', '白']],
  skin: [['#f7dcc4', '色白'], ['#f3d2b4', 'ふつう'], ['#e8c09c', '日焼け']],
  body: [['slim', 'やせ型'], ['normal', 'ふつう'], ['stout', 'がっしり'], ['round', 'ふくよか'], ['tall', 'のっぽ']],
  top: [['#c8463a', '赤'], ['#3a6aa0', '紺'], ['#e3a62b', '山吹'], ['#4a8a5a', '緑'], ['#efe6d0', '生成り'], ['#8a7ab8', '藤色'], ['#6b5a4c', '茶'], ['#f2b8c6', '桃']],
  bottom: [['#2b3a55', '紺'], ['#4a4036', '茶'], ['#6b6f75', '灰'], ['#1f1b18', '黒']],
  extra: [['none', 'なし'], ['glasses', '眼鏡'], ['hat', '帽子'], ['scarf', '手ぬぐい']],
};

// 体型ごとの幅・背の高さ（1 = ふつう）
export const BODY_SHAPE = { slim: [0.82, 1.02], normal: [1, 1], stout: [1.18, 1.0], round: [1.28, 0.96], tall: [0.95, 1.14] };

const pickId = (list, rnd) => list[Math.floor(rnd() * list.length)][0];

// 年齢と性別に合わせて、それらしく選ぶ
export function randomLook(rnd, { sex = 'm', age = 30 } = {}) {
  const hairBy = age >= 70 && sex === 'm' ? ['bald', 'crop', 'short'] : sex === 'm' ? ['crop', 'short', 'parted', 'perm'] : age >= 60 ? ['perm', 'bun', 'short'] : ['bob', 'long', 'perm', 'bun', 'short'];
  const colorBy = age >= 70 ? ['#d8d4cc', '#9a9a9a'] : age >= 55 ? ['#9a9a9a', '#1f1b18', '#3d2f26'] : ['#1f1b18', '#3d2f26', '#6b4a32'];
  const look = {
    face: pickId(LOOK_PARTS.face, rnd), eyes: pickId(LOOK_PARTS.eyes, rnd), brows: pickId(LOOK_PARTS.brows, rnd), mouth: pickId(LOOK_PARTS.mouth, rnd),
    hair: hairBy[Math.floor(rnd() * hairBy.length)], hairColor: colorBy[Math.floor(rnd() * colorBy.length)],
    skin: pickId(LOOK_PARTS.skin, rnd), body: age < 13 ? 'normal' : pickId(LOOK_PARTS.body, rnd),
    top: pickId(LOOK_PARTS.top, rnd), bottom: pickId(LOOK_PARTS.bottom, rnd),
    extra: rnd() < 0.55 ? 'none' : pickId(LOOK_PARTS.extra, rnd),
  };
  if (age >= 60 && rnd() < 0.4) look.extra = 'glasses';
  return look;
}

// 外から渡された見た目（アバター登録）を、使える部品だけに整える
export function cleanLook(input = {}, fallback) {
  const out = { ...fallback };
  for (const [k, list] of Object.entries(LOOK_PARTS)) if (list.some(([id]) => id === input[k])) out[k] = input[k];
  return out;
}

const nameOf = (k, id) => LOOK_PARTS[k].find(([v]) => v === id)?.[1] || '';

// 台帳に書く見た目の説明（例: 丸顔・たれ目・パーマ（白まじり）・ふくよか・紺の上着・眼鏡）
export function describeLook(l) {
  if (!l) return '';
  const parts = [nameOf('face', l.face), nameOf('eyes', l.eyes), `${nameOf('hair', l.hair)}${l.hair === 'bald' ? '' : `（${nameOf('hairColor', l.hairColor)}）`}`, nameOf('body', l.body), `${nameOf('top', l.top)}の上着`];
  if (l.extra && l.extra !== 'none') parts.push(nameOf('extra', l.extra));
  return parts.join('・');
}
