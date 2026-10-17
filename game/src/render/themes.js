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
};
