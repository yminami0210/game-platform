// 型染めの背景と地形（ピクト層 320x180）。studio/design-concept.md §1.6 §2 §2.5 §4 §8。
// 墨の輪郭は使わない。輪郭は生成りの抜け線（1〜2px・不揃い・つりで途切れる）、色版は1〜2pxずらす。
// 柄は文様（麻の葉・七宝・青海波・千鳥・矢絣・鱗）。丸い木・もこもこ雲・なだらかな丘は描かない。
import { K } from './themes.js';

const TS = 16;
const hash = (x, y, k = 0) => { let h = (x * 374761393 + y * 668265263 + k * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const mod = (a, n) => ((a % n) + n) % n;
const CHIDORI = ['.##....', '#####..', '..#####', '....#.#']; // 千鳥（7x4）

// 文様の判定: (x, y) が柄の画素なら true。p は柄の一周期（px）
export const MOTIF = {
  asanoha(x, y, p) { const a = mod(x, p), b = mod(y, p); return a === 0 || (b === 0 && a % 2 === 0) || mod(a + b, p) === 0 || mod(a - b, p) === 0; },
  shippo(x, y, p) {
    const h = p / 2, d1 = Math.hypot(mod(x + h, p) - h, mod(y + h, p) - h), d2 = Math.hypot(mod(x, p) - h, mod(y, p) - h);
    return Math.abs(d1 - h) < 0.55 || Math.abs(d2 - h) < 0.55;
  },
  seigaiha(x, y, p) {
    const h = p / 2, r = Math.floor(y / h), dx = mod(x + (r % 2) * h, p) - h, dy = mod(y, h) - h;
    const d = Math.hypot(dx, dy); return d < h && Math.round(d) % 3 === 0;
  },
  yagasuri(x, y, p) { const w = p / 2, s = Math.floor(x / w), lx = mod(x, w); return mod(y + Math.abs(lx - (w - 1) / 2) * (s % 2 ? 1 : -1) + s * 3, p) < 1.5; },
  uroko(x, y, p) { const h = p / 2, r = Math.floor(y / h), lx = mod(x + (r % 2) * h, p), ly = mod(y, h); return Math.abs(lx - h) <= ly * (h / h) - 1 && (r + Math.floor((x + (r % 2) * h) / p)) % 2 === 0; },
  kebi(x, y) { // ビロードの毛足: 面単位の2段（毛足の帯／平らな帯）＋向きのそろった3pxの斜めの刻みを行ごとに半歩ずらす
    const band = Math.floor((y + (Math.floor(x / 64) % 2) * 12) / 24) % 2; if (band) return false;
    const r = Math.floor(y / 5), lx = mod(x + (r % 2) * 5, 10), ly = mod(y, 5);
    return ly < 3 && lx === 2 - ly;
  },
  chidori(x, y, p) {
    const cw = p + 4, ch = Math.round(p * 0.7), r = Math.floor(y / ch), lx = mod(x + (r % 2) * (cw >> 1), cw), ly = mod(y, ch);
    return ly < 4 && lx < 7 && CHIDORI[ly][lx] === '#';
  },
};
// 矩形の中に柄を置く。ox, oy は版ずれ（柄の版だけずらす）
function paint(g, x0, y0, w, h, motif, p, color, ox = 0, oy = 0, inside = null) {
  const f = MOTIF[motif]; if (!f) return;
  g.fillStyle = color;
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    if (inside && !inside(x, y)) continue;
    if (f(x - ox, y - oy, p)) g.fillRect(x, y, 1, 1);
  }
}
// 抜け線: 生成りの線。長さ2〜10pxの不揃いな線が、不揃いな間と「つり」の途切れでつながる（等間隔の破線にしない）
function nukeH(g, x0, x1, y, color, seed, gap = 0.16) {
  g.fillStyle = color;
  for (let x = x0, i = 0; x < x1; i++) {
    const len = 2 + Math.floor(hash(i, seed, 72) * 9);
    if (hash(i, seed, 71) >= gap * 1.6) g.fillRect(x, y + (hash(i, seed, 73) < 0.25 ? 1 : 0), Math.min(len, x1 - x), hash(i, seed, 77) < 0.3 ? 2 : 1);
    x += len + 1 + Math.floor(hash(i, seed, 78) * 4);
  }
}
function nukeV(g, x, y0, y1, color, seed, gap = 0.16) {
  g.fillStyle = color;
  for (let y = y0, i = 0; y < y1; i++) {
    const len = 2 + Math.floor(hash(seed, i, 75) * 9);
    if (hash(seed, i, 74) >= gap * 1.6) g.fillRect(x + (hash(seed, i, 76) < 0.25 ? 1 : 0), y, hash(seed, i, 79) < 0.3 ? 2 : 1, Math.min(len, y1 - y));
    y += len + 1 + Math.floor(hash(seed, i, 80) * 4);
  }
}

// ---------- 背景: 反物の干し場 ----------
// 1つの干し場の層。竿（または theme の物）から反物を吊るす
function rack(th, layer, W, H, opt) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const [wood, woodShade] = th.wood, line = th.line[opt.lineIdx], cloths = th[layer];
  const py = opt.pole, seed = opt.seed;
  // 支柱（版ずれ2pxの影つき）
  for (let i = 0; i < opt.posts; i++) {
    const x = Math.round((i + 0.3 + hash(i, seed, 1) * 0.3) * W / opt.posts);
    g.fillStyle = woodShade; g.fillRect(x + 2, py - 4, opt.postW, H - py + 4);
    g.fillStyle = wood; g.fillRect(x, py - 6, opt.postW, H - py + 6);
    nukeV(g, x + opt.postW - 1, py - 4, H, line, seed * 13 + i, 0.3);
  }
  // 反物
  let x = 4 + Math.floor(hash(seed, 2) * 10), n = 0;
  const pins = [];
  while (x < W - 20) {
    const w = opt.minW + Math.floor(hash(n, seed, 3) * opt.varW);
    if (x + w > W - 4) break;
    const len = opt.minL + Math.floor(hash(n, seed, 4) * opt.varL);
    let ci = Math.floor(hash(n, seed, 5) * cloths.length);
    const [face, mc, motif] = cloths[ci];
    // 茜濃の反物は1つの層に1枚まで
    if (face === K.akk && !th.akkFree && (opt.usedAkk || layer !== (th.akkLayer ?? opt.akkLayer))) { const alt = cloths[(ci + 1) % cloths.length]; draw(alt); } else { if (face === K.akk) opt.usedAkk = true; draw(cloths[ci]); }
    function draw([face, mc, motif]) {
      const top = py + 1;
      // 下の端はわずかに不揃い（布の重み）
      const bottomAt = xx => top + len - (hash(Math.floor((xx - x) / 6), n, seed + 9) < 0.35 ? 1 : 0);
      g.fillStyle = face;
      for (let xx = x; xx < x + w; xx++) g.fillRect(xx, top, 1, bottomAt(xx) - top);
      const sx = 1 + (n % 2), sy = n % 3 === 0 ? 1 : 2; // 柄の版ずれ（背景は強め）
      if (motif) paint(g, x, top + 3, w, len - 3, motif, opt.p, mc, sx, sy, (xx, yy) => yy < bottomAt(xx) - 1);
      // 耳（刈安）: 反物の上端
      if (opt.ear) { g.fillStyle = th.ear[0]; g.fillRect(x + sx, top, w - sx, 2); }
      // 抜け線（左右と下）。面より1〜2px内側にずれる
      nukeH(g, x + 2, x + w - 2, top + len - 2 - (sy - 1), line, n * 5 + seed, 0.22);
      pins.push(x + 3, x + w - 6);
    }
    x += w + opt.gap + Math.floor(hash(n, seed, 6) * opt.gap);
    n++;
  }
  // 竿
  if (th.hanger === 'zip') {
    g.fillStyle = woodShade; g.fillRect(0, py - 2, W, 4);
    g.fillStyle = wood; for (let xx = 0; xx < W; xx += 3) g.fillRect(xx, py - 3 + (xx / 3) % 2, 2, 2);
  } else {
    g.fillStyle = woodShade; g.fillRect(0, py, W, 2);
    g.fillStyle = wood; g.fillRect(0, py - 2, W, 2);
    nukeH(g, 0, W, py - 3, line, seed + 40, 0.4);
  }
  if (opt.objects) for (let i = 0; i < pins.length; i++) hanger(g, th, pins[i], py, line, i + seed, opt.big);
  return c;
}
// 竿に付くテーマの物（ピクト。触れない物）
function hanger(g, th, x, py, line, i, big) {
  const [wood, shade] = th.wood, s = big ? 1 : 0;
  switch (th.hanger) {
    case 'pins': // 木の割り箸型の洗濯ばさみ
      g.fillStyle = shade; g.fillRect(x + 1, py - 3, 3 + s, 9 + s * 2);
      g.fillStyle = wood; g.fillRect(x, py - 4, 3 + s, 9 + s * 2);
      g.fillStyle = shade; g.fillRect(x + 1, py - 4, 1, 6 + s); // 割れ目
      g.fillStyle = line; g.fillRect(x, py + 1, 1, 2);
      break;
    case 'zip': // ファスナーの引き手
      g.fillStyle = shade; g.fillRect(x + 1, py - 1, 4, 8);
      g.fillStyle = wood; g.fillRect(x, py - 2, 4, 3); g.fillRect(x + 1, py + 1, 2, 5);
      g.fillStyle = th.sky; g.fillRect(x + 1, py + 3, 2, 1);
      break;
    case 'irons': if (i % 3) break; { // 竿の上に置いたアイロン（台形）
      const y = py - 3;
      for (let r = 0; r < 6; r++) { g.fillStyle = r === 5 ? shade : K.su; g.fillRect(x + 4 - r, y - 6 + r, 10 + r, 1); }
      g.fillStyle = K.su; g.fillRect(x + 4, y - 10, 7, 2); g.fillRect(x + 5, y - 8, 1, 2); g.fillRect(x + 9, y - 8, 1, 2);
      nukeH(g, x, x + 14, y - 1, line, i, 0.3);
      break; }
    case 'spools': if (i % 2) break; // 竿に通した糸巻き
      g.fillStyle = wood; g.fillRect(x - 1, py - 5, 8, 2); g.fillRect(x - 1, py + 3, 8, 2);
      g.fillStyle = [K.akk, K.ai, K.ka][i % 3]; g.fillRect(x, py - 3, 6, 6);
      g.fillStyle = shade; g.fillRect(x + 1, py - 3, 1, 6);
      break;
    case 'needles': { // 針山に林立する待ち針（刈安の頭・生成りの軸）
      const t = 4 + Math.floor(hash(i, 5, 81) * 10), lean = hash(i, 5, 82) < 0.4 ? 1 : 0;
      g.fillStyle = K.ki; g.fillRect(x + 2, py - 18 - t, 1, 26 + t); g.fillRect(x + 2 + lean, py - 18 - t, 1, 6);
      g.fillStyle = K.su; g.fillRect(x + 3, py - 16 - t, 1, 22 + t);
      g.fillStyle = K.kak; g.fillRect(x + 1, py - 22 - t, 5, 5);
      g.fillStyle = K.ka; g.fillRect(x, py - 23 - t, 5, 5);
      g.fillStyle = K.kaa; g.fillRect(x + 1, py - 23 - t, 2, 1);
      break; }
  }
}

