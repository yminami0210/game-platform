# タスクボード

状態: todo / doing / done / blocked（blocked は理由を書く）

| ID | フェーズ | 担当 | 内容 | 読むもの | 完了条件 | 依存 | 状態 |
|---|---|---|---|---|---|---|---|
| T-001 | 2 | gs-worldbuilder | 世界観バイブル初稿 | concept.md | world-bible.md | - | done |
| T-002 | 2 | gs-design-manager | デザインシステム＋音の方針 | concept.md | design-system.md | - | done |
| T-003 | 2 | gs-balance | 数値モデル初稿 | concept.md | balance.md, balance-proposal.json | - | done |
| T-010 | 3 | gs-coder | core: 群れ・壁・隙間・はぐれ・層・得点・clone/actions/step、決定的テスト | brief, gdd §2§3§8§9 | npm test / check_build OK | T-003 | done（gate slice PASS。層1-2実装、3-5は表のみ。洞窟の流れ pull で浅層を補助） |
| T-011 | 3 | gs-coder | 描画: 闇マスクの光、ホタル、壁、はぐれ、HUD、散る/拾う演出（最小） | brief, design-system §光§形 | 起動して遊べる | T-010 | done（gate slice PASS。層1-2実装、3-5は表のみ。洞窟の流れ pull で浅層を補助） |
| T-012 | 3 | gs-coder | 入力: 相対ドラッグ、キー、__GS__ フック | gdd §3 | gate_check slice | T-010 | done（gate slice PASS。層1-2実装、3-5は表のみ。洞窟の流れ pull で浅層を補助） |
| T-020 | 4 | gs-content-creator | layers / creatures / texts / colors の JSON | brief, world-bible | JSON検証OK | T-010 | done |
| T-021 | 4 | gs-design-manager | タイトル・遊び方・ずかん・設定・リザルト画面、アイコン、エフェクト | brief, design-system | 画面が揃う | T-011 | done |
| T-022 | 4 | gs-sound | 効果音と層別BGM、ミュート | brief, design-system §音 | 鳴る/止まる | T-011 | done（sfx.js 拡張: start/pickup/scatter/gate/bloom/layer/fail/puddle、bgm.js新規: startBgm/setBgmLayer/stopBgm、五音階ペンタトニック、同時発音制限、ピッチ微調整） |
| T-023 | 4 | gs-coder | 罠4種、ねむり花、図鑑・色の保存、チュートリアル、組み込み | gdd §2§5§6§7 | gate_check release | T-020 | done |
| T-024 | 5 | gs-coder | リリースレビュー B1（ひとやすみ）・P2/P3・README・公開準備 | studio/reviews/release.md | gate_check release | T-023 | done |
| T-030 | 5 | gs-reviewer | リリース判定 | 差分、gate 結果 | 判定 | T-023 | done |
| T-031 | 5 | gs-legal | リリース前チェックリスト | legal-checklist | 判定 | T-023 | done |
| T-040 | 6 | gs-designer | 見た目の作り直し（墨と和紙＋蛍籠。書体 Yuji Boku + Kiwi Maru 同梱、renderer・画面・アイコン・sw v6） | design-system v2, game-art-direction | npm test / check_build OK、playtest エラー0 | T-031 | done（自己採点「AIが作った感」3/10） |
