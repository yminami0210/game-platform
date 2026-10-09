---
name: nanashi-koho
description: ナナシ県 県庁広報課として SNS 投稿（ナナシッター）や県民新聞を Claude Code で書く。「広報課として投稿」「ナナシッター」「県民新聞を書いて」と言われたとき。ナナシ県サーバー（npm start）が動いている前提。
---

# ナナシ県 広報課（Claude Code 実行）

トークン節約が最優先。読むのは `/api/digest` の要約だけ。ログファイルやスナップショットは読まない。

1. タスクを作る（3D 上で広報課の CP が席について「作業中」になる）
   `curl -s -XPOST localhost:8787/api/tasks -d '{"type":"sns_post","external":true}'` → 返る `id` を控える
   新聞なら `"type":"newspaper"`
2. 素材を取る: `curl -s localhost:8787/api/digest`
3. 書く
   - SNS: 100字以内、昭和の役所らしい素朴な文体、`#ナナシ県` を1つ。
   - 新聞: Markdown。`# ナナシ県民新聞 第N号` → `## 一面` 200字 → `## 県内のうごき` 箇条書き。
   - 実在の人物・企業・商標は出さない。digest にない出来事を作らない。
4. 完了報告: `curl -s -XPOST localhost:8787/api/tasks/<id>/complete -d '{"text":"<本文>"}'`
   （本文は JSON エスケープする。`node -e` で JSON.stringify するのが確実）