export function buildBackground(th, W, H) {
  // 空: 平らな地（帯やグラデーションは使わない）
  const sky = document.createElement('canvas'); sky.width = W; sky.height = H;
  const sg = sky.getContext('2d'); sg.fillStyle = th.sky; sg.fillRect(0, 0, W, H);
  // 遠くの千鳥（まばら、手置き寄り）
  const clouds = document.createElement('canvas'); clouds.width = 768; clouds.height = 60;
  const cg = clouds.getContext('2d'); cg.fillStyle = th.bird;
  for (let i = 0; i < 9; i++) {
    const bx = Math.floor(i * 85 + hash(i, 31) * 50), by = Math.floor(6 + hash(i, 32) * 40);
    for (let r = 0; r < 4; r++) for (let q = 0; q < 7; q++) if (CHIDORI[r][q] === '#') cg.fillRect(bx + q, by + r, 1, 1);
  }
  const opt = { usedAkk: false, akkLayer: 'mid' };
  const far = rack(th, 'far', 768, 130, { ...opt, pole: 14, posts: 3, postW: 2, minW: 26, varW: 20, minL: 50, varL: 40, gap: 3, p: 8, lineIdx: 0, seed: 11, ear: false, objects: false });
  const props = rack(th, 'mid', 768, 150, { ...opt, pole: 26, posts: 3, postW: 3, minW: 34, varW: 26, minL: 56, varL: 46, gap: 6, p: 12, lineIdx: 1, seed: 23, ear: true, objects: true });
  const near = rack(th, 'near', 768, 80, { ...opt, pole: 6, posts: 2, postW: 4, minW: 48, varW: 34, minL: 60, varL: 14, gap: 10, p: 16, lineIdx: 2, seed: 37, ear: true, objects: true, big: true });
  return { sky, clouds, far, near, props };
}

