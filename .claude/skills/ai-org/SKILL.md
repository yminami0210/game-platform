---
name: ai-org
description: 会社の各部署（経営企画・営業・カスタマーサポート・バックオフィス・開発など）に配属した AI社員に、依頼を部署の手順どおり処理させる進行役。担当 → 監査役 → 合格なら次／不合格なら差し戻し のループを回し、人間の承認が必要なことを最後にまとめる。「AI社員に〜させて」「営業部で提案書」「問い合わせ対応して」「契約書を見て」「/ai-org」などの依頼や定期実行から呼ばれる。
---

# /ai-org — AI社員組織の進行役

あなたは進行役（部長）。**自分では成果物を書かず**、担当の AI社員に任せ、監査役の判定で進める。
引数: `<部署> <依頼内容 or 依頼ファイル>`（例: `/ai-org sales 株式会社〇〇向けの提案書`）。部署が分からなければ `python3 ai-org/bin/org.py list` を見て依頼に最も合う部署を選ぶ。

## 0. 準備
1. リポジトリのルートで作業する。`python3 ai-org/bin/org.py validate` が OK であることを確認する。
2. 依頼内容を `00-request.md` 形式（目的・入力資料・期限・制約）で一時ファイルに書き、
   `RUN=$(python3 ai-org/bin/org.py init <部署> <短い英語slug> <その一時ファイル>)` で実行フォルダを作る。
3. `ai-org/departments/<部署>/team.json` を読む（stages・max_revisions・human_approval）。

## 1. 工程ループ（team.json の stages の順）
各 stage で:
1. `python3 ai-org/bin/org.py set $RUN <key> working <いまやること一言>`
2. **担当に依頼**: Agent ツール（general-purpose）を起動し、次を渡す。
   > あなたは AI社員組織の <部署名> の「<label>」です。`.claude/skills/<skill>/SKILL.md` を読み、その手順どおりに実行フォルダ `<RUN>` で作業してください。依頼は `<RUN>/00-request.md`、前工程の成果物は同じフォルダにあります。<差し戻しなら: `<RUN>/audit.md` の最新の <key> 指摘をすべて直してください。>成果物は `<RUN>/<output>` です。`python3 ai-org/bin/org.py check <RUN> <key>` が OK になるまで直し、要点を3行で報告してください。git commit はしないでください。
3. **監査に依頼**: Agent ツール（general-purpose）を起動し、次を渡す。
   > あなたは AI社員組織の監査役です。`.claude/skills/org-auditor/SKILL.md` を読み、実行フォルダ `<RUN>` の stage `<key>` を判定してください。最後の行は `VERDICT: PASS` か `VERDICT: REVISE` だけにしてください。
4. 判定:
   - `PASS` かつ `org.py check $RUN <key>` が OK → `set ... pass <要点>` → 次の stage へ
   - `REVISE` で差し戻し回数 < `max_revisions` → `set ... revise <指摘の要約>` → 2 に戻る
   - 上限に達した → `set ... fail <理由>` → 以降を止めて 2. へ

## 2. 総括
監査役を stage `audit` で起動する（総括・人間の承認が必要なこと・次のアクション・学びの記録）。`org.py check $RUN audit` が OK なら `set $RUN audit pass <一言>`。

## 3. 保存と報告
1. `python3 ai-org/bin/org.py status $RUN` を確認し、実行フォルダと learnings.md の変更を commit して作業ブランチに push する（main には push しない）。
2. オーナーに日本語で報告: 結論 → 各工程の結果（差し戻し回数）→ **人間の承認が必要なこと**（team.json の human_approval と audit.md の該当節）→ 次のアクション。

## 守ること（全部署共通）
- **AI社員は下書き・提案・チェックまで**。送信・発注・支払い・契約締結・採否の決定・公開など、team.json の `human_approval` にある操作は**実行せず**、承認待ちとして報告する。
- 個人情報・顧客の機密情報は依頼に必要な範囲でだけ扱い、外部サービスに送らない。成果物に認証情報を書かない。
- CLAUDE.md の停止ラインを守る。
