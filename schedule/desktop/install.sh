#!/bin/bash
# Puts the next three days of the schedule on the macOS desktop.
#   bash install.sh           install Übersicht + the widget, ask for the token if none is saved
#   bash install.sh --token   replace the saved token
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
APP="/Applications/Übersicht.app"
WIDGETS="$HOME/Library/Application Support/Übersicht/widgets"
CONFIG="$HOME/.config/alita-schedule"

if [ ! -d "$APP" ]; then
  echo "Installing Übersicht (desktop widgets)…"
  brew install --cask ubersicht
fi

mkdir -p "$WIDGETS"
rm -rf "$WIDGETS/schedule.widget"
cp -R "$HERE/schedule.widget" "$WIDGETS/"
echo "Widget installed in $WIDGETS/schedule.widget"

mkdir -p "$CONFIG"
chmod 700 "$CONFIG"
if [ ! -t 0 ]; then
  [ -s "$CONFIG/token" ] || echo "No token saved yet. Run this script again in Terminal to add one."
elif [ ! -s "$CONFIG/token" ] || [ "${1:-}" = "--token" ]; then
  echo "Paste the fine-grained GitHub token for Alita-xky/schedule (Contents: read is enough here)."
  read -rsp "Token: " token || token=""
  echo
  if [ -n "$token" ]; then
    (umask 077; printf '%s' "$token" > "$CONFIG/token")
    rm -f "$CONFIG/events.json" "$CONFIG/fetched-at"
    echo "Token saved to $CONFIG/token"
  fi
fi

# Start Übersicht at login.
AGENT="$HOME/Library/LaunchAgents/icu.alitaxky.schedule-widget.plist"
mkdir -p "$(dirname "$AGENT")"
cat > "$AGENT" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>icu.alitaxky.schedule-widget</string>
  <key>ProgramArguments</key><array><string>/usr/bin/open</string><string>-g</string><string>$APP</string></array>
  <key>RunAtLoad</key><true/>
</dict>
</plist>
PLIST
echo "Übersicht will start at login ($AGENT)."

open -g "$APP"
touch "$WIDGETS/schedule.widget/index.jsx"   # Übersicht reloads a widget when its file changes
echo "Done. The schedule is on your desktop (top-left)."
