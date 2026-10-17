## 目的
オーナー（yminami0210）の会社「AI社員だけで回るインディーゲームスタジオ」の**看板となる大型タイトル**を作る。会社の方針は `docs/company.md`。
オーナーの好み: 仕事を忘れて遊べる、純粋に楽しいゲーム（仕事を題材にしない）。オーナーは「ほぼ放置」を希望している。

## やること
1. リポジトリの `game-studio` スキル一式（`.claude/agents/gs-*.md`、`.claude/game-studio/`、`studio/`、`game/` の雛形）はセットアップ済み。`game-studio` スキルが使えればそれに従う。スキルが見つからなければ、`.claude/game-studio/` の参照資料と `.claude/agents/gs-*.md` を読み、同じフェーズ・ゲートの進め方で進める。
2. **Gate 1（コンセプト確定）はオーナーから AI相棒に委任済み**。人間へのインタビューは行わず、上の好み（純粋な娯楽、スマホで遊べる、続けて遊びたくなる）を前提に researcher で調べて3案を作り、最も新規性と熱中度の高い1案を自分で選ぶ。選定理由と残り2案を `studio/decisions.md` と `studio/concept.md` に残す。
3. Phase 2〜5（プリプロダクション → 垂直スライス → プロダクション → 品質ゲート）を mode=eco で進める。gate_check が PASS するまで直す。
4. Phase 6 では**公開しない**。Gate 2 の「公開承認パック」（一行ピッチ、スクショ、各判定の要約、既知の問題、公開手順）を `studio/release-pack.md` にまとめて止める。
5. フェーズが終わるたびに `studio/STATUS.md` を更新し、commit して作業ブランチに push する（途中で止まっても再開できるように）。

## 完了条件
- `studio/concept.md`（Gate 1 確定）、`studio/brief.md`、`studio/gdd.md` がある
- `game/` が動き、`node .claude/game-studio/scripts/gate_check.mjs --gate release` が PASS
- `studio/release-pack.md` がある
- すべて作業ブランチに push 済み（PR は作らない。main にはマージしない）

## 前提・文脈
- ミニゲーム量産ライン（`arcade/`）が別に毎時動いている。`arcade/` のファイルには触らない。
- `arcade/catalog.json` に監査の「楽しさスコア」が高いミニゲームがあれば、企画の参考にしてよい。
- `.github/workflows/pages.yml` はセットアップで作られていない（雛形に無かった）。公開手順は release-pack に書くだけでよい。
- この環境は外部サイトへの通信が制限されている。調べられなかったことは「未確認」と記録する。

## 制約
- リポジトリの CLAUDE.md にある停止ラインを守る（著作権・商標の侵害をしない。実在作のキャラクター・名前・見た目を使わない。秘密情報を扱わない）
- 公開（GitHub Pages の有効化、main へのマージ、外部への投稿）、課金・契約は行わず、報告に「要確認」として書く
- 上記以外は確認なしで自律的に進める

## 報告
結論 / 変更点 / 確認結果（gate_check の結果、playtester・reviewer の判定）/ 残課題 を日本語で
