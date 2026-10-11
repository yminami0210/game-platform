# OmniRoute でルーティン業務を回す

ルーティン業務は **考えるのは Claude、実行するのは OmniRoute、最終チェックは Claude**（CLAUDE.md §9）。
設定の正本は Artifact「OmniRoute 運用設定」（https://claude.ai/artifact/9xmFA9SxMfJgCnP96bVVoL）。このページは、このリポジトリでの使い方をまとめたもの。

## 仕組み
| 役割 | モデル（`tools/omni_models.json`） | やること |
|---|---|---|
| writer | gemini/gemini-3.8-flash | 下書き・書き直し・ゲーム本体（index.html）など、成果物の本文を書く |
| critic | gemini/gemini-3.7-flash | 1次点検。writer と別のモデル |
| clerk | gemini/gemini-3.6-flash | 集計・表へのとりまとめ・meta.json などの事務 |

呼び出し: `python3 tools/omni_task.py <役割> <依頼ファイル> <出力ファイル>`（使えるかの確認は `--check`）。
失敗したときの順番: OmniRoute（同じモデルで2回）→ Gemini（`tools/gemini_draft.py`）→ Claude 代筆（成果物と報告に明記）。

## どこで動かすか（大事）
OmniRoute はオーナーの Mac の中（127.0.0.1:20128）だけで動く。**クラウドの Claude Code セッションからは届かない。**
そのため、ルーティンは Mac の Claude Code で動かす。クラウドで動いた回は `--check` が失敗し、その回は全部 Claude が行う（報告に「OmniRoute 不在」と書く）。

### Mac で動かす手順（オーナーが1回だけ行う）
1. Mac に OmniRoute を用意する（下の「環境の準備」。ナナシ県で用意済みなら不要）
2. Mac でこのリポジトリを clone し、ミニゲーム工場のブランチにする: `git clone https://github.com/yminami0210/game-platform && cd game-platform && git checkout arcade/factory`
3. 予備の Gemini を使うなら、ナナシ県の `tools/gemini_draft.py` をこのリポジトリの `tools/` に置く（無くても動く。そのときは OmniRoute が失敗した工程を Claude が代筆する）
4. そのフォルダで `claude remote-control` を起動する（Claude Code アプリにセッションとして出てくる）。または Claude Desktop アプリでそのフォルダを開く
5. 起動したら AI相棒に伝える。毎朝の「今日の1本」の定期実行（arcade-daily、いまは停止中）の送り先を、その Mac のセッションに切り替える

## 環境の準備（Mac 1台につき1回。正本の Artifact と同じ）
1. Node.js 24: `brew install node@24`（PATH に `/opt/homebrew/opt/node@24/bin`）
2. OmniRoute: `npm install -g --allow-scripts=omniroute,keytar,onnxruntime-node,@parcel/watcher,@swc/core,protobufjs,esbuild omniroute`
3. `~/.omniroute/.env` に `OMNIROUTE_SERVER_HOST=127.0.0.1`（この Mac からだけ接続）
4. AI サービスの登録: `omniroute providers add <provider>`（キーを聞かれる）。JSON で一括取り込みした場合は、キーを書いた JSON を消す
5. 確認: `omniroute providers test-all`、続けてこのリポジトリで `python3 tools/omni_task.py --check`

## ルーティンごとの当てはめ
| ルーティン | OmniRoute に回すもの | Claude が行うもの |
|---|---|---|
| ミニゲーム工場（`/arcade-make`） | 企画書・デザイン案・ゲーム本体を書く（writer）、企画とコードの1次点検（critic）、meta.json と learnings.md の整理（clerk） | 依頼文づくり、見本画像のスクショ、自動QA、スクショを見ての確認、監査、判定、commit |
| 進捗ボードの毎朝更新 | 回さない（ブランチとセッションを読むのが仕事の大半で、書く量が少ない） | すべて |

## 新しいルーティンに当てはめる手順
1. その業務を「考える（何をどう頼むか・判断）」と「実行する（書く・まとめる・点検する）」に分ける
2. 実行の部分に役割（writer / critic / clerk）を割り当てる。合わなければ `tools/omni_models.json` に新しい役割を足す
3. スキルの手順に、依頼文の置き場所（`<作業フォルダ>/依頼/<名前>.md`）と呼び出しを書く
4. Claude の最終チェックで見る点（数値・日付・固有名詞の一致、勝手に足された設定、不自然な日本語）を書く
5. 失敗時の扱い（上の順番）をそのまま書き写す
6. ブラウザ操作・スクショの確認・画像生成・正本の書き換えは Claude が行う

## 守ること
- 依頼文に秘密情報（API キー、パスワード、個人情報）を入れない。送った内容が学習に使われる無料枠も使ってよい（2026-10-11 オーナー判断）
- DeepSeek は使わない（データが中国のサーバーに保存されるため。2026-10-11 オーナー判断）
