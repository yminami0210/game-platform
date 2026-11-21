#!/usr/bin/env bash
# 使い方: bash setup_studio.sh <プロジェクトのフォルダ> [--mode eco|standard|full]（既定 eco）
# サブエージェント・参照資料・スクリプト・studio/ テンプレート・game/ 雛形を配置する。既存ファイルは上書きしない。
set -euo pipefail
SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$(cd "${1:-.}" && pwd)"
MODE=eco; if [ "${2:-}" = "--mode" ]; then MODE="${3:?}"; fi
copy_new() { # src dst : dst が無ければコピー
  if [ -e "$2" ]; then echo "  skip (exists): ${2#$DEST/}"; else mkdir -p "$(dirname "$2")"; cp -R "$1" "$2"; echo "  add: ${2#$DEST/}"; fi
}
echo "== agents -> .claude/agents/"
for f in "$SKILL_DIR"/agents/*.md; do copy_new "$f" "$DEST/.claude/agents/$(basename "$f")"; done

echo "== references, scripts, templates -> .claude/game-studio/ (常に最新版で更新)"
mkdir -p "$DEST/.claude/game-studio"
cp "$SKILL_DIR"/references/*.md "$DEST/.claude/game-studio/"
rm -rf "$DEST/.claude/game-studio/scripts" "$DEST/.claude/game-studio/templates"
cp -R "$SKILL_DIR/scripts" "$DEST/.claude/game-studio/scripts"
cp -R "$SKILL_DIR/templates" "$DEST/.claude/game-studio/templates"

echo "== studio/ (チームの共有ドキュメント)"
mkdir -p "$DEST"/studio/{reviews,legal,playtests,research}
copy_new "$SKILL_DIR/templates/status.md"    "$DEST/studio/STATUS.md"
copy_new "$SKILL_DIR/templates/concept.md"   "$DEST/studio/concept.md"
copy_new "$SKILL_DIR/templates/brief.md"     "$DEST/studio/brief.md"
copy_new "$SKILL_DIR/templates/gates.json"   "$DEST/studio/gates.json"
copy_new "$SKILL_DIR/templates/gdd.md"       "$DEST/studio/gdd.md"
copy_new "$SKILL_DIR/templates/tasks.md"     "$DEST/studio/tasks.md"
copy_new "$SKILL_DIR/templates/decisions.md" "$DEST/studio/decisions.md"

echo "== game/ 雛形と GitHub Pages ワークフロー"
copy_new "$SKILL_DIR/assets/game-template/game" "$DEST/game"
copy_new "$SKILL_DIR/assets/game-template/.github/workflows/pages.yml" "$DEST/.github/workflows/pages.yml"

echo "== mode"
bash "$SKILL_DIR/scripts/set_mode.sh" "$MODE" "$DEST"

if [ ! -e "$DEST/.gitignore" ]; then printf 'node_modules/\n.DS_Store\nstudio/playtests/**/*.png\nstudio/.gate/\n' > "$DEST/.gitignore"; fi
if [ ! -d "$DEST/.git" ] && command -v git >/dev/null; then (cd "$DEST" && git init -q -b main && echo "== git init (main)"); fi

echo
echo "完了。Claude Code を再起動（または /agents で確認）して gs-* エージェントを読み込んでください。"
