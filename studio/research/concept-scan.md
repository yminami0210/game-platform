# Phase 1 新規性調査: 3案まとめ (2026-10-01)

調査範囲: WebSearch 8回(英語中心、日本語1回)、WebFetch 0回。ストア本文・プレイ映像は未確認。
凡例: 【確認】=検索結果で確認 / 【知識】=知識ベース(未検証)。

## 結論
| 案 | 新規性 | 一文の理由 |
|---|---|---|
| A ほしわたり | 低 | 「軌道からタップで離脱し次の惑星へ」は一タップ系の定番で、同型が5本以上ある。残る差は「星座の線・図形閉じ」のみ |
| B 波紋灯籠 | 中〜高 | 「波で間接的に押す」の先行例(Ripple Ruler)は存在するが、ゲームジャム作で1ラン短時間のアーケード化は見つからず |
| C ホタルの群れ | 中〜高 | 群れ操作(SwarmLight)、群れ拡大(Count Masters)は各々ある。「大きいほど明るい=得点倍率、かつ幅が広がり不利」の同時成立は見つからず |
推し: **C**(新規性は中〜高、熱中のループが「育てる→守る→散る」と自然に回る)。

## 案A ほしわたり
### 近い既存作
| 名前 | URL | 同じ点 / 違う点 |
|---|---|---|
| Orbit Snap | https://play.google.com/store/apps/details?id=com.orbitsnap.game&hl=en_US | 同: 周回中にタップで離脱し次の軌道へ。違: 星座演出なし |
| Orbit Jump | https://play.google.com/store/apps/details?id=com.vipergames.orbitjump&hl=en_IN | 同: 軌道から軌道へ。違: 同上 |
| Perfect Orbit | https://play.google.com/store/apps/details?id=com.ioapps.perfect_orbit&hl=en_US | 同: 周回→発射→着地 |
| Hop Rocket | https://play.google.com/store/apps/details?id=com.planethopper.game&hl=en | 同: 重力スイングで次の惑星へ |
| Orbit (Godot, 101地点+12ジャンプごとボス) | https://itch.io/t/7030234/orbit-one-tap-space-arcade-android-godot-4-is-it-clear-without-a-tutorial | 同: 一タップ離脱。軌道が縮む圧力あり |
| Crystal Orbit / Orbit Hopper / Hop Planet (itch.io) | https://taso-studios.itch.io/crystal-orbit/devlog/1649142/crystal-orbit-is-out-hop-orbits-inside-a-crystal-solar-system , https://bastagamestudio.itch.io/orbit-hopper/devlog/1630861/orbit-hopper-let-go-at-the-right-moment , https://tate1605.itch.io/hop-planet | 同: 同型。類似作が多数 |
| Star Art / Constellation Station 等 | https://play.google.com/store/apps/details?id=games.taplab.vertex&hl=en , https://www.abcya.com/games/constellation-station | 星座を線でつなぐ別ジャンル(お絵描き・知育)。軌道との組合せは未発見 |
### 熱中と落とし穴
- 熱中: タイミング1つで成否が決まる→即リトライ。連続成功のリズム。星座が完成する「収集欲」はA固有の追加要素。
- 落とし穴: ストアが飽和で埋もれる。星座を閉じるには移動経路を計画的にする必要があり、タイミングゲームの「反射」と衝突しやすい(図形を狙うと難しすぎ、無視されると装飾に終わる)【推測】。
### 検索語と未発見
- 「constellation drawing arcade game connect stars orbit」で軌道×星座線の組合せは見つからず(ただし8回の検索の範囲のみ)。
### 名前
- 「ほしわたり」: 日本語検索で同名ゲームは見つからず(「ほしわたり ゲーム」を他2語とOR検索した1回のみ、精度は低い)。商標は【未確認】(J-PlatPat未検索)。
- 英語名候補は「Orbit〜」系が極めて多く衝突しやすい。避ける。

