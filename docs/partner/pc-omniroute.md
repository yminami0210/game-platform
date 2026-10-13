# PC で動かす（OmniRoute を使うとき）

クラウドのセッション（claude.ai/code）からは、OmniRoute（127.0.0.1:20128）とオーナーの PC に届かない。
文章を OmniRoute に書かせる作業（CLAUDE.md §10）は、**オーナーの PC で動く Claude Code のセッション**で行う。

## はじめの1回だけ（PC で）
```bash
git clone https://github.com/yminami0210/game-platform.git   # すでにあれば git -C game-platform pull
cd game-platform
git fetch origin ccr-3b71b4a0-xvetzp && git checkout ccr-3b71b4a0-xvetzp
npm install
omniroute serve --daemon --no-open      # 127.0.0.1:20128 で待ち受け
python3 tools/omni_task.py clerk <(echo "「はい」とだけ返してください。") /tmp/omni-ping.txt && cat /tmp/omni-ping.txt   # 動くかの確認
```
- `tools/omni_task.py` は、OmniRoute が失敗すると `tools/gemini_draft.py` に切り替える。このファイルはリポジトリに入っていないので、使うなら PC に置く（キーは環境変数で渡し、ファイルに書かない）

## 作業するとき
- **Claude のアプリから PC を動かす**: PC のこのフォルダで `claude remote-control` を起動すると、Claude Code のアプリ（スマホ・ブラウザ）にそのセッションが出る。そこで頼めば、PC の上で OmniRoute を使って作業する
- または Claude デスクトップアプリで、このフォルダを開いて作業する
- 町を OmniRoute つきで動かす: `NANASHI_LLM_MODE=omniroute npm start`（`http://localhost:8787`）

## クラウドとの分担
| どこで | 何をする |
|---|---|
| クラウド（いまのセッション） | 町の画面・仕組みの開発、テスト、Artifact の更新（トークン 0 のテンプレート） |
| PC | OmniRoute に文章を書かせる仕事（SNS の下書きの言い換え、県民だより、記事）。Instagram などへの投稿 |

作業ブランチ `ccr-3b71b4a0-xvetzp` を両方で使う。PC で作業したら commit して push し、クラウドでは pull してから続ける。
