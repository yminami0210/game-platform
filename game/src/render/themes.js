// ステージの布地（テーマ）ごとの色と柄。型染め（studio/design-concept.md §1.6 §2 §2.5 §4）。
// 色は §4 の6色と重ね刷りの色だけを使う。墨の輪郭は使わず、輪郭は生成りの抜け線。
export const K = {
  ki: '#ebdfc3', kis: '#c9b88f',                    // 生成り・生成影
  ai: '#2b4a6f', aik: '#1f3752', aia: '#3f6590',    // 藍・藍濃・藍淡
  ha: '#6f9bb8', hak: '#5683a3', haa: '#8fb5cb',    // 縹・縹濃・縹淡
  ak: '#b33a2c', akk: '#8a2c22', akd: '#6f2018',    // 茜・茜濃・茜の影（背景は茜濃と茜の影だけ）
  ka: '#d1aa36', kak: '#a4852b', kaa: '#e6cd6e',    // 刈安・刈安濃・刈安淡
  su: '#3a302b',                                    // 消炭
};
// sky: 空の地 / bird: 遠くの千鳥 / far・mid・near: 干し場の各層の反物 [地の色, 柄の色, 柄]
// wood: 竿と支柱 [面, 影] / line: 層ごとの抜け線の色 / hanger: 竿に付くテーマの物
// ground: 地形の当て布の地 / cross: 地形の柄の色 / motifs: 地形の柄 / ear: 上面の耳 [面, 影]
// 地の色（テーマごとの支配色。design-concept.md §2.5 の表）: meadow=藍 / valley=刈安・芥子 / plateau=生成り・縹 / secret=柿渋の木地 / fort=茜濃のビロード
// near（ツギの高さの帯）はツギの袖（藍）・胴（茜）より明るい柄なしの反物にする（§2.5 改訂）
export const THEMES = {
  meadow: { // はぎれ野: 藍の干し場
    sky: K.hak, bird: K.haa,
    far: [[K.aia, K.ai, 'seigaiha'], [K.ai, K.aia, 'shippo'], [K.aia, K.ha, 'yagasuri']],
    mid: [[K.ai, K.aik, 'shippo'], [K.ka, K.kak, 'uroko'], [K.aik, K.ai, 'seigaiha'], [K.akk, K.su, 'yagasuri']],
    near: [[K.ha, K.haa, null], [K.haa, K.ha, null]],
    wood: [K.ka, K.kak], line: [K.haa, K.ki, K.ki], hanger: 'pins',
    ground: [K.aik, K.ai, K.aik], cross: K.ai, motifs: ['asanoha', 'shippo', 'seigaiha', 'uroko'], ear: [K.ka, K.kak], top: K.ka,
  },
  valley: { // ファスナー谷: 刈安・芥子の干し場。竿の代わりにファスナー
    sky: K.kaa, bird: K.ka,
    far: [[K.ka, K.kaa, 'yagasuri'], [K.kaa, K.ka, 'chidori'], [K.kis, K.ki, 'seigaiha']],
    mid: [[K.kak, K.ka, 'yagasuri'], [K.ka, K.kak, 'uroko'], [K.kak, K.su, 'asanoha'], [K.ki, K.kis, 'shippo']],
    near: [[K.ki, K.kis, null], [K.kaa, K.ka, null]],
    wood: [K.su, K.aik], line: [K.ki, K.ki, K.kis], hanger: 'zip',
    ground: [K.kak, K.ka, K.kak], cross: K.su, motifs: ['yagasuri', 'uroko', 'asanoha', 'shippo'], ear: [K.ki, K.kis], top: K.ki,
  },
  plateau: { // アイロン台地: 生成りの台と縹の反物
    sky: K.ki, bird: K.kis,
    far: [[K.haa, K.ha, 'uroko'], [K.kis, K.ki, 'seigaiha'], [K.ha, K.haa, 'shippo']],
    mid: [[K.ha, K.hak, 'seigaiha'], [K.kis, K.ki, 'shippo'], [K.haa, K.ha, 'uroko'], [K.hak, K.ha, 'chidori']],
    near: [[K.kis, K.ki, null], [K.haa, K.ha, null]],
    wood: [K.kak, K.su], line: [K.ki, K.ki, K.ki], hanger: 'irons',
    ground: [K.hak, K.ha, K.hak], cross: K.ha, motifs: ['uroko', 'seigaiha', 'shippo', 'asanoha'], ear: [K.ki, K.kis], top: K.ki,
  },
  secret: { // ひみつの縫い目: 柿渋の木地の針箱。糸巻きを竿に通す（茜濃は遠景だけ＝ツギから離す）
    sky: K.su, bird: K.kak,
    far: [[K.kak, K.su, 'asanoha'], [K.akk, K.su, 'shippo'], [K.kak, K.ka, 'uroko']],
    mid: [[K.kak, K.ka, 'asanoha'], [K.su, K.kak, 'chidori'], [K.ka, K.kak, 'yagasuri']],
    near: [[K.ka, K.kaa, null], [K.kaa, K.ka, null]],
    wood: [K.ka, K.kak], line: [K.kis, K.ki, K.ki], hanger: 'spools', akkLayer: 'far',
    ground: [K.kak, K.su, K.kak], cross: K.su, motifs: ['asanoha', 'chidori', 'yagasuri', 'shippo'], ear: [K.ka, K.kak], top: K.ka,
  },
  river: { // 藍の川: 染め場の川べり。藍・縹・生成りの型染め、観世水と青海波の流れ
    sky: K.haa, bird: K.ki,
    far: [[K.ha, K.haa, 'kanzemizu'], [K.aia, K.ha, 'seigaiha'], [K.haa, K.ki, 'kanzemizu']],
    mid: [[K.ai, K.aia, 'seigaiha'], [K.aik, K.ai, 'kanzemizu'], [K.ki, K.kis, 'seigaiha'], [K.aia, K.haa, 'kanzemizu']],
    near: [[K.ha, K.haa, null], [K.ki, K.kis, null]],
    wood: [K.kis, K.su], line: [K.ki, K.ki, K.haa], hanger: 'pins',
    ground: [K.aik, K.ai, K.aik], cross: K.aia, motifs: ['kanzemizu', 'seigaiha', 'kanzemizu', 'shippo'], ear: [K.ki, K.kis], top: K.ki,
  },
  fort: { // 針山の砦: 茜濃のビロードの針山。刈安の頭・生成りの軸の待ち針が林立
    sky: K.akd, bird: K.akk, akkFree: true,
    far: [[K.akk, K.akd, 'kebi'], [K.su, K.akd, 'kebi'], [K.akk, K.su, 'uroko']],
    mid: [[K.akk, K.akd, 'kebi'], [K.su, K.akk, 'kebi'], [K.akk, K.su, 'kebi']],
    near: [[K.kis, K.ki, null], [K.kaa, K.ka, null]],
    wood: [K.kak, K.su], line: [K.kis, K.kis, K.ki], hanger: 'needles',
    ground: [K.akk, K.akd, K.akk], cross: K.akd, motifs: ['kebi'], ear: [K.akd, K.su], top: K.akd,
  },
cloud: { // わた雲山: 綿畑と霞の雲。生成り・刈安（雲は丸めず霞の帯）
    sky: K.ki, bird: K.kis,
    far: [[K.kis, K.ki, 'kasumi'], [K.kaa, K.ki, 'kasumi'], [K.ki, K.kis, 'shippo']],
    mid: [[K.ka, K.kaa, 'kasumi'], [K.kis, K.ki, 'asanoha'], [K.kaa, K.ka, 'kasumi'], [K.kak, K.ka, 'yagasuri']],
    near: [[K.ki, K.kis, null], [K.kaa, K.ka, null]],
    wood: [K.kak, K.su], line: [K.ki, K.ki, K.ki], hanger: 'pins',
    ground: [K.kak, K.ka, K.kak], cross: K.kis, motifs: ['kasumi', 'asanoha', 'kasumi', 'shippo'], ear: [K.ki, K.kis], top: K.ki,
  },
  loom: { // はた織り場: 柿渋の木地の機。格子の経糸と杼
    sky: K.kak, bird: K.ka,
    far: [[K.su, K.kak, 'koshi'], [K.kak, K.su, 'asanoha'], [K.kak, K.ka, 'koshi']],
    mid: [[K.ka, K.kak, 'koshi'], [K.su, K.kak, 'yagasuri'], [K.kis, K.ki, 'koshi']],
    near: [[K.ka, K.kaa, null], [K.kaa, K.ka, null]],
    wood: [K.ka, K.su], line: [K.kis, K.ki, K.ki], hanger: 'shuttles',
    ground: [K.su, K.kak, K.su], cross: K.kak, motifs: ['koshi', 'asanoha', 'yagasuri', 'koshi'], ear: [K.ka, K.kak], top: K.ka,
  },
  night: { // よなべ町: 藍濃の夜、障子の格子と刈安の行灯
    sky: K.aik, bird: K.ai,
    far: [[K.ai, K.aik, 'koshi'], [K.aik, K.ai, 'seigaiha'], [K.kak, K.ka, 'koshi']],
    mid: [[K.kaa, K.ka, 'koshi'], [K.ai, K.aia, 'asanoha'], [K.ka, K.kak, 'koshi'], [K.su, K.ai, 'chidori']],
    near: [[K.aia, K.ha, null], [K.kaa, K.ka, null]],
    wood: [K.su, K.aik], line: [K.ha, K.ki, K.kaa], hanger: 'andon',
    ground: [K.su, K.aik, K.su], cross: K.ai, motifs: ['koshi', 'asanoha', 'seigaiha', 'koshi'], ear: [K.ka, K.kak], top: K.ka,
  },
  snow: { // 毛糸の雪原: 生成りと縹の編み目
    sky: K.haa, bird: K.ki,
    far: [[K.ki, K.kis, 'amime'], [K.haa, K.ki, 'amime'], [K.kis, K.ki, 'asanoha']],
    mid: [[K.ha, K.haa, 'amime'], [K.ki, K.kis, 'amime'], [K.hak, K.ha, 'shippo'], [K.kis, K.ki, 'amime']],
    near: [[K.ki, K.kis, null], [K.haa, K.ha, null]],
    wood: [K.kis, K.hak], line: [K.ki, K.ki, K.ki], hanger: 'pins',
    ground: [K.ki, K.kis, K.ki], cross: K.haa, motifs: ['amime', 'amime', 'asanoha', 'shippo'], ear: [K.ha, K.hak], top: K.ha,
  },
  palace: { // 錦の宮: 刈安の金糸と茜濃の錦。亀甲と青海波
    sky: K.kaa, bird: K.ka, akkFree: true,
    far: [[K.akk, K.ka, 'kikko'], [K.ka, K.kak, 'seigaiha'], [K.akd, K.akk, 'kikko']],
    mid: [[K.ka, K.kaa, 'kikko'], [K.akk, K.ka, 'asanoha'], [K.kak, K.ka, 'kikko'], [K.akd, K.ka, 'seigaiha']],
    near: [[K.kaa, K.ka, null], [K.ki, K.kis, null]],
    wood: [K.akd, K.su], line: [K.kaa, K.ki, K.ki], hanger: 'pins',
    ground: [K.akk, K.akd, K.akk], cross: K.ka, motifs: ['kikko', 'seigaiha', 'kikko', 'asanoha'], ear: [K.ka, K.kak], top: K.ka,
  },
  abyss: { // ほどきの穴: 消炭と藍濃。ほどけた糸の渦
    sky: K.su, bird: K.aik,
    far: [[K.aik, K.su, 'uzu'], [K.su, K.aik, 'uzu'], [K.aik, K.ai, 'kanzemizu']],
    mid: [[K.ai, K.aik, 'uzu'], [K.su, K.aik, 'kanzemizu'], [K.aik, K.aia, 'uzu']],
    near: [[K.aia, K.ha, null], [K.kis, K.ki, null]],
    wood: [K.aik, K.su], line: [K.aia, K.ha, K.kis], hanger: 'threads',
    ground: [K.su, K.aik, K.su], cross: K.aik, motifs: ['uzu', 'kanzemizu', 'uzu', 'uzu'], ear: [K.aia, K.aik], top: K.aia,
  },
};
