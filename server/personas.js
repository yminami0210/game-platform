// SNS アカウント（ペルソナ）: 県庁観光課・住人A・住人B・料理屋「ふじや」。
// 構想書（docs/product/nanashi/business-plan.md）の「点：世界観の土台」。町の中の実在の住人・店に結びつけ、
// その人が本当にいる場所・時刻に合わせて投稿する。だから投稿どうしが自然に交差する。
// 文はテンプレートだけで作る（トークン 0）。設定は docs/nanashi/world-bible.md、口調は docs/nanashi/personas/README.md。
import { EPOCH_UTC, mulberry32 } from './world.js';

export const PERSONAS = {
  kanko: {
    handle: '@nanashi_kanko', label: '県庁観光課',
    profile: 'ナナシ県庁 観光課の公式アカウントです。県内の季節の便りをお届けします。※この県はフィクションです。AI が運用しています。',
  },
  a: {
    handle: '@nanashi_resident_a', label: '住人A',
    profile: 'ナナシ県の高校2年。ナナシ線でナナミ市の高校に通ってます。※フィクションの県の、架空の住人です（AI 運用）。',
  },
  b: {
    handle: '@nanashi_resident_b', label: '住人B',
    profile: 'ナナシ県在住、ナナミ市で働いています。帰り道の商店街と、おいしいもの。※フィクションの県の、架空の住人です（AI 運用）。',
  },
  fujiya: {
    handle: '@fujiya_nanashi', label: '大衆食堂ふじや',
    profile: 'ナナシ県の商店街の大衆食堂です。毎朝、本日のおすすめを書いています。11時〜14時／17時〜21時。※フィクションの県の、架空のお店です（AI 運用）。',
  },
};

// ふじやの本日のおすすめ（日ごとに決まる。住人のつぶやきと食い違わないように、ここだけで決める）
const MENUS = [
  ['さばの味噌煮定食', 650], ['しょうが焼き定食', 700], ['ぶり大根定食（名無大根）', 720], ['アジフライ定食', 680],
  ['親子丼', 600], ['カレーライス', 550], ['肉じゃが定食', 650], ['中華そば', 500], ['焼き魚定食（魚辰さんの魚）', 680],
  ['オムライス', 620], ['ハムカツ定食', 600], ['かきあげうどん', 520],
];
export const menuOf = (day) => MENUS[(day * 7 + Math.floor(day / 3)) % MENUS.length];

const LEAF_NAMES = ['ゆうこ', '三郎', 'はる', 'としお', 'みつ', '健二', 'さくら', 'まさお'];
const BOARD = ['「傘、戻りました」', '「七瀬さんへ　またね」', '「おかえりなさい」がふたつ', '「3時に改札」', '「ななっしーの顔、まだ決まりません」'];
const WEEK = ['月', '火', '水', '木', '金', '土', '日'];
const hm = (m) => `${Math.floor((m % 1440) / 60)}:${String(Math.floor(m % 60)).padStart(2, '0')}`;

