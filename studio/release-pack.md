# Gate 2 公開承認パック — トモシムレ（初版 v1）

- 作成: 2026-10-01 / AI相棒（PM）
- 状態: **公開していない。オーナーの承認待ち**（main へのマージ、GitHub Pages の有効化はしていない）
- ブランチ: `studio/flagship`（基点コミット: gate-release = 2fe12bc、デザイン作り直し後は最新コミット）

## 一行ピッチ
暗い洞窟を、ついてくるホタルの群れごと導いて進む。群れが大きいほど明るく高得点、でも大きいほど狭い隙間を抜けられない。

- 操作: 画面のどこでも左右にドラッグするだけ（片手・縦持ち）。1ランは 30秒〜2分半。
- 中身: 5つの層（あさせ → こけの道 → しずくの間 → ねの森 → ねむりの底）。層ごとに新しい罠（風穴・水たまり・根のカーテン・黒石）が1つずつ増える。ねむり花、図鑑12種、群れの色5種の解放、ベスト記録。効果音と層ごとのBGMはコードで生成。オフラインで遊べるPWA。
- 課金・広告・通知・アカウント・外部通信は一切なし。

## 見た目（2026-10-01 作り直し）
オーナーの方針「AIが作った感をなくす」を受けて、見た目を作り直した。題材は「墨と和紙＋蛍籠」。闇は墨で塗った和紙として描き、ホタルの光の輪の中だけ墨がぬぐわれて紙の地と繊維が見える。ホタルは実際の蛍の黄緑で、版ずれのように重ねて描く。
- パレット: 墨 #1C1915 / 楮 #DDD4B8 / 蛍 #C6DA3C / 朱 #D2432B / 藍 #2F4F7A / 薄紅 #E8A3A0
- 書体: Yuji Boku（題字・見出し）と Kiwi Maru（本文・数字）。使う文字だけのサブセットを同梱しているので、外部通信なしでオフラインでも表示できる（SIL OFL 1.1）。

## スクリーンショット（`studio/release-shots/`）
| ファイル | 内容 |
|---|---|
| title.png | タイトル。墨の中の紙の輪に、縦書きの題字 |
| play-layer1.png | 層1「あさせ」。チュートリアルの吹き出し、群れ5匹 |
| play-layer3.png | 層3「しずくの間」。群れ17匹、水たまり、風穴、隙間 |
| result-360x640.png | リザルト（360×640） |

## 各判定の要約
| 判定 | 担当 | 結果 | 記録 |
|---|---|---|---|
| Gate 1 コンセプト | AI相棒（オーナーから委任） | 3案から C案を採用 | studio/concept.md, decisions.md |
| 新規性調査 | gs-researcher | 新規性 中〜高（群れの数が視界・倍率・幅を同時に動かす作品は見つからず。検索8回の範囲） | studio/research/concept-scan.md |
| 自動ゲート（slice） | gate_check | PASS | — |
| 垂直スライス | gs-playtester | 面白さの核が届いている（PASS） | studio/playtests/slice/report.md |
| 世界観監査 | gs-worldbuilder | 表記ゆれ2件を修正。避ける表現なし | studio/reviews/world-audit.md |
| **自動ゲート（release）** | gate_check | **PASS**（初心者ボット 中央値210点/33秒、上達者ボット 3039点/126秒、上達比 約14倍、詰まり37%、コンソールエラー0、FPS 60） | — |
| リリースレビュー | gs-reviewer | 条件付き → ブロッカー1件（一時停止なし）を修正済み。PM がブラウザで停止・再開を確認 | studio/reviews/release.md |
| リーガル | gs-legal | YELLOW（RED なし）。外部通信・第三者素材・個人情報・課金はなし、点滅は毎秒1.5回以下。追加したフォントは GREEN（OFL の条件を満たす） | studio/legal/concept-check.md, release-check.md |
| デザインの再レビュー | gs-reviewer（frontend-design / game-art-direction 基準） | 条件付き → **「AIが作った感」7/10**（6未満はブロッカー）。ブロッカー1件「HUD の数字が筆書体で読めない」は、数字を Kiwi Maru に替えて修正し、PM がスクショで確認 | studio/reviews/design.md |

エージェント呼び出し: 18回（eco 上限20）。

## 既知の問題・未確認
1. **実機（iPhone / Android）では未確認。** 確認はヘッドレスブラウザ（スマホ画面サイズ）だけ。ドラッグの手触り、音、振動、ホーム画面への追加は実機で見ていない。
2. **浅い層（1〜3）の「隙間へ寄せる流れ」が強め。** プレイテストでは「自動操縦に感じるかも」と指摘された。弱めると、ランダム入力の初心者ボットが基準に届かなくなるため据え置いた（decisions.md）。公開後の感触を見て調整する。
3. 上達者ボットは層5以降の加速で2分半前後で止まる。人間の上級者がもっと長く続けた場合の体験は未確認。
4. 図鑑の出現条件の数値（スコア400/3000、花5/40など）は推定値で、シミュレーションでは検証していない。
5. 英語版はない（日本語のみ）。
6. reviewer の改善提案（P3）のうち、360×640 以外の回転や60秒放置などは未確認。
7. 紙の質感を入れてから、ヘッドレス計測の最低 fps が 33〜38 に下がる回がある（基準30はクリア）。古い端末での重さは未確認。
8. フォントの原本（各書体のリポジトリの著作権表示）は、公開前に目視で確認する（法務より）。

## 公開前に人間がやること（法務より）
- [ ] **商標の確認**: J-PlatPat で「トモシムレ」「トモシ」を区分9・41で検索する（この環境では未実施）。
- [ ] **ライセンス方針を決める**: リポジトリに LICENSE ファイルがない（例: コードは MIT、絵と音は all rights reserved）。
- [ ] **GitHub Pages の利用条件**の最新版を確認し、確認日を残す。リポジトリが非公開なら、Pages に有料プランが必要か確認する。

## 公開手順（オーナーの承認後）
ブランチから配信する方式では `/` か `/docs` しか選べないため、GitHub Actions で `game/` だけを配信する。
1. `studio/flagship` を main にマージする（PR の作成から。**マージにはオーナーの一言確認が必要**）。
2. 下のワークフローを `.github/workflows/pages.yml` として main に追加する。
3. Settings → Pages → Source を「GitHub Actions」にする（初回だけ）。
4. Actions の「Deploy game to Pages」が成功したら、https://yminami0210.github.io/game-platform/ をスマホで開き、起動、ホーム画面への追加、機内モードでの再起動を確認する。
5. 2回目以降に更新するときは、`game/sw.js` の CACHE_VERSION を上げてから main にマージする。

```yaml
name: Deploy game to Pages
on:
  push:
    branches: [main]
    paths: ['game/**']
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: game
      - id: deployment
        uses: actions/deploy-pages@v4
```
注意: `game/` には `test/` と `package.json` も含まれるが、配信されても害はない（秘密情報なし）。気になる場合は upload の前に削除するステップを足す。

## オーナーに決めてほしいこと
1. この内容で公開してよいか（Gate 2）。
2. ライセンス方針（上記）。
3. 次の一手: 実機での手触り確認後の調整、英語版、層6以降の追加のどれを優先するか。
