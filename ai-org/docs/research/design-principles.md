# AIエージェントを「部門・役割ごとの社員」として組織化するための設計原則（一次情報調査）

調査日: 2026-10-01

## 0. 調査の前提と確認状況

この環境はネットワークの外向き通信が制限されており、開けたのは anthropic.com・claude.com・code.claude.com・raw.githubusercontent.com だけでした。次のサイトは WebFetch が `EGRESS_BLOCKED` になり、**本文を開けていません**。

- openai.com / cdn.openai.com / openai.github.io
- learn.microsoft.com / techcommunity.microsoft.com
- docs.cloud.google.com / developers.googleblog.com / google.github.io
- meti.go.jp / soumu.go.jp / ppc.go.jp / bunka.go.jp / aisi.go.jp / digital.go.jp / ipa.go.jp / current.ndl.go.jp / nist.gov

確認状況の表記:
- **【確認済】** WebFetch で本文を開いて内容を確かめたもの。
- **【未確認】** 検索結果の題名・要約でしか見ていないもの。設計の根拠にする前に、原文を必ず確認してください。

Microsoft と Google の一部は、公式ドキュメントのソースリポジトリ（GitHub 上の Markdown）で本文を確認しました。各項目に記載しています。

---

## 1. 出典ごとの要点

### 1-1. Anthropic（すべて【確認済】）

