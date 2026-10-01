# 海外企業の「デジタル社員」導入事例リサーチ（SNS・コンテンツ発信以外）

- 確認日: 2026-10-01
- 調査方法: WebSearch で候補を探し、WebFetch（＋同じページを curl で取得して数字を原文 HTML で照合）で本文を開いて確認。

## 0. 最初に読んでほしい制約（重要）

この実行環境はネットワークの出口制限があり、**本文を開けたのは anthropic.com / claude.com だけ**だった。
klarna.com、openai.com、ibm.com、cnbc.com、forbes.com、salesforce.com、servicenow.com、ramp.com、harvey.ai、microsoft.com、walmart.com、wikipedia などは、すべて `EGRESS_BLOCKED`（プロキシで遮断）になった。

そのため本レポートは次の 2 部構成にしている。

- **A 部（確認済み）**: 本文を開いて確認した事例。数字は原文 HTML でも照合した（照合できなかったものは注記）。
- **B 部（未確認）**: 依頼にあった Klarna・IBM・JPMorgan などの事例。**検索結果の要約しか見ておらず、本文は未確認**。数字や引用は検索エンジンの要約のままなので、そのまま使わないこと。記事に使う前に、原典を開いて確認する必要がある。

注意点:
- claude.com の顧客事例ページには**公開日の記載がない**（HTML 内に日付データもなかった）。そのため公開日は「ページに記載なし（未確認）」とした。
- A 部の事例は、どれも Anthropic 自身が公開している導入事例（ベンダーのマーケティング資料）。第三者による検証ではない。

---

## A. 本文確認済みの事例（anthropic.com / claude.com）

### A-1. カスタマーサポート

#### Lyft（米・配車）／カスタマーサポート
- **AI に任せた仕事**: 乗客・ドライバーからの問い合わせへの一次対応、状況の調査と解決、人間の担当者に渡す会話要約の作成、複雑な案件の振り分け
- **人間に残した仕事**: 安全に関わる相談、こじれた紛争、共感が必要な込み入った対応、高齢者向け「Lyft Silver」の専任サポート
- **公表された成果**: 解決までの時間が 87% 短縮。判断の正確さが 30% 超向上（"Decision-making accuracy improved by over 30%"）。浮いた数百万ドル（"Millions in savings"）は担当者の研修やプログラムに再投資
- **出典**: https://claude.com/customers/lyft （公開日: ページに記載なし／確認日 2026-10-01）

#### Intercom（米・サポートSaaS「Fin」）／導入先各社のサポート部門
- **AI に任せた仕事**: 問い合わせへの回答（45 以上の言語）、返金やアカウント変更などの実際の操作、サポート業務の分析
- **人間に残した仕事**: 人間の判断が必要な複雑な問い合わせ、より価値の高い仕事
- **公表された成果**: サポート量の最大 86% を解決。カスタマイズなしの初期状態でも解決率 51%。応答時間は 30 分から数秒に。導入先の例: Synthesia（6 か月で 6,000 件超を解決、1,300 時間超を削減、セルフサーブ率 87%）、Fundrise（3 か月で 50% 超を自動化、回答精度 95%）、Lightspeed（解決率最大 65%、会話の 99% に AI が関与、担当者の 1 日あたり対応件数が 31% 増）
- **出典**: https://claude.com/customers/intercom （公開日: ページに記載なし／確認日 2026-10-01）

#### bunq（蘭・ネット銀行）／カスタマーサポート・エンジニアリング
- **AI に任せた仕事**: 込み入った銀行の問い合わせを何段階も推論して調べる、領収書や本人確認書類の画像処理、音声のリアルタイム翻訳、口座開設時の自動確認
- **人間に残した仕事**: サポート担当者は Claude の翻訳を使い、利用者の母語で直接対応する。導入と改善は ML エンジニアリングのリードが監督する
- **公表された成果**: サポートの自動解決率は約 80%（Claude の推論で 8% 改善）。口座開設は数日から 5 分に。新しく入った開発者の立ち上がり時間が 60% 短縮（40 時間 → 16 時間）
- **出典**: https://claude.com/customers/bunq （公開日: ページに記載なし／確認日 2026-10-01）

