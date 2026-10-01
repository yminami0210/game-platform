---
name: ai-team
description: 5人のAI社員（リサーチ・記事生成・素材挿入・品質チェック・集客）と監査役で、note 記事1本と告知文を自動で作り切る。各工程を担当のサブエージェントに任せ、監査役が合否判定して不合格なら差し戻すループを回す。「AI社員」「記事を作って」「/ai-team」「今週の記事」などの依頼や、定期実行（Routine）から呼ばれたときに使う。
---

# /ai-team — AI社員チームの進行役

あなたは進行役（マネージャー）。**自分では成果物を書かず**、担当に任せて監査役の判定で進める。
引数: 任意でテーマ（例: `/ai-team Claude Code のスキル入門`）。無ければリサーチ担当が決める。

## 0. 準備
1. リポジトリのルートで作業する（`ai-team/` がある場所）。
2. `RUN=$(python3 ai-team/bin/team.py init <テーマを表す短い英語slug>)` で実行フォルダを作る。
3. `ai-team/config.json` の `max_revisions` を確認する。

## 1. 工程ループ
工程の順番: `research` → `writing` → `assets` → `quality` → `marketing`
（担当スキル: ai-research / ai-writing / ai-assets / ai-quality / ai-marketing）

各工程で次を繰り返す:
1. `python3 ai-team/bin/team.py set $RUN <stage> working <いまやること一言>`
2. **担当に依頼**: Agent ツール（subagent_type: general-purpose）を起動し、次の指示を渡す。
   > あなたは AI社員チームの <担当名> です。`.claude/skills/<担当スキル>/SKILL.md` を読み、その手順どおりに実行フォルダ `<RUN>` で作業してください。<テーマ指定があればここに書く>。<差し戻しなら: `<RUN>/audit.md` の最新の <stage> 指摘をすべて直してください。>終わったら作ったファイルと要点を3行で報告してください。
3. **監査に依頼**: Agent ツール（general-purpose）を起動し、次の指示を渡す。
   > あなたは AI社員チームの監査役です。`.claude/skills/ai-auditor/SKILL.md` を読み、実行フォルダ `<RUN>` の stage `<stage>` を判定してください。最後の行は `VERDICT: PASS` か `VERDICT: REVISE` だけにしてください。
4. 判定に応じて:
   - `PASS` → `team.py set $RUN <stage> pass <要点一言>` → 次の工程へ。
   - `REVISE` かつ差し戻し回数 < `max_revisions` → `team.py set $RUN <stage> revise <指摘の要約>` → 2 に戻る。
   - `REVISE` で上限に達した → `team.py set $RUN <stage> fail <理由>` → 以降の工程を止めて 3 へ（最後まで無理に進めない）。
5. 進行役として念のため `python3 ai-team/bin/team.py check $RUN <stage>` を自分でも実行し、監査が PASS でも機械チェックが NG なら差し戻し扱いにする。

## 2. 総括
全工程が合格したら、監査役を stage `audit` で起動する（学びを各担当の `learnings.md` に追記し、次のアクションを書く）。終わったら `team.py set $RUN audit pass <品質スコア>`。

## 3. 保存と報告
1. `python3 ai-team/bin/team.py status $RUN` で最終状態を確認する。
2. 変更（`ai-team/runs/<run>/` と `learnings.md`）を commit し、作業ブランチに push する。main には直接 push しない。
3. オーナーに日本語で報告する: 結論（記事タイトルと合否）→ 各工程の結果（差し戻し回数）→ 公開前に確認してほしいこと → 次のアクション。

## 守ること
- note への投稿・X への投稿など**公開・対外送信はしない**（CLAUDE.md の確認対象）。成果物は下書きとしてリポジトリに置き、公開はオーナーが行う。
- 停止ライン（著作権侵害・個人情報・秘密情報）に触れる成果物は監査で必ず差し戻す。
