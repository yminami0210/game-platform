// ステージの布地（テーマ）ごとの色と柄。型染め（studio/design-concept.md §1.6 §2 §2.5 §4）。
// 色は §4 の6色と重ね刷りの色だけを使う。墨の輪郭は使わず、輪郭は生成りの抜け線。
export const K = {
  ki: '#ebdfc3', kis: '#c9b88f',                    // 生成り・生成影
  ai: '#2b4a6f', aik: '#1f3752', aia: '#3f6590',    // 藍・藍濃・藍淡
  ha: '#6f9bb8', hak: '#5683a3', haa: '#8fb5cb',    // 縹・縹濃・縹淡
  ak: '#b33a2c', akk: '#8a2c22',                    // 茜・茜濃（背景は茜濃だけ）
  ka: '#d1aa36', kak: '#a4852b', kaa: '#e6cd6e',    // 刈安・刈安濃・刈安淡
  su: '#3a302b',                                    // 消炭
};
// sky: 空の地 / bird: 遠くの千鳥 / far・mid・near: 干し場の各層の反物 [地の色, 柄の色, 柄]
// wood: 竿と支柱 [面, 影] / line: 層ごとの抜け線の色 / hanger: 竿に付くテーマの物
// ground: 地形の当て布の地 / cross: 地形の柄の色 / motifs: 地形の柄 / ear: 上面の耳 [面, 影]
export const THEMES = {
  meadow: { // はぎれ野: 反物の干し場
    sky: K.hak, bird: K.haa,
    far: [[K.haa, K.ha, 'seigaiha'], [K.ha, K.haa, 'shippo'], [K.aia, K.ha, 'yagasuri']],
    mid: [[K.aia, K.ai, 'shippo'], [K.ka, K.kak, 'uroko'], [K.ai, K.aia, 'seigaiha'], [K.akk, K.su, 'yagasuri']],
    near: [[K.aik, K.ai, 'asanoha'], [K.ai, K.aik, null], [K.aik, K.ai, 'uroko']],
    wood: [K.ka, K.kak], line: [K.haa, K.ki, K.kis], hanger: 'pins',
    ground: [K.aik, K.ai, K.aik], cross: K.ai, motifs: ['asanoha', 'shippo', 'seigaiha', 'uroko'], ear: [K.ka, K.kak], top: K.ka,
  },
  valley: { // ファスナー谷: 竿の代わりにファスナーを渡し、引き手で反物を留める
    sky: K.hak, bird: K.haa,
    far: [[K.ha, K.haa, 'yagasuri'], [K.haa, K.ha, 'chidori'], [K.aia, K.ha, 'seigaiha']],
    mid: [[K.ai, K.aia, 'yagasuri'], [K.aia, K.ai, 'uroko'], [K.kak, K.ka, 'asanoha'], [K.ai, K.aik, 'shippo']],
    near: [[K.aik, K.ai, 'yagasuri'], [K.ai, K.aik, null], [K.aik, K.ai, 'asanoha']],
    wood: [K.kak, K.su], line: [K.haa, K.ki, K.kis], hanger: 'zip',
    ground: [K.ai, K.aik, K.ai], cross: K.aia, motifs: ['yagasuri', 'uroko', 'asanoha', 'shippo'], ear: [K.kak, K.su], top: K.kak,
  },
  plateau: { // アイロン台地: 竿の上にアイロン、たたんだ反物
    sky: K.hak, bird: K.haa,
    far: [[K.haa, K.ha, 'uroko'], [K.ha, K.haa, 'seigaiha'], [K.aia, K.ha, 'shippo']],
    mid: [[K.aia, K.ai, 'seigaiha'], [K.kaa, K.ka, 'shippo'], [K.ai, K.aia, 'uroko'], [K.aia, K.ai, 'chidori']],
    near: [[K.aik, K.ai, 'shippo'], [K.ai, K.aik, null], [K.aik, K.ai, 'seigaiha']],
    wood: [K.ka, K.kak], line: [K.haa, K.ki, K.kis], hanger: 'irons',
    ground: [K.aik, K.ai, K.aik], cross: K.ai, motifs: ['uroko', 'seigaiha', 'shippo', 'asanoha'], ear: [K.kaa, K.ka], top: K.kaa,
  },
  secret: { // ひみつの縫い目: 針箱の中。糸巻きを竿に通す
    sky: K.su, bird: K.kak,
    far: [[K.kak, K.ka, 'asanoha'], [K.aia, K.ai, 'shippo'], [K.kak, K.su, 'uroko']],
    mid: [[K.ai, K.aia, 'asanoha'], [K.akk, K.su, 'chidori'], [K.ka, K.kak, 'yagasuri'], [K.aia, K.ai, 'seigaiha']],
    near: [[K.aik, K.ai, 'asanoha'], [K.aik, K.su, null], [K.ai, K.aik, 'yagasuri']],
    wood: [K.ka, K.kak], line: [K.kis, K.ki, K.kis], hanger: 'spools',
    ground: [K.aik, K.ai, K.aik], cross: K.kak, motifs: ['asanoha', 'chidori', 'yagasuri', 'shippo'], ear: [K.ka, K.kak], top: K.ka,
  },
  fort: { // 針山の砦: 大きな待ち針が竿を貫く
    sky: K.aik, bird: K.aia,
    far: [[K.aia, K.ai, 'uroko'], [K.ai, K.aia, 'asanoha'], [K.akk, K.su, 'uroko']],
    mid: [[K.ai, K.aia, 'uroko'], [K.kak, K.ka, 'yagasuri'], [K.aia, K.ai, 'asanoha'], [K.ai, K.aik, 'chidori']],
    near: [[K.su, K.aik, 'uroko'], [K.aik, K.su, null], [K.su, K.aik, 'yagasuri']],
    wood: [K.kak, K.su], line: [K.aia, K.ki, K.kis], hanger: 'needles',
    ground: [K.ai, K.aik, K.ai], cross: K.aia, motifs: ['uroko', 'yagasuri', 'asanoha', 'chidori'], ear: [K.ka, K.kak], top: K.ka,
  },
};