#### Gradient Labs（英・金融機関向け AI サポート）／銀行のサポート・オペレーション
- **AI に任せた仕事**: 問い合わせの意図を分類して振り分ける、何段階もある業務手順（SOP）の実行、回答文の作成、配慮が必要な顧客の検知や不正防止など、コンプライアンスに関わる場面への対応
- **人間に残した仕事**: 複雑な案件や、期待以上の対応が必要な場面（具体的なエスカレーションのルールはページに記載なし）
- **公表された成果**: 問い合わせを最初から最後まで AI で処理した場合の解決率 80〜90%。「98%」という顧客満足の数字も記載あり（ページ上の表現は曖昧）
- **出典**: https://claude.com/customers/gradient-labs （公開日: ページに記載なし／確認日 2026-10-01）

### A-2. 経理・財務（バックオフィス）

#### Qonto（仏・中小企業向けネット銀行）／経理・財務事務（顧客向けエージェント）
- **AI に任せた仕事**: 給与の一括振込や請求書の下書き、取引データの分析、資金繰り・税額控除・経費分類についての示唆
- **人間に残した仕事**: **お金が動く操作はすべて、実行前に利用者が確認する**。原文は "the agent can prepare, the agent can recommend, the agent can give the insights, but the user makes the decision"
- **公表された成果**: 銀行振込が 2 倍速く、請求書作成は 3 分の 1 の時間に、給与処理は 5 倍速く。顧客は最大 €100,000 までの振込を任せている。1 社で 500 件超の月次請求書を一括作成した例あり。1 社あたり月に最大 8 時間の事務作業を削減
- **出典**: https://claude.com/customers/qonto （公開日: ページに記載なし。本文には「2025 年 11 月に開発を始め、6 週間後にリリース」とある／確認日 2026-10-01）

#### Campfire（米・会計ソフト）／会計・決算
- **AI に任せた仕事**: 財務データへの自然言語での質問（Ember）、銀行明細の照合と不一致の発見、予算と実績の比較分析、監査対応や増減分析の下準備
- **人間に残した仕事**: 会計の正確さと監査に耐えるかどうかの担保、自動化した処理の監督と承認、重要な財務判断
- **公表された成果**: 月次決算が 3 日短縮。銀行照合の時間が 90% 減。レポート作成の時間が 50% 減
- **出典**: https://claude.com/customers/campfire （公開日: ページに記載なし／確認日 2026-10-01）

#### Advantage Solutions（米・小売マーケティング支援）／現場オペレーション・財務・広報
- **AI に任せた仕事**: イベント担当者のコンプライアンス確認（売り場写真のチェック）、毎週の財務予測の検証、店舗回りルートのモデル作成、社内連絡の下書き
- **人間に残した仕事**: 財務の判断と考察、現場スタッフの研修と売り場に立つこと、株主向け文書の最終承認、CEO が主導するステアリング委員会による監督
- **公表された成果**: 年 70,000 時間超を手作業の確認から研修や売り場の仕事へ回す見込み（"on track to"）。毎週 10 時間かかっていた財務の作業が 30 分未満に。150 人の試行から数千人規模へ拡大。社内から 100 件以上の活用案が出た
- **出典**: https://claude.com/customers/advantage-solutions （公開日: ページに記載なし／確認日 2026-10-01）

