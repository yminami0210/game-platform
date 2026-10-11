// SNS アカウントと主な登場人物（正本: 世界観バイブル。写し docs/nanashi/canon/world-bible.md）。
// アカウントは「ナナシ県庁」「ナナシ放送」「スーパーまるやす」「ナナシくん」の4つ。書いている人は町の住人に配役する。
// SNS は県民に向けた普通の発信（県外の読者を意識しない）。数字・値段・地名・時刻を入れ、絵文字は使わない。
// 文はテンプレートだけで作る（トークン 0）。正本では、すべての投稿はエージェントが下書きして人間が承認する。
// ここで作る投稿は町の中の下書きで、外には出さない。
import { EPOCH_UTC, mulberry32 } from './world.js';
import { randomLook } from './looks.js';
import { GIVEN_F, GIVEN_M } from './lore.js';

export const PERSONAS = {
  kencho: {
    handle: '@nanashi_pref', label: 'ナナシ県庁', writer: 'sato',
    profile: 'ナナシ県庁の公式アカウントです（担当: 観光課）。イベント、工事、制度のお知らせ。※フィクションです。',
  },
  housou: {
    handle: '@nns_nanashi', label: 'ナナシ放送', writer: 'toda',
    profile: 'NNSナナシ放送（テレビ・ラジオ）。番組表、お天気、県内ニュース。※フィクションです。',
  },
  maruyasu: {
    handle: '@maruyasu_honten', label: 'スーパーまるやす', writer: 'maruyama',
    profile: 'スーパーまるやす本店です。特売、入荷、季節の品を店長がお知らせします。※フィクションです。',
  },
  nanashikun: {
    handle: '@nanashi_kun', label: 'ナナシくん', writer: 'sato',
    profile: 'ナナシ県のPRキャラ、ナナシくんです（観光課）。※フィクションです。',
  },
};

// 主な登場人物（正本の「登場人物」と「追加された設定」）。町の住人をこの人に配役する
export const CAST = {
  haru: { surname: '西村', given: 'ハル', yomi: 'にしむら はる', age: 17, sex: 'f', note: '県立中ノ町商業2年、放送部。母と祖母の3人暮らし。中ノ町駅の北側の住宅地' },
  maruyama: { surname: '丸山', given: '保', yomi: 'まるやま たもつ', age: 58, sex: 'm', work: 'super', title: '2代目店長', note: 'スーパーまるやすの2代目店長' },
  toda: { surname: '戸田', given: '由佳', yomi: 'とだ ゆか', age: 34, sex: 'f', work: 'housou', title: '気象予報士', note: 'ナナシ放送の気象予報士' },
  miura: { surname: '三浦', given: '勝', yomi: 'みうら まさる', age: 41, sex: 'm', work: 'post', title: '局員', note: '中ノ町郵便局の局員。窓口に入って14年' },
  sato: { surname: '佐藤', given: '恵', yomi: 'さとう めぐみ', age: 29, sex: 'f', dept: 'kanko', note: '県庁観光課。ナナシくんの担当' },
  kitamura: { surname: '北村', given: null, age: 56, sex: 'm', dept: 'kanko', title: '課長', note: '観光課の北村課長。佐藤の上司' },
};

const WEEK = ['月', '火', '水', '木', '金', '土', '日'];

