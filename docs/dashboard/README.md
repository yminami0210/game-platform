# ゲーム会社 進捗ボード

- ページ: https://claude.ai/artifact/BArpv3QytwtskyYzC9EFiC （オーナーのみ閲覧可・非公開）
- ソース: `company-board.html`（同じ URL に再公開するときは Artifact ツールに `url` を渡す）

## 仕組み
| 表示 | データ元 | 更新 |
|---|---|---|
| 判断待ち・部署の状況・ミニゲーム棚 | ページの db の 1 文書 `hq/snapshot` | 相棒が毎朝更新（下の手順） |
| 箱庭のロボの動き（作業中・返事待ち） | Claude Code Remote コネクタの `list_sessions`（閲覧者の権限で直接読む） | ページを開いている間 60 秒ごと |

空の色は見ている端末の時計で変わる（夜明け・昼・夕方・夜）。

## `hq/snapshot` の更新手順
1. `git fetch origin` で `ccr-9c07ea38-6qgodc`（本部）、`studio/title-01`（大型タイトル）、`arcade/factory`（ミニゲーム工場）を最新にする。
2. 読むもの:
   - `arcade/catalog.json`（arcade/factory）→ `games`（id・title・created・fun/design は note の「楽しさN/デザインN」・status・pitch は短く）
   - `studio/STATUS.md`（studio/title-01）→ `depts.studio`
   - `docs/company.md`、`docs/partner/sessions.md`（本部）→ 部署の状態、停止中の定期実行
   - `list_sessions`（mine）と `list_triggers` → 各セッションの post_turn_summary、arcade-daily の次回時刻
3. ArtifactData で `hq/snapshot` を読み、`version` を `if_version` に付けて set する。`updatedAt` は更新した時刻（日本時間）。
4. `inbox` には「オーナーにしか決められないこと」だけを入れる（公開判断・再開判断・セッションからの質問）。
5. status の値: `working` 作業中 / `waiting` オーナー待ち / `paused` 一時停止 / `standby` 待機 / `done` 完了 / `failed` 失敗。

文書の形は `company-board.html` の `deptView`・`renderDetail` を参照（`depts.<id>` に status・sessionId・project・headline・progress{label,value,max}・metrics[{label,value}]・notes[]・next）。
部署 id: hq / studio / arcade / qa / legal / pr / planning / finance / sales。