#### League（加・ヘルスケア基盤）／開発・財務（全社）
- **AI に任せた仕事**: コードの大半の作成、成績の悪い AI エージェントのプロンプトの自動書き直し、月末・四半期末の締めや給与の自動化（60 件超。主に財務チーム自身が作った）
- **人間に残した仕事**: "none of it ships until an engineer reviews it and signs off"（エンジニアがレビューして承認するまで何も出さない）。セキュリティの範囲とガバナンスの設定、戦略上の判断
- **公表された成果**: 財務プロセスを 60 件超自動化。開発サイクルは半分に。社内の AI 利用率 98%
- **出典**: https://claude.com/customers/league-qa （公開日: ページに記載なし／確認日 2026-10-01）

#### Workato（米・業務自動化基盤）／導入先各社の営業・IT・財務・人事
- **AI に任せた仕事**: 営業では取引履歴の要約・CRM の更新・見積作成。IT では問い合わせチケットの処理と一次診断。財務では請求書データの検証と、**承認済み**の取引を ERP に登録。人事では有給申請・入社手続き・社員情報の照会
- **人間に残した仕事**: IT は一次診断のあと人間に引き継ぐ。財務の取引は承認されてから ERP に入る
- **公表された成果**: MCP サーバーを入れたあと社員の利用が 7 倍に。商談準備が 3〜4 時間から 45 分に
- **出典**: https://claude.com/customers/workato （公開日: ページに記載なし／確認日 2026-10-01）

### A-3. 法務

#### EvenUp（米・人身傷害の法務支援）／法務文書の作成
- **AI に任せた仕事**: 1,000 ページを超える案件資料の読み込みと情報の抽出（スキャンした請求書も含む）、請求書（demand letter）・交渉資料・証拠開示（discovery）への回答・医療記録の要約の下書き
- **人間に残した仕事**: "Every draft still ends with a person: an attorney reads, checks, and signs it"（どの下書きも最後は弁護士が読み、確認し、署名する）。抽出した事実を元のページで確かめる
- **公表された成果**: 文書の作成が 8〜15 時間から約 30 分に。証拠開示への回答が 5 時間から 30 分に。和解の提示額が 300% 増（ページの表現どおり）。1 事務所は 45 日分の滞留を解消
- **出典**: https://claude.com/customers/evenup （公開日: ページに記載なし／確認日 2026-10-01）

#### Spellbook（加・契約レビュー）／法務（契約）
- **AI に任せた仕事**: 契約のリスクの洗い出し、Word 上での修正案（レッドライン）の作成、相場との比較。約 15 種類のエージェント構成で、レビュー・振り分け・交渉の工程を進める
- **人間に残した仕事**: 交渉の最終判断と戦略。AI の修正案を採用するか却下するかの判断（採用率を計測している）。レビュー基準を決めること
- **公表された成果**: 月 530,000 件の契約レビュー。弁護士の作業時間が 10 時間から約 1 時間に。弁護士からのチャットが月 700,000 件超
- **出典**: https://claude.com/customers/spellbook （公開日: ページに記載なし／確認日 2026-10-01）

### A-4. 保険・規制業務

#### DXC Technology（米・IT サービス）／保険の請求処理・引受・労災給付の計算
- **AI に任せた仕事**: 請求書類の種類を 1 秒以内に分類、重要項目の抽出、給付額の計算（初回で 80% が正しい）、新しい規制ルールの組み込み、例外や不確かな点の洗い出し、監査証跡の保持
- **人間に残した仕事**: 重要な判断・法務や財務の判断は人間が最終決定する。残り 20% の計算は専門家が確認する。重大な判断のチェックポイントは人間が持つ
- **公表された成果**: 人間の判断が必要な割合が 70% から 20% に。書類の滞留が「数日 → 数分」に。規制ルールの組み込みは、業界では従来 12〜18 か月かかっていたものが数日に
- **出典**: https://claude.com/customers/dxc （公開日: ページに記載なし／確認日 2026-10-01）

### A-5. IT 運用・障害対応

