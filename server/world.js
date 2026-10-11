// 地図（サーバーとクライアントで共有する静的データ）。単位はメートル、y は上。
import { DEPARTMENTS } from './lore.js';

export const ROAD_STEP = 60; // 道路は x, z とも 60m 間隔の格子
export const HALF = 240;     // 町の範囲は -240..240

// kind: 建物の種類（クライアントの見た目と CP の行き先選択に使う）
export const PLACES = [
  { id: 'kencho', name: 'ナナシ県庁', kind: 'kencho', x: 30, z: -46, w: 44, d: 14, h: 28, color: '#c9c3b6', sign: 'ナナシ県庁' },
  { id: 'office', name: '県庁 執務フロア', kind: 'office', x: 30, z: -20, w: 48, d: 26, h: 3, color: '#b9b2a2', sign: '' },
  { id: 'super', name: 'スーパーまるなな', kind: 'super', x: 90, z: -30, w: 30, d: 22, h: 8, color: '#e8e1d0', sign: 'スーパーまるなな' },
  { id: 'conbini1', name: 'ナナシマート駅前店', kind: 'conbini', x: -30, z: 150, w: 14, d: 10, h: 5, color: '#f2f2f2', sign: 'ナナシマート' },
  { id: 'conbini2', name: 'ナナシマート県道店', kind: 'conbini', x: 150, z: 90, w: 14, d: 10, h: 5, color: '#f2f2f2', sign: 'ナナシマート' },
  { id: 'mall', name: 'ナナシ・シティプラザ', kind: 'mall', x: -150, z: -150, w: 46, d: 40, h: 16, color: '#d8cfc0', sign: 'シティプラザ' },
  { id: 'car', name: '名無自動車', kind: 'car', x: 150, z: -150, w: 34, d: 24, h: 7, color: '#dfe6ea', sign: '名無自動車' },
  { id: 'yaoya', name: '青果マルヤ', kind: 'shop', x: -42, z: 108, w: 10, d: 9, h: 6, color: '#cfa77a', sign: '青果マルヤ' },
  { id: 'sakanaya', name: '魚辰', kind: 'shop', x: -28, z: 108, w: 10, d: 9, h: 6, color: '#a9c1c9', sign: '魚辰' },
  { id: 'kissa', name: '純喫茶ポプラ', kind: 'kissa', x: -14, z: 108, w: 10, d: 9, h: 6, color: '#8c5a3c', sign: '喫茶ポプラ' },
  { id: 'shoten', name: '七星堂書店', kind: 'shop', x: 14, z: 108, w: 10, d: 9, h: 6, color: '#b8a27a', sign: '七星堂' },
  { id: 'shokudo', name: '大衆食堂ふじや', kind: 'shokudo', x: 28, z: 108, w: 10, d: 9, h: 6, color: '#c98f5a', sign: 'ふじや' },
  { id: 'sento', name: '名無湯', kind: 'sento', x: 44, z: 108, w: 14, d: 12, h: 7, color: '#9a8a7a', sign: '名無湯' },
  { id: 'station', name: 'ナナシ駅', kind: 'station', x: 30, z: 200, w: 40, d: 12, h: 8, color: '#c7b79a', sign: 'ナナシ駅' },
  { id: 'park', name: 'ななし公園', kind: 'park', x: 90, z: 150, w: 40, d: 40, h: 0, color: '#7fa66a', sign: '' },
  { id: 'school', name: 'ナナシ第一小学校', kind: 'school', x: -150, z: 90, w: 44, d: 20, h: 12, color: '#e6dccb', sign: '第一小学校' },
  { id: 'bokujo', name: '名無牧場', kind: 'bokujo', x: 210, z: 210, w: 46, d: 46, h: 0, color: '#8fb36b', sign: '名無牧場' },
  { id: 'tanbo', name: '田んぼ', kind: 'tanbo', x: -210, z: 210, w: 46, d: 46, h: 0, color: '#9cba5a', sign: '' },
];

export const PLACE_BY_ID = Object.fromEntries(PLACES.map((p) => [p.id, p]));

