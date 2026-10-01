# リリース前リーガルチェック (2026-10-01) T-031

注意: 私は弁護士ではなく、これは法的助言ではありません。リスクの洗い出しと、人間が判断・専門家相談すべき点の明確化です。

## 判定: YELLOW（RED なし。公開前に人間の確認2点と文書の仕上げが必要。フォント追補後も判定は変わらず）

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

## 追補（フォント） 2026-10-01
判定: GREEN（上記の「第三者素材・ライブラリ」「外部通信ゼロ」の GREEN は、フォント追加後は下記で置き換わる。総合は YELLOW のまま）

- 対象: Yuji Boku（Copyright 2021 The Yuji Project Authors）、Kiwi Maru 500（Copyright 2020 The Kiwi Maru Project Authors）。いずれも SIL OFL 1.1。サブセット woff2 を game/fonts/ に同梱。
- OFL 条件の充足: (1) 単体販売禁止: ゲームに同梱して無料配布、フォント単体では売らない → 適合。(2) 著作権表示＋ライセンス文の同梱: game/fonts/OFL.txt に両方あり → 適合。(3) Reserved Font Name: 両書体の著作権表示に RFN 指定なし（OFL.txt 記載どおり）。サブセット化は「改変版」だが名称制限なし。CSS の font-family 名は参照用でも問題なし。(4) 作者名を宣伝に使わない: 使っていない → 適合。(5) OFL 以外のライセンスで配布しない: LICENSES.md に OFL と明記 → 適合。なおゲーム本体コードのライセンスは別（フォントには及ばない）。
- 指摘と対応: OFL.txt の Kiwi Maru 節が著作権表示のみで全文を「上と同じ」と参照していた。OFL は「各コピーにライセンスを含める」ことを求めるため参照でも実質足りるが、疑義を避けるため Kiwi 節にも全文を複製して自己完結にした（game/fonts/OFL.txt）。LICENSES.md に OFL 条件の充足メモを追記。
- 外部通信: game 内の index.html・js・css・json に googleapis / gstatic の参照なし。@font-face は相対パス fonts/*.woff2（index.html:14-15）、sw.js もそれらをキャッシュするのみ。実行時の外部通信ゼロを維持。Google Fonts へのアクセスは開発時の studio/tools/fetch-fonts.sh のみ（配布物に含まれない）。
- 残り（人間）: 配布元（Google Fonts/GitHub）の表示がRFNなしである点は、公開前に各リポジトリの OFL.txt を一度目視すると確実。専門家相談は不要。
