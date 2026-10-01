# リリース前リーガルチェック (2026-10-01) T-031

注意: 私は弁護士ではなく、これは法的助言ではありません。リスクの洗い出しと、人間が判断・専門家相談すべき点の明確化です。

## 判定: YELLOW（RED なし。公開前に人間の確認2点と文書の仕上げが必要）

## 確認結果
| 項目 | 判定 | 根拠 |
|---|---|---|
| 外部通信ゼロ | GREEN | game/src と index.html を grep。http(s)URLなし（SVG の xmlns のみ）。fetch は自サイト内の `src/data/*.json` のみ（main.js:12, screens.js:12）。sw.js も同一オリジンのキャッシュのみ。外部フォント・CDN・解析・広告なし。script は `src/main.js` のみ |
| 第三者素材・ライブラリ | GREEN | 画像ファイルは自作アイコンのみ（icons/）。音声ファイルなし、BGM/SFX は Web Audio オシレーター合成（bgm.js, sfx.js）。フォントは system-ui 等のOS標準指定のみ。実行時依存なし、package.json は playwright（テスト用 dev）のみ。GPL等の混入なし。LICENSES.md に「第三者素材なし・自作/コード生成」を明記済み |
| プライバシー | GREEN | 保存は localStorage のみ（save.js:21,23）。内容は記録・設定のみで個人情報なし。通信なし。→ プライバシーポリシー表示は不要（外部送信を足したら要再検討） |
| 点滅・動き | GREEN | renderer.js の明滅は約1.1〜1.5Hz のやわらかい脈動（l.144 1.2回/秒、l.152 1.5回/秒、l.187 1.1回/秒）で毎秒3回以下。CSS は breathe 4秒周期。「うごき控えめ」設定あり（saved.calm）＋ OS の prefers-reduced-motion にも対応。画面フラッシュ・ストロボ演出なし |
| ガチャ・課金・景表法 | GREEN | 課金・広告・ガチャ・確率の語/処理なし（grep）。図鑑・色解放は条件達成型（creatures.json の cond）で、ランダム報酬ではない。景表法・特商法の対象となる要素なし |
| 既存作の名前・見た目の寄せ | GREEN | SwarmLight / Count Masters / ホタルノニッキ / Firefly の語はコード・README・index.html になし。タイトルは「トモシムレ」のまま。見た目は黄色い光の点群と暗い洞窟で独自の配色。生物名は造語（ひとしずく、こけたま等） |
| 年齢・表現 | GREEN | 暴力・流血・恐怖・ギャンブル演出なし。対象年齢は全年齢で問題ない目安 |
| 秘密情報 | GREEN | game/ の git 履歴を token/password/api key パターンで grep して該当なし（簡易確認。全リポジトリの完全監査ではない） |

## YELLOW（対応すれば可）
1. **README が雛形のまま**（game/README.md に `GAME_TITLE`、`https://OWNER.github.io/REPO/`、遊び方が空）。公開前に差し替える。入れる文言: 端末内保存のみ・外部送信なし、第三者素材なし、点滅の穏やかさと「うごき控えめ」、対象年齢の目安。「〜風」「No.1」「世界初」は書かない。※game/ 内の README は私の編集範囲外のため未修正（PM/担当に依頼）。
2. **リポジトリのLICENSEファイルが未設置**（`game/LICENSE*` なし）。コード/素材のライセンス方針を人間が決め decisions.md に記録（例: コード MIT、素材は all rights reserved 等）。決めずに公開すると、他人が再利用できる条件が不明のまま。
3. **GitHub Pages の利用条件の最新版確認**は今回未実施（確認日の記録なし）。無料の個人制作ゲームを静的ホスティングする用途は通常範囲だが、公開前に人間が https://docs.github.com/ja/pages/getting-started-with-github-pages/github-pages-limits と GitHub 利用規約を確認し、確認日を記録。公開リポジトリ化・Pages 公開は CLAUDE.md §2 のとおりオーナーの一言確認が必要。

## 未確認事項（人間がやること）
- **商標未確認**（concept-check から継続）。J-PlatPat（https://www.j-platpat.inpit.go.jp/）で「トモシムレ」「トモシ」を区分9・41で検索。USPTO / WIPO は海外展開するなら。ストア（App Store/Google Play）に載せるなら、ストア内の同名アプリ検索も。Web公開のみ・無料個人制作なら必須ではないが推奨。
- 公開用の外部表示（OGPやストア説明）を足す場合は、既存作名を出さない点を再確認。
- 外部通信（解析・フォント・広告）や課金・ガチャ・オンラインランキングを足すなら、このチェックをやり直す（課金は RED で専門家相談）。

## RED
なし。
