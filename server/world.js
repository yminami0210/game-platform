// 地図と町の配置（サーバーとブラウザで共有）。単位はメートル、y は上。
// 建物の配置は「レイアウト」というデータで持ち、管理者が動かしたり足したりできる。
import { DEPARTMENTS } from './lore.js';

export const ROAD_STEP = 60; // 道路は x, z とも 60m 間隔の格子
export const HALF = 240;     // 町の範囲は -240..240
export const ROAD_HALF = 5.5; // 道路＋歩道の半幅
export const RAIL_Z = 27;     // ヨコデンの線路（単線。東西にまっすぐ町の真ん中を通り、中ノ町駅ですれ違う）
export const RAIL_BAND = [22.5, 31.5]; // 線路の敷地（建物を置けない）
export const PORTAL_X = 400;  // トンネルの位置（ここで町の外とつながる）

// 町の外（正本のバイブル: 県内の市町村）。通勤先・来訪者のふるさと。ヨコデンは西の下川原から東の上ヨコネまで
export const CITIES = [
  { id: 'shimogawara', name: '下川原市', dir: -1, note: '西。ヨコネ川の下流。部品工場と団地の町' },
  { id: 'fukada', name: '深田市', dir: 1, note: '東。米とかぶらの産地。田んぼの真ん中に県立大学' },
  { id: 'shogyo', name: '県立中ノ町商業高校', dir: 1, note: '高校生の通学先' },
];
export const RIVER_Z = [262, 292]; // ヨコネ川（町の南を東から西へ流れる。南岸の先は田んぼと山）

// 標準のレイアウト。駅を町の真ん中に置き、駅前の桜通りの向こうに県庁がある
export const PLACES = [
  { id: 'kencho', name: 'ナナシ県庁', kind: 'kencho', x: 30, z: -46, w: 44, d: 14, h: 28, color: '#c9c3b6', sign: 'ナナシ県庁', locked: true },
  { id: 'office', name: '県庁 執務フロア', kind: 'office', x: 30, z: -20, w: 48, d: 26, h: 3, color: '#b9b2a2', sign: '', locked: true },
  { id: 'station', name: '中ノ町駅', kind: 'station', x: 30, z: 13, w: 40, d: 12, h: 10, color: '#c7b79a', sign: '中ノ町駅', face: -1, locked: true },
  { id: 'super', name: 'スーパーまるやす本店', kind: 'super', x: 90, z: -30, w: 30, d: 22, h: 8, color: '#e8e1d0', sign: 'まるやす' },
  { id: 'conbini1', name: 'コンビニ駅前店', kind: 'conbini', x: -22, z: 44, w: 14, d: 10, h: 5, color: '#f2f2f2', sign: 'コンビニ' },
  { id: 'conbini2', name: 'コンビニ県道店', kind: 'conbini', x: 150, z: 90, w: 14, d: 10, h: 5, color: '#f2f2f2', sign: 'コンビニ' },
  { id: 'mall', name: 'ナカノモール', kind: 'mall', x: -150, z: -150, w: 46, d: 40, h: 22, color: '#d8cfc0', sign: 'ナカノモール' },
  { id: 'housou', name: 'NNSナナシ放送', kind: 'housou', x: 150, z: -150, w: 34, d: 24, h: 14, color: '#dfe6ea', sign: 'ナナシ放送' },
  { id: 'post', name: '中ノ町郵便局', kind: 'post', x: -22, z: -30, w: 12, d: 10, h: 6, color: '#efe9da', sign: '〒 中ノ町郵便局' },
  { id: 'yaoya', name: '青果マルヤ', kind: 'shop', x: -42, z: 108, w: 10, d: 9, h: 6, color: '#cfa77a', sign: '青果マルヤ' },
  { id: 'sakanaya', name: '魚辰', kind: 'shop', x: -28, z: 108, w: 10, d: 9, h: 6, color: '#a9c1c9', sign: '魚辰' },
  { id: 'kissa', name: '純喫茶ポプラ', kind: 'kissa', x: -14, z: 108, w: 10, d: 9, h: 6, color: '#8c5a3c', sign: '喫茶ポプラ' },
  { id: 'shoten', name: '七星堂書店', kind: 'shop', x: 14, z: 108, w: 10, d: 9, h: 6, color: '#b8a27a', sign: '七星堂' },
  { id: 'shokudo', name: '大衆食堂ふじや', kind: 'shokudo', x: 28, z: 108, w: 10, d: 9, h: 6, color: '#c98f5a', sign: 'ふじや' },
  { id: 'sento', name: '名無湯', kind: 'sento', x: 44, z: 108, w: 14, d: 12, h: 7, color: '#9a8a7a', sign: '名無湯' },
  { id: 'park', name: '中ノ町公園', kind: 'park', x: 90, z: 150, w: 40, d: 40, h: 0, color: '#7fa66a', sign: '' },
  { id: 'school', name: '中ノ町第一小学校', kind: 'school', x: -150, z: 90, w: 44, d: 20, h: 12, color: '#e6dccb', sign: '第一小学校' },
  { id: 'bokujo', name: '中ノ町牧場', kind: 'bokujo', x: 210, z: 210, w: 46, d: 46, h: 0, color: '#8fb36b', sign: '牧場' },
  { id: 'tanbo', name: '田んぼ', kind: 'tanbo', x: -210, z: 210, w: 46, d: 46, h: 0, color: '#9cba5a', sign: '' },
];
export const PLACE_BY_ID = Object.fromEntries(PLACES.map((p) => [p.id, p]));