// 執務フロアの机。部署ごとに 2 列で並べる。
export function buildDesks() {
  const office = PLACE_BY_ID.office;
  const desks = [];
  const cols = 4; // 部署を 4 列 x 2 行のブロックに配置
  DEPARTMENTS.forEach((dept, i) => {
    const bx = office.x - office.w / 2 + 7 + (i % cols) * 12;
    const bz = office.z - office.d / 2 + 5 + Math.floor(i / cols) * 11;
    for (let s = 0; s < dept.staff; s++) {
      desks.push({ dept: dept.id, seat: s, x: bx + (s % 2) * 3, z: bz + Math.floor(s / 2) * 2.6 });
    }
  });
  return desks;
}

// 住宅は決定的な乱数で生成（サーバーとクライアントで同じ配置になる）
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

function overlapsPlace(x, z, pad = 6) {
  return PLACES.some((p) => Math.abs(x - p.x) < p.w / 2 + pad && Math.abs(z - p.z) < p.d / 2 + pad);
}

// 家の種類（案内図のように形で見分けられるように）
export const HOUSE_TYPES = {
  hira: { w: [9, 11], d: [7, 8], h: 3.2, roofH: 2.4 },   // 平屋（縁側のある横長の家）
  niko: { w: [7, 8], d: [7, 8], h: 6, roofH: 2.6 },      // 二階建て
  apart: { w: [15, 17], d: [6, 7], h: 6, roofH: 1.2 },   // 木造アパート（外階段・低い屋根）
  mise: { w: [7, 8], d: [8, 9], h: 6, roofH: 2.2 },      // 店舗つき住宅（一階が店）
};
const TYPE_ROLL = [['hira', 0.34], ['niko', 0.4], ['apart', 0.12], ['mise', 0.14]];

export function buildHouses(seed = 7, count = 300) {
  const rnd = mulberry32(seed * 9973);
  const houses = [];
  const mod = (v) => ((v % ROAD_STEP) + ROAD_STEP) % ROAD_STEP;
  let tries = 0;
  while (houses.length < count && tries++ < 14000) {
    // 道路沿い（道路から 8〜12m）に建てる
    const alongX = rnd() < 0.5;
    const road = (Math.floor(rnd() * 9) - 4) * ROAD_STEP;
    const side = rnd() < 0.5 ? -1 : 1;
    let r = rnd(), type = 'niko';
    for (const [k, p] of TYPE_ROLL) { if ((r -= p) <= 0) { type = k; break; } }
    const T = HOUSE_TYPES[type];
    const w = T.w[0] + Math.round(rnd() * (T.w[1] - T.w[0]));
    const d = T.d[0] + Math.round(rnd() * (T.d[1] - T.d[0]));
    const off = road + side * (6.5 + d / 2 + rnd() * 2);
    const t = -HALF + 10 + rnd() * (HALF * 2 - 20);
    const x = alongX ? t : off;
    const z = alongX ? off : t;
    const along = alongX ? x : z;
    if (mod(along) < w / 2 + 6 || mod(along) > ROAD_STEP - w / 2 - 6) continue; // 交差する道にかからない
    if (overlapsPlace(x, z)) continue;
    const ex = alongX ? w : d, ez = alongX ? d : w;
    if (houses.some((h) => Math.abs(h.x - x) < (h.ex + ex) / 2 + 1.5 && Math.abs(h.z - z) < (h.ez + ez) / 2 + 1.5)) continue;
    houses.push({
      id: `house${houses.length}`, type, x: Math.round(x), z: Math.round(z), w, d, h: T.h, roofH: T.roofH, ex, ez,
      rot: alongX ? (side > 0 ? Math.PI : 0) : (side > 0 ? -Math.PI / 2 : Math.PI / 2), // 玄関を道に向ける
    });
  }
  return houses;
}

// 道路網に沿った経路（L字×2）。歩道を歩いているように見せる。
export function routeBetween(ax, az, bx, bz) {
  const snap = (v) => Math.max(-HALF, Math.min(HALF, Math.round(v / ROAD_STEP) * ROAD_STEP));
  const rx = snap(ax);
  const rz = snap(bz);
  return [
    [rx, az],
    [rx, rz],
    [bx, rz],
    [bx, bz],
  ];
}

// 建物内（または前）の行き先点。建物の手前（道路側）にばらつかせる。
export function spotIn(place, rnd) {
  return [place.x + (rnd() - 0.5) * place.w * 0.7, place.z + (rnd() - 0.5) * place.d * 0.7];
}