| 資料 | 要点 |
|---|---|
| Building effective agents（2024-12-19）<br>https://www.anthropic.com/engineering/building-effective-agents | - **オーケストレーター・ワーカー型**: 中央の LLM がタスクを動的に分解し、ワーカー LLM に割り振る。「必要なサブタスクを事前に予測できない複雑なタスク」向き。<br>- **評価者・最適化者型**: 1つの LLM が出力を作り、別の LLM が評価して返す。「評価基準が明確で、反復で測れる改善がある」ときに効く。<br>- 最初は単純に作る（"Start with simple prompts..."）。エージェントは「コストが上がり、誤りが積み重なる」おそれがある。<br>- 人間の関与: 「チェックポイントや行き詰まりで人間のフィードバックを待つ」。<br>- 対策: サンドボックスでの十分なテストと、適切なガードレール。<br>- 実装の3原則: 単純さ、透明性（計画の手順を見せる）、ツール（ACI）の丁寧な設計。<br>- 向いている業務の例: カスタマーサポート（解決したかどうかを測れる）、コーディング（「自動テストで検証できる」「品質を客観的に測れる」）。 |
| How we built our multi-agent research system（2025-06-13）<br>https://www.anthropic.com/engineering/multi-agent-research-system | - リードエージェントが戦略を立て、サブエージェントを並列に起動する。<br>- 委任時に伝える4点: **目的、出力形式、使うツールの指針、タスクの境界**。指示があいまいだと作業が重複した。<br>- 作業量は難しさに合わせる（単純な事実確認ならエージェント1つでツール呼び出し3〜10回）。<br>- トークン消費はチャットの約4倍、マルチエージェントでは約15倍。価値の高いタスクでないと割に合わない。<br>- 全員で文脈を共有する必要がある作業や、依存関係が強い作業（多くのコーディング）には向かない。<br>- 評価: LLM による採点（事実の正確さ、引用の正確さ、網羅性、情報源の質、ツール効率）に加え、人間による評価（自動評価で見落とすケースを見つける）。 |
| Writing effective tools for agents（2025-09-11）<br>https://www.anthropic.com/engineering/writing-tools-for-agents | - 「ツールは多ければよいわけではない」。重要な業務に絞る。<br>- 名前空間（共通の接頭辞）で責任範囲を区切る。<br>- 返すのは判断に必要な情報だけにする。ツールの説明は新人に教えるつもりで書く。 |
| Our framework for developing safe and trustworthy agents（2025-08-04）<br>https://www.anthropic.com/news/our-framework-for-developing-safe-and-trustworthy-agents | - 自律性を持たせつつ、重要な判断は人間が握る。例として Claude Code は既定で読み取り専用で、変更の前に承認を求める。<br>- 透明性、価値観との整合（目的が合っていても「適切に動くための文脈が足りない」ことがある）、プライバシー（MCP でツールとデータへのアクセスを制御）、悪用への対策（プロンプトインジェクション）。 |
| Building agents with the Claude Agent SDK（2025-09-29）<br>https://claude.com/blog/building-agents-with-the-claude-agent-sdk | - 基本ループは「文脈を集める → 実行する → 結果を検証する → 繰り返す」。<br>- サブエージェントは並列化と文脈の分離に使い、要点だけを返させる。<br>- 検証の方法: ルールによる検証（「明確なルールを示し、どれに違反したかと理由を返すのが最良」）、画面などの目視確認、LLM による判定（あいまいな基準向け。頑健さは落ちる）。 |
| Claude Code: Subagents<br>https://code.claude.com/docs/en/sub-agents | - 各サブエージェントは独立した文脈・専用のシステムプロンプト・ツール・権限を持つ。<br>- `tools`（許可リスト）と `disallowedTools`（拒否リスト）でツールを絞れる。`permissionMode` も設定できる。<br>- ベストプラクティス: 「1つのタスクに特化させる」「必要なツールだけ渡す（調査役は Read, Grep, Glob など読み取りのみ）」「単一責務にする」「委任の判断材料になる説明を書く」。<br>- 使い分け: 出力が長い作業・ツールを制限したい作業・要約を返せる独立した作業はサブエージェントに任せる。頻繁なやり取りが要る作業はメインの会話で行う。 |
| Claude Code: Skills<br>https://code.claude.com/docs/en/skills | - 本文は使うときだけ読み込まれる（段階的な読み込み）。<br>- `allowed-tools` で、そのスキルが動くターンだけツールを事前承認できる（次のメッセージで解除）。<br>- `disable-model-invocation: true` にすると人間が `/name` で呼んだときだけ動く。デプロイや破壊的な操作向き。<br>- `context: fork` と `agent` を指定すると、隔離したサブエージェントで実行する。 |
| Claude Code: Hooks<br>https://code.claude.com/docs/en/hooks | - `PreToolUse` でツール実行前に `allow` / `deny` / `ask` / `defer` を返せる。破壊的コマンドを止める例がある。<br>- 何も返さないことは許可を意味しない。<br>- セキュリティ: 「厳密なセキュリティ境界には、フックより権限ルールを優先する」「フックは最小権限で動かす」。 |
| Claude Code: Permissions<br>https://code.claude.com/docs/en/permissions | - ルールは「deny → ask → allow の順に評価され、最初に一致したものが結果になる」。<br>- 管理設定（managed settings）はユーザー・プロジェクトの設定で上書きできない。`disableBypassPermissionsMode` などで bypass や auto モードを禁止できる。 |
| Agent SDK: Configure permissions<br>https://code.claude.com/docs/en/agent-sdk/permissions | - 評価の順序: フック → deny ルール → ask ルール → 権限モード → allow ルール → `canUseTool` コールバック。<br>- deny ルールは `bypassPermissions` モードでも効く。<br>- 締め付けたエージェントにするなら `allowedTools` と `permissionMode: "dontAsk"` を組み合わせる。<br>- 注意: `allowedTools` は `bypassPermissions` を制限しない。<br>- サブエージェントには親の `bypassPermissions` が引き継がれ、「完全で自律的なシステムアクセス」を与えてしまう。<br>- 全呼び出しを確実に検査したい場合は `PreToolUse` フックを使う。 |

### 1-2. OpenAI / Google / Microsoft