// ---- 中ノ町のお天気（ナナシ放送の戸田の予報に使う。日付ごとに決まる） ----
// 内陸の盆地。夏は蒸し暑く、冬は雪より風（ヨコネおろし）が厳しい。月ごとの平年の最高／最低気温
const NORMALS = [[5, -4], [6, -4], [11, 0], [18, 5], [23, 11], [26, 16], [30, 21], [31, 22], [27, 17], [20, 10], [14, 3], [8, -2]];
const SKIES = [['晴れ', 0], ['晴れのちくもり', 20], ['くもりのち晴れ', 20], ['くもり', 30], ['くもり一時雨', 50], ['雨', 80]];
export function weatherOf(date) {
  const y = date.getUTCFullYear(), mo = date.getUTCMonth(), d = date.getUTCDate();
  // 正本の投稿例: 11月5日（木）晴れのちくもり、最高14℃／最低3℃、ヨコネおろしは13時ごろから最大瞬間風速18m/s前後
  if (y === 2026 && mo === 10 && d === 5) return { sky: '晴れのちくもり', hi: 14, lo: 3, pop: 10, oroshi: { from: 13, gust: 18 }, rain: false };
  const r = mulberry32(y * 1000 + mo * 40 + d);
  const wet = [0.25, 0.25, 0.3, 0.3, 0.35, 0.5, 0.45, 0.35, 0.45, 0.3, 0.25, 0.25][mo];
  const roll = r();
  const i = roll < wet * 0.45 ? 5 : roll < wet ? 4 : roll < wet + 0.15 ? 3 : roll < wet + 0.3 ? 2 : roll < wet + 0.5 ? 1 : 0;
  const [sky, base] = SKIES[i];
  const [nh, nl] = NORMALS[mo];
  const hi = Math.round(nh + (r() - 0.5) * 6 - (i >= 4 ? 2 : 0)), lo = Math.round(nl + (r() - 0.5) * 5);
  const pop = Math.min(90, base + Math.floor(r() * 2) * 10);
  // ヨコネおろし: 最初の日は11月上旬。冬（11〜3月）の雨でない日にときどき
  const season = mo === 10 ? d >= 5 : mo >= 11 || mo <= 2;
  const oroshi = season && i < 4 && r() < 0.4 ? { from: 11 + Math.floor(r() * 4), gust: 12 + Math.floor(r() * 11) } : null;
  return { sky, hi, lo: Math.min(lo, hi - 4), pop, oroshi, rain: i >= 4 };
}

const md = (date) => `${date.getUTCMonth() + 1}月${date.getUTCDate()}日`;
const wk = (date) => WEEK[(date.getUTCDay() + 6) % 7];
const between = (date, m0, d0, m1, d1) => { const v = (date.getUTCMonth() + 1) * 100 + date.getUTCDate(); return v >= m0 * 100 + d0 && v <= m1 * 100 + d1; };
const is = (date, m, d) => date.getUTCMonth() + 1 === m && date.getUTCDate() === d;

export class PersonaHub {
  constructor(sim) {
    this.sim = sim;
    this.done = new Set(); // その日に投稿済みの枠
    this.recent = {};      // アカウントごとの最近使った文
    this.ids = this.#cast();
  }

