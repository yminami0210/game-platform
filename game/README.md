# ツギと ほつれ島

縫い合わされてできた島々が、虫食いの群れにほどかれていく。最後に縫われた端切れ人形「ツギ」が、針一本で島の結び玉を取り戻しに行く横スクロールの冒険。
いま遊べるのは **ワールド1「はぎれ野」**（地図・通常4ステージ・ひみつのステージ・針山の砦とボス・エンディング）。

## 遊び方
- ローカル: `cd game && npm run serve` → 表示された URL の `index.html` を開く（ビルド不要）
- PC: ← → 移動 / Z・スペース・K ジャンプ（長押しで高く）/ X・Shift・J ダッシュ / ↓ 物差しから降りる / Esc・Enter・P ひとやすみ
- ゲームパッド: 十字・左スティック / A ジャンプ / B・X ダッシュ / Start
- スマホ: 横持ち。左下が十字、右下がジャンプとダッシュ、右上がひとやすみ
- 綿毛（つづらから出る）を取ると、空中でジャンプを押し続けてふわりと滑空でき、敵に1回当たっても大丈夫
- 各ステージに金ボタンが3枚。ファスナー谷には隠し出口がある
- 進行は端末のブラウザに自動で保存される

## 開発
- 構成: `src/core`（決定的なシミュレーション）/ `src/render`（ドット絵・地図）/ `src/input` / `src/audio`（Web Audio で合成）/ `src/data`（ステージ・地図・文章・チューニング）
- ステージは `src/data/stages/*.json` の文字のタイル図（凡例は `src/core/level.js`）。追加したら `stages/index.json` と `world1.json` に足す
- テスト: `npm test`
- クリア確認ボット: `node tools/clearbot.mjs [ステージ] --medals`（ゴール・隠し出口・金ボタンに届くか）
- 初心者ボット: `node tools/novice.mjs [ステージ]`（押し間違えながら遊んだときの死亡数・時間）
- 実ブラウザ確認: `node tools/browsercheck.mjs`
- 自動ゲート: リポジトリ直下で `node .claude/game-studio/scripts/gate_check.mjs --gate release`
- 公開前に `node tools/sync_sw.mjs`（オフライン用キャッシュの一覧を更新）

## クレジット
企画・プログラム・ドット絵・音・曲・文章: AI社員のゲームスタジオ（すべて新規制作）
フォント: Kaisei Decol / DotGothic16（SIL Open Font License 1.1、Google Fonts から読み込み）
詳細は `LICENSES.md`
