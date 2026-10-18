#!/usr/bin/env bash
# ナナシ県を Mac の裏でずっと動かす（launchd）。画面を開いていなくても町が進み、data/logs/ にログがたまる。
#   bash scripts/service.sh install    # ログイン時に自動で起動し、止まったら起動し直す
#   bash scripts/service.sh uninstall  # 自動起動をやめる
#   bash scripts/service.sh status     # 動いているか、今日のログの件数
#   bash scripts/service.sh restart    # コードを変えたあとに
# Mac が眠っていたあいだは、起きたときに早回しで埋める（最大14日。LLM は使わない）。
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$(pwd)"
LABEL="com.nanashi.town"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
DOMAIN="gui/$(id -u)"

case "${1:-status}" in
  install)
    mkdir -p "$HOME/Library/LaunchAgents" data
    cat > "$PLIST" <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key><array><string>/bin/bash</string><string>$ROOT/scripts/start-omni.sh</string></array>
  <key>WorkingDirectory</key><string>$ROOT</string>
  <key>EnvironmentVariables</key><dict><key>PATH</key><string>/opt/homebrew/opt/node@24/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string></dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>60</integer>
  <key>StandardOutPath</key><string>$ROOT/data/server.log</string>
  <key>StandardErrorPath</key><string>$ROOT/data/server.log</string>
</dict></plist>
PL
    launchctl bootout "$DOMAIN/$LABEL" 2>/dev/null || true
    launchctl bootstrap "$DOMAIN" "$PLIST"
    echo "裏で動かし始めました（$LABEL）。ログ: data/logs/、サーバーの記録: data/server.log"
    ;;
  uninstall)
    launchctl bootout "$DOMAIN/$LABEL" 2>/dev/null || true
    rm -f "$PLIST"
    echo "自動起動をやめました"
    ;;
  restart)
    launchctl kickstart -k "$DOMAIN/$LABEL"
    echo "起動し直しました"
    ;;
  status)
    if launchctl print "$DOMAIN/$LABEL" >/dev/null 2>&1; then
      launchctl print "$DOMAIN/$LABEL" | grep -E "^\s+(state|pid) =" | sed 's/^ */  /'
    else
      echo "  自動起動は未設定（bash scripts/service.sh install）"
    fi
    f=$(ls -t data/logs/*.jsonl 2>/dev/null | head -1 || true)
    [ -n "$f" ] && echo "  最新のログ: $f（$(wc -l < "$f" | tr -d ' ')件、最後: $(tail -1 "$f" | cut -c1-80)）"
    ;;
  *) echo "使い方: bash scripts/service.sh install|uninstall|restart|status"; exit 1 ;;
esac