// 種類ごとの働き口と営業時間（時）。CP の勤め先と行き先選びに使う
export const KIND_INFO = {
  kencho: { jobs: 0, open: 8.5, close: 17.25 }, office: { jobs: 0, open: 8.5, close: 17.25 },
  station: { jobs: 3, open: 5.5, close: 23.5 }, super: { jobs: 6, open: 9, close: 20 }, conbini: { jobs: 2, open: 6, close: 23 },
  mall: { jobs: 6, open: 10, close: 20 }, housou: { jobs: 5, open: 9, close: 22 }, shop: { jobs: 2, open: 9, close: 19 },
  kissa: { jobs: 2, open: 8, close: 19 }, shokudo: { jobs: 2, open: 11, close: 21 }, sento: { jobs: 2, open: 15, close: 23 },
  park: { jobs: 0, open: 6, close: 18 }, school: { jobs: 4, open: 8, close: 16 }, bokujo: { jobs: 3, open: 6, close: 17 },
  tanbo: { jobs: 2, open: 6, close: 17 }, clinic: { jobs: 3, open: 9, close: 18 }, post: { jobs: 2, open: 9, close: 17 },
  koban: { jobs: 2, open: 0, close: 24 },
};

// 管理者が建てられるもの（シムシティの建設メニュー）
export const CATALOG = {
  house_hira: { label: '平屋', house: 'hira' },
  house_niko: { label: '二階建て', house: 'niko' },
  house_apart: { label: '木造アパート', house: 'apart' },
  house_mise: { label: '店舗つき住宅', house: 'mise' },
  conbini: { label: 'コンビニ', kind: 'conbini', w: 14, d: 10, h: 5, color: '#f2f2f2', names: ['コンビニ'] },
  shop: { label: '商店', kind: 'shop', w: 10, d: 9, h: 6, color: '#d6b98a', names: ['豆腐の山田', '肉のマツイ', '文具ハナブサ', '中ノ町薬局', '金物のカネキ', '花の店すみれ'] },
  kissa: { label: '喫茶店', kind: 'kissa', w: 10, d: 9, h: 6, color: '#8c5a3c', names: ['喫茶ひまわり', '珈琲ランプ', '喫茶白樺'] },
  shokudo: { label: '食堂', kind: 'shokudo', w: 10, d: 9, h: 6, color: '#c98f5a', names: ['中華そば一番', 'とんかつ丸', 'うどんの松'] },
  sento: { label: '銭湯', kind: 'sento', w: 14, d: 12, h: 7, color: '#9a8a7a', names: ['松の湯', '亀の湯'] },
  super: { label: 'スーパー', kind: 'super', w: 30, d: 22, h: 8, color: '#e8e1d0', names: ['スーパーまるやす 支店'] },
  clinic: { label: '診療所', kind: 'clinic', w: 12, d: 10, h: 7, color: '#f4f4ef', names: ['中ノ町内科', '駅前医院'] },
  post: { label: '郵便局', kind: 'post', w: 12, d: 10, h: 6, color: '#efe9da', names: ['中ノ町郵便局 分室'] },
  koban: { label: '交番', kind: 'koban', w: 7, d: 7, h: 5, color: '#e9e6dc', names: ['駅前交番', '町なか交番'] },
  park: { label: '公園', kind: 'park', w: 30, d: 30, h: 0, color: '#7fa66a', names: ['ちびっこ広場', 'すずらん公園'] },
};