| 資料 | 状況 | 要点 |
|---|---|---|
| OpenAI "A practical guide to building agents"<br>https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf | **【未確認】**（ブロック。検索要約のみ） | 検索要約によると: ガードレールを重ねて防御する（関連性の分類、安全性の分類、個人情報フィルタ、モデレーション、リスク評価付きのツール保護、ルールベースの保護、出力の検証）。人間に引き継ぐ条件は (1) 失敗の上限（再試行回数など）を超えたとき、(2) 取り消せない・影響の大きい操作（注文の取消、高額の返金、支払い）。原文で確認が必要。 |
| OpenAI Agents SDK: Guardrails（GitHub 上のドキュメント原稿）<br>https://raw.githubusercontent.com/openai/openai-agents-python/main/docs/guardrails.md | 【確認済】 | - 入力ガードレール（最初のエージェントの入力を検査）、出力ガードレール（最終出力を検査）、ツールガードレール（ツールを呼ぶたびに実行前後で検査。ユーザー承認の前後どちらでも動かせる）。<br>- トリップワイヤーが作動すると、その場で実行を止める。 |
| Google ADK: Safety and Security（GitHub 上のドキュメント原稿）<br>https://raw.githubusercontent.com/google/adk-docs/main/docs/safety/index.md | 【確認済】 | - Agent-Auth（サービスアカウントで動く）と User-Auth（OAuth で利用者本人の権限内でだけ動く）を使い分ける。<br>- ツール内に、モデルが覆せない決定的な制約を置く（例: アクセスできるテーブルを固定する）。<br>- コールバックやプラグインで呼び出し前に検証する。コードはサンドボックスで実行する。VPC Service Controls で情報の持ち出しを防ぐ。<br>- すべての土台は最小権限。 |
| Google Cloud "Choose a design pattern for your agentic AI system"<br>https://docs.cloud.google.com/architecture/choose-design-pattern-agentic-ai-system | **【未確認】**（ブロック） | 検索要約によると: 人間の介在（human-in-the-loop）を独立したパターンとして挙げる。決められたチェックポイントで処理を止め、人間の承認・修正を待つ。対象は取り消せない操作や影響の大きい操作（金融取引、本番環境へのデプロイ、機密データに基づく操作）。 |
| Microsoft Azure Architecture Center "AI agent orchestration patterns"（GitHub 上のソース）<br>https://raw.githubusercontent.com/MicrosoftDocs/architecture-center/main/docs/ai-ml/guide/ai-agent-design-patterns.md<br>（公開先: https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns ） | 【確認済】（ソースで確認） | - 「要件を確実に満たす中で、最も低い複雑さを使う」。段階が上がるごとに調整の手間・遅延・コストが増える。<br>- パターン: Sequential、Concurrent、Group Chat（作る役と確かめる役の maker-checker ループを含む）、Handoff、Magentic。<br>- 全エージェントに最小権限を適用し、各エージェントでアクセス範囲を絞る（security trimming）。<br>- 人間の入力が必要な地点を特定し、任意か必須かを決める。承認待ちの時点で状態を保存する。<br>- よくある失敗: 不要な調整の複雑さ、並列エージェント間で変更可能な状態を共有すること、文脈の肥大化。 |
| Microsoft Agent Framework: Human-in-the-loop<br>https://learn.microsoft.com/en-us/agent-framework/workflows/human-in-the-loop | **【未確認】**（ブロック） | 検索要約によると: 承認が必要なツールは、実行前にワークフローを止めて人間の確認を待つ。 |

### 1-3. 日本の公的ガイドライン（すべて**【未確認】**: 政府サイトがブロックされ、本文を開けていない）

