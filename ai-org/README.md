# AI社員組織（ai-org）

SNS 発信用の「AI社員チーム」（`ai-team/`）の仕組みを、一般的な株式会社の部署に広げたもの。
**どの部署も同じ型**で動く: 担当（AI社員）が下書き → 監査役が合否判定 → 不合格なら差し戻し → 最後に「人間の承認が必要なこと」をまとめる。

- 採用の考え方と、どの AI社員を雇ったか: [`docs/hiring-plan.md`](docs/hiring-plan.md)
- 調査（国内事例・海外事例・設計原則）: [`docs/research/`](docs/research/)

## 組織図

```
                      オーナー（承認・送信・意思決定）
                                 │
          進行役 /ai-org ── 監査役 /org-auditor ── 人事 /org-hire（AI社員の採用）
                                 │
 ┌────────────┬────────────┬──────────────┬────────────┬────────────┬─────────────┐
 経営企画部     営業部        カスタマーサポート部  法務部        経理部        広報部（ai-team/）
 市場調査       顧客リサーチ   一次対応（振り分け）  契約審査      突合チェック   リサーチ〜集客
 → レポート     → 提案書       → 回答作成          → 修正案      → 仕訳・支払準備  （5担当）
```

| 部署 | 依頼の例 | 最終成果物 | 人間に残すこと |
|---|---|---|---|
| 経営企画部 `planning` | 新機能を入れるべきかの判断材料 | `02-report.md` | 意思決定 |
| 営業部 `sales` | 初回商談の準備と提案書 | `02-proposal.md` | 価格の決定、送付 |
| カスタマーサポート部 `support` | 問い合わせへの対応 | `02-reply.md` | 送信、返金・補償の決定 |
| 法務部 `legal` | 契約書の一次審査 | `02-redline.md` | 締結の判断、高リスク条項の確認 |
| 経理部 `finance` | 請求書チェックと支払準備 | `02-entry.md` | 支払いの実行、会計システムへの登録 |

## 使い方
- 依頼する: `/ai-org <部署> <依頼内容>`（例: `/ai-org legal この契約書を見て`）
- 試運転（架空のデータ）: `/ai-org support ai-org/departments/support/samples/request.md`
- オフィスの様子: `python3 ai-org/bin/org.py office`（1件の詳細は `status <run>`）
- 部署と担当の一覧: `python3 ai-org/bin/org.py list`
- AI社員を増やす: `/org-hire <任せたい業務>`（採用基準で点数をつけ、team.json とスキルを作る）

## 仕組み
| ステップ | 形 |
|---|---|
| ① 担当ごとにフォルダ | `departments/<部署>/`（team.json・README・learnings.md・samples/） |
| ② 専用スキル | `.claude/skills/org-<部署>-<役割>/SKILL.md`（10本）＋共通の `ai-org` / `org-auditor` / `org-hire` |
| ③ ループ化 | `bin/org.py` が team.json の定義どおりに機械チェック・進行管理。監査役の学びが learnings.md に溜まる |

成果物は `runs/<日付>-<部署>-<slug>/` に溜まる。**すべて下書き**で、送信・支払い・契約などはオーナー（人間）が行う。

## テスト
`python3 -m unittest discover -s ai-org/tests` と `python3 ai-org/bin/org.py validate`
