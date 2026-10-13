#!/usr/bin/env bash
# ナナシ県を OmniRoute 経由で起動する（npm run start:omni）。
# 町の文章（SNS 投稿・新聞）は OmniRoute の writer（tools/omni_models.json）が書く。
# OmniRoute が止まっていれば裏で起動する。使えなければゲーム側が自動でテンプレートに落ちる。
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="/opt/homebrew/opt/node@24/bin:/opt/homebrew/bin:$HOME/.local/bin:$PATH"
OMNI="${OMNIROUTE_URL:-http://127.0.0.1:20128}"

up() { curl -s -o /dev/null -m 5 "$OMNI/v1/models"; }
if ! up; then
  echo "OmniRoute を起動します…"
  omniroute serve --daemon --no-open >/dev/null 2>&1 || true
  for _ in $(seq 30); do up && break; sleep 2; done
fi
up && echo "OmniRoute: $OMNI" || echo "OmniRoute に接続できません。テンプレートの文章で動きます" >&2

export NANASHI_LLM_MODE=omniroute
exec node server/index.js
