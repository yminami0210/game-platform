// ドット絵の定義。1文字=1ピクセル、'.' は透明。色は PAL の名前つきパレット（studio/design-system.md）。
// 起動時に一度だけキャンバスへ焼いて使い回す（毎フレーム作らない）。

export const PAL = {
  K: '#2b2420', // 墨
  k: '#4a3d35', // 墨の影
  n: '#f0e6cf', // 生成り（縫い目・顔）
  N: '#cbbf9f', // 生成りの影
  R: '#b8372b', // 茜
  r: '#dd6a4c', // 茜の明るい所
  A: '#26426b', // 藍
  a: '#4b6e98', // 藍の明るい所
  Y: '#d39a22', // 芥子
  y: '#f2cf62', // 芥子の明るい所
  G: '#7c9a4a', // 若草
  g: '#56703a', // 若草の影
  W: '#8a5536', // 柿渋
  w: '#b47c4f', // 柿渋の明るい所
  M: '#6f5f7d', // 蛾
  m: '#a596b0', // 蛾の明るい所
  S: '#8e979f', // 鋼
  s: '#d5dade', // 鋼の明るい所
  O: '#f7f3ea', // 綿
  o: '#dcd5c6', // 綿の影
  B: '#3c6fae', // スナップの青
  P: '#c9577a', // 針山の紅
};

const TSUGI_TOP = [
  '......nn........',
  '.....nKn........',
  '....KKRKK.......',
  '...KRRRRRK......',
  '..KRrRRRRRK.....',
  '..KRnnnnnRK.....',
  '..KnnnnKnnK.....',
  '..KnnnnKnnK.....',
  '..KRnnnNnRK.....',
  '...KRRRRRK......',
];
const TSUGI_BODY = [
  '...KAAnAAK......',
  '..KAaAAAAAK.....',
  '..KAAARRAAK.....',
];
const legs = {
  stand: ['...KAAAAAK......', '...KK...KK......', '...KK...KK......'],
  run1: ['...KAAAAAK......', '..KK....KK......', '.KK......KK.....'],
  run2: ['...KAAAAAK......', '....KK.KK.......', '....KK.KK.......'],
  run3: ['...KAAAAAK......', '...KK..KK.......', '..KK.....KK.....'],
  jump: ['...KAAAAAK......', '...KKK.KKK......', '................'],
  fall: ['...KAAAAAK......', '..KK.....KK.....', '.KK.......KK....'],
  skid: ['....KAAAAAK.....', '....KK...KK.....', '...KK....KK.....'],
};
const tsugi = l => [...TSUGI_TOP, ...TSUGI_BODY, ...legs[l]];

