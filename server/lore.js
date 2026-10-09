// ストーリーマスター管轄: ナナシ県の「ありそう」を作る素材表。
// LLM を使わずに世界の手触りを出すための語彙・出来事テーブル（トークン 0）。

export const SURNAMES = ['佐藤', '鈴木', '高橋', '田中', '渡辺', '伊藤', '山本', '中村', '小林', '加藤', '吉田', '山田', '佐々木', '松本', '井上', '木村', '林', '清水', '山崎', '森', '池田', '橋本', '石川', '前田', '藤田', '岡田', '後藤', '長谷川', '村上', '近藤', '名無', '七瀬', '野々村', '菜種', '梨木'];
export const GIVEN_M = ['茂', '清', '勇', '博', '実', '昭夫', '和夫', '健一', '誠', '浩二', '孝', '修', '進', '豊', '正男', '一郎', '大輔', '拓也', '翔太', '蓮'];
export const GIVEN_F = ['和子', '幸子', '節子', '洋子', '恵子', '京子', '久美子', '由美子', '真由美', '明美', '智子', '裕子', '陽子', '美香', 'さくら', '葵', '結衣', '花子', 'トメ', 'ハル'];

// 県庁の部署。skills を持つ部署の職員は Claude Code / テンプレート経由で実タスクを実行する。
export const DEPARTMENTS = [
  { id: 'koho', name: '広報課', staff: 6, color: '#d9534f', skills: ['sns_post', 'photo', 'newspaper'] },
  { id: 'jumin', name: '住民課', staff: 6, color: '#5b8bd9', skills: ['resident_register'] },
  { id: 'chikusan', name: '畜産課', staff: 5, color: '#8a6d3b', skills: [] },
  { id: 'doboku', name: '土木課', staff: 5, color: '#777777', skills: [] },
  { id: 'kanko', name: '観光課', staff: 4, color: '#e0a030', skills: [] },
  { id: 'somu', name: '総務課', staff: 5, color: '#4a9a6a', skills: [] },
  { id: 'zeimu', name: '税務課', staff: 4, color: '#6a5acd', skills: [] },
  { id: 'fukushi', name: '福祉課', staff: 5, color: '#d97eb0', skills: [] },
];

// 部署ごとの「決められた選択肢」（ランダム実行、ログに残るだけ）
export const DEPT_ROUTINES = {
  koho: ['ポスター原稿を校正した', '取材メモを整理した', 'カメラのフィルムを交換した', '県のマスコット「ななっしー」の着ぐるみを干した'],
  jumin: ['転入届を受理した', '住民票の写しを交付した', '窓口の番号札を補充した', '印鑑登録の説明をした'],
  chikusan: ['乳牛の健康診断の日程を組んだ', '飼料価格の資料をまとめた', '牧場へ電話で聞き取りをした', '家畜共進会の案内を書いた'],
  doboku: ['県道7号の補修計画を見直した', '側溝の苦情に対応した', '橋の点検記録をファイルした', '測量図を青焼きした'],
  kanko: ['名無湯の観光パンフを改訂した', 'ナナシ駅前の案内板を発注した', '夏祭りの屋台割りを決めた'],
  somu: ['会議室の予約表を書き換えた', '庁内報を輪転機で刷った', '朝礼の議事録を回覧した'],
  zeimu: ['固定資産税の通知書を封入した', '算盤で検算した', '納税相談に応じた'],
  fukushi: ['敬老会の名簿を更新した', '民生委員と打ち合わせた', '配食サービスの献立を確認した'],
};

// 町の出来事（ランダム発生）。importance が高いほど SNS・新聞に載りやすい。
export const TOWN_EVENTS = [
  { place: 'yaoya', text: '八百屋「青果マルヤ」で大根が一本50円の特売', importance: 2 },
  { place: 'sento', text: '名無湯の富士山のペンキ絵が塗り直された', importance: 2 },
  { place: 'kissa', text: '純喫茶ポプラのナポリタンが値上げ（350円→380円）', importance: 2 },
  { place: 'bokujo', text: '名無牧場で子牛が生まれた', importance: 3 },
  { place: 'kencho', text: '県庁に三毛猫が迷い込み、総務課で保護された', importance: 3 },
  { place: 'station', text: 'ナナシ駅の伝言板に「3時に例の場所で」と書かれていた', importance: 2 },
  { place: 'mall', text: 'ナナシ・シティプラザ屋上で戦隊ショーが開かれた', importance: 2 },
  { place: 'car', text: '名無自動車に新型セダン「ナナシ・グロリオ」が入荷', importance: 2 },
  { place: 'super', text: 'スーパーまるななでタイムセールの鐘が鳴った', importance: 1 },
  { place: 'conbini1', text: 'ナナシマート駅前店の新作おにぎり「ナナシ味噌」が完売', importance: 2 },
  { place: 'park', text: 'ななし公園で老人会のゲートボール大会', importance: 1 },
  { place: 'school', text: 'ナナシ第一小学校で避難訓練', importance: 1 },
  { place: 'shokudo', text: '大衆食堂「ふじや」に行列ができた', importance: 1 },
  { place: 'tanbo', text: '田んぼの案山子が一体増えていた（誰が立てたかは不明）', importance: 3 },
  { place: 'shoten', text: '本屋「七星堂」に月刊誌の発売日で人だかり', importance: 1 },
];

export const PLACE_ACTIONS = {
  super: ['夕飯の買い物をした', 'お惣菜を半額で買えた', 'レジで知り合いと立ち話をした'],
  conbini: ['缶コーヒーを買った', '週刊誌を立ち読みした', '公共料金を払った'],
  mall: ['ウィンドウショッピングをした', 'フードコートでラーメンを食べた', 'レコード店を覗いた'],
  car: ['新車のカタログをもらった', '車検の見積もりを頼んだ'],
  shop: ['店主と世間話をした', 'コロッケを買い食いした', '値切ってみた'],
  sento: ['一番風呂に入った', 'フルーツ牛乳を飲んだ'],
  kissa: ['クリームソーダを頼んだ', 'インベーダーゲームをした', '新聞を読んだ'],
  shokudo: ['日替わり定食を食べた', 'カツ丼を注文した'],
  park: ['ベンチで休んだ', '鳩に餌をやった', 'ラジオ体操をした'],
  station: ['時刻表を確かめた', '切符を買った'],
  home: ['テレビで野球中継を見た', '縁側で昼寝をした', '洗濯物を取り込んだ'],
  school: ['授業を受けた', '校庭で遊んだ'],
  bokujo: ['牛の世話をした', '牛乳を搬出した'],
  tanbo: ['田んぼの見回りをした'],
};

export const HASHTAGS = ['#ナナシ県', '#ないのにありそう', '#県庁広報課', '#ななっしー', '#昭和レトロ'];
export const SNS_NAME = 'ナナシッター';
export const NEWSPAPER_NAME = 'ナナシ県民新聞';
