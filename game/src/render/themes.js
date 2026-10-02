// ステージの布地（テーマ）ごとの色。名前は studio/design-system.md と合わせる。
export const THEMES = {
  meadow: { // はぎれ野: 藍の継ぎはぎ＋若草のピンキング縁
    sky: ['#9ccbc4', '#b2d6cb', '#c6e0d0'], cloud: '#f7f3ea', cloudShade: '#d9e4dc',
    hills: ['#86b08f', '#79a483', '#93ba97'], hillSeam: '#e9efe0', hillInk: '#4f7a62',
    near: ['#5a8450', '#668f59'], nearInk: '#2f4a33', flower: ['#b8372b', '#8a5536', '#f0e6cf'],
    ground: ['#26426b', '#2e4d7a', '#213a5f'], groundInk: '#16243b', stitch: '#f0e6cf', cross: '#3d5f8c',
    top: '#7c9a4a', topDark: '#56703a', topStitch: '#f0e6cf', props: 'needles',
  },
  valley: { // ファスナー谷: デニム＋芥子のステッチ
    sky: ['#8fb8d2', '#a7c7d8', '#c3d6dc'], cloud: '#f7f3ea', cloudShade: '#d6e0e6',
    hills: ['#5f86ad', '#6c93b8', '#557ba1'], hillSeam: '#d39a22', hillInk: '#33506f',
    near: ['#3f6390', '#4b6e98'], nearInk: '#1f3350', flower: ['#8a5536', '#f0e6cf', '#b8372b'],
    ground: ['#36598a', '#3f6597', '#2f4f7c'], groundInk: '#18263d', stitch: '#e0a93a', cross: '#5579a6', twill: true, props: 'spools',
    top: '#2f4f7c', topDark: '#1f3554', topStitch: '#e0a93a',
  },
  plateau: { // アイロン台地: しま柄の台の布＋鋼の縁
    sky: ['#b7c1d6', '#c6cedd', '#d5dbe2'], cloud: '#f7f3ea', cloudShade: '#dde1e6',
    hills: ['#9aa7bd', '#a8b4c6', '#8f9cb3'], hillSeam: '#eef0f3', hillInk: '#5f6c84',
    near: ['#7b8aa3', '#8a98ae'], nearInk: '#3e4a5e', flower: ['#b8372b', '#f0e6cf', '#5f676e'],
    ground: ['#4f7a74', '#5a857e', '#466e69'], groundInk: '#22383a', stitch: '#f0e6cf', cross: '#6f9a92', stripes: '#e8eee6', props: 'irons',
    top: '#8e979f', topDark: '#5f676e', topStitch: '#d5dade',
  },
  secret: { // ひみつの縫い目: 針箱の中（柿渋の木地＋茜のちりめん）
    sky: ['#6e4632', '#7c5039', '#8a5a40'], cloud: '#b47c4f', cloudShade: '#8a5536',
    hills: ['#5e3b2a', '#68412e', '#553525'], hillSeam: '#d39a22', hillInk: '#3a2419',
    near: ['#4e3022', '#583727'], nearInk: '#2b1a12', flower: ['#f0e6cf', '#dd6a4c', '#8a5536'],
    ground: ['#a33a2e', '#b8443a', '#933327'], groundInk: '#4a1712', stitch: '#f2cf62', cross: '#c4574a', props: 'spools',
    top: '#d39a22', topDark: '#a87a18', topStitch: '#2b2420',
  },
  fort: { // 針山の砦: 紅のビロードの針山
    sky: ['#4a2a3a', '#563042', '#62374a'], cloud: '#7a4459', cloudShade: '#5a3343',
    hills: ['#6e3549', '#7a3d52', '#643044'], hillSeam: '#d39a22', hillInk: '#3d1d29', tufted: true,
    near: ['#5a2c3c', '#653244'], nearInk: '#2e1520', flower: ['#d5dade', '#9a3e5c', '#f0e6cf'],
    ground: ['#8c3b4f', '#9a4558', '#7e3446'], groundInk: '#3a1520', stitch: '#d39a22', cross: '#a85468', props: 'needles',
    top: '#c9577a', topDark: '#9a3e5c', topStitch: '#f0e6cf',
  },
};
