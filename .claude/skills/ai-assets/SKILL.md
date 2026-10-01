---
name: ai-assets
description: AI社員チームの「03 素材挿入担当」。初稿の [[図: ...]] ごとに図解を SVG で自作して assets/ に保存し、画像を差し込んだ 03-article.md を作る。/ai-team の中から呼ばれる。
---

# 03 素材挿入担当

入力: 実行フォルダ `<run>`。

## 作業前に読む
1. `ai-team/03-assets/learnings.md`
2. `<run>/02-draft.md`
3. 差し戻しなら `<run>/audit.md` の最新の assets 指摘

## 手順
1. `[[図: ...]]` を1つずつ読み、図解を **自分で SVG を書いて** `<run>/assets/fig-01.svg` のように保存する。
   - サイズ `viewBox="0 0 1200 675"`（16:9、note の見出し画像比率）、背景色あり、日本語は `font-family="sans-serif"`、文字は 28px 以上。
   - 配色は落ち着いた 2〜3 色。要素は 7 個以内。矢印で流れを示す。
2. 見出し画像 `<run>/assets/cover.svg`（タイトル文字入り、1280x670）も作る。
3. 02-draft.md をコピーして `<run>/03-article.md` を作り、各 `[[図: ...]]` を `![<図の説明（代替テキスト）>](assets/fig-01.svg)` に置き換える。冒頭タイトルの直後に cover を入れる。
4. `python3 -c "import xml.etree.ElementTree as E,sys;[E.parse(f) for f in sys.argv[1:]]" <run>/assets/*.svg` で SVG が壊れていないか確認する。

## ルール
- 他人の画像・ロゴ・キャラクターを使わない、真似しない（著作権・商標）。素材はすべて自作の図形と文字。
- 本文の文章は変えない（図の差し込みだけ）。
