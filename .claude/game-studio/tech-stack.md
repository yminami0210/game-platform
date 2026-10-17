# 技術規約（全エージェント共通）

## 前提

- 配信: GitHub Pages。スマホのブラウザでURLを開けば即プレイ、ホーム画面に追加でアプリのように起動（PWA）。
- **ビルド工程なし**の素のES Modules。`game/` フォルダがそのまま公開物になる。ビルドが無いと、エージェントが壊すものが減り、公開が確実になる。
- `package.json` は開発用（テスト、プレイテスト）だけ。ブラウザに届くコードは npm パッケージに依存しない。

## フォルダ構成

```
.github/workflows/pages.yml   game/ を GitHub Pages に自動デプロイ
game/
  index.html                  1枚だけ。<canvas> と最小限のUI
  manifest.webmanifest        PWA
  sw.js                       オフライン用サービスワーカー（CACHE_VERSION を上げて更新）
  icons/                      icon.svg, icon-192.png, icon-512.png
  src/
    main.js                   起動、ゲームループ、__GS__ の公開
    core/                     純粋ロジック。DOM/Canvas/Audio/時間APIに触れない。乱数はシード付き
    render/                   Canvas 描画（core の state を読むだけ）
    input/                    タッチ/マウス/キーを「行動」に変換
    audio/                    Web Audio（イベント購読）
    ui/                       メニュー、設定、リザルト
    data/                     *.json（balance, levels, enemies, text…）
    save.js                   localStorage（バージョン番号つき、壊れていても落ちない）
  test/                       node --test 用
  LICENSES.md                 第三者物の一覧（無ければ「なし」と書く）
  README.md                   遊び方、クレジット
studio/                       チームの共有ドキュメント（公開されない）
```

## core の書き方（重要）

```js
// core は「状態」と「行動」と「時間の刻み」だけで動く
export function createGame({ seed, data }) { ... return state }
export function actions(state)            // その時点で取れる行動の一覧
export function step(state, action, dt)   // 状態を進め、発生したイベント配列を返す
```
- 描画・音・入力は core のイベントと state を見て動く。
- `dt` は固定刻み（例: 1/60秒）で回す。表示フレームとロジックを分けると、端末差が出ず、シミュレーションも正確になる。
- 乱数は `core/rng.js` のシード付き乱数だけを使う（`Math.random` 禁止）。再現性がないとバグ報告もバランス検証もできない。

## __GS__（テレメトリとボット用フック）

`main.js` で `window.__GS__ = { state, events, bot: { actions, step }, version }` を公開する。`events` は `{t, type, ...}` の配列（start / fail / clear / retry / score / 任意）。playtester と balance はこれに依存するので、形を変えるときは PM に知らせる。

## 性能とスマホ対応の予算

- 初回ロード合計 1.5MB 以下（目安）、初期表示 3秒以内（低速4G想定）
- 60fps 目標、低端末で30fps を下回らない。毎フレームの生成（new、配列確保）を避ける
- Canvas は devicePixelRatio に合わせ、上限2倍
- 縦持ち前提、`viewport-fit=cover` とセーフエリア、ピンチズーム・長押しメニュー・プルリフレッシュを抑止
- タップ領域 44×44px 以上、主要操作は画面下半分
- `visibilitychange` で一時停止、復帰時に dt の暴走を防ぐ
- 外部通信なし（CDN、Webフォント、解析タグを入れるなら legal の確認が先）

## 禁止

`eval` / `new Function`、`Math.random`（core 内）、外部スクリプト読み込み、`document.write`、ユーザー入力の innerHTML 直挿し。`scripts/check_build.mjs` がこれらを検査する。

## テスト

`cd game && npm test`（node --test）。最低限: core が決定的であること（同じシード・同じ行動列で同じ結果）、1000ステップ回して例外が出ないこと、データJSONの読み込み。

## 公開手順（Phase 6）

1. リポジトリを GitHub に作成し push（人間の GitHub 権限が要る場合は手順を提示してお願いする）。`gh` があれば: `gh repo create <名前> --public --source . --push`
2. GitHub のリポジトリ設定 → Pages → Source を「GitHub Actions」にする（`gh api -X POST repos/<owner>/<repo>/pages -f build_type=workflow` でも可）
3. `main` への push で `.github/workflows/pages.yml` が `game/` を公開する
4. 公開URL `https://<owner>.github.io/<repo>/` をスマホで開いて起動確認。サービスワーカーの更新は `sw.js` の CACHE_VERSION を上げる
