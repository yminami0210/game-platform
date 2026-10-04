---
name: arcade-make
description: ミニゲーム工場で、すぐ遊べる短いブラウザゲームを1本、企画 → 開発 → 自動QA → 監査 まで作り切る（1回 = 1本）。毎朝の定期実行（1日1本）や「ミニゲームを作って」「/arcade-make」で使う。大型タイトル（studio/・game/）には触らない。
---

# /arcade-make — ミニゲームを1本作る

会社の方針: **仕事を忘れて遊べる、純粋に楽しいゲーム**を作る。1本 = 1ファイル（`index.html`）で、スマホでもPCでも、1〜3分で1回遊び終わるもの。
あなたは進行役。企画・開発・監査は別々のサブエージェント（Agent ツール、general-purpose）に任せ、作った本人に採点させない。

## 0. 準備
1. リポジトリのルートで、`git pull --ff-only` で最新にする（失敗したら `git fetch` して状況を確認）。
2. `python3 arcade/bin/arcade.py list` で、最近のジャンルと操作を見る（**直近12本と同じジャンル×操作の組み合わせは作らない**）。
3. `arcade/learnings.md` を読む。
4. **`.claude/skills/product-layers/SKILL.md` に従い、`docs/product/company-core.md` と `docs/product/arcade/canvas.md` を読む**（How から考えない。Core → Why → What → How）。

## 1. 企画担当（サブエージェント）
> あなたはミニゲーム工場の企画担当です。`arcade/learnings.md` と `python3 arcade/bin/arcade.py list` の結果（<貼る>）を踏まえ、まだ無い遊びを1つ企画してください。`GAME=$(python3 arcade/bin/arcade.py new <英語slug>)` でフォルダを作り、まず `docs/product/arcade/canvas.md` の Core と Why を読み、`$GAME/plan.md` の先頭に `## このゲームの Why`（キャンバスのどのペイン・ゲインに答えるかを1〜2行）を書いてから、次の節を書きます: `## 一行ピッチ` `## 30秒のコアループ` `## 操作`（タップ/スワイプ/キー。スマホとPC両対応）`## 気持ちいい瞬間` `## 終わり方とスコア` `## 既存作との違い` `## 見た目と音`（`.claude/skills/game-art-direction/SKILL.md` §1 に従い、借りてくる物・名前つきパレット・フォント・印象に残す1点を書く。`arcade/design-log.md` の直近10本と被らせない）。実在のゲーム・キャラクター・商標の名前や見た目は使わない。**現実の自分の仕事を思い出させる題材にしない**（会議・メール・表計算・残業・締め切りに追われる会社員ものなど）。一方、オーバークックのように**仮想の仕事をおもしろおかしく体験する遊び**（料理店・郵便局・宇宙の配達など）は歓迎（オーナーの方針: 自分の仕事から離れられればよい）。返答はフォルダのパスと一行ピッチだけ。

## 2. 開発担当（サブエージェント）
> あなたはミニゲーム工場の開発担当です。まず `.claude/skills/frontend-design/SKILL.md` と `.claude/skills/game-art-direction/SKILL.md` を読み、そのデザインの進め方（計画 → 定番との照合 → 実装 → スクショで自己批評 → 飾りを1つ取る）で作ってください。`<GAME>/plan.md` のとおりに `<GAME>/index.html` を作ります。条件:
> - 1ファイルで完結（HTML + CSS + JS を埋め込み）。外部の読み込みは Google Fonts だけ可（読めなくても遊べるようにフォールバックを書く）。それ以外のファイル・通信は使わない。画像は canvas の図形か inline SVG、音は Web Audio で生成（最初のタップで鳴らし始める）
> - `<meta name="viewport" content="width=device-width,initial-scale=1">`。スマホ縦画面（390x844）で全体が見え、PCではキーボードでも遊べる
> - タイトル画面 → 遊ぶ → 結果（スコア・もう一回）の流れ。遊び方は画面に1〜2行で表示。ベストスコアは localStorage に保存（try/catch で囲む）
> - 300KB 以下。エラーを出さない
> `<GAME>/meta.json` の title / pitch（60字以内）/ genre / controls / how_to_play を埋める。
> `node arcade/bin/qa.mjs <GAME>` と `python3 arcade/bin/arcade.py check <GAME>` が両方 OK になるまで直す。`<GAME>/qa/play.png` を Read で見て、遊んでいる画面になっているか自分でも確かめる。最後に `arcade/design-log.md` に1行追記する。返答は3行以内。

## 3. 監査役（サブエージェント）
> あなたはミニゲーム工場の監査役です。`<GAME>` を判定してください。`node arcade/bin/qa.mjs <GAME>` と `python3 arcade/bin/arcade.py check <GAME>` を実行し、`qa/start.png` と `qa/play.png` を Read で見て、`plan.md` と `index.html` を読みます。観点:
> 0. **Fit**: `plan.md` の「このゲームの Why」が `docs/product/arcade/canvas.md` と会社の Core（仕事を忘れて没頭できる遊び）に合っているか。合っていなければ REVISE
> 1. **楽しさ**: 30秒で何をすればいいか分かるか / 気持ちいい瞬間が実装されているか / もう一回遊びたくなる仕掛けがあるか
> 2. **完成度**: タイトル → 遊ぶ → 結果 → もう一回 が回るか / スマホで操作できるか / 画面からはみ出していないか
> 3. **デザイン**: `.claude/skills/game-art-direction/SKILL.md` の「監査役が見る観点（デザイン）」で確かめ、「AIが作った感」スコア（10点満点、10 = 人のデザイナーの作品にしか見えない）をつける。**6点未満は REVISE**
> 4. **権利・安全**: 実在作品のキャラクター・名前・見た目に似ていないか / 暴力や性的な表現が過度でないか / 外部通信が無いか
> `<GAME>/audit.md` に観点ごとの結果と、10点満点の「楽しさスコア」と「デザインスコア」を書く。最後の行は `VERDICT: PASS` か `VERDICT: REVISE` だけ。REVISE なら、開発担当がそのまま直せる具体的な指摘を書く。

## 4. 判定
- `PASS` → `python3 arcade/bin/arcade.py set <GAME> ready 楽しさ<点>/デザイン<点>` 
- `REVISE` → 指摘を開発担当（新しいサブエージェント）に渡して直させ、監査をもう一度。**差し戻しは1回まで**。2回目も REVISE なら `set <GAME> rejected <理由>`（失敗作も記録として残す）
- 監査で出た学び（次の企画・開発で役立つこと）を `arcade/learnings.md` に1行追記する（30行以内に整理）

## 5. 保存
1. `python3 arcade/bin/arcade.py catalog`
2. `git add arcade && git commit -m "arcade: <番号> <タイトル>（ready|rejected）"` → `git push`（push が競合したら `git pull --rebase` してから再度 push。catalog.json と index.html が競合したら `arcade.py catalog` で作り直して解決）
3. 3行で報告: タイトル / 一行ピッチ / 判定と楽しさスコア

## 守ること
- **公開はしない**。`ready` は「公開候補」。公開（GitHub Pages など外から見える場所に出すこと）はオーナーの承認後。
- 大型タイトル（`studio/`、`game/`）のファイルには触らない。
- 1回の実行で作るのは1本だけ。