| 資料 | 検索結果で分かったこと（要原文確認） |
|---|---|
| 総務省・経済産業省「AI事業者ガイドライン（第1.1版）」2025-03-28<br>本文: https://www.meti.go.jp/shingikai/mono_info_service/ai_shakai_jisso/pdf/20250328_1.pdf<br>概要: https://www.meti.go.jp/shingikai/mono_info_service/ai_shakai_jisso/pdf/20250328_2.pdf | - AI開発者・AI提供者・AI利用者ごとに共通の指針を示す（共通指針が10項目ある旨が検索要約にある）。<br>- 第1.1版で、AIエージェントやフィジカルAIの定義・便益・リスクが追記された。<br>- 継続的に更新する「Living Document」。<br>- 「令和7年度更新内容」（総務省資料、令和8年3月12日付）が検索に出ている: https://www.soumu.go.jp/main_content/001059300.pdf 。**2026-10 時点で第1.2版以降が出ている可能性がある**ため、最新版を原文で確認すること。 |
| 個人情報保護委員会「生成AIサービスの利用に関する注意喚起等」2023-06（検索で確認した公表時期） | 検索要約（法律事務所などの解説）によると: 個人情報を含むプロンプトを入力するときは、利用目的の範囲内か確認する。入力した個人データが提供事業者の機械学習に使われる場合は、第三者提供として法令違反になりうる。学習に使われないことを確認する。原文（ppc.go.jp）は未確認。 |
| 文化審議会著作権分科会法制度小委員会「AIと著作権に関する考え方について」2024-03-15<br>https://www.bunka.go.jp/seisaku/bunkashingikai/chosakuken/pdf/94037901_01.pdf | 検索要約によると: 生成・利用段階では、生成物が既存の著作物と**類似**し、かつ既存の著作物に**依拠**していれば、著作権侵害になりうる。ほかに、学習段階の扱いと生成物の著作物性を整理している。 |

### 1-4. どの業務をAIに任せるかの判断基準

反復性・検証可能性・失敗時の影響・データの機密度を、まとめて採用基準として示した単一の一次資料は、**確認できた範囲では見つかりませんでした**。以下は、確認済みの資料の記述を組み合わせたものです。

- **検証可能性**: Anthropic は、コーディングが向く理由を「自動テストで検証できる」「品質を客観的に測れる」とし、カスタマーサポートは「解決」を測れるとしている（Building effective agents）。評価者・最適化者型は「評価基準が明確」な場合に向く。
- **予測可能性（反復性）**: 手順が決まった作業はワークフロー型（予測可能で一貫している）、手順を予測できない作業はエージェント型にする（Building effective agents）。最も低い複雑さで足りるならそれを選ぶ（Microsoft）。
- **費用対効果**: マルチエージェントのトークン消費は約15倍なので、価値の高いタスクに限る（Anthropic research system）。
- **失敗時の影響**: 取り消せない・影響の大きい操作は人間の承認を挟む（Anthropic framework、Claude Code の権限設計、Microsoft のツール承認）。OpenAI と Google にも同じ趣旨の記述がある旨の検索結果があるが未確認。
- **データの機密度**: アクセス範囲の絞り込み（Microsoft）、User-Auth と最小権限（Google ADK）、MCP によるデータアクセスの制御（Anthropic）、個人データ入力時の利用目的と第三者提供の確認（個人情報保護委員会、未確認）。

---

## 2. AI社員の採用基準（どの業務を任せるか）

確認済みの資料から導いた基準です。

| 基準 | 任せてよい | 任せない、または人間の承認付きにする | 根拠 |
|---|---|---|---|
| 検証可能性 | 完了条件をルールやテストで機械的に判定できる | 良し悪しを主観でしか判断できず、評価者も置けない | Anthropic: Building effective agents / Agent SDK |
| 反復性・予測可能性 | 定型・反復の作業（ワークフローで書ける）、または手順は読めないが成果を検証できる作業 | 一度きりで文脈依存が強く、頻繁な対話が要る作業 | Anthropic: Building effective agents、Subagents |
| 失敗時の影響 | 取り消せる（下書き・ブランチ・プレビュー） | 取り消せない、外部に出る、お金が動く | Anthropic framework、Microsoft、OpenAI（未確認） |
| データの機密度 | 公開情報、社内の非機密情報 | 個人情報・認証情報・営業秘密（入力先の学習利用と利用目的を確認できるまで扱わない） | Google ADK、Microsoft、個人情報保護委員会（未確認） |
| 費用対効果 | マルチエージェントのコスト（約15倍）に見合う価値がある | 1エージェントや単発の呼び出しで足りる | Anthropic research system、Microsoft |

