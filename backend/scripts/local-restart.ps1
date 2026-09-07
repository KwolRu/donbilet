$ErrorActionPreference = "Stop"

Set-Location (Join-Path $PSScriptRoot "..")

Write-Host "==> Restarting local environment..."
powershell -ExecutionPolicy Bypass -File .\scripts\local-down.ps1
Start-Sleep -Seconds 2
powershell -ExecutionPolicy Bypass -File .\scripts\local-up.ps1
