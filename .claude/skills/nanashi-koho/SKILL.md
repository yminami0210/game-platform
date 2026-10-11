---
name: nanashi-koho
description: ナナシ県 県庁広報課として SNS 投稿（ナナシッター）や県民新聞を作る。「広報課として投稿」「ナナシッター」「県民新聞を書いて」と言われたとき。ナナシ県サーバー（npm start）が動いている前提。
---

# ナナシ県 広報課（考える＝Claude、書く＝OmniRoute、最終チェック＝Claude）

会社の「OmniRoute 運用設定」に従う（CLAUDE.md「ルーティン業務の分担」）。Claude は本文を自分で書かない。
読むのは `/api/digest` の要約だけ。ログファイルやスナップショットは読まない。作業フォルダは `data/koho/`（コミットしない）。

1. **タスクを作る**（3D 上で広報課の CP が席について「作業中（Claude Code）」になる）
   `curl -s -XPOST localhost:8787/api/tasks -d '{"type":"sns_post","external":true}'` → 返る `id` を控える。新聞なら `"type":"newspaper"`
2. **素材を取る**: `curl -s localhost:8787/api/digest`
3. **依頼文を作る**（Claude）: `data/koho/依頼/<id>.md` に、次をすべてそのまま書く（実行する AI はファイルを読めない）
   - digest の JSON（要約しない）
   - 作るもの:
     - SNS: 100字以内。昭和の役所らしい素朴な文体。`#ナナシ県` を1つ。
     - 新聞: Markdown。`# ナナシ県民新聞 第N号` → `## 一面` 200字 → `## 県内のうごき` 箇条書き。
   - 守ること: 架空の県。実在の人物・企業・商標は出さない。digest にない出来事は作らない。
   - 秘密情報（キー・個人情報）は入れない。
4. **書かせる**: `python3 tools/omni_task.py writer data/koho/依頼/<id>.md data/koho/出力/<id>.md`
5. **最終チェック**（Claude）: 次を確かめる。
   - digest と、数値・時刻・場所・人名が一致しているか
   - 勝手に足された出来事や設定がないか
   - 字数と、`#ナナシ県` が1つか
   - 実在の固有名詞がないか
   - 日本語として不自然でないか

   直すところがあれば、依頼文に直す点を足して手順4を1回やり直す。
6. **失敗したとき**: `omni_task.py` が「OmniRoute → Gemini」の順で自動で切り替える。それでも終了コード1なら、Claude が書く（代筆）。代筆した本文の末尾に `（Claude代筆：理由）` を付け、報告に件数を入れる。
7. **完了報告**: `node -e 'console.log(JSON.stringify({text:require("fs").readFileSync(process.argv[1],"utf8").trim()}))' data/koho/出力/<id>.md | curl -s -XPOST localhost:8787/api/tasks/<id>/complete -d @-`