// 4人の正式な設定（くわしくは docs/nanashi/personas/characters.md）。町の中の住人をこの人に「配役」する。
// 見た目の部品は server/looks.js の LOOK_PARTS から選ぶ。
export const CAST = {
  a: {
    surname: '菜種', given: '澪', yomi: 'なたね みお', sns: 'みお（高2）', age: 16, sex: 'f',
    look: { face: 'egg', eyes: 'dot', brows: 'thin', mouth: 'smile', hair: 'bob', hairColor: '#1f1b18', skin: '#f7dcc4', body: 'slim', top: '#efe6d0', bottom: '#2b3a55', extra: 'none' },
    p: { wake: 6.2, sleep: 23.2, leave: 6.95, back: 17.3, fav: { shop: 'yaoya' } }, // 6:57 に家を出て、7:07 の鐘をホームで聞く
    family: [{ sex: 'm', adult: true, given: '和夫' }, { sex: 'f', adult: true, given: '洋子' }, { sex: 'm', adult: false, given: '健太' }],
  },
  b: {
    surname: '梨木', given: 'さくら', yomi: 'なしき さくら', sns: 'さくら', age: 27, sex: 'f',
    look: { face: 'oval', eyes: 'droop', brows: 'thin', mouth: 'open', hair: 'long', hairColor: '#3d2f26', skin: '#f3d2b4', body: 'normal', top: '#f2b8c6', bottom: '#4a4036', extra: 'none' },
    p: { wake: 6.6, sleep: 23.6, leave: 7.6, back: 18.8, fav: { eat: 'shokudo', kissa: 'kissa', bath: 'sento', shop: 'super' } }, // 行きつけ
    family: [],
  },
  fujiya: {
    surname: '藤谷', given: '修', yomi: 'ふじたに おさむ', sns: '大衆食堂ふじや', age: 52, sex: 'm', title: '店主（二代目）',
    look: { face: 'square', eyes: 'sharp', brows: 'thick', mouth: 'flat', hair: 'crop', hairColor: '#3d2f26', skin: '#e8c09c', body: 'stout', top: '#efe6d0', bottom: '#2b3a55', extra: 'scarf' },
    p: { wake: 5.3, sleep: 22.2, offDay: 2 }, // 定休日は水曜
    family: [{ sex: 'f', adult: true, given: '康子' }, { sex: 'f', adult: false, given: '千夏' }, { sex: 'm', adult: false, given: '大地' }], // 先代の源蔵はオトギ町で隠居
  },
  kanko: {
    surname: '七瀬', given: '光太郎', yomi: 'ななせ こうたろう', sns: 'ナナシ県庁 観光課', age: 34, sex: 'm', title: '主事',
    look: { face: 'round', eyes: 'smile', brows: 'thin', mouth: 'smile', hair: 'parted', hairColor: '#1f1b18', skin: '#f3d2b4', body: 'normal', top: '#3a6aa0', bottom: '#6b6f75', extra: 'glasses' },
    p: { wake: 6.4, sleep: 23, fav: { eat: 'shokudo' } }, // お昼はたいていふじや
    family: [],
  },
};

export class PersonaHub {
  constructor(sim) {
    this.sim = sim;
    this.done = new Set(); // その日に投稿済みの枠
    this.recent = {};      // アカウントごとの最近使った文
    this.ids = this.#cast();
  }