// ---------- 地形: 型染めの当て布 ----------
export function drawGroundTile(g, th, tx, ty, x, y, tileAt, isGround, patch) {
  const pid = patch(tx, ty);
  g.fillStyle = th.ground[pid]; g.fillRect(x, y, TS, TS);
  // 当て布ごとに文様を変え、柄の版を1〜2pxずらす
  const kind = th.motifs[Math.floor(hash(Math.floor(tx / 5), Math.floor(ty / 4), 11) * th.motifs.length)];
  const sx = 1 + Math.floor(hash(Math.floor(tx / 5), Math.floor(ty / 4), 12) * 2);
  paint(g, x, y, TS, TS, kind, 16, th.cross, sx, sx - 1);
  const up = isGround(tileAt(tx, ty - 1));
  const left = isGround(tileAt(tx - 1, ty)), right = isGround(tileAt(tx + 1, ty)), down = isGround(tileAt(tx, ty + 1));
  // 継ぎ目: 隣の当て布と色が違う所に生影の抜け線（途切れがち）
  if (right && patch(tx + 1, ty) !== pid) nukeV(g, x + 15, y, y + TS, K.kis, tx * 31 + ty, 0.35);
  if (down && patch(tx, ty + 1) !== pid) nukeH(g, x, x + TS, y + 15, K.kis, ty * 29 + tx, 0.35);
  // 外の縁の抜け線は上面の耳だけ（§4「意味のある所だけ」）
  if (!up) {
    // 上面: 刈安の耳（織物の端）。耳の版は1pxずらし、上に抜け線
    const ex = hash(tx, ty, 13) < 0.5 ? 1 : 0;
    g.fillStyle = th.ear[1]; g.fillRect(x, y + 1, TS, 4);
    g.fillStyle = th.ear[0]; g.fillRect(x + ex, y, TS - ex, 3);
    // 抜け線は面の継ぎ目・端の近くだけ（全幅に並べない）。つりを多めに
    const seamL = !left || patch(tx - 1, ty) !== pid, seamR = !right || patch(tx + 1, ty) !== pid;
    if (seamL) nukeH(g, x + (left ? 0 : 2), x + 8, y + 5, K.ki, tx * 13 + ty, 0.45);
    if (seamR) nukeH(g, x + 8, x + TS - (right ? 0 : 2), y + 5, K.ki, tx * 17 + ty, 0.45);
    if (hash(tx, ty, 14) < 0.2) { g.fillStyle = th.ground[pid]; g.fillRect(x + 4 + Math.floor(hash(tx, ty, 15) * 8), y + 1, 2, 1); } // 耳の織りむら
  }
}
