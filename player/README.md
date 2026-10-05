# ミニゲームの遊び場（player）

毎日増えるミニゲームを、一覧から選んでその場で遊べる画面。**日々のバッチ（/arcade-make）とは別物**として管理する。

- 作品キャンバス（Core → How）: [`docs/product/player/canvas.md`](../docs/product/player/canvas.md)
- デザインコンセプト（事前審査に合格したもの）: [`design.md`](design.md)、見本 `design/`

## 開き方
`fetch` でゲームの一覧を読むので、ファイルを直接開く（file://）のではなく、リポジトリのルートで簡単なサーバーを立てて開く。
```
python3 -m http.server 8000      # または npx serve .
# → http://localhost:8000/player/
```
特定のゲームを直接開く: `http://localhost:8000/player/#play-001-bloom-chain`

## スマホから開く（非公開の Artifact）
- **https://claude.ai/artifact/7oichDRhSjwFZnW8mwZQBz** （オーナーだけが開ける非公開ページ。スマホの Claude アプリ／ブラウザで開く）
- 作り方: `python3 player/bin/bundle.py <出力フォルダ>` で遊び場と遊べるゲームを1つのフォルダに束ね、その `index.html` を Artifact として公開し、`files.json` を files に渡す（同じファイルパスで公開し直すと同じ URL のまま更新される）
- 毎朝のゲームは自動では載らない。AI相棒に「遊び場を更新して」と頼むと束ね直して公開し直す
- Artifact の制約に合わせ、ゲームを直接開くリンクは `#play-<id>` の形にしている

## しくみ
| ファイル | 役割 |
|---|---|
| `index.html` | 一覧（紙芝居の舞台と絵札）と、遊ぶ画面 |
| `js/catalog.js` | `arcade/catalog.json`（バッチが作る）を**読むだけ**。遊べる（ready/published）ものを新しい順に |
| `js/launcher.js` | ゲームを始める・終える処理。一覧からも、将来の「街」からも同じ関数で呼ぶ |
| `data/best-keys.json` | 既存ゲームのベストスコアの保存キー。新しいゲームは `meta.json` の `best_key` を使う |
| `tests/smoke.mjs` | 一覧 → 遊ぶ → 戻る の自動確認（Playwright） |

## バッチとの分担
- バッチ（/arcade-make）は `arcade/` だけを書く。`player/` には触らない
- 遊び場は `arcade/` を読むだけ。新しいゲームが ready になれば、何もしなくても一覧に並ぶ

## これから（ロードマップ）
- M2: 街の画面。住人ごとにミニゲームを割り当て、話しかけると `launcher.open(game, { from: "town" })` で始まる。割り当ては `data/residents.json` のようなデータで持つ
- M3: 住人との会話、遊んだ記録、街が少しずつ賑わう仕掛け
