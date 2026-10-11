#!/usr/bin/env bash
# Claude Code を OmniRoute 経由で起動する（安いモデル・無料枠に回してトークン上限を守る）。
# 予備の方法。普段のルーティンは tools/omni_task.py（会社の「OmniRoute 運用設定」）を使う。
# 事前に OmniRoute を起動しておく: omniroute serve --daemon --no-open（127.0.0.1:20128）
# キーは環境変数で渡す（ファイルに書かない）: export OMNIROUTE_API_KEY=...
set -euo pipefail
: "${OMNIROUTE_API_KEY:?OMNIROUTE_API_KEY を設定してください}"
export ANTHROPIC_BASE_URL="${OMNIROUTE_URL:-http://127.0.0.1:20128}"
export ANTHROPIC_AUTH_TOKEN="$OMNIROUTE_API_KEY"
exec claude "$@"
