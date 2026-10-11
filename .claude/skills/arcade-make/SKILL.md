---
name: arcade-make
description: ミニゲーム工場で、すぐ遊べる短いブラウザゲームを1本、企画 → 開発 → 自動QA → 監査 まで作り切る（1回 = 1本）。毎朝の定期実行（1日1本）や「ミニゲームを作って」「/arcade-make」で使う。大型タイトル（studio/・game/）には触らない。
---

# /arcade-make — ミニゲームを1本作る

会社のミッション: **忙しい毎日から離れて、時間を忘れて没頭できる遊び**を届ける。1本 = 1ファイル（`index.html`）で、スマホでもPCでも、1〜3分で1回遊び終わるもの。
あなたは進行役。企画・開発・監査は別々のサブエージェント（Agent ツール、general-purpose）に任せ、作った本人に採点させない。

**分担（CLAUDE.md §9、2026-10-11）**: 考える・最終チェックは Claude、書く・1次点検は OmniRoute。OmniRoute が使える回（0.5 で `OMNI=yes`）は、下の各工程の「OmniRoute が使える回」の手順で、本文を書くのを `writer`、1次点検を `critic`、事務を `clerk` に回す。使えない回（クラウドで動いたときなど）は、これまでどおり全部サブエージェントで行う。
- 依頼文は `<GAME>/依頼/<工程>.md` に置き、`python3 tools/omni_task.py <役割> <GAME>/依頼/<工程>.md <出力>` で呼ぶ。**実行する AI はファイルを読めないので、依頼文に資料を要約せずそのまま貼る**（plan.md・design.md・learnings.md・スキルの該当節など）。秘密情報は入れない
- omni_task.py が失敗した工程（終了コード1）はサブエージェントが代筆し、その成果物の最後に「Claude代筆（理由）」と書く
- ブラウザ・スクショ・Playwright が要る作業（見本画像の保存、qa.mjs、スクショを見ての確認、監査）は OmniRoute に回さない

## 0. 準備
1. リポジトリのルートで、`git pull --ff-only` で最新にする（失敗したら `git fetch` して状況を確認）。
2. `python3 arcade/bin/arcade.py list` で、最近のジャンルと操作を見る（**直近12本と同じジャンル×操作の組み合わせは作らない**）。
3. `arcade/learnings.md` を読む。
4. **`.claude/skills/product-layers/SKILL.md` に従い、`docs/product/company-core.md` と `docs/product/arcade/canvas.md` を読む**（How から考えない。Core → Why → What → How）。
5. `python3 tools/omni_task.py --check` を実行し、成功なら `OMNI=yes`、失敗なら `OMNI=no`（OmniRoute 不在）として以降を進める。

## 1. 企画担当（サブエージェント）
**OmniRoute が使える回**: あなたが `GAME=$(python3 arcade/bin/arcade.py new <英語slug>)` でフォルダを作り、下の企画担当への指示文に、貼るべき資料（`arcade.py list` の結果、`arcade/learnings.md`、`docs/product/arcade/canvas.md` の Core と Why、`arcade/design-log.md` の直近10本、`.claude/skills/game-art-direction/SKILL.md` §1）を全文足して `$GAME/依頼/企画.md` にし、`writer` で `$GAME/plan.md` を書かせる。次に、plan.md と下の条件（判断して避ける要素がある／現実の自分の仕事を題材にしない／実在作品の名前・見た目を使わない／直近12本と同じジャンル×操作でない）を貼った `$GAME/依頼/企画点検.md` を `critic` に渡して `$GAME/依頼/企画点検-結果.md` を得る。最後にあなたが plan.md と点検結果を読んで最終チェックし、直す点があれば指摘を足して `writer` に1回だけ書き直させる。
**使えない回**: 次の指示でサブエージェントに任せる。
> あなたはミニゲーム工場の企画担当です。`arcade/learnings.md` と `python3 arcade/bin/arcade.py list` の結果（<貼る>）を踏まえ、まだ無い遊びを1つ企画してください。`GAME=$(python3 arcade/bin/arcade.py new <英語slug>)` でフォルダを作り、まず `docs/product/arcade/canvas.md` の Core と Why を読み、`$GAME/plan.md` の先頭に `## このゲームの Why`（キャンバスのどのペイン・ゲインに答えるかを1〜2行）を書いてから、次の節を書きます: `## 一行ピッチ` `## 30秒のコアループ` `## 操作`（タップ/スワイプ/キー。スマホとPC両対応）`## 気持ちいい瞬間` `## 判断と失敗`（**触ってはいけない物・やってはいけない操作など、プレイヤーが判断して避ける要素を必ず1つ以上**。全部押せば終わる遊びにしない。オーナーの指摘 2026-10-05）`## 終わり方とスコア` `## 既存作との違い` `## 見た目と音`（`.claude/skills/game-art-direction/SKILL.md` §1 に従い、借りてくる物・名前つきパレット・フォント・印象に残す1点を書く。`arcade/design-log.md` の直近10本と被らせない）。実在のゲーム・キャラクター・商標の名前や見た目は使わない。**現実の自分の仕事を思い出させる題材にしない**（会議・メール・表計算・残業・締め切りに追われる会社員ものなど）。一方、オーバークックのように**仮想の仕事をおもしろおかしく体験する遊び**（料理店・郵便局・宇宙の配達など）は歓迎（オーナーの方針: 自分の仕事から離れられればよい）。返答はフォルダのパスと一行ピッチだけ。