採用時の確認リスト:
1. 完了条件（機械で確認できるルール）を書けるか。
2. 失敗しても取り消せるか。取り消せない場合、承認ポイントを置けるか。
3. 扱うデータの区分（公開・社内・個人情報・秘密）と、入力先が学習に使うかどうか。
4. 単一エージェントやワークフローで足りないか。
5. 必要なツールを最小限で列挙できるか。

---

## 3. 役割設計

### 3-1. 1エージェント1責務
- サブエージェントは1つのタスクに特化させ、単一責務にする。委任の判断材料になる説明（description）を書く（Claude Code Subagents）。
- 委任するときは、目的・出力形式・使うツール・タスクの境界を明記する。境界がないと作業が重複する（Anthropic research system）。
- 子エージェントは会話の履歴を持たないので、指示は単体で完結させる（Skills の `context: fork`）。
- 部署内の分担はツールの名前空間で区切る（Writing tools for agents）。

### 3-2. 権限最小化
- ツールは許可リスト（`tools` / `allowedTools`）で渡し、不要なツールは `disallowedTools` で見えなくする（Subagents、Agent SDK）。
- 締め付けた役割は `allowedTools` と `dontAsk` の組み合わせにする（Agent SDK）。
- `bypassPermissions` は使わない。`allowedTools` では制限できず、サブエージェントにも引き継がれる（Agent SDK）。組織として禁止するなら管理設定の `disableBypassPermissionsMode` を使う（Permissions）。
- 厳密な境界は deny ルールで作る（フックより権限ルールを優先する。Hooks）。deny はどのモードでも効く（Agent SDK）。
- 利用者本人の権限の範囲内でだけ動かす（User-Auth）。ツール内に、モデルが覆せない制約を置く（Google ADK）。各エージェントでアクセス範囲を絞る（Microsoft）。
- スキル単位の事前承認（`allowed-tools`）はそのターンだけ有効。破壊的な手順のスキルは `disable-model-invocation: true` にして人間だけが起動する（Skills）。

### 3-3. 監査役の分離（作る役と確かめる役を分ける）
- 評価者・最適化者型: 生成する LLM と評価する LLM を分ける（Building effective agents）。Microsoft の maker-checker ループも同じ考え方。
- 評価はまずルールで行い、違反したルールと理由を返す。あいまいな基準にだけ LLM 判定を使う（Agent SDK）。
- 監査役は読み取り専用のツールにする（Subagents の「調査役は読み取りのみ」の考え方を応用）。
- 自動評価に加えて人間による評価も行う。自動評価で見落とすケースがある（Anthropic research system）。
- 監査役の判定だけに頼らず、`PreToolUse` フックと deny ルールで機械的に止める層を重ねる（Hooks、Agent SDK、OpenAI Agents SDK のガードレール）。

---

## 4. 人間の承認を必須にすべき操作

| 操作 | 根拠 |
|---|---|
| 取り消せない操作、影響の大きい操作（削除、本番反映、デフォルトブランチへのマージなど） | Anthropic framework（変更前の承認）、Claude Code の権限設計（ファイル変更と Bash は既定で承認が必要）。Google Cloud が「本番へのデプロイ」を例示している旨の検索結果があるが未確認 |
| お金が動く操作（支払い、返金、購入、契約） | OpenAI（支払い・高額返金）、Google（金融取引）。いずれも未確認 |
| 外部への送信・公開（メール送信、外部共有、SNS投稿） | Anthropic framework（重要な判断は人間が握る）からの推論。直接の記述は未確認 |
| 機密データに基づく操作、個人データの外部サービスへの入力 | Google（機密データに基づく操作。未確認）、個人情報保護委員会（未確認） |
| 失敗の上限を超えたとき（再試行の上限に達した、行き詰まった） | Anthropic（行き詰まったら人間のフィードバックを待つ）。OpenAI（失敗の上限）は未確認 |
| 権限設定やガードレール自体の変更 | Claude Code Hooks（プロジェクトのフックはワークスペースの信頼が前提、`/hooks` で確認）、Permissions（管理設定は上書き不可） |