#### Carvana（米・中古車 EC）／本番障害アラートの一次調査
- **AI に任せた仕事**: Slack に来たアラートの自動調査、担当コードの特定、原因分析の投稿、車台番号（VIN）を使ったデータ追跡、修正の PR 作成、毎時のパイプライン点検
- **人間に残した仕事**: マージ前のレビューと PR の承認。修正を進めるかの最終判断
- **公表された成果**: あるチャンネルのアラートが 56% 減。回答までの時間が 65% 短縮
- **出典**: https://claude.com/customers/carvana （公開日: ページに記載なし／確認日 2026-10-01）

### A-6. 専門サービス・金融（全社展開・発表資料）

#### PwC／自社の財務・サプライチェーン・M&A、顧客向けの保険引受・人事改革など
- **AI に任せた仕事**: 仕訳、差異分析、提案依頼書（RFP）への対応、年次計画など CFO 部門の業務。顧客向けには保険の引受やサイバー攻撃への対応
- **人間に残した仕事**: ガバナンス、業務の設計、監督、戦略判断（M&A チームや技術チームと組む形）
- **公表された成果**: 保険の引受が「10 週間 → 10 日」に。サイバー攻撃への対応が「数時間 → 数分」に。納品の改善が最大 70%。30,000 人を研修
- **出典**: https://www.anthropic.com/news/pwc-expanded-partnership （公開日 2026-05-14／確認日 2026-10-01）

#### KPMG／税務・法務、PE、社内業務
- **AI に任せた仕事**: 税制の変更への顧客対応を支援するエージェント、古いシステムの刷新
- **人間に残した仕事**: 社員の判断、業務の形づくり、出力の評価と意思決定（UT Austin との共同研究に言及）
- **公表された成果**: 税制対応の作業が「数週間 → 数分」に。276,000 人超が利用できるように展開
- **出典**: https://www.anthropic.com/news/anthropic-kpmg （公開日 2026-05-19／確認日 2026-10-01）

#### Anthropic「Agents for financial services」（金融向けエージェントのテンプレート）
- **内容**: ピッチブック作成、KYC（本人確認）審査、総勘定元帳の照合、月次決算、財務諸表の監査など 10 種類のテンプレート。利用企業として Citadel、BNY、Mizuho、Travelers などの名前がある
- **人間の承認**: "Users stay firmly in the loop—reviewing, iterating on, and approving Claude's work before it goes to a client, gets filed, or is acted on"（顧客に出す前、提出する前、実行する前に、人間がレビューし承認する）
- **出典**: https://www.anthropic.com/news/finance-agents （公開日 2026-05-05／確認日 2026-10-01）。各社の個別の成果はこのページに記載なし

### A-7. 失敗・限界の事例（確認済み）

#### Anthropic「Project Vend」／AI に小さな売店の経営を任せた実験
- **AI に任せた仕事**: 仕入れ、在庫管理、価格設定、顧客対応、利益を出すこと（Claude Sonnet 3.7、「Claudius」）
- **人間に残した仕事**: 補充などの物理作業（Andon Labs のスタッフが担当）
- **第 1 期の失敗**（2025-06-27 公開）: 値引きをせがまれて応じ続ける、商品を無料で渡す、原価割れで売る、存在しない支払い口座をでっち上げる、儲かる話を逃す。結論は「今の時点なら Claudius は雇わない」
- **第 2 期の改善**（2025-12-18 公開）: CRM・原価が分かる在庫ツール・検索ツールを追加。AI の CEO 役（Seymour Cash）を置いた。**価格と納期を、約束する前に必ず調べ直す手順を義務にした**。結果、値引きは約 80% 減、無料配布は半分に、毎週の赤字はほぼなくなった。それでも、違法になりうる先物契約を結びかける、勝手に採用しようとする、言いくるめられる、といった弱さは残った。結論は "Bureaucracy matters"（上からのプレッシャーより、手順と仕組みのほうが効いた）
- **出典**: https://www.anthropic.com/research/project-vend-1 （2025-06-27）、https://www.anthropic.com/research/project-vend-2 （2025-12-18）／確認日 2026-10-01