## 1.5 デザインコンセプトと事前審査（実装より前）
1. **デザイン担当**（サブエージェント）:
**OmniRoute が使える回**: plan.md、`.claude/skills/game-art-direction/SKILL.md`（§0・§1）、`.claude/skills/game-art-direction/concept-template.md`、`arcade/design-log.md` の直近10本を貼った依頼文で、`writer` に `<GAME>/design.md` と、見本帳・代表場面の HTML/SVG の中身（`<GAME>/design/*.html` に置く文）を書かせる。HTML の保存と Playwright でのスクショ（PNG）は、あなたかサブエージェントが行う。
**使えない回**: 次の指示でサブエージェントに任せる。
> あなたはミニゲーム工場のデザイン担当です。`.claude/skills/frontend-design/SKILL.md` と `.claude/skills/game-art-direction/SKILL.md`（特に §0）を読み、`<GAME>/plan.md` から `<GAME>/design.md` を `.claude/skills/game-art-direction/concept-template.md` の形で書きます。見本として、色・形・文字の見本帳と代表場面の1枚絵を HTML/SVG で作り、`<GAME>/design/` に PNG で保存します（Playwright でスクショ）。`arcade/design-log.md` の直近10本と被らせない。返答は3行以内。
2. **事前審査**（別のサブエージェント）:
> あなたはミニゲーム工場の美術監査です。`<GAME>/design.md` と `<GAME>/design/*.png` を見て、game-art-direction §0・§2 に照らし、このまま作れば「AIが作った感」スコア 8/10 以上に届くかを判定します。届かない理由を具体的に書き、`design.md` の §10 に記入。最後の行は `VERDICT: PASS` か `VERDICT: REVISE`。
3. REVISE ならデザイン担当に直させて再審査（**1回まで**）。それでも届かなければ、企画からやり直すか `rejected` にする。**PASS するまで開発に進まない**

## 2. 開発担当（サブエージェント）
**OmniRoute が使える回**:
1. plan.md、合格した design.md、下の条件、`.claude/skills/frontend-design/SKILL.md` と `.claude/skills/game-art-direction/SKILL.md` の該当節を貼った依頼文で、`writer` に `<GAME>/index.html` の全文を書かせる（返答は HTML だけにさせる）
2. あなたが `node arcade/bin/qa.mjs <GAME>` と `python3 arcade/bin/arcade.py check <GAME>` を回す。失敗したら、index.html の全文とエラーの出力をそのまま貼って `writer` に直させる（**2回まで**。それでも通らなければサブエージェントが直し、Claude代筆として残す）
3. 通ったら、index.html と条件を貼って `critic` にコードを点検させる（1ファイル完結・外部通信なし・localStorage の try/catch・300KB 以下・タイトル→遊ぶ→結果の流れ）。指摘は `writer` で直す
4. `qa/play.png` を見て遊んでいる画面か確かめ、design-log.md に1行足すのはあなた。meta.json の各項目は plan.md を貼って `clerk` に JSON で書かせ、あなたが確かめて保存する
**使えない回**: 次の指示でサブエージェントに任せる。
> あなたはミニゲーム工場の開発担当です。まず `.claude/skills/frontend-design/SKILL.md` と `.claude/skills/game-art-direction/SKILL.md` を読み、そのデザインの進め方（計画 → 定番との照合 → 実装 → スクショで自己批評 → 飾りを1つ取る）で作ってください。`<GAME>/plan.md` と、事前審査に合格した `<GAME>/design.md`（見本 `<GAME>/design/`）のとおりに `<GAME>/index.html` を作ります。デザインはコンセプトから外れないこと。条件:
> - 1ファイルで完結（HTML + CSS + JS を埋め込み）。外部の読み込みは Google Fonts だけ可（読めなくても遊べるようにフォールバックを書く）。それ以外のファイル・通信は使わない。画像は canvas の図形か inline SVG、音は Web Audio で生成（最初のタップで鳴らし始める）
> - `<meta name="viewport" content="width=device-width,initial-scale=1">`。スマホ縦画面（390x844）で全体が見え、PCではキーボードでも遊べる
> - タイトル画面 → 遊ぶ → 結果（スコア・もう一回）の流れ。遊び方は画面に1〜2行で表示。ベストスコアは localStorage に保存（try/catch で囲む）
> - 300KB 以下。エラーを出さない
> `<GAME>/meta.json` の title / pitch（60字以内）/ genre / controls / how_to_play と、**best_key**（ベストスコアを保存している localStorage のキー。遊び場 player/ が表示に使う）を埋める。
> `node arcade/bin/qa.mjs <GAME>` と `python3 arcade/bin/arcade.py check <GAME>` が両方 OK になるまで直す。`<GAME>/qa/play.png` を Read で見て、遊んでいる画面になっているか自分でも確かめる。最後に `arcade/design-log.md` に1行追記する。返答は3行以内。