## 案B 波紋灯籠
### 近い既存作
| 名前 | URL | 同じ点 / 違う点 |
|---|---|---|
| Ripple Ruler (GMTK Jam 2023) | https://winteralexander.itch.io/ripple-ruler | 同: 波紋を操作して船を目的地へ押す(間接操作)。違: 全9面のステージ制、障害物(岩・流木・アヒル)、色の仕分けなし |
| Ripple Pool | https://getripplepool.com/support | 同: 波紋が物を押す。違: ドラッグで水滴を発射する物理パズル、同色を合体 |
| Ripple (Skxptic0) | https://skxptic0.itch.io/ripple | 同: 一タップで波紋。違: 波の干渉で目標を光らせるゼン系パズル、失敗なし |
| Digital Ripple | https://digitalripple.space/ | 信号の波が干渉するパズル。灯籠なし |
### 新規性
- 中〜高。「灯籠×同色の岸」の組合せは見つからず(検索「lantern water ripple game indirect control」で灯籠系は一件もなし)。ただし「波で間接的に押す」自体はRipple Rulerが先行しているので、売りは「アーケード短ラン+色マッチ」。
### 熱中と落とし穴
- 熱中: 「思い通りに動かない」予測の楽しさ、連鎖。波の干渉(重なると強まる)を覚えて上達する。
- 落とし穴: 波の物理が読めないと運ゲーに感じる(1ラン30〜120秒だと学習が間に合わない)【推測】。画面が小さい縦画面では波の伝わりが見えにくい。灯籠が増えると画面が混雑。波は連打で解決しやすいので、タップ回数/インクのコスト設計が必要。
### 検索語と未発見
- 「lantern water ripple game indirect control waves carry lanterns to shore mobile」: 灯籠ゲームは出ず(Ripple Rulerのみ)。「波紋灯籠 ゲーム」: 該当なし。
### 名前
- 「波紋灯籠」: 検索で同名ゲームなし。「Ripple」は一般語で類似タイトル多数(Ripple, Ripple漾, Ripple Pool, Ripple Ruler)。英題に「Ripple」を単独で使うのは避ける。「Lanterns: The Harvest Festival」(Renegade Game Studios)は灯籠を題材にした有名ボードゲーム。英題に「Lanterns」を使うと衝突しうる。商標【未確認】。

## 案C ホタルの群れ × 逆スネーク
### 近い既存作
| 名前 | URL | 同じ点 / 違う点 |
|---|---|---|
| SwarmLight (itch.io) | https://saniag.itch.io/swarmlight | 同: 複数のホタルを一つの生き物として操作、密集して狭所を抜け、広げて照らす。違: 一人称の物理パズル探索、得点倍率なし |
| Spelunking Spark | https://mrworldwide45.itch.io/spelunking-spark | 同: 洞窟でホタルが光る。違: 一匹、光の管理 |
| Firefly (Shukelven) / Flare in the Dark | https://shukelven.itch.io/firefly , https://kalponic-games.itch.io/flare-in-the-dark | 同: 暗闇のホタル。違: 一匹 |
| Count Masters 系 | https://apps.apple.com/us/app/count-masters-crowd-runner-3d/id1568245971 | 同: 左右操作で群れを増やし、狭い足場・罠で減る。違: 3D、ゲートで増減、戦闘 |
| htoL#NiQ ホタルノニッキ | https://www.4gamer.net/games/250/G025026/20140311036/ | 光るホタルで導く。別ジャンル(PS Vita) |
| Reversed Snake | https://imbios.github.io/lab-snake-reverse/ | 「逆スネーク」はリンゴ側で遊ぶ別物。尾が伸びる「スネーク」の構造は定番 |
### 新規性
- 中〜高。群れ操作、ホタルの暗闇、群衆増殖のどれも先行例あり。「サイズが得点倍率と視界を上げつつ通過を難しくする」という一つの数値に利益と不利益を両方結びつける設計は、検索で見つからず(「reverse snake game bigger swarm harder to pass gaps」で関連なし)。ただし 8回の検索の範囲。Snake系の「伸びるほど難しい」も同様の構造で、概念自体は新しくない【知識】。
### 熱中と落とし穴
- 熱中: 欲張りの葛藤(増やしたいが通れなくなる)。散って減っても少しずつ戻せる回復ループ。倍率が上がるほど失う怖さが増す。
- 落とし穴: 群れ描画のCPU負荷(スマホ・PWA)。大群の操作感が悪いと「ぬるぬる」でストレス。ホタルが散る罰が大きすぎると一撃で終わり、小さすぎるとジレンマが消える。暗闇だと状況把握が難しい(見える範囲が狭い序盤は不親切)。
### 検索語と未発見
- 「fireflies swarm game flock follows cursor dark cave avoid obstacles」: SwarmLight等は出るが、倍率つき縦スクロールは出ず。「ホタル 群れ 操作 スマホゲーム」: 該当なし(育成放置系のみ)。
### 名前
- 「ホタル」関連: htoL#NiQ ホタルノニッキ(日本一ソフトウェア)、Hotaru(Steam)、ほたる育成ゲーム(アプリ)。英題「Fireflies」(Nest Game Studio, itch.io)、「Firefly」は同名多数。単独語は避け、固有名詞を足す。商標【未確認】。
- 「Swarm」は Swarm(2011) / Swarm(1998) など同名ゲームあり。

## 全体の注意
- 外部通信は可能だったが、今回の検索は抜粋のみで判断。ストア内のDL数・評価は未確認。
- 各案の商標は J-PlatPat/USPTO を未検索。legal へ引き継ぐ。
- 差別化の追加提案: A→星座の形を毎回違う「お題」にする、B→色の混ざる/ぶつかる仕掛けで短ランに、C→現状の仕様を軸に洞窟の風でリズムを作る。