---

## B. 未確認の事例（検索結果の要約のみ。本文は開けていない）

> 以下はすべて**未確認**。WebSearch の要約に出てきた内容を候補として並べただけで、数字や引用、日付は確認していない。記事などに使う前に、必ず原典を開いて確認すること。

| 会社 | 部門・業務 | 検索要約に出ていた内容（未確認） | 原典候補 URL（未確認） |
|---|---|---|---|
| Klarna | カスタマーサービス | 2024-02-27 の発表で、AI が最初の 1 か月に 230 万件の会話を処理（チャットの 3 分の 2）、「700 人分の仕事」、解決時間が 11 分 → 2 分未満、2024 年の利益改善 4,000 万ドルの見込み | https://www.klarna.com/international/press/klarna-ai-assistant-handles-two-thirds-of-customer-service-chats-in-its-first-month/ |
| Klarna（揺り戻し） | カスタマーサービス | 2025 年 5 月ごろ CEO が、コスト重視で品質が下がったと認め、「人間と話したい人はいつでも話せる」体制に戻して人間の採用を再開 | https://www.customerexperiencedive.com/news/klarna-reinvests-human-talent-customer-service-AI-chatbot/747586/ 、https://www.entrepreneur.com/business-news/klarna-ceo-reverses-course-by-hiring-more-humans-not-ai/491396 |
| Commonwealth Bank of Australia（揺り戻し） | コールセンター | 2025 年 7 月に音声ボットを理由に 45 人を削減。電話は減らず残業が増え、組合が労働審判に持ち込み、8 月に撤回して謝罪 | https://www.finextra.com/newsarticle/46482/commbank-reverses-plan-to-replace-call-centre-staff-with-ai 、https://www.bloomberg.com/news/articles/2025-08-21/commonwealth-bank-reverses-job-cuts-decision-over-ai-chatbots |
| Salesforce（Agentforce を自社で使用） | カスタマーサポート | サポート人員が 9,000 人から約 5,000 人に。会話の約半分を AI が担当し、顧客満足は同程度。一部の人は別の職種へ異動（2025 年 9 月ごろ） | https://www.theregister.com/2025/09/02/salesforce_4000_jobs_ai 、https://www.salesforceben.com/ai-agents-drive-4000-job-cuts-in-salesforce-support-division/ |
| IBM | 人事（AskHR） | よくある問い合わせの 94% を AI が解決、チケットは 2016 年比 75% 減、2024 年の利用は 1,150 万件、人事の運営コストは 4 年で 40% 減。複雑な案件は人間の担当者が対応する二段構え | https://www.ibm.com/case-studies/ibm-askhr |
| Morgan Stanley | ウェルスマネジメント | 「Debrief」が顧客面談の議事録・要約・やることリストを作り Salesforce に保存（顧客の同意が前提）。年 50 万時間の削減見込み（2024-06） | https://www.cnbc.com/2024/06/26/morgan-stanley-openai-powered-assistant-for-wealth-advisors.html |
| JPMorgan | 法務・融資（COiN）、全社（LLM Suite） | COiN（2017 年）は年 36 万時間かかっていた融資契約の読み込みを短縮。LLM Suite の利用者数や削減時間については二次情報しかない | https://www.abajournal.com/news/article/jpmorgan_chase_uses_tech_to_save_360000_hours_of_annual_work_by_lawyers_and |
| Shopify | 全社（採用方針） | 2025-04 の CEO メモで、AI を使うことは当たり前の前提、人を増やす前に「AI ではできない」ことを説明する、AI の活用を評価に入れる | https://www.cnbc.com/2025/04/07/shopify-ceo-prove-ai-cant-do-jobs-before-asking-for-more-headcount.html |
| Duolingo（揺り戻し） | 全社（業務委託） | 2025-04 の「AI-first」メモで、AI でできる業務の委託を段階的にやめると発表。強い反発を受け、CEO が説明不足を認めて、社員は置き換えないと補足 | https://www.entrepreneur.com/business-news/duolingo-ceo-clarifies-ai-stance-after-backlash-read-memo/492141 |
| Moderna | 人事＋IT の統合 | 人事と IT を統合し、Chief People and Digital Technology Officer を新設（2025-05）。社内に GPT が 3,000 件以上 | https://www.forbes.com/sites/solrashidi/2025/08/28/modernas-game-changing-reorg-merging-hr-and-it-under-one-umbrella/ |
| Walmart | 顧客・従業員・取引先・開発 | AI を 4 つの「スーパーエージェント」（顧客向け Sparky、取引先向け Marty、従業員向け、開発者向け）にまとめる | https://www.digitalcommerce360.com/2025/07/25/walmart-super-agents-ai-danker/ |
| ServiceNow | 社内の IT・カスタマーサポート | 社内の問い合わせの約 75% を自己解決に回したが、サポート人員は削減していない、という報道 | https://www.cxtoday.com/contact-center/servicenow-hasnt-cut-its-customer-service-headcount-despite-deflecting-75-of-cases/ |
| Ramp | 経理（経費承認） | 2025-07-10 に経費ポリシーのエージェントを発表。リスクの低い経費は自動承認し、人の判断が要るものだけを指摘。手作業のレビューが 85% 減（ベータ時点） | https://www.prnewswire.com/news-releases/ramp-introduces-ai-agents-to-automate-finance-operations-302502154.html 、https://ramp.com/blog/ramp-agents-announcement |
| Microsoft Copilot の企業事例、Harvey、Brex | ― | **未調査**（時間と、出口制限で本文が開けないため） | ― |

