# Gemini連携仕様（Geminiで考える → Claudeで実行・点検）

別のプロジェクトでも同じ分担にするための仕様。新しい環境のClaude Codeにこのファイルを渡し、「この仕様どおりに組んで」と頼めば再現できるように書いてある。

## 1. 分担

| 役割 | 担当 | 内容 |
|---|---|---|
| 考える・書く | Gemini（Google AI Pro） | 企画案、計画、下書き、文章の中身、差し戻し後の書き直し |
| 実行する | Claude（Claude Code） | 資料を読む、Geminiへの依頼文を作る、Geminiを呼ぶ、ファイルを置く、スクリプトを動かす |
| 点検する | Claude | 事実・数値・日付の確認、ルール違反の点検、合格／差し戻しの判断（最終チェック） |
| 決める | 人間 | 承認、公開の判断 |

原則：

- Claudeは中身を自分で書き直さない。直してよいのは形式（見出し、番号、表の体裁）だけ。中身に問題があれば理由と直し方を添えてGeminiに書き直させる
- Geminiにはファイルを読ませない・書かせない。必要な資料はClaudeが依頼文に全部貼る
- どのモデルで何を書いたかを必ず記録に残す

## 2. 仕組み

```
Claude Code
  ├─ 資料を読む（ルール、手本、データ）
  ├─ 依頼文を書く ──→ <作業フォルダ>/依頼/<名前>.md
  ├─ python3 tools/gemini_draft.py 依頼/<名前>.md <出力>.md
  │        └─ agy -p "<依頼文>" --model gemini-3.1-pro-high --mode plan --output-format json
  │             （空の一時フォルダで実行。Google AI Proのログインを使う）
  ├─ 出力を受け取る ──→ <出力>.md ＋ 生成記録.md に1行追記
  └─ 点検する ──→ 合格 / 差し戻し（依頼文に理由を足して再度Geminiへ。3回まで）
```

## 3. 環境の準備（macOS、1台につき1回）

### 3-1. Antigravity CLI（agy）

Google AI ProのGeminiを外部から呼べる公式の手段。

```
curl -fsSL https://antigravity.google/cli/install.sh | bash
```

- `~/.local/bin/agy` に入る。インストーラーが `~/.zshrc` と `~/.zprofile` にPATHを書き足すので、表示される `echo 'export PATH=...'` は実行しない（二重になる）
- 新しいターミナルを開くか `source ~/.zshrc` してから `agy` を起動し、「1. Google OAuth」でGoogle AI Proのアカウントにログインする。「Use a Google Cloud project」は選ばない（Cloud課金側になる）
- 初回は色の設定などが出るので Enter で進め、終わったら閉じる
- 確認：`~/.local/bin/agy models` でモデル一覧が出ればログインできている

### 3-2. 使わないもの（理由つき）

| 候補 | 使わない理由 |
|---|---|
| Gemini CLI（@google/gemini-cli） | 2026年6月18日にGoogle AI Pro・個人アカウントへの提供が終了。ログインしても `This client is no longer supported for Gemini Code Assist for individuals` で止まる |
| Gemini API キー（AI Studio） | Google AI Proの契約とは別課金。無料枠は送った内容がGoogleの改善に使われ、人が読むこともある（日本から使う場合） |
| OmniRoute などのAI中継ソフト | 無料枠を束ねるのが主目的で、未発表の内容を扱う用途と合わない。Gemini 1つだけなら間に挟む利点がない |

## 4. 呼び出しスクリプト tools/gemini_draft.py

本リポジトリの `tools/gemini_draft.py` がそのもの。新しいプロジェクトの `tools/` にそのまま置く。

agy の出力（`--output-format json`）の形：

```json
{"conversation_id": "...", "status": "SUCCESS", "response": "本文", "duration_seconds": 3.9, "num_turns": 1,
 "usage": {"input_tokens": 12146, "output_tokens": 152, "thinking_tokens": 151, "total_tokens": 12298}}
```

## 5. 依頼文の書き方（Claudeが守ること）

