# ツギ 3案の共通仕様（デザイナー向け）

- 守ること: `.claude/skills/frontend-design/SKILL.md`、`.claude/skills/game-art-direction/SKILL.md`、`studio/characters/similarity.md`（避ける組み合わせ）、`studio/world-bible.md`、`studio/design-system.md`
- 頭身 2〜2.5。太く単純なシルエット。ひと目で覚える「印」を1つ。顔は刺繍で表せる線だけ（ボタン目・×の縫い口・ジッパーは禁止）。目は大きめで表情が出ること
- 置き場所: `studio/characters/tsugi/<A|B|C>/`
  - `sheet.svg` と `sheet.png`（幅1600px以上）: 正面・横・後ろ・斜めの4方向、表情6種（ふつう・笑う・驚く・困る・怒る・眠い）、決めポーズ2つ
  - `silhouette.png`: 正面と決めポーズの黒塗り
  - `palette.md`: 名前つきの色5色以内（実在する染め色の名前と hex）
  - `plush.md`: 高さ20cmのぬいぐるみの型紙の分け方、素材（フェルト・綿布・ボア等）、目と口は刺繍、細すぎて縫えない所の確認
  - `sprite.json`: ゲーム内ドット絵。形式は下記
  - `notes.md`: 一行の性格、デザインの狙い、似ているものとの違い
- PNG 化: playwright がグローバルにある（`createRequire(\`${npm root -g}/x.js\`)('playwright')`、Chromium は /opt/pw-browsers）。SVG をページに置いてスクリーンショット

## sprite.json の形式（エンジンにそのまま読み込む）
```json
{ "w": 28, "h": 28,
  "palette": { "K": "#2b2420", "R": "#b8372b", ... },   // 1文字=1色、10色まで。'.' は透明
  "frames": { "stand": [28行の文字列], "run1": [...], "run2": [...], "run3": [...], "jump": [...], "fall": [...] } }
```
- 右向きで描く（左向きはエンジンが反転）。足は一番下の行に着ける。キャラの高さは 24〜26px（画面の高さ144pxの約1/6）
- 輪郭は墨（真っ黒ではない濃い色）1px。小さくても印（房・針など）が読めること
