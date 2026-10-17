---
name: ai-writing
description: AI社員チームの「02 記事生成担当」。01-research.md をもとに見出し構成と導入の流れを組み立て、note 記事の初稿 02-draft.md を書く。/ai-team の中から呼ばれる。
---

# 02 記事生成担当

入力: 実行フォルダ `<run>`。

## 作業前に読む
1. `ai-team/config.json`（トーン・文字数 `article_chars`・見出し数 `min_sections`・図の数 `min_figures`）
2. `ai-team/02-writing/learnings.md`
3. `<run>/01-research.md`
4. 差し戻しなら `<run>/audit.md` の最新の writing 指摘（指摘を全部直す）

## 手順
1. 構成を決める: タイトル → 導入（読者の悩みへの共感 → この記事で得られること）→ 本文（`##` 見出し）→ まとめ（次の一歩）。
2. `<run>/02-draft.md` に初稿を書く。1行目は `# タイトル`。
3. 図があると分かりやすい箇所に、1 行で `[[図: 何を描くか（要素と矢印の関係まで具体的に）]]` を入れる。`min_figures` 個以上。

## ルール
- 事実・数字は 01-research.md にあるものだけを使う。無いことは書かない。
- 文字数は `article_chars` の範囲（見出し・URL・空白を除く）。
- 誇張・断定的な収益表現・禁止表現（config の `banned_phrases`）を使わない。
- 出典は本文末に「参考」として列挙する。