  // 町の住人の中から条件に合う人を選び（毎回同じ人になるよう一番古い住人）、正本の名前・年齢・勤め先にする。
  // 家族の名字もそろえる。保存した町を開き直しても同じ人が同じ設定になる
  #cast() {
    const s = this.sim;
    const taken = new Set();
    const members = (c) => (s.households.get(c.hh)?.members || []).map((id) => s.cpById(id)).filter(Boolean);
    const pick = (f) => s.cps.filter((c) => c.resident && !taken.has(c.hh) && f(c)).sort((x, y) => x.id - y.id)[0] || null;
    const look = (c) => randomLook(mulberry32(s.seed * 7919 + c.id * 104729), { sex: c.sex, age: c.age });
    const rename = (c, k) => {
      for (const m of members(c)) { m.surname = k.surname; m.name = `${k.surname} ${m.given}`; }
      const hh = s.households.get(c.hh);
      if (hh) hh.surname = k.surname;
      const changed = c.sex !== k.sex || Math.abs(c.age - k.age) > 8;
      // 下の名前が正本で決まっていない人（北村課長）は、性別が変わったときだけ台帳の名前の表から選び直す
      const given = k.given || (c.sex === k.sex ? c.given : (k.sex === 'm' ? GIVEN_M : GIVEN_F)[c.id % (k.sex === 'm' ? GIVEN_M : GIVEN_F).length]);
      Object.assign(c, { surname: k.surname, given, age: k.age, sex: k.sex });
      c.name = `${k.surname} ${c.given}`;
      if (changed) c.look = look(c);
      if (k.title) c.title = k.title;
      taken.add(c.hh);
    };
    const out = {};
    // 観光課の2人（佐藤は主事、北村は課長）
    const kanko = s.cps.filter((c) => c.role === 'staff' && c.dept === 'kanko').sort((x, y) => x.seat - y.seat);
    const kitamura = kanko.find((c) => c.seat === 0), sato = kanko.find((c) => c.seat !== 0);
    if (kitamura) { rename(kitamura, CAST.kitamura); out.kitamura = kitamura; }
    if (sato) { rename(sato, CAST.sato); out.sato = sato; }
    // 西村ハル: 中ノ町駅の北側の家に、母と祖母との3人暮らし。3人家族の家を選び、父にあたる人を祖母にする
    const north = (c) => (s.houseById[c.home]?.z ?? 99) < 13;
    const fam3 = (c) => members(c).length === 3 && members(c).filter((m) => m.age >= 25).length === 2 && !members(c).some((m) => m.role === 'staff');
    const haru = pick((c) => c.age >= 15 && c.age <= 18 && fam3(c) && north(c)) || pick((c) => c.age >= 10 && c.age <= 20 && fam3(c) && north(c))
      || pick((c) => c.age >= 15 && c.age <= 18 && fam3(c)) || pick((c) => c.school);
    if (haru) {
      const adults = members(haru).filter((m) => m !== haru);
      Object.assign(haru, { role: 'commuter', school: true, city: 'shogyo', work: null, p: { ...haru.p, leave: 7.2, back: 17.6 } }); // 放送部なので帰りは少し遅い
      rename(haru, CAST.haru);
      const mother = adults.find((m) => m.sex === 'f') || adults[0];
      const grand = adults.find((m) => m !== mother);
      if (mother) Object.assign(mother, { sex: 'f', age: Math.max(40, Math.min(50, mother.age)) });
      if (grand) { Object.assign(grand, { sex: 'f', age: 72, role: 'retired', city: null, work: null, school: false, given: grand.sex === 'f' ? grand.given : 'トメ' }); grand.name = `${CAST.haru.surname} ${grand.given}`; grand.look = look(grand); }
      out.haru = haru;
    }
    // 町の店で働く3人
    for (const id of ['maruyama', 'toda', 'miura']) {
      const k = CAST[id];
      const near = (c) => c.sex === k.sex && Math.abs(c.age - k.age) <= 12 && ['worker', 'commuter'].includes(c.role) && !c.school;
      const c = pick((x) => x.work === k.work && near(x)) || pick(near);
      if (!c) continue;
      Object.assign(c, { role: 'worker', work: k.work, city: null });
      rename(c, k);
      out[id] = c;
    }
    for (const [id, c] of Object.entries(out)) c.persona = id;
    return Object.fromEntries(Object.entries(out).map(([id, c]) => [id, c.id]));
  }

  // 配役した住人（町を出入りしても同じ人）
  get bound() {
    return Object.fromEntries(Object.entries(this.ids).map(([id, cpId]) => [id, this.sim.cpById(cpId)]));
  }

  // 時刻 before → after のあいだに来た投稿の枠を処理する（町が進むたびに呼ぶ）
  tick(before, after) {
    if (after - before > 30) return; // 一気に時間を飛ばしたとき（開き直し）は投稿しない
    const s = this.sim;
    const day = s.day;
    const date = new Date(EPOCH_UTC + (day - 1) * 86400000);
    const wd = (date.getUTCDay() + 6) % 7, weekend = wd >= 5;
    const at = (m) => { const t = s.dayStart() + m; return t > before && t <= after; };
    // 毎日同じ分に投稿すると機械っぽいので、枠ごとに日によって少しずらす
    const J = (n, spread = 24) => Math.floor(this.#rnd(day, 100 + n)() * spread) - Math.floor(spread / 3);
    const once = (key, fn) => { const k = `${day}:${key}`; if (this.done.has(k)) return; this.done.add(k); fn(this.#rnd(day, [...key].reduce((h, ch) => h * 31 + ch.charCodeAt(0), 7) % 9973)); };
    if (this.done.size > 400) this.done = new Set([...this.done].filter((k) => k.startsWith(`${day}:`)));
    const today = weatherOf(date);

    // ---- スーパーまるやす（丸山店長。毎日1回。店長の話し言葉のまま、感嘆符が多い） ----
    if (at(9 * 60 + 20 + J(1, 30))) once('m', (r) => this.#post('maruyasu', this.#maruyasu(date, wd, today, r)));

    // ---- ナナシ放送（毎日1〜3回。番組告知・お天気（戸田）・県内ニュース） ----
    if (at(18 * 60 + 40 + J(2, 20))) once('h-wx', () => this.#post('housou', this.#forecast(new Date(date.getTime() + 86400000))));
    if (wd === 1 && at(12 * 60 + J(3, 30))) once('h-prog', (r) => this.#post('housou', `【ナナシ放送】今夜7時は「ヨコネ川さんぽ」。今週は${this.#pickFor('h-prog', ['深田市のかぶら畑', '鳴沢町の温泉街', '上ヨコネ村', '下川原の工場街', '中ノ町駅前商店街'], r)}を歩きます。`));
    if (at(12 * 60 + 30 + J(4, 30))) once('h-news', (r) => { const n = this.#news(date, r); if (n) this.#post('housou', n); });

    // ---- ナナシ県庁（観光課の佐藤。平日1〜2回。お役所のお知らせ。少し硬い） ----
    if (!weekend && at(10 * 60 + J(5, 40))) once('k-am', (r) => { const n = this.#kencho(date, wd, r); if (n) this.#post('kencho', n); });
    if (!weekend && at(15 * 60 + 30 + J(6, 40))) once('k-pm', (r) => {
      if (r() > 0.4) return;
      const ev = s.chronicle.day.filter((e) => e.kind === 'event' && ['kencho', 'station', 'mall', 'post'].includes(e.place)).at(-1);
      if (ev) this.#post('kencho', `【ナナシ県庁】${ev.text}。`);
    });

    // ---- ナナシくん（観光課の持ち回り。週数回。一言だけ、写真が主役） ----
    const kun = this.#nanashikun(date, wd, today);
    if (kun && at(kun.at * 60 + J(7, 20))) once('n', () => this.#post('nanashikun', kun.text, { photoNote: '写真が主役（出演の写真を添える）' }));
  }

  // まるやす: 季節の品と曜日の特売（正本の「追加された設定」の値段と時刻）
  #maruyasu(date, wd, today, r) {
    if (is(date, 10, 12)) return '今日は県民駅伝！コースの前なので、店頭で応援用のお茶を配ってます！';
    if (between(date, 10, 3, 10, 4)) return 'かぶら祭りの会場に出てます！受付テントの向かいで、ますめし1個450円！';
    if (between(date, 11, 1, 11, 10)) return '風袋、今年の柄が入荷しました！水色に黄色の丸です！3枚で398円！';
    const list = [];
    if (wd === 1) return `火曜市です！今日は卵が1パック98円！${today.rain ? '雨なのでポイント2倍ですよ！' : ''}`;
    else if (today.rain) list.push('雨の日はポイント2倍です！足元に気をつけて来てください！');
    if (between(date, 10, 15, 12, 31)) list.push(wd < 5 ? '焼きいも、今日も焼きます！1本180円！14時と16時に焼き上がり！' : '焼きいも、1本180円です！');
    if (between(date, 10, 22, 12, 31)) list.push('深田産のかぶらが並びました！大きいのは1個298円！');
    if (between(date, 10, 15, 10, 25)) list.push('さんまはそろそろ終わりです！これからは塩さばが中心になります！');
    list.push('今日の卵はね、おっちらまでもたんよ！1パック98円！', 'ますめし用の升、1個220円で置いてます！洗った升は1個5円で引き取ります！', '屋根酢コーナーに、上ヨコネの吉澤さんちのが入りました！去年すぐなくなったやつです！！');
    return this.#pickFor('m', list, r);
  }

  // 戸田の予報（日付、天気、最高／最低気温、降水確率、風速、時刻を必ず入れる）
  #forecast(next) {
    const w = weatherOf(next);
    const wind = w.oroshi
      ? `ヨコネおろしは${w.oroshi.from}時ごろから、最大瞬間風速${w.oroshi.gust}m/s前後の見込み。風袋は今夜のうちに。`
      : w.rain ? `降り始めは${9 + (next.getUTCDate() % 7)}時ごろ。風は弱く、最大3m/s前後。` : `風は弱く、14時ごろに最大${2 + (next.getUTCDate() % 3)}m/s前後。`;
    return `【ナナシ放送 お天気】あす${md(next)}（${wk(next)}）の中ノ町、${w.sky}、最高${w.hi}℃／最低${w.lo}℃、降水確率${w.pop}%。${wind}戸田`;
  }

  // 県内ニュース（正本の「追加された設定」にある出来事だけ）
  #news(date, r) {
    if (is(date, 10, 5)) return '【ナナシ放送】深田市のかぶら祭り。重さ当ての大かぶらは9.1kg、2日目のかぶらは7.6kgで、当てた人はいませんでした。人出は2日間で約1万2千人。';
    if (is(date, 10, 6)) return '【ナナシ放送】かぶら祭りの重さ当てで、上ヨコネ村の70代の男性が大かぶらの9.1kgを当てました。毎年「9.1kg」と書いていたそうです。';
    if (is(date, 10, 12)) return '【ナナシ放送】県民駅伝は下川原市チームが3年ぶりに優勝。中ノ町市チームはゴール前300mで抜かれて2位でした。';
    if (is(date, 10, 16)) return '【ナナシ放送】下川原ものづくりフェアはあす10月17日（土）、下川原市民体育館で。ねじの詰め放題があります。';
    if (is(date, 10, 23)) return '【ナナシ放送】あす10月24日の中ノ町商業の文化祭。放送部の校内ラジオに、13時30分からナナシくんがゲスト出演します。一般公開は9時から15時まで。';
    if (is(date, 10, 28)) return '【ナナシ放送】県展の入選が発表されました。今年の応募は612点。';
    if (between(date, 10, 19, 10, 30) && r() < 0.35) return '【ナナシ放送】まるやすの焼きいもは、平日14時と16時に焼き上がるそうです。1本180円。';
    return null;
  }

  // 県庁のお知らせ（正本の工事・制度・行事）
  #kencho(date, wd, r) {
    if (is(date, 6, 11)) return '【ナナシ県庁】本日6月11日は県民の日です。県立の博物館と美術館は入館無料です。';
    if (between(date, 10, 5, 10, 9)) return '【ナナシ県庁】10月12日（月・スポーツの日）は県民駅伝です。コースは県道3号線（中ノ町〜下川原）。ゴールは下川原市役所前です。';
    if (is(date, 10, 13)) return '【ナナシ県庁】県民駅伝は下川原市チームが優勝しました。区間記録は県のホームページに載せています。';
    if (between(date, 10, 19, 10, 23)) return '【ナナシ県庁】県展の応募は612点でした。入選の発表は10月28日です。出品された方には郵便でもお知らせします。';
    if (between(date, 10, 26, 10, 30)) return '【ナナシ県庁】県営バスの深田・鳴沢方面は、11月1日から冬ダイヤになります。';
    if (between(date, 10, 1, 10, 31) && wd === 0) return '【ナナシ県庁】県道7号線（鳴沢方面）は10月31日まで片側交互通行です。ご迷惑をおかけします。';
    if (r() < 0.5) return null;
    return this.#pickFor('k', [
      '【ナナシ県庁】県立歴史博物館では、県名が決まらなかったときの会議記録を展示しています。',
      '【ナナシ県庁】ナナシくんのイベント出演のご依頼は、観光課で受け付けています。',
      '【ナナシ県庁】11月の県展は、県立美術館で開きます。6部門（日本画・洋画・彫刻・工芸・書・写真）です。',
    ], r);
  }

  // ナナシくん（正本の出演予定。しゃべらない、一言だけ）
  #nanashikun(date, wd, today) {
    if (is(date, 10, 1)) return { at: 10, text: '衣替え。冬用です。' };
    if (is(date, 10, 21)) return { at: 11, text: '中ノ町第一保育園のいも掘り。' };
    if (is(date, 10, 24)) return { at: 14, text: '中ノ町商業の文化祭。校内ラジオ。' };
    if (is(date, 10, 12)) return { at: 12, text: '県民駅伝。' };
    if (between(date, 10, 3, 10, 4)) return { at: 13, text: 'かぶら祭り。' };
    if (today.oroshi && wd < 5) return { at: 16, text: '風。' };
    if (wd === 2 || wd === 5) return { at: 15, text: ['県庁の玄関。', '中ノ町駅。', 'ヨコネ川。', 'まるやす。'][Math.floor(date.getUTCDate() / 2) % 4] };
    return null;
  }

  #rnd(day, slot) { return mulberry32(this.sim.seed * 7331 + day * 97 + slot * 13); }
  #pick(list, r) { return list[Math.floor(r() * list.length)]; }
  // 最近そのアカウントが使った文は避ける（同じ投稿のくり返しを減らす）
  #pickFor(id, list, r) {
    const used = this.recent[id] || [];
    const fresh = list.filter((t) => !used.includes(t));
    const t = this.#pick(fresh.length ? fresh : list, r);
    this.recent[id] = [...used, t].slice(-Math.max(1, Math.floor(list.length * 0.7)));
    return t;
  }

  #post(id, text, extra = {}) {
    const s = this.sim;
    const p = PERSONAS[id];
    const writer = this.bound[p.writer];
    s.chronicle.postSns({ id: `${id}-${s.day}-${Math.floor(s.minutes % 1440)}`, day: s.day, time: s.timeLabel(), author: p.label, handle: p.handle, persona: id, cpId: writer?.id ?? null, writer: writer?.name ?? null, text, via: 'template', draft: true, ...extra });
  }
}