  // 町の住人の中から条件に合う人を選び（毎回同じ人になるよう一番古い住人）、正式な名前・年齢・見た目・暮らしにする。
  // 家族の名字もそろえる。保存した町を開き直しても同じ人が同じ設定になる
  #cast() {
    const s = this.sim;
    const pick = (f) => s.cps.filter((c) => c.resident && f(c)).sort((x, y) => x.id - y.id)[0] || null;
    const members = (c) => (s.households.get(c.hh)?.members || []).map((id) => s.cpById(id)).filter(Boolean);
    const a = pick((c) => c.school && c.sex === 'f' && c.age >= 16 && c.age <= 17 && members(c).length >= 3) || pick((c) => c.school && c.sex === 'f');
    const b = pick((c) => c.role === 'commuter' && !c.school && c.sex === 'f' && c.age >= 23 && c.age <= 32 && members(c).length === 1 && c.hh !== a?.hh)
      || pick((c) => c.role === 'commuter' && !c.school && c.sex === 'f' && c.age >= 23 && c.age <= 32 && c.hh !== a?.hh);
    // ふじやの店主は町に住む人（県外から通う店員ではなく）。いなければ、家族のいる働きざかりの男性に店を継がせる
    const fujiya = pick((c) => c.work === 'shokudo' && c.hh !== a?.hh && c.hh !== b?.hh)
      || pick((c) => c.sex === 'm' && c.age >= 40 && c.age <= 65 && ['worker', 'commuter'].includes(c.role) && members(c).length >= 2 && c.hh !== a?.hh && c.hh !== b?.hh);
    if (fujiya && fujiya.work !== 'shokudo') Object.assign(fujiya, { role: 'worker', work: 'shokudo', city: null, school: false });
    const kanko = pick((c) => c.role === 'staff' && c.dept === 'kanko' && c.seat === 1) || pick((c) => c.role === 'staff' && c.dept === 'kanko');
    const chosen = { a, b, fujiya, kanko };
    for (const [id, c] of Object.entries(chosen)) {
      if (!c) continue;
      const k = CAST[id];
      const hh = s.households.get(c.hh);
      // 家族: 名字をそろえ、決めてある続柄の人には決めてある名前をつける
      const fam = members(c).filter((m) => m !== c);
      for (const m of fam) { m.surname = k.surname; m.name = `${k.surname} ${m.given}`; }
      const used = new Set();
      for (const f of k.family) {
        const m = fam.find((x) => !used.has(x) && x.sex === f.sex && (x.age >= 20) === f.adult);
        if (m) { used.add(m); m.given = f.given; m.name = `${k.surname} ${f.given}`; }
      }
      if (hh) hh.surname = k.surname;
      Object.assign(c, { surname: k.surname, given: k.given, name: `${k.surname} ${k.given}`, age: k.age, sex: k.sex, look: { ...k.look }, p: { ...c.p, ...k.p } });
      if (k.title) c.title = k.title;
      c.persona = id;
    }
    return Object.fromEntries(Object.entries(chosen).map(([id, c]) => [id, c?.id ?? null]));
  }

  // 結びついている住人（町を出入りしても同じ人）
  get bound() {
    return Object.fromEntries(Object.entries(this.ids).map(([id, cpId]) => [id, cpId == null ? null : this.sim.cpById(cpId)]));
  }

  // 時刻 before → after のあいだに来た投稿の枠を処理する（町が進むたびに呼ぶ）
  tick(before, after) {
    if (after - before > 30) return; // 一気に時間を飛ばしたとき（開き直し）は投稿しない
    const s = this.sim;
    const day = s.day, wd = s.weekday, weekend = wd >= 5;
    const dom = new Date(EPOCH_UTC + (day - 1) * 86400000).getUTCDate();
    const at = (m) => { const t = s.dayStart() + m; return t > before && t <= after; };
    // 毎日同じ分に投稿すると機械っぽいので、枠ごとに日によって少しずらす（決まった時刻の鐘などはずらさない）
    const J = (n, spread = 24) => Math.floor(this.#rnd(day, 100 + n)() * spread) - Math.floor(spread / 3);
    const b = this.bound;
    const fujiyaClosed = b.fujiya && wd === b.fujiya.p.offDay; // ふじやの定休日（水曜）は、誰もふじやの話をしない
    const once = (key, fn) => { const k = `${day}:${key}`; if (this.done.has(k)) return; this.done.add(k); fn(this.#rnd(day, [...key].reduce((h, ch) => h * 31 + ch.charCodeAt(0), 7) % 9973)); }; // 枠ごとに別の乱数
    if (this.done.size > 400) this.done = new Set([...this.done].filter((k) => k.startsWith(`${day}:`)));

    // ---- 大衆食堂ふじや ----
    const f = b.fujiya;
    if (f) {
      const closed = wd === f.p.offDay;
      if (at(10 * 60 + 40 + J(1, 10))) once('f-am', () => {
        const [menu, price] = menuOf(day);
        const r = this.#rnd(day, 1);
        if (closed) return this.#post('fujiya', '本日は定休日です。また明日、お待ちしています。');
        const extra = [`小鉢は名無大根の煮物です。`, `ごはん大盛り無料です。`, `魚辰さんから、いい魚が入りました。`, `先代のおすすめ帳を見ながら書いています。`, ``, ``][Math.floor(r() * 6)];
        const nanori = dom === 7 ? '\n本日は名乗らずの日のため、お呼び出しは番号でいたします。' : '';
        this.#post('fujiya', `【本日のおすすめ】${menu}　${price}円\n11時からです。${extra}${nanori}`);
      });
      if (!closed && at(14 * 60 + 10 + J(2))) once('f-noon', () => { const r = this.#rnd(day, 2); if (r() < 0.45) this.#post('fujiya', this.#pickFor('fujiya', ['お昼の部、おわりました。夜は17時からです。', `本日の${menuOf(day)[0]}、お昼で売り切れました。ありがとうございました。`, 'ランチの部、のれんを下ろしました。夜もやっています。', 'お昼にご来店のみなさま、ありがとうございました。夜は小鉢を一品増やします。'], r)); });
      if (!closed && at(20 * 60 + 40 + J(3))) once('f-pm', () => { const r = this.#rnd(day, 3); if (r() < 0.3) this.#post('fujiya', this.#pickFor('fujiya', ['本日もありがとうございました。明日のおすすめは、明日の朝に書きます。', '本日は閉店です。おやすみなさい。', '明日の仕込みをしています。名無大根、いいのが入りました。', 'のれんを下ろしました。また明日。'], r)); });
    }

    // ---- 県庁観光課 ----
    if (b.kanko) {
      if (dom === 7 && at(8 * 60 + 30)) once('k-7', () => this.#post('kanko', '【おしらせ】本日は名乗らずの日です。お店や窓口では「そちらさま」とお呼びします。名札は明日おつけください。#ナナシ県'));
      if (!weekend && at(12 * 60 + 5 + J(4, 30))) once('k-noon', () => {
        const ev = s.chronicle.day.filter((e) => e.kind === 'event' && e.importance >= 1).sort((x, y) => y.importance - x.importance)[0];
        const r = this.#rnd(day, 4);
        if (ev && r() < 0.7) return this.#post('kanko', `【県内のできごと】${ev.text}。${this.#pickFor('kanko', ['今日もナナシ県はおだやかです。', '観光課も見に行ってきます。', 'お近くの方は、ぜひ。', '皆さまのお便りもお待ちしています。'], r)} #ナナシ県 #おかえりなさいナナシ県`);
        this.#post('kanko', this.#pickFor('kanko', KANKO_NOTES, r));
      });
      if (!weekend && at(16 * 60 + 30 + J(5, 40))) once('k-pm', () => { const r = this.#rnd(day, 5); if (r() < 0.45) this.#post('kanko', this.#pickFor('kanko', KANKO_NOTES, r)); });
      if (wd === 6 && at(10 * 60 + J(6, 30))) once('k-week', () => {
        const evs = s.chronicle.day.filter((e) => e.kind === 'event').slice(-3).map((e) => e.text);
        this.#post('kanko', evs.length ? `【今日のナナシ県】${evs.join('。')}。よい日曜日を。#ナナシ県` : '【今日のナナシ県】県内はおだやかな日曜日です。駅の伝言板は、今日も「おかえりなさい」です。#ナナシ県');
      });
    }

    // ---- 住人A（高校2年。ナナシ線でナナミ市の高校へ） ----
    const a = b.a;
    if (a) {
      const leave = Math.round(a.p.leave * 60), back = Math.round(a.p.back * 60);
      if (!weekend && at(7 * 60 + 7) && (a.place === 'station' || a.state === 5)) once('a-707', (r) => { if (r() < 0.55) this.#post('a', this.#pickFor('a', ['黙りの一分。ホームの全員ほんとに黙るの、ちょっとすき', '7:07の鐘。今日はちゃんと黙れた', '鐘の途中でくしゃみしそうになった。耐えた', '鐘のあいだは、ななし鳩も鳴かない', '黙りの一分のあいだに電車が来た。運転士さんも黙ってた'], r)); });
      if (!weekend && at(leave + 9 + J(7, 6))) once('a-am', (r) => {
        if (r() > 0.75) return;
        const lines = [`${s.timeLabel().replace(/^0/, '')}の電車。今日も伝言板に「おかえりなさい」って書いてあった`, 'ナナシ線、トンネル入るとき毎回耳がきーんってなる', '朝の電車で数え柑たべてる人いた。房かぞえてた', '一本のがした。10分まち', '駅の売店の七つ割り煎餅、ためしに割ったら8こになった（なんで）', '同じ車両のおばあちゃんに「おかえり」って言われた。いってきますなんだけど', 'トンネル抜けたらナナミ市。今日は晴れ'];
        if (dom === 7) lines.push('今日は名乗らずの日だから、出席とるとき先生が困ってた');
        this.#post('a', this.#pickFor('a', lines, r));
      });
      if (!weekend && at(back + 25 + J(8, 50))) once('a-after', (r) => {
        if (r() > 0.7) return;
        const today = s.chronicle.day;
        const daikon = today.some((e) => e.place === 'yaoya' && /大根/.test(e.text));
        const lines = ['七星堂で立ち読み。今月号はまだって言われた', `おつかいでマルヤ。大根の葉っぱに「${this.#pick(LEAF_NAMES, r)}」って書いてあった。消してから帰る`, 'ポプラの前とおったらナポリタンのにおい。お腹すいた', `駅の伝言板、${this.#pick(BOARD, r)}って増えてた`, '名無湯の前で猫が寝てた。三毛', '図書委員の当番で遅くなった。七星堂に寄る時間なかった', ...(fujiyaClosed ? [] : [`帰りにふじやの貼り紙みた。今日は${menuOf(day)[0]}だったらしい`])];
        if (daikon) lines.push('マルヤの大根50円だった。2本かった。重い');
        this.#post('a', this.#pickFor('a', lines, r));
      });
      if (at(21 * 60 + 20 + J(9, 70))) once('a-night', (r) => { if (r() < 0.4) this.#post('a', this.#pickFor('a', ['宿題おわらない。数え柑、数が合わないからもう一個たべた', wd < 3 ? `まだ${WEEK[wd]}曜。週末が遠い` : wd === 4 ? 'あした土曜！' : '明日の小テスト、範囲どこだっけ', 'おやすみ。ななし鳩が「ななー」って鳴いてる', 'こたつ出した。数え柑の季節', '伝言板に何か書こうと思って、やめた'], r)); });
      if (weekend && at(14 * 60 + J(10, 90))) once('a-we', (r) => {
        if (r() < 0.5) return;
        if (a.away) return this.#post('a', 'ナナミ市の駅ビル。帰りのトンネル抜けたら「おかえり」って言われた気がした');
        this.#post('a', `ふじやでお昼。今日のおすすめは${menuOf(day)[0]}だった`);
      });
    }

    // ---- 住人B（ナナミ市で働く。グルメ） ----
    const bb = b.b;
    if (bb) {
      const back = Math.round(bb.p.back * 60);
      if (!weekend && at(12 * 60 + 15 + J(11, 40))) once('b-lunch', (r) => { if (r() < 0.55) this.#post('b', this.#pickFor('b', [fujiyaClosed ? 'ナナミ市の駅ビルでランチ。今日はふじやも休みだし' : `ナナミ市の駅ビルでランチ。おいしいけど、ふじやの${menuOf(day)[0]}のほうが気になる`, 'お昼はコンビニ。早く帰ってポプラ行きたい', '同僚に「ナナシ県ってどこ？」って聞かれた。どこって、ここだけど', 'お昼休み。デスクで七つ割り煎餅。今日も8こ', 'ナナミ市のお昼は高い。ポプラのナポリタンなら380円なのに', '会社の地図にナナシ県が載ってなかった。まあいいか'], r)); });
      if (!weekend && at(back + 50 + J(12, 40))) once('b-eve', (r) => {
        if (r() > 0.8) return;
        // 町の中で本当にいる場所の話をする（ふじやにいるなら、ふじやのおすすめ）
        const where = bb.place;
        const [menu] = menuOf(day);
        const byPlace = {
          kissa: ['帰りにポプラ。ナポリタン、380円になってた。それでも頼む', 'ポプラのクリームソーダ。インベーダーの台、今日も誰か遊んでた'],
          shokudo: [`ふじやで晩ごはん。今日のおすすめは${menu}。手書きの字がまた上手になってる`],
          sento: [`名無湯。富士山の絵がきれいになってた。湯上がりはななし牛乳（ふたに「${(day % 9) + 1}日目」）`],
          super: ['まるななのタイムセールに間に合った。鐘が鳴ると、みんな少しだけ走る'],
        };
        const lines = (fujiyaClosed && where === 'shokudo' ? null : byPlace[where]) || [`${hm(back)}ごろの電車で帰宅。トンネルを抜けると空気が変わる`, '帰りの電車。伝言板の「おかえりなさい」、まだ消えてなかった', '帰りの電車で数え柑の房を数えたら11だった。いつもは10', 'ナナシ駅の改札で、駅員さんに「おかえりなさい」って言われる。毎日', '今日の晩ごはんは名無大根の煮物。母のレシピ', '駅を出たら名無湯のけむり。今日は寄らずに帰る', '帰りにマルヤに寄ったら、もう閉まってた', 'アパートの隣の部屋の人、県庁の観光課の人らしい。廊下でななっしーの顔の話をしてた', ...(fujiyaClosed ? ['ふじや、今日は定休日だった。水曜なの忘れてた'] : [`ふじやの前を通ったら「${menu}　売り切れ」の貼り紙`])];
        this.#post('b', this.#pickFor('b', lines, r));
      });
      if (weekend && at(12 * 60 + 15 + J(13, 60))) once('b-we', (r) => { if (r() < 0.5) { const [menu, price] = menuOf(day); this.#post('b', r() < 0.6 ? `休日のお昼はふじや。${menu}、${price}円。` : `マルヤで名無大根。葉っぱの名前は「${this.#pick(LEAF_NAMES, r)}」でした`); } });
      if (dom === 7 && at(19 * 60 + 30 + J(14, 60))) once('b-7', () => this.#post('b', '名乗らずの日。会社では名前を呼ばれるから、帰ってくるとほっとする'));
    }
  }

  #rnd(day, slot) { return mulberry32(this.sim.seed * 7331 + day * 97 + slot * 13); }
  #pick(list, r) { return list[Math.floor(r() * list.length)]; }
  // 最近そのアカウントが使った文は避ける（同じつぶやきのくり返しを減らす）
  #pickFor(id, list, r) {
    const used = this.recent[id] || [];
    const fresh = list.filter((t) => !used.includes(t));
    const t = this.#pick(fresh.length ? fresh : list, r);
    this.recent[id] = [...used, t].slice(-Math.max(3, Math.floor(list.length * 0.7)));
    return t;
  }

  #post(id, text) {
    const s = this.sim;
    const p = PERSONAS[id];
    const cp = this.bound[id];
    const name = CAST[id].sns;
    s.chronicle.postSns({ id: `${id}-${s.day}-${Math.floor(s.minutes % 1440)}`, day: s.day, time: s.timeLabel(), author: name, handle: p.handle, persona: id, cpId: cp?.id ?? null, text, via: 'template' });
  }
}

const KANKO_NOTES = [
  '【県の特産】名無大根は、葉っぱに名前を書いて売られています。お買い上げの際は、名前をご自分で消してからお持ち帰りください。#ナナシ県',
  '【観光課より】ナナシ駅の伝言板は、どなたでもお使いいただけます。毎朝の「おかえりなさい」は、町内会の当番の方が書いています。#ナナシ県',
  '【観光課より】七つ割り煎餅は、ナナシ駅の売店で買えます。7つに割ってお召し上がりください。#ナナシ県',
  '【観光課より】名無湯の富士山のペンキ絵が塗り直されました。湯上がりには、ななし牛乳をどうぞ。#ナナシ県',
  '【県の花】名無草が咲いています。花びらの数は、数えなくても大丈夫です。#ナナシ県',
  '【観光課より】本日も七時七分の鐘が鳴りました。ご協力ありがとうございました。#ナナシ県',
  '【おしらせ】雨の日は、傘に住所をお書きください。お忘れ物が早く戻ります。#ナナシ県',
  '【観光課より】ナナシ線は朝夕10分おきに走っています。トンネルを抜けるとナナミ市です。#ナナシ県',
  '【観光課より】純喫茶ポプラのナポリタンは380円です。先月から30円上がりました。#ナナシ県',
  '【観光課より】ななっしーの顔は、まだ決まっていません。ご意見は観光課まで。#ナナシ県',
  '【観光課より】ななっしーの顔を決める会議は、今年で7年目になりました。#ナナシ県',
];
