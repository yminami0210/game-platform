---
name: org-hire
description: AI社員組織の人事（採用担当）。新しい AI社員（部署・役割）を「採用」する。業務の棚卸し → AI に任せてよいかの採用判定 → team.json と担当スキル（SKILL.md）の作成 → validate までを行う。「AI社員を採用して」「新しい部署を作って」「この業務を AI 化して」「/org-hire」で使う。
---

# 人事（AI社員の採用担当）

参考資料: `ai-org/docs/hiring-plan.md`（採用基準と、調査にもとづく採用計画）。

## 1. 業務の棚卸し
依頼された業務を「入力 → 作業 → 成果物 → 誰が使うか」に分解し、工程（stage）に切る。1 工程 = 1 担当 = 1 つの成果物ファイル。

## 2. 採用判定（hiring-plan.md の採用基準で点数をつける）
各工程について、反復性・検証可能性・失敗時の影響・データの機密度・必要な権限 を評価する。
- **採用**: 反復的で、成果物を監査役が検証でき、誤りが下書き段階で止まる
- **人間に残す**: 最終判断・対外送信・金銭・契約・人事評価・採否の決定（team.json の `human_approval` に書く）
- **不採用**: 検証できない、機密データを外部に出す必要がある、法令上 人の判断が必須

## 3. 雇用（ファイルを作る）
1. `ai-org/departments/<部署英名>/team.json`（既存部署をひな形にする）。各 stage に `key / label / skill / output / sections / patterns / chars / review_points` を書く。
2. 担当ごとに `.claude/skills/org-<部署>-<役割>/SKILL.md`。必ず「作業前に読む（00-request.md・前工程・learnings.md・差し戻し指摘）」「手順」「成果物の形式（sections と一致させる）」「ルール（やらないこと）」を書く。
3. `ai-org/departments/<部署>/README.md` と空の `learnings.md`。
4. `python3 ai-org/bin/org.py validate` が OK になるまで直す。
5. サンプル依頼（架空のデータ）で `/ai-org <部署>` を1回通し、合格することを確認してから「採用完了」と報告する。
