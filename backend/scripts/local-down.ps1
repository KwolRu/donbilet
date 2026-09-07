# Останавливает локальное окружение: сначала процессы сервисов на хосте,
# затем инфраструктуру в Docker.
#
# Запуск: cd backend && bun run local:down

$ErrorActionPreference = "Stop"

Set-Location (Join-Path $PSScriptRoot "..")
$backendRoot = (Get-Location).Path
$repoRoot = (Get-Item $backendRoot).Parent.FullName

# Добавили сервис — добавьте его entrypoint сюда, иначе процесс переживёт local:down.
$serviceEntrypoints = @(
  "microservices/gateway/src/main.ts",
  "microservices/auth-service/src/main.ts",
  "microservices/example-service/src/main.ts",
  "microservices/notification-service/src/main.ts",
  "microservices/billing-service/src/main.ts",
  "microservices/analytics-service/src/main.ts"
)

# Фильтруем по корню backend, чтобы не задеть процессы других проектов.
$rootLower = $backendRoot.ToLowerInvariant()

Write-Host "==> Stopping local backend service processes..."

# Сервисы могут работать и под node (ts-node), и под bun — ищем оба.
$processes = Get-CimInstance Win32_Process -Filter "Name = 'node.exe' OR Name = 'bun.exe'" |
  Where-Object {
    $cmd = "$($_.CommandLine)".ToLowerInvariant()
    if (-not $cmd) { return $false }
    if (-not $cmd.Contains($rootLower)) { return $false }
    foreach ($entry in $serviceEntrypoints) {
      if ($cmd.Contains($entry.ToLowerInvariant())) { return $true }
    }
    return $false
  }

if (-not $processes -or $processes.Count -eq 0) {
  Write-Host "No matching backend processes found."
} else {
  foreach ($p in $processes) {
    try {
      Stop-Process -Id $p.ProcessId -Force -ErrorAction Stop
      Write-Host ("Stopped PID {0}" -f $p.ProcessId)
    } catch {
      Write-Host ("Failed to stop PID {0}: {1}" -f $p.ProcessId, $_.Exception.Message)
    }
  }
}

Write-Host "==> Stopping infrastructure..."
Set-Location $repoRoot
docker compose -f docker-compose.local.yml down

Set-Location $backendRoot
Write-Host "==> Done."