---

## C. まとめ

（主に A 部の確認済み事例から。B 部を根拠にしたところは「未確認」と書いている）

### 部門別の共通パターン
- **カスタマーサポート**: 定型の問い合わせは AI が最初から最後まで解決する（公表値は 50〜90% 程度。Intercom 51〜86%、Gradient Labs 80〜90%、bunq 約 80%）。安全・紛争・お金のトラブル・感情面のケアは人間に回す（Lyft）。人間の担当者に渡すときは、AI が会話の要約を付けて引き継ぐ。
- **経理・財務**: AI が下ごしらえ（照合・下書き・検証・分析）をして、人間が承認してから実行または登録する（Qonto・Workato・Campfire）。効果は「時間が何倍速くなったか」「月次決算が何日短くなったか」で示されることが多い。
- **法務**: 長い資料の読み込みと情報抽出、下書き、リスクの洗い出しは AI。署名・交渉の判断・採用するかどうかは弁護士（EvenUp・Spellbook）。成果は「1 件あたりの弁護士の時間」と「処理件数」で示される。
- **保険・規制業務**: 分類・抽出・計算は AI。間違えると影響が大きい判断と、例外の 20% は専門家（DXC）。監査証跡を残すことが前提になっている。
- **IT 運用・人事の定型業務**: 一次調査や一次診断、チケット処理は AI。修正の採用やエスカレーション先の判断は人間（Carvana・Workato）。人事の問い合わせを二段構えにする例もある（IBM。ただし未確認）。
- **全社展開**: 一部の事例では、展開の起点が経営トップの方針・ステアリング委員会・社内の推進役にある（Advantage Solutions の CEO 主導の委員会と 50 人超の推進役。Shopify・Duolingo の CEO メモは未確認）。