export const SPRITES = {
  tsugi_stand: tsugi('stand'),
  tsugi_run1: tsugi('run1'),
  tsugi_run2: tsugi('run2'),
  tsugi_run3: tsugi('run3'),
  tsugi_jump: tsugi('jump'),
  tsugi_fall: tsugi('fall'),
  tsugi_skid: tsugi('skid'),
  tsugi_dead: [
    '................',
    '....KKKKK.......',
    '...KRRRRRK......',
    '..KRnnnnnRK.....',
    '..KnKnnKnnK.....',
    '..KnnKKnnnK.....',
    '..KnKnnKnnK.....',
    '..KRnnnnnRK.....',
    '...KRRRRRK......',
    '..KAAnAAAAK.....',
    '.KAaAAAAAAAK....',
    '..KAAARRAAK.....',
    '...KAAAAAK......',
    '..KK.....KK.....',
    '.KK.......KK....',
    '................',
  ],
  // 綿毛の房（ツギにかぶせる）
  fluff: [
    '....OO..OO......',
    '...OooOOooO.....',
    '..O.........O...',
    '.O...........O..',
    '................',
    '................',
    'O...............',
    '................',
    '................',
    '.O..........O...',
    '................',
    'O............O..',
    '................',
    '.O..........O...',
    '..OO......OO....',
    '................',
  ],
  // 敵: イガ（布切れの筒をかぶった衣蛾の幼虫）
  iga1: [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '....KKKKKKKK....',
    '...KRRaaGGRRK...',
    '..KKRRaaGGRRRK..',
    '.KnKRRaaGGRRRK..',
    '.KKnKRaaGGRRK...',
    '.KnnK.KKKKKK....',
    '..KK..K.K.K.....',
    '................',
    '................',
    '................',
  ],
  iga2: [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '.....KKKKKKKK...',
    '....KRRaaGGRRK..',
    '...KKRRaaGGRRRK.',
    '..KnKRRaaGGRRRK.',
    '.KKnKKRaaGGRRK..',
    '.KnnK..KKKKKK...',
    '..KK..K.K.K.....',
    '................',
    '................',
    '................',
  ],
  kona1: [
    '................',
    '..KK......KK....',
    '.KmmK....KmmK...',
    '.KmMmK..KmMmK...',
    '..KmMMKKMMmK....',
    '...KMMnKKMMK....',
    '....KKKKKKK.....',
    '...KmMK..KMmK...',
    '...KmK....KmK...',
    '....K......K....',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  kona2: [
    '................',
    '................',
    '................',
    '................',
    '..KKKKKKKKKK....',
    '.KmmMMKKMMmmK...',
    '..KmMnKKKMmK....',
    '...KKKKKKKK.....',
    '..KmMK..KMmK....',
    '..KmK....KmK....',
    '...K......K.....',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  choki1: [
    '................',
    '................',
    '...KKK...KKK....',
    '..KR.RK.KR.RK...',
    '..KRnRK.KRnRK...',
    '...KKKK.KKKK....',
    '.....KKKKK......',
    '......KSK.......',
    '.....KsSK.......',
    '.....KsSSK......',
    '....KsSKKSK.....',
    '....KsK..KSK....',
    '...KsK....KSK...',
    '...KK......KK...',
    '................',
    '................',
  ],
  choki2: [
    '................',
    '................',
    '................',
    '...KKK...KKK....',
    '..KR.RK.KR.RK...',
    '..KRnRK.KRnRK...',
    '...KKKKKKKKK....',
    '......KSK.......',
    '......KsK.......',
    '......KsSK......',
    '.....KsSSK......',
    '.....KsKSK......',
    '.....KsKSK......',
    '.....KK.KK......',
    '................',
    '................',
  ],
  hari1: [
    '................',
    '................',
    '................',
    '.....R...Y......',
    '...B.s.R.s......',
    '...s.s.s.s.Y....',
    '..KsKsKsKsKs....',
    '.KPPPPPPPPPPK...',
    'KPPnPPPPPPPPPK..',
    'KPPPPKPPPPPPPK..',
    'KPPPPPPPPPPPPK..',
    '.KPPPPPPPPPPK...',
    '..KK.KK.KK.KK...',
    '................',
    '................',
    '................',
  ],
  hari2: [
    '................',
    '................',
    '................',
    '.....R...Y......',
    '...B.s.R.s......',
    '...s.s.s.s.Y....',
    '..KsKsKsKsKs....',
    '.KPPPPPPPPPPK...',
    'KPPnPPPPPPPPPK..',
    'KPPPPKPPPPPPPK..',
    'KPPPPPPPPPPPPK..',
    '.KPPPPPPPPPPK...',
    '...KK.KK.KK.KK..',
    '................',
    '................',
    '................',
  ],
  tsumu1: [
    '................',
    '.K...KKKK...K...',
    '..K.KkkkkK.K....',
    'K..KkkkkkkK..K..',
    '.KKkknkknkkKK...',
    '...KkkkkkkK.....',
    '.KK.KKKKKK.KK...',
    'K..K......K..K..',
    '..K........K....',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  yubi1: [
    '....KKKKKKK.....',
    '...KSsSsSsSK....',
    '..KSsSsSsSsSK...',
    '..KsSsSsSsSsK...',
    '..KSsSsSsSsSK...',
    '.KSSSSSSSSSSSK..',
    '.KSsSsKKKsSsSK..',
    '.KsSsKnnnKsSsK..',
    '.KSsSKKKKKSsSK..',
    '.KsSsSsSsSsSsK..',
    'KSSSSSSSSSSSSSK.',
    'KSsSsSsSsSsSsSK.',
    'KsSsSsSsSsSsSsK.',
    'KSSSSSSSSSSSSSK.',
    'KWWWWWWWWWWWWWK.',
    'KKKKKKKKKKKKKKK.',
  ],
  kedama1: [
    '................',
    '................',
    '................',
    '.....O.O.O......',
    '...OOaOaOaOO....',
    '..OaaaaaaaaaO...',
    '.OaaaaaaaaaaaO..',
    '..aaKnaaKnaaO...',
    '.OaaKKaaKKaaaO..',
    '..aaaaaaaaaaa...',
    '.OaaaaAAaaaaaO..',
    '..OaaaaaaaaaO...',
    '...OOaOaOaOO....',
    '.....O.O.O......',
    '................',
    '................',
  ],
  pin: [
    'sssssssssssKRRK.',
    'SSSSSSSSSSSKRrK.',
    '...........KKK..',
    '................',
  ],
  dust: [
    '..mm.m..',
    '.mMmmMm.',
    'mMmMmmMm',
    '.mmMmMm.',
    'm.mMmm.m',
    '..m.m...',
    '........',
    '........',
  ],
  wata: [
    '....OOOO....',
    '..OOOOOOOO..',
    '.OOOoOOOOOO.',
    'OOOooOOOOOOO',
    'OOOOOOOOoOOO',
    'OOOOOOOooOOO',
    '.OOOOOOOOOO.',
    '..OOOOOOOO..',
    '....OOOO....',
    '.....KK.....',
    '....K..K....',
    '............',
  ],
  coin1: [
    '..KKKK..',
    '.KyYyYK.',
    'KYyYyYyK',
    'KyYyYyYK',
    'KYyYyYyK',
    'KyYyYyYK',
    '.KYyYyK.',
    '..KKKKY.',
  ],
  coin2: [
    '...KK...',
    '..KyYK..',
    '..KYyK..',
    '..KyYK..',
    '..KYyK..',
    '..KyYK..',
    '..KYyK..',
    '...KKY..',
  ],
  medal: [
    '....KKKKKK....',
    '..KKyyyyyyKK..',
    '.KyyYYYYYYyyK.',
    '.KyYYYYYYYYyK.',
    'KyYYKYYYYKYYyK',
    'KyYYYYYYYYYYyK',
    'KyYYYYYYYYYYyK',
    'KyYYYYYYYYYYyK',
    'KyYYYYYYYYYYyK',
    'KyYYKYYYYKYYyK',
    '.KYYYYYYYYYYK.',
    '.KWYYYYYYYYWK.',
    '..KKWWWWWWKK..',
    '....KKKKKK....',
  ],
  knot: [
    '...KKK..KKK...',
    '..KRrRKKRrRK..',
    '.KRrRRRKRRrRK.',
    '.KRRRKRRKRRRK.',
    'KRrRRRKKRRRrRK',
    'KRRRKRRRRKRRRK',
    'KRrRRRKKRRRRRK',
    'KRRRKRRRRKRrRK',
    '.KRRRRKKRRRRK.',
    '.KRrRKRRKRRRK.',
    '..KRRRKKRRRK..',
    '...KKRRRRKK...',
    '....KRK.KRK...',
    '.....K...K....',
  ],
};

// ボス（48×32）: 大蛾ケバ
const BOSS_BODY = [
  '..................KKKKKKKKKK....................',
  '.................KMMMMMMMMMMK...................',
  '.......K........KMmmMMMMMMmmMK.........K........',
  '........K......KMmnKMMMMMMKnmMK.......K.........',
  '.........K.....KMmKKMMMMMMKKmMK......K..........',
  '..........KK...KMMMMMMMMMMMMMMK....KK...........',
  '............K..KMMMMKKKKKKMMMMK...K.............',
  '.............KKKMMMMKnnnnKMMMMKKKK..............',
  '...............KMMMMMKKKKMMMMMK.................',
  '................KMmMmMmMmMmMmK..................',
  '................KmMmMmMmMmMmMK..................',
  '.................KMmMmMmMmMmK...................',
  '..................KmMmMmMmMK....................',
  '...................KKMmMmKK.....................',
  '.....................KKKK.......................',
];
const WING_UP = [
  'KKKK..........................................KK',
  'KmmmKK......................................KKmK',
  'KmMMmmKK..................................KKmmMK',
  '.KMMMMmmKK..............................KKmmMMK.',
  '.KMnMMMMmmK............................KmmMMnMK.',
  '..KMnnMMMMmK..........................KmMMMnnK..',
  '..KMMnMMMMMMK........................KMMMMMnMK..',
  '...KMMMMMMMMMK......................KMMMMMMMK...',
  '....KMMMMMMMMMK....................KMMMMMMMK....',
  '.....KKMMMMMMMMK..................KMMMMMMKK.....',
  '.......KKKMMMMMMK................KMMMMMKKK......',
  '..........KKKKKKK................KKKKKK.........',
];
const WING_DOWN = [
  '................................................',
  '................................................',
  '..............KKKKKK..........KKKKKKK...........',
  '...........KKKMMMMMMK........KMMMMMMKKK.........',
  '........KKKMMMMMMMMMMK......KMMMMMMMMMKKK.......',
  '.....KKKmmMMMMnMMMMMMK......KMMMMMnMMMMmmKKK....',
  '...KKmmMMMMMnnMMMMMMK........KMMMMMnnMMMMMmKK...',
  '..KmmMMMMMMnMMMMMMKK..........KKMMMMMnMMMMMMmK..',
  '..KmMMMMMMMMMMMKKK..............KKKMMMMMMMMMmK..',
  '...KKMMMMMMKKKK....................KKKKMMMMKK...',
  '.....KKKKKK..............................KKKK...',
  '................................................',
];
function composeBoss(wing, wingY) {
  const H = 32, W = 48;
  const g = Array.from({ length: H }, () => Array(W).fill('.'));
  const put = (rows, ox, oy) => rows.forEach((r, y) => [...r].forEach((c, x) => { if (c !== '.' && g[y + oy] && x + ox < W) g[y + oy][x + ox] = c; }));
  put(wing, 0, wingY);
  put(BOSS_BODY, 0, 8);
  // 脚
  put(['..........K..K.......K..K.......', '.........K..K.........K..K......'], 8, 23);
  return g.map(r => r.join(''));
}
SPRITES.boss_up = composeBoss(WING_UP, 0);
SPRITES.boss_down = composeBoss(WING_DOWN, 10);
SPRITES.boss_rest = composeBoss([
  '................................................',
  '................................................',
  '................................................',
  '.......KKKKKKKKK..................KKKKKKKKK.....',
  '.....KKmmMMMMMMMKK..............KKMMMMMMMmmKK...',
  '....KmMMMnMMMMMMMMK............KMMMMMMMnMMMmK...',
  '....KMMMnnMMMMMMMMMK..........KMMMMMMMMnnMMMK...',
  '.....KKMMMMMMMMMMMMMK........KMMMMMMMMMMMMKK....',
  '.......KKKKKKKKKKKKKK........KKKKKKKKKKKKK......',
], 12);

// 文字列スプライト → キャンバス（左右反転つき）
export function bake(doc) {
  const out = {};
  for (const [name, rows] of Object.entries(SPRITES)) {
    const h = rows.length, w = Math.max(...rows.map(r => r.length));
    const make = flip => {
      const c = doc.createElement('canvas'); c.width = w; c.height = h;
      const g = c.getContext('2d');
      rows.forEach((r, y) => [...r].forEach((ch, x) => {
        if (ch === '.' || !PAL[ch]) return;
        g.fillStyle = PAL[ch]; g.fillRect(flip ? w - 1 - x : x, y, 1, 1);
      }));
      return c;
    };
    out[name] = { r: make(false), l: make(true), w, h };
  }
  // 白く光らせた版（被弾・ボスの点滅）
  for (const name of ['boss_up', 'boss_down', 'boss_rest', 'tsugi_stand', 'tsugi_jump', 'tsugi_fall', 'tsugi_run1', 'tsugi_run2', 'tsugi_run3', 'tsugi_skid']) {
    const src = out[name];
    const flash = side => {
      const c = doc.createElement('canvas'); c.width = src.w; c.height = src.h;
      const g = c.getContext('2d'); g.drawImage(src[side], 0, 0);
      g.globalCompositeOperation = 'source-in'; g.fillStyle = PAL.O; g.fillRect(0, 0, src.w, src.h);
      return c;
    };
    out[name + '_flash'] = { r: flash('r'), l: flash('l'), w: src.w, h: src.h };
  }
  return out;
}
