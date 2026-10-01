# トモシムレ

暗い洞窟を、ついてくるホタルの群れごと導いて進む、指一本のスマホ向けブラウザゲームです。

遊びます: https://yminami0210.github.io/game-platform/
ホーム画面に追加すると、アプリのように起動し、オフラインでも遊べます。

## 遊び方

- 画面を指でなぞって、ひかり（先頭のホタル）を左右に動かします。群れがあとをついてきます。
- 壁のすき間を群れごと通り抜け、花をともして奥へ進みます。ぶつかると群れが散ります。
- 右上の「ひとやすみ」ボタンで一時停止できます。

## ローカルでの起動

```bash
cd game
node ../.claude/game-studio/scripts/serve.mjs .   # または npm run serve
```
表示された URL をブラウザで開きます（スマホは同じネットワークから）。

## テスト

```bash
cd game
npm test
node ../.claude/game-studio/scripts/check_build.mjs
```

## 公開手順（GitHub Pages・人間が行う）

ブランチから配信する方式では `/`（ルート）か `/docs` しか選べず、`/game` は直接選べません。そのため GitHub Actions で `game/` だけを配信します。手順は `studio/release-pack.md` の「公開手順」にあるワークフロー（`.github/workflows/pages.yml`）を使います。

1. オーナーの承認後、`studio/release-pack.md` のワークフローを `.github/workflows/pages.yml` として追加し、`main` にマージする。
2. GitHub の yminami0210/game-platform → Settings → Pages を開き、Source を「GitHub Actions」にする（初回だけ）。
3. Actions タブで「Deploy game to Pages」が成功したら、https://yminami0210.github.io/game-platform/ をスマホで開き、起動と機内モードでの再起動を確認する。
4. リポジトリが非公開の場合、Pages の利用には有料プランが必要なことがある（要確認）。

## ライセンス

第三者素材とその条件は [LICENSES.md](LICENSES.md) を参照。

## クレジット

このゲームは AI エージェントのチームによって制作されました。
