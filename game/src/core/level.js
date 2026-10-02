// ステージ JSON（文字のタイル図を区画ごとに横へ並べたもの）を読み、タイル配列と配置物の一覧にする。
// 文字の意味は CHARS を見る。ステージを書く人向けの説明は game/src/data/stages/README.md。

export const T = {
  EMPTY: 0, GROUND: 1, BLOCK: 2, ONEWAY: 3, SPIKE: 4, BOX_POWER: 5, BOX_COIN: 6, BOX_USED: 7,
  CRUMBLE: 8, FAKE: 9, RED: 10, BLUE: 11, HIDDEN: 12, COIN: 13,
};

const TILE_CHARS = {
  '.': T.EMPTY, ' ': T.EMPTY, '#': T.GROUND, '%': T.BLOCK, '-': T.ONEWAY, '^': T.SPIKE,
  'B': T.BOX_POWER, 'b': T.BOX_COIN, 'x': T.CRUMBLE, 'f': T.FAKE, 'r': T.RED, 'u': T.BLUE,
  'h': T.HIDDEN, 'o': T.COIN,
};

const ENEMY_CHARS = { '1': 'iga', '2': 'kona', '3': 'choki', '4': 'hari', '5': 'tsumu', '6': 'yubi', '7': 'kedama' };

// 配置物の文字（タイルとしては空き）
const ENTITY_CHARS = {
  'P': 'start', 'C': 'checkpoint', 'G': 'goal', 'E': 'secret', 'M': 'medal', 'S': 'spring', 'T': 'switch',
  'Z': 'moverH', 'z': 'moverH', 'Y': 'moverV', 'y': 'moverV', 'V': 'vent', 'W': 'vent', '8': 'boss', 'A': 'arena',
};

export const CHARS = { ...TILE_CHARS, ...ENEMY_CHARS, ...ENTITY_CHARS };

export function joinSections(stage) {
  const secs = stage.sections ?? [{ rows: stage.rows }];
  const h = secs[0].rows.length;
  const rows = Array.from({ length: h }, () => '');
  const marks = [];
  for (const s of secs) {
    if (s.rows.length !== h) throw new Error(`${stage.id}: 区画「${s.note ?? '?'}」の行数 ${s.rows.length} が先頭区画 ${h} と違う`);
    const w = Math.max(...s.rows.map(r => r.length));
    marks.push({ x: rows[0].length, w, note: s.note ?? '' });
    for (let y = 0; y < h; y++) rows[y] += s.rows[y].padEnd(w, '.');
  }
  return { rows, marks };
}

export function parseLevel(stage) {
  const { rows, marks } = joinSections(stage);
  const h = rows.length, w = rows[0].length;
  const tiles = new Uint8Array(w * h);
  const ents = [];
  let medal = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = rows[y][x];
      if (!(c in CHARS)) throw new Error(`${stage.id}: 不明な文字 '${c}' (${x},${y})`);
      if (c in TILE_CHARS) { tiles[y * w + x] = TILE_CHARS[c]; continue; }
      const px = x * 16, py = y * 16;
      if (c in ENEMY_CHARS) { ents.push({ kind: 'enemy', type: ENEMY_CHARS[c], x: px, y: py, tx: x, ty: y }); continue; }
      const e = { kind: ENTITY_CHARS[c], x: px, y: py, tx: x, ty: y };
      if (c === 'M') e.idx = medal++;
      if (c === 'Z') e.range = 4 * 16;
      if (c === 'z') e.range = 8 * 16;
      if (c === 'Y') e.range = 4 * 16;
      if (c === 'y') e.range = 7 * 16;
      if (c === 'W') e.pulse = true;
      ents.push(e);
    }
  }
  const start = ents.find(e => e.kind === 'start');
  if (!start) throw new Error(`${stage.id}: スタート P が無い`);
  if (!ents.some(e => e.kind === 'goal' || e.kind === 'boss')) throw new Error(`${stage.id}: ゴール G かボス 8 が無い`);
  // 崩れる橋のタイル番号 → 記録の添字
  const crumbleAt = new Map();
  tiles.forEach((t, i) => { if (t === T.CRUMBLE) crumbleAt.set(i, crumbleAt.size); });
  return {
    id: stage.id, name: stage.name, theme: stage.theme ?? 'meadow', w, h, pw: w * 16, ph: h * 16,
    tiles, ents, medalCount: medal, crumbleAt, marks, par: stage.par ?? 180,
  };
}