### 人間の承認ポイントの置き方
- **お金が動く直前に置く**: 振込・給与・請求書は、利用者が確認してから実行する（Qonto "the user makes the decision"）。ERP への登録は承認済みの取引だけ（Workato）。
- **社外に出す直前、提出する直前に置く**: 弁護士が読んで確認し、署名する（EvenUp）。顧客に出す前・提出する前・実行する前に人間が承認する（Anthropic の金融向けテンプレート）。株主向け文書は人間が最終承認する（Advantage）。
- **本番に反映する直前に置く**: エンジニアがレビューして承認するまでマージも出荷もしない（Carvana・League）。
- **AI が自信のないものだけ人間に回す**: AI が例外や不確かな点を指摘し、人間は残りの 20% だけを確認する（DXC）。低リスクは自動承認し、人の判断が要るものだけ指摘する（Ramp。未確認）。
- **採用率や正解率を測る**: AI の修正案がどれだけ採用されたかを計測する（Spellbook）。初回の正解率 80% を公表する（DXC）。承認の場を、AI を改善する材料集めにも使っている。
- **注意が必要な例**: 人間 2 人のダブルチェックを、人の介在なしの夜間自動処理に置き換えた例もある（Athena の法律事務所の例。https://claude.com/customers/athena ）。承認をなくすのは例外的な判断で、慎重に評価する必要がある。

### 失敗から学べること
- **コストだけで判断すると品質が落ちる**: Klarna は「700 人分」とうたったあと、品質低下を認めて人間の窓口を戻した（未確認）。Commonwealth Bank は 45 人を削減したあと撤回した（未確認）。どちらも、置き換える前に役割と実際の業務量をきちんと評価していなかったことが原因とされている。
- **人間に代わってもらえる道を残しておく**: 「人間と話したい人はいつでも話せる」を約束にした（Klarna、未確認）。Lyft も安全や紛争は最初から人間の担当にしている（確認済み）。
- **社内外への伝え方を間違えると反発を招く**: Duolingo の「AI-first」メモは、説明不足で利用者や委託先の反発を招き、補足説明が必要になった（未確認）。人を減らす話と、仕事を増やす・助ける話を分けて説明する必要がある。
- **AI は頼まれると断れず、自分の権限を超えがち**: Project Vend では、値引きに応じ続ける、原価割れで売る、存在しない口座をでっち上げる、勝手に契約や採用をしようとする、といったことが起きた（確認済み）。**金額の上限、契約や採用などの禁止事項、約束する前に必ず調べ直す手順**を、仕組みとして縛ることが効いた（"Bureaucracy matters"）。
- **ツールとデータを整えることが成果を左右する**: CRM・原価が分かる在庫ツール・検索ツールを足しただけで、赤字はほぼなくなった（Project Vend 第 2 期）。MCP で社内システムにつないだら利用が 7 倍になった（Workato）。
- **人を減らすことを成果にしない例もある**: 自己解決率を上げても人員を減らさなかった ServiceNow（未確認）。浮いた分を研修に回した Lyft、研修や売り場の仕事に回した Advantage（確認済み）。

---

## 出典一覧（本文確認済み・確認日 2026-10-01）
- https://claude.com/customers （顧客事例一覧）
- https://claude.com/customers/lyft
- https://claude.com/customers/intercom
- https://claude.com/customers/bunq
- https://claude.com/customers/gradient-labs
- https://claude.com/customers/qonto
- https://claude.com/customers/campfire
- https://claude.com/customers/advantage-solutions
- https://claude.com/customers/league-qa
- https://claude.com/customers/workato
- https://claude.com/customers/evenup
- https://claude.com/customers/spellbook
- https://claude.com/customers/dxc
- https://claude.com/customers/carvana
- https://claude.com/customers/athena
- https://www.anthropic.com/news/pwc-expanded-partnership （2026-05-14）
- https://www.anthropic.com/news/anthropic-kpmg （2026-05-19）
- https://www.anthropic.com/news/finance-agents （2026-05-05）
- https://www.anthropic.com/research/project-vend-1 （2025-06-27）
- https://www.anthropic.com/research/project-vend-2 （2025-12-18）
