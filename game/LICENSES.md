# 第三者ライセンス

| 名前 | 種類 | 出典URL | ライセンス | 表記義務 | 使用箇所 |
|---|---|---|---|---|---|
| Yuji Boku（書体・見出し/題字/数字。使う文字だけのサブセット woff2） | フォント | https://fonts.google.com/specimen/Yuji+Boku / https://github.com/Kinutafontfactory/Yuji | SIL Open Font License 1.1 | Copyright 2021 The Yuji Project Authors。ライセンス本文を fonts/OFL.txt に同梱 | game/fonts/yuji-boku.woff2 |
| Kiwi Maru（書体・本文/ボタン。同サブセット） | フォント | https://fonts.google.com/specimen/Kiwi+Maru / https://github.com/Kiwi-KawagotoKajiru/Kiwi-Maru | SIL Open Font License 1.1 | Copyright 2020 The Kiwi Maru Project Authors。fonts/OFL.txt に同梱 | game/fonts/kiwi-maru-500.woff2 |

- 第三者の素材は上記2書体のみ。ライブラリ・画像・音の第三者素材はない。
- 画像: アイコン（icons/）はコード由来の自作SVG/PNG。ゲーム内の絵はすべて Canvas/SVG によるコード生成。
- 音: BGM・効果音はすべて Web Audio API（オシレーター）による合成。音声ファイルなし。
- OFL 1.1 の条件: 著作権表示とライセンス全文（両書体分）を fonts/OFL.txt に同梱。両書体とも Reserved Font Name の指定なし。サブセット化は改変版にあたるが RFN がないため名称使用に制限なし。フォント単体での販売はしない（ゲームに同梱して配布）。
- フォント: 上記2書体を game/fonts/ に同梱（実行時の外部通信なし）。取得・再生成は studio/tools/fetch-fonts.sh（Google Fonts から使う文字だけを取得）。読めない環境ではシステムの明朝/ゴシックに落ちる。
- 実行時の依存: なし（ビルド不要の素の ES Modules）。playwright はテスト用の開発依存で、配布物に含まれない。

生成AIで作った素材: コード生成のみ（画像・音の生成AI素材なし）。コードは AI エージェント（Claude）が作成。
