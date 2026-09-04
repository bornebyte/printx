#!/usr/bin/env bash
set -euo pipefail

agent_dir="$(cd -- "$(dirname -- "$0")/.." && pwd)"
node_bin="$(command -v node)"
launch_dir="$HOME/Library/LaunchAgents"
plist="$launch_dir/com.printx.agent.plist"

mkdir -p "$launch_dir"
cat > "$plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.printx.agent</string>
  <key>ProgramArguments</key><array><string>$node_bin</string><string>$agent_dir/agent.mjs</string></array>
  <key>WorkingDirectory</key><string>$agent_dir</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>$agent_dir/data/agent.out.log</string>
  <key>StandardErrorPath</key><string>$agent_dir/data/agent.err.log</string>
</dict></plist>
PLIST

launchctl bootout "gui/$(id -u)" "$plist" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$plist"
launchctl kickstart -k "gui/$(id -u)/com.printx.agent"
echo "PrintX Agent installed and started as a macOS LaunchAgent."
echo "Logs: tail -f $agent_dir/data/agent.out.log"