## 3. 監査役（サブエージェント）
> あなたはミニゲーム工場の監査役です。`<GAME>` を判定してください。`node arcade/bin/qa.mjs <GAME>` と `python3 arcade/bin/arcade.py check <GAME>` を実行し、`qa/start.png` と `qa/play.png` を Read で見て、`plan.md` と `index.html` を読みます。観点:
> 0. **Fit**: `plan.md` の「このゲームの Why」が `docs/product/arcade/canvas.md` と会社の Core（忙しい毎日から離れて、時間を忘れて没頭できる遊び）に合っているか。合っていなければ REVISE
> 1. **楽しさ**: 判断して避ける要素（触ってはいけない物など）があり、失敗がはっきり分かるか（無ければ REVISE）／30秒で何をすればいいか分かるか / 気持ちいい瞬間が実装されているか / もう一回遊びたくなる仕掛けがあるか
> 2. **完成度**: タイトル → 遊ぶ → 結果 → もう一回 が回るか / スマホで操作できるか / 画面からはみ出していないか
> 3. **デザイン**: `.claude/skills/game-art-direction/SKILL.md` の「監査役が見る観点（デザイン）」で確かめ、「AIが作った感」スコア（10点満点、10 = 人のデザイナーの作品にしか見えない）をつける。**8点未満は REVISE**（オーナー方針: ミニゲームは8点以上）
> 4. **権利・安全**: 実在作品のキャラクター・名前・見た目に似ていないか / 暴力や性的な表現が過度でないか / 外部通信が無いか
> `<GAME>/audit.md` に観点ごとの結果と、10点満点の「楽しさスコア」と「デザインスコア」を書く。最後の行は `VERDICT: PASS` か `VERDICT: REVISE` だけ。REVISE なら、開発担当がそのまま直せる具体的な指摘を書く。

## 4. 判定
- `PASS` → `python3 arcade/bin/arcade.py set <GAME> ready 楽しさ<点>/デザイン<点>` 
- `REVISE` → 指摘を開発担当（新しいサブエージェント）に渡して直させ、監査をもう一度。**差し戻しは1回まで**。2回目も REVISE なら `set <GAME> rejected <理由>`（失敗作も記録として残す）
- 監査で出た学び（次の企画・開発で役立つこと）を `arcade/learnings.md` に1行追記する（30行以内に整理）。OmniRoute が使える回は、learnings.md の全文と追記したい学びを貼って `clerk` に30行以内へ整理させ、あなたが中身が消えていないか確かめてから保存する

## 5. 保存
1. `python3 arcade/bin/arcade.py catalog`
2. `git add arcade && git commit -m "arcade: <番号> <タイトル>（ready|rejected）"` → `git push`（push が競合したら `git pull --rebase` してから再度 push。catalog.json と index.html が競合したら `arcade.py catalog` で作り直して解決）
3. 4行で報告: タイトル / 一行ピッチ / 判定と楽しさスコア / 分担（例「OmniRoute: writer 4回・critic 2回・clerk 2回、Claude代筆 0件」、使えない回は「OmniRoute 不在」）

## 守ること
- **公開はしない**。`ready` は「公開候補」。公開（GitHub Pages など外から見える場所に出すこと）はオーナーの承認後。
- 大型タイトル（`studio/`、`game/`）と、遊び場（`player/`）のファイルには触らない。
- 1回の実行で作るのは1本だけ。
- OmniRoute への依頼文に、秘密情報（API キー、パスワード、個人情報）を入れない。`<GAME>/依頼/` と `生成記録.md` はゲームと一緒に commit してよい。