- 置き場所：`<作業フォルダ>/依頼/<出力ファイル名>.md`。書き直しは `<名前>_<回数>回目.md`
- それだけで完結させる。Geminiは何も知らない前提で、次を「要約せずそのまま」貼る
  - 守るルール（文体、禁止事項、トーン）
  - 手本（良い例）とNG例
  - 過去に人間が✕にした理由の蓄積（あれば）
  - 今回使うデータ（日付、数値、固有名詞）
  - 作る物の指示と、出力の形式（見出し、番号、字数）
- 書き直しの依頼には、元の依頼文＋前回の下書き＋点検の「理由」「直し方」を入れる
- 秘密情報（パスワード、APIキー、個人情報）は入れない

## 6. 点検（Claudeの最終チェック）

通常の点検項目に加えて、Geminiの出力に多い癖を見る：

- 依頼文にない設定・人物・事実を勝手に足していないか
- 数値・日付・固有名詞が依頼文のデータと一致しているか（曜日は `date` で確かめる）
- 翻訳調、カタカナ語の多用、「！」や定型の挨拶で始まる宣伝口調になっていないか
- 前置き（「はい、承知しました」等）や後書きが混ざっていないか → 形式の範囲なのでClaudeが削ってよい

判定は「合格／差し戻し／要判断（人間に回す）」。差し戻しは3回まで。3回で通らなければ最後の版と点検記録をつけて人間に回す。

## 7. Geminiが使えないとき

`gemini_draft.py` がエラーで止まったら（ログイン切れ、利用上限、通信エラー）：

1. 1回だけやり直す
2. それでもだめならClaudeが代わりに書き、ファイルの最後に「Claude代筆（理由）」と書き、人間への報告に件数を入れる
3. ログイン切れは人間に `agy` を起動して再ログインしてもらう（Claudeはログインできない）

止めずに進むか、その場で止めるかはプロジェクトごとに決めて、CLAUDE.mdに書く。（本リポジトリは「止めずに進む」。CLAUDE.md §5）

## 8. 新しいプロジェクトのCLAUDE.mdに足す文

```
## 文章生成の環境（Gemini）
- 考える・書く部分（企画、下書き、書き直し）はGemini（Google AI Pro）が担当し、Claudeは依頼文づくり、実行、最終チェックを行う
- Antigravity CLI（`~/.local/bin/agy`）をGoogle AI Proのアカウントでログインして使う。Gemini CLIはGoogle AI Proでは使えない
- 呼び出しは `tools/gemini_draft.py <依頼ファイル> <出力ファイル>` から行う。既定のモデルは `gemini-3.1-pro-high`（一覧は `agy models`）。使ったモデルは出力と同じフォルダの `生成記録.md` に残る
- Geminiはプロジェクトのファイルを読めないので、依頼文（`依頼/`）に必要な資料を全部そのまま貼る
- Claudeは中身を書き直さない。直すのは形式だけ。中身の問題は理由を添えてGeminiに書き直させる（3回まで）
- Geminiが使えないときはClaudeが代筆し、そのことを出力と報告に残す
```

## 9. 確認手順（組み終わったら）

```
~/.local/bin/agy models
```
→ 一覧が出ればログインOK。

```
mkdir -p /tmp/gtest && echo "「テスト」とだけ返してください。" > /tmp/gtest/依頼.md && python3 tools/gemini_draft.py /tmp/gtest/依頼.md /tmp/gtest/出力.md && cat /tmp/gtest/出力.md /tmp/gtest/生成記録.md
```
→ 「テスト」と、生成記録の1行が出れば完成（15秒前後）。

## 10. 未確認の点

- Google AI ProでAntigravityを使ったとき、送った内容が学習に使われるかどうかは公式ページで確認できていない（2026-10-05時点）。未発表の内容を送る前に、Antigravityの設定とGoogleのプライバシー設定を確認する
- agy のモデル名は更新で変わる。動かなくなったら `agy models` で確かめて `DEFAULT_MODEL` を直す