// 家の種類（形で見分けられるように）。units はそこに住める世帯の数
export const HOUSE_TYPES = {
  hira: { w: [9, 11], d: [7, 8], h: 3.2, roofH: 2.4, units: 1, label: '平屋' },
  niko: { w: [7, 8], d: [7, 8], h: 6, roofH: 2.6, units: 1, label: '二階建て' },
  apart: { w: [15, 17], d: [6, 7], h: 6, roofH: 1.2, units: 4, label: '木造アパート' },
  mise: { w: [7, 8], d: [8, 9], h: 6, roofH: 2.2, units: 1, label: '店舗つき住宅' },
};
const TYPE_ROLL = [['hira', 0.34], ['niko', 0.4], ['apart', 0.12], ['mise', 0.14]];

// 執務フロアの机。部署ごとに 2 列で並べる
export function buildDesks(office = PLACE_BY_ID.office) {
  const desks = [];
  const cols = 4;
  DEPARTMENTS.forEach((dept, i) => {
    const bx = office.x - office.w / 2 + 7 + (i % cols) * 12;
    const bz = office.z - office.d / 2 + 5 + Math.floor(i / cols) * 11;
    for (let s = 0; s < dept.staff; s++) desks.push({ dept: dept.id, seat: s, x: bx + (s % 2) * 3, z: bz + Math.floor(s / 2) * 2.6 });
  });
  return desks;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- 配置のきまり --------------------------------------------------------------
// 建物が地面に占める長方形（半幅）。家は向きで縦横が入れ替わる
export function footprint(b) {
  if (b.type) {
    const side = Math.abs(Math.sin(b.rot || 0)) > 0.5;
    return { x: b.x, z: b.z, hx: (side ? b.d : b.w) / 2, hz: (side ? b.w : b.d) / 2 };
  }
  const extra = b.kind === 'station' ? 0 : 0; // 駅はホームを線路側に別に持つ
  return { x: b.x, z: b.z, hx: b.w / 2 + extra, hz: b.d / 2 };
}

const overlap = (a, b, pad) => Math.abs(a.x - b.x) < a.hx + b.hx + pad && Math.abs(a.z - b.z) < a.hz + b.hz + pad;

function hitsRoad(f) {
  for (let k = -HALF; k <= HALF; k += ROAD_STEP) {
    if (Math.abs(f.x - k) < f.hx + ROAD_HALF) return true;
    if (Math.abs(f.z - k) < f.hz + ROAD_HALF) return true;
  }
  return false;
}
const hitsRail = (f) => f.z + f.hz > RAIL_BAND[0] && f.z - f.hz < RAIL_BAND[1];

// 置けるか。置けないときは理由を返す（管理画面に出す）
export function placementError(layout, item, ignoreId = null) {
  const f = footprint(item);
  if (Math.abs(f.x) + f.hx > HALF - 2 || Math.abs(f.z) + f.hz > HALF - 2) return '町の外には建てられません';
  if (hitsRoad(f)) return '道路にかかっています';
  if (hitsRail(f)) return '線路にかかっています';
  for (const p of layout.places) if (p.id !== ignoreId && overlap(f, footprint(p), 1.5)) return `${p.name}と重なっています`;
  for (const h of layout.houses) if (h.id !== ignoreId && overlap(f, footprint(h), 1.0)) return 'ほかの家と重なっています';
  return null;
}

// 標準の住宅地（決定的な乱数。同じ seed なら同じ町）
export function buildHouses(seed = 7, count = 300, places = PLACES) {
  const rnd = mulberry32(seed * 9973);
  const layout = { places, houses: [] };
  let tries = 0;
  while (layout.houses.length < count && tries++ < 16000) {
    const alongX = rnd() < 0.5;
    const road = (Math.floor(rnd() * 9) - 4) * ROAD_STEP;
    const side = rnd() < 0.5 ? -1 : 1;
    let r = rnd(), type = 'niko';
    for (const [k, p] of TYPE_ROLL) { if ((r -= p) <= 0) { type = k; break; } }
    const T = HOUSE_TYPES[type];
    const w = T.w[0] + Math.round(rnd() * (T.w[1] - T.w[0]));
    const d = T.d[0] + Math.round(rnd() * (T.d[1] - T.d[0]));
    const off = road + side * (ROAD_HALF + 1 + d / 2 + rnd() * 2);
    const t = -HALF + 10 + rnd() * (HALF * 2 - 20);
    const house = {
      id: `h${layout.houses.length + 1}`, type, w, d, h: T.h, roofH: T.roofH, units: T.units,
      x: Math.round(alongX ? t : off), z: Math.round(alongX ? off : t),
      rot: alongX ? (side > 0 ? Math.PI : 0) : (side > 0 ? -Math.PI / 2 : Math.PI / 2), // 玄関を道に向ける
    };
    if (!placementError(layout, house)) layout.houses.push(house);
  }
  return layout.houses;
}

export function makeHouse(type, x, z, rot, id) {
  const T = HOUSE_TYPES[type];
  return { id, type, w: Math.round((T.w[0] + T.w[1]) / 2), d: Math.round((T.d[0] + T.d[1]) / 2), h: T.h, roofH: T.roofH, units: T.units, x: Math.round(x), z: Math.round(z), rot };
}

export function defaultLayout(seed = 7) {
  const places = PLACES.map((p) => ({ ...p }));
  return { version: 1, places, houses: buildHouses(seed, 300, places), nextId: 1 };
}

// ---- 歩く道 -------------------------------------------------------------------
// 道路網に沿った経路（L字×2）。歩道を歩いているように見せる。線路は踏切（道路）で渡る
export function routeBetween(ax, az, bx, bz) {
  const snap = (v) => Math.max(-HALF, Math.min(HALF, Math.round(v / ROAD_STEP) * ROAD_STEP));
  const rx = snap(ax);
  const rz = snap(bz);
  return [[rx, az], [rx, rz], [bx, rz], [bx, bz]];
}

// 建物の中（または前）の行き先点
export function spotIn(place, rnd) {
  return [place.x + (rnd() - 0.5) * place.w * 0.7, place.z + (rnd() - 0.5) * place.d * 0.7];
}

// 駅のホーム（乗り降りする場所）
export function platformSpot(station, rnd) {
  return [station.x + (rnd() - 0.5) * 36, RAIL_Z - 4.5 + (rnd() - 0.5) * 2];
}

// ---- 時計（現実の日時と同じにする） ----------------------------------------
// ゲーム内の「分」は 2026-03-30（月）0:00 からの経過分。端末（サーバー）の地域の時刻で数える
export const EPOCH_UTC = Date.UTC(2026, 2, 30);
export function realMinutes(now = Date.now()) {
  return (now - new Date(now).getTimezoneOffset() * 60000 - EPOCH_UTC) / 60000;
}

// ---- 電車の時刻表 -------------------------------------------------------------
// 1日の何分に駅に着くか。朝夕は10分おき、昼は20分おき、5:40〜23:40
// ヨコデン（正本のバイブル）: 単線・2両・30分に1本。上りと下りが中ノ町駅で同じ時刻にすれ違う
export function trainTimes() {
  const out = [];
  for (let m = 5 * 60 + 40; m <= 23 * 60 + 10; m += 30) out.push(m);
  return out;
}
export const TRAIN_TIMES = trainTimes();
export const TRAIN_DWELL = 2;  // 停車（分）
export const TRAIN_RUN = 6;    // トンネルから駅まで（分）
export const TRAIN_CARS = 2;
const LOOP = 1.8;               // 駅の行き違い線（駅の前後だけ線路が2本になる）

// その時刻に見えている電車（x 座標・z 座標と向き）。dir=1 は西から東へ
export function trainsAt(minuteOfDay, stationX = 30) {
  const list = [];
  const z = (x, dir) => RAIL_Z + dir * LOOP * Math.max(0, Math.min(1, 1 - (Math.abs(x - stationX) - 40) / 40));
  for (const t of TRAIN_TIMES) for (const dir of [1, -1]) {
    const from = -dir * PORTAL_X, to = dir * PORTAL_X;
    const m = minuteOfDay;
    let x = null, stopped = false;
    if (m >= t - TRAIN_RUN && m < t) {
      const k = (m - (t - TRAIN_RUN)) / TRAIN_RUN;
      x = from + (stationX - from) * (1 - (1 - k) * (1 - k)); // 減速して止まる
    } else if (m >= t && m < t + TRAIN_DWELL) { x = stationX; stopped = true; }
    else if (m >= t + TRAIN_DWELL && m < t + TRAIN_DWELL + TRAIN_RUN) {
      const k = (m - t - TRAIN_DWELL) / TRAIN_RUN;
      x = stationX + (to - stationX) * k * k; // 加速して出ていく
    }
    if (x != null) list.push({ x, z: z(x, dir), dir, stopped });
  }
  return list;
}

// 次に駅に着く電車の時刻（分・日をまたぐと翌日の始発）
export function nextTrainAfter(minuteOfDay) {
  return TRAIN_TIMES.find((t) => t >= minuteOfDay) ?? TRAIN_TIMES[0] + 1440;
}