実装方法: `ask` ルール、`PreToolUse` フックの `permissionDecision: "ask"`、Agent SDK の `canUseTool`、`plan` モード（書き込みは承認が必要）を使う。承認待ちの時点で状態を保存する（Microsoft）。

---

## 5. 法令・ガイドライン上の注意（日本）

**本節はすべて【未確認】です（検索結果ベース）。運用ルールにする前に原文を確認してください。**

1. **AI事業者ガイドライン（総務省・経済産業省、第1.1版 2025-03-28。それ以降の改訂の可能性あり）**: 企業は「AI利用者」として共通指針（人間中心、安全性、公平性、プライバシー保護、セキュリティ確保、透明性、アカウンタビリティなど。**各項目名は原文未確認**）に沿う。第1.1版で AIエージェントのリスクが追記された。令和7年度の更新資料（2026-03）があるため、最新版を確認すること。
2. **個人情報保護委員会の注意喚起（2023-06）**: 個人情報を含むプロンプトは利用目的の範囲内に限る。入力データが提供事業者の機械学習に使われる設定では、第三者提供として法令違反になりうる。AI社員に個人データを扱わせる場合は、入力先の学習利用の有無と利用目的を確認する。
3. **AIと著作権に関する考え方（文化審議会 法制度小委員会、2024-03-15）**: 生成物が既存の著作物と類似し、依拠していれば侵害になりうる。記事や画像を作るAI社員の工程には、類似性の確認（品質チェック役による照合）と人間の最終確認を入れる。
4. **共通の対策**: 認証情報・個人情報をログや外部に出さない（OpenAI の個人情報フィルタは未確認。Google ADK の持ち出し防止、Anthropic のプライバシー原則は確認済み）。

---

## 6. 出典一覧

【確認済】
- https://www.anthropic.com/engineering/building-effective-agents
- https://www.anthropic.com/engineering/multi-agent-research-system
- https://www.anthropic.com/engineering/writing-tools-for-agents
- https://www.anthropic.com/news/our-framework-for-developing-safe-and-trustworthy-agents
- https://claude.com/blog/building-agents-with-the-claude-agent-sdk
- https://code.claude.com/docs/en/sub-agents
- https://code.claude.com/docs/en/skills
- https://code.claude.com/docs/en/hooks
- https://code.claude.com/docs/en/permissions
- https://code.claude.com/docs/en/agent-sdk/permissions
- https://raw.githubusercontent.com/openai/openai-agents-python/main/docs/guardrails.md
- https://raw.githubusercontent.com/google/adk-docs/main/docs/safety/index.md
- https://raw.githubusercontent.com/MicrosoftDocs/architecture-center/main/docs/ai-ml/guide/ai-agent-design-patterns.md

【未確認】（通信がブロックされ、検索結果でのみ把握）
- https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf
- https://docs.cloud.google.com/architecture/choose-design-pattern-agentic-ai-system
- https://learn.microsoft.com/en-us/agent-framework/workflows/human-in-the-loop
- https://www.meti.go.jp/shingikai/mono_info_service/ai_shakai_jisso/pdf/20250328_1.pdf
- https://www.soumu.go.jp/main_content/001059300.pdf
- 個人情報保護委員会「生成AIサービスの利用に関する注意喚起等」（ppc.go.jp。正確な URL も未確認）
- https://www.bunka.go.jp/seisaku/bunkashingikai/chosakuken/pdf/94037901_01.pdf
