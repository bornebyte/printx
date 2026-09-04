#!/usr/bin/env bash
set -euo pipefail

agent_dir="$(cd -- "$(dirname -- "$0")/.." && pwd)"
node_bin="$(command -v node)"
service_dir="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
service_file="$service_dir/printx-agent.service"

mkdir -p "$service_dir"
cat > "$service_file" <<SERVICE
[Unit]
Description=PrintX background printer agent
After=network-online.target

[Service]
Type=simple
WorkingDirectory=$agent_dir
ExecStart=$node_bin $agent_dir/agent.mjs
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
SERVICE

systemctl --user daemon-reload
systemctl --user enable --now printx-agent.service
loginctl enable-linger "$USER" 2>/dev/null || true
echo "PrintX Agent installed and started as a systemd user service."
echo "Logs: journalctl --user -u printx-agent.service -f"
