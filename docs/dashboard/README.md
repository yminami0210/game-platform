# ゲーム会社 進捗ボード

- ページ: https://claude.ai/artifact/BArpv3QytwtskyYzC9EFiC （オーナーのみ閲覧可・非公開）
- ソース: `company-board.html`（同じ URL に再公開するときは Artifact ツールに `url` を渡す）

## 仕組み
| 表示 | データ元 | 更新 |
|---|---|---|
| 判断待ち・部署の状況・ミニゲーム棚 | ページの db の 1 文書 `hq/snapshot` | 相棒が毎朝更新（下の手順） |
| 箱庭のロボの動き（作業中・返事待ち） | Claude Code Remote コネクタの `list_sessions`（閲覧者の権限で直接読む） | ページを開いている間 60 秒ごと |

| 指示を出す | 指示文をクリップボードにコピーし、担当セッション（claude.ai/code/<id>）を開く。送信はオーナーが貼り付けて行う | 「コピーしてセッションを開く」を押すだけ（確認の段階は無し） |
| 指示の履歴 | ページの db の `orders`（新しい順に10件） | 「コピーしてセッションを開く」を押したときにページが記録（実際に送ったかは記録しない） |

ページから `send_message` で直接送る方式は、claude.ai 側の方針で止められている（blocked_by_policy。Claude Code Remote は組み込みコネクタで、ユーザー側で許可を変える画面が無い）。止められた送信を別の経路で中継する仕組みは作らない。

空の色は見ている端末の時計で変わる（夜明け・昼・夕方・夜）。

## 指示の送り先
- 担当セッションがある部署（本部・大型タイトル・ミニゲーム工場）は、そのセッションへ直接送る。
- 担当セッションが無い部署（品質保証・法務・広報・経営企画・経理・営業）は、本部セッションへ「宛先: ○○」付きで送り、本部が対応・振り分けする。
- 送る文には先頭に「【進捗ボードからの指示（オーナー）】」が付く。受けたセッションは CLAUDE.md の権限区分と停止ラインに従って動く（ボードからの指示でも停止ラインは越えない）。
- 判断待ちの項目のボタン（`inbox[].actions`）と、部署ごとの定型ボタン（`depts.<id>.quick`）は、指示文を入力欄に入れるだけ。送るのはオーナーが確認してから。

## `hq/snapshot` の更新手順
1. `git fetch origin` で `ccr-9c07ea38-6qgodc`（本部）、`studio/title-01`（大型タイトル）、`arcade/factory`（ミニゲーム工場）を最新にする。
2. 読むもの:
   - `arcade/catalog.json`（arcade/factory）→ `games`（id・title・created・fun/design は note の「楽しさN/デザインN」・status・pitch は短く）
   - `studio/STATUS.md`（studio/title-01）→ `depts.studio`
   - `docs/company.md`、`docs/partner/sessions.md`（本部）→ 部署の状態、停止中の定期実行
   - `list_sessions`（mine）と `list_triggers` → 各セッションの post_turn_summary、arcade-daily の次回時刻
3. ArtifactData で `hq/snapshot` を読み、`version` を `if_version` に付けて set する。`updatedAt` は更新した時刻（日本時間）。
4. `inbox` には「オーナーにしか決められないこと」だけを入れる（公開判断・再開判断・セッションからの質問）。各項目に送り先の `deptId` と、答えの候補 `actions: [{label, text}]` を付ける。部署の `quick` は消さずに引き継ぐ。担当セッションが動けば片付く項目（質問への返事・再開など）には `clearOnActive: true` を付ける。
6. ページ側の自動補正: 朝の記録（`updatedAt`）より後に (a) 判断待ちの答えと同じ文の指示が `orders` に入る、または (b) `clearOnActive` の項目で担当セッションが返事待ち以外の状態で動くと、その項目は「対応済み」に移る。部署の説明文も、記録より新しいライブの動きと指示があればそちらを優先して表示する。
5. status の値: `working` 作業中 / `waiting` オーナー待ち / `paused` 一時停止 / `standby` 待機 / `done` 完了 / `failed` 失敗。

文書の形は `company-board.html` の `deptView`・`renderDetail` を参照（`depts.<id>` に status・sessionId・project・headline・progress{label,value,max}・metrics[{label,value}]・notes[]・next）。
部署 id: hq / studio / arcade / qa / legal / pr / planning / finance / sales。
