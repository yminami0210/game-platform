# AI社員チーム

5人のAI社員と監査役が、note 記事1本（図解つき）と X の告知文を自動で作る仕組み。
参考にした「自動化の3ステップ」をそのまま形にしている。

| ステップ | このリポジトリでの形 |
|---|---|
| ① 担当ごとにフォルダを作る | `ai-team/01-research` 〜 `05-marketing`、`00-auditor`（各担当の机。`learnings.md` に仕事のコツが溜まる） |
| ② 専用スキルの作成 | `.claude/skills/ai-research` / `ai-writing` / `ai-assets` / `ai-quality` / `ai-marketing` / `ai-auditor` |
| ③ ループ化 | `/ai-team` が 担当 → 監査役 → 合格なら次へ／不合格なら差し戻し を回す。最後に監査役が学びを各担当の `learnings.md` に書き足すので、回すほど品質が上がる。定期実行は Routine（毎週） |

## 流れ

```
01 リサーチ → 02 記事生成 → 03 素材挿入 → 04 品質チェック → 05 集客
     ↑↓            ↑↓             ↑↓             ↑↓            ↑↓
                   00 監査役（各工程を合否判定・差し戻し）
                              ↓
          総括: 品質スコア・次のアクション・各担当の learnings.md 更新
```

## 使い方
- 手動: Claude Code で `/ai-team`（テーマ指定は `/ai-team Claude Code のスキル入門` のように）
- 自動: 毎週月曜 9:00 前（日本時間）に Routine が新しいセッションで `/ai-team` を実行し、結果をブランチ `ai-team/weekly` に push する
- 進行状況（オフィスの様子）: `python3 ai-team/bin/team.py status`
- 図を PNG に書き出す: `python3 ai-team/bin/team.py preview ai-team/runs/<run>`

## 成果物（`ai-team/runs/<日付>-<slug>/`）
| ファイル | 担当 |
|---|---|
| `01-research.md` | リサーチ（テーマ・読者・要点・出典） |
| `02-draft.md` | 記事生成（初稿、図の差し込み指示つき） |
| `03-article.md`, `assets/*.svg`, `png/*.png` | 素材挿入（自作の図解と見出し画像。note には png/ を上げる） |
| `04-quality.md`, **`final.md`** | 品質チェック（完成稿） |
| **`05-promo.md`** | 集客（X 告知文 3 パターン・タグ・投稿タイミング） |
| `audit.md`, `status.json` | 監査記録と進行状況 |

**公開はしない**: note・X への投稿は対外的な操作なので、`final.md` と `05-promo.md` を確認してオーナーが行う。

## 設定
`config.json` でジャンル・読者・トーン・文字数・禁止表現・差し戻し上限を変えられる。

## テスト
`python3 -m unittest discover -s ai-team/tests`
