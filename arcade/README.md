# ミニゲーム工場（arcade）

1時間に1本、すぐ遊べるミニゲームを AI社員が作る。会社の方針は [`docs/company.md`](../docs/company.md)。

## 流れ（`/arcade-make` 1回 = 1本）
```
企画担当 → 開発担当 → 自動QA（qa.mjs）→ 監査役 → ready（公開候補）/ rejected（記録として残す）
              ↑______差し戻し（1回まで）______|
```
- **企画担当**: 直近12本と被らない遊びを企画し、`plan.md` にする
- **開発担当**: 1ファイルの `index.html` を作る（外部通信なし、スマホとPC両対応）
- **自動QA**: `node arcade/bin/qa.mjs <game>` がスマホ画面のヘッドレスブラウザで6秒間でたらめに遊び、エラー・無反応・外部通信・はみ出しを調べる
- **監査役**: スクショとコードを見て、楽しさ・完成度・権利を判定。楽しさスコア（10点満点）をつける
- 学びは `learnings.md` に溜まり、次の企画・開発で読まれる

## ファイル
| パス | 中身 |
|---|---|
| `games/<番号>-<slug>/` | 1本ぶん: `plan.md`（企画）、`index.html`（ゲーム）、`meta.json`、`qa/`（スクショと結果）、`audit.md`（監査） |
| `index.html` | 遊び場ページ（ready のゲームの一覧）。`arcade.py catalog` で作り直す |
| `catalog.json` | 全ゲームの一覧（rejected を含む） |
| `bin/arcade.py` | new / check / set / catalog / list |
| `bin/qa.mjs` | 自動QA |

## 遊んでみる
リポジトリを手元に置き、`arcade/index.html` をブラウザで開く。公開はオーナーの承認後（`docs/company.md` §公開の流れ）。
