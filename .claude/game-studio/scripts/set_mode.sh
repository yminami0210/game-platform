#!/usr/bin/env bash
# 使い方: bash set_mode.sh <eco|standard|full> [プロジェクトのフォルダ]
# .claude/agents/gs-*.md の model: を書き換える。反映には Claude Code の再起動が必要。
set -euo pipefail
MODE="${1:?eco|standard|full}"; DEST="${2:-.}"; A="$DEST/.claude/agents"
model_for() { # agent -> model
  case "$MODE" in
    eco) case "$1" in gs-playtester|gs-sound) echo haiku;; *) echo sonnet;; esac;;
    standard) case "$1" in gs-coder|gs-reviewer) echo opus;; *) echo sonnet;; esac;;
    full) echo inherit;;
    *) echo "unknown mode: $MODE" >&2; exit 1;;
  esac
}
for f in "$A"/gs-*.md; do
  n="$(basename "$f" .md)"; m="$(model_for "$n")"
  if grep -q '^model:' "$f"; then sed -i.bak "s/^model:.*/model: $m/" "$f"; else sed -i.bak "0,/^tools:/s//model: $m\ntools:/" "$f"; fi
  rm -f "$f.bak"; echo "  $n -> $m"
done
S="$DEST/studio/STATUS.md"; [ -f "$S" ] && sed -i.bak "s/^- mode: .*/- mode: $MODE/" "$S" && rm -f "$S.bak"
echo "mode=$MODE（Claude Code を再起動すると反映）"
