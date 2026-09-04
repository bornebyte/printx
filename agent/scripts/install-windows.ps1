$ErrorActionPreference = "Stop"

$agentDir = (Resolve-Path (Join-Path $PSScriptRoot "..\")).Path
$node = (Get-Command node -ErrorAction Stop).Source
$taskName = "PrintX Agent"
$arguments = "`"$agentDir\agent.mjs`""

 schtasks.exe /Create /TN $taskName /TR "`"$node`" $arguments" /SC ONLOGON /RL LIMITED /F | Out-Host
Start-ScheduledTask -TaskName $taskName
Write-Host "PrintX Agent installed and started as a Windows logon task."
Write-Host "Local dashboard: http://127.0.0.1:47821"
