# Поднимает локальное окружение бэкенда:
#   1. инфраструктура в Docker (postgres, redis, traefik) — из корневого compose;
#   2. Prisma client + миграции + runtime-роль;
#   3. все сервисы на хосте, каждый в своём окне, в watch-режиме.
#
# Фронтенд запускается отдельно: cd frontend && bun run dev
#
# Запуск: cd backend && bun run local:up

$ErrorActionPreference = "Stop"

Set-Location (Join-Path $PSScriptRoot "..")
$backendRoot = $PWD.Path
$repoRoot = (Get-Item $backendRoot).Parent.FullName

# ─── 1. Инфраструктура ────────────────────────────────────────────────────────
Write-Host "==> Starting infrastructure (postgres, redis, traefik)..."
Set-Location $repoRoot

if (-not (Test-Path ".\.env")) {
  Copy-Item ".\.env.example" ".\.env"
  Write-Host "Created .env from example."
}

docker compose -f docker-compose.local.yml up -d
if ($LASTEXITCODE -ne 0) { throw "docker compose failed" }

Set-Location $backendRoot

if (-not (Test-Path ".\.env")) {
  Copy-Item ".\.env.example" ".\.env"
  Write-Host "Created backend\.env from example. Заполните JWT_SECRET и CRYPTO_KEY."
}

# ─── 2. База данных ───────────────────────────────────────────────────────────
Write-Host "==> Waiting for postgres..."
$attempts = 0
while ($true) {
  docker compose -f (Join-Path $repoRoot "docker-compose.local.yml") exec -T postgres pg_isready -q 2>$null
  if ($LASTEXITCODE -eq 0) { break }
  if (++$attempts -ge 30) { throw "postgres did not become ready" }
  Start-Sleep -Seconds 2
}

Write-Host "==> Building Prisma schema and client..."
bun run db:generate

Write-Host "==> Applying migrations..."
bun run db:migrate:deploy

# Роль приложения без BYPASSRLS. Без неё RLS не защищает (ADR-0002 §3).
Write-Host "==> Ensuring runtime DB role..."
bun run db:runtime-role

# ─── 3. Сервисы ───────────────────────────────────────────────────────────────
# Каждый в своём окне, чтобы логи не смешивались.
# Добавили сервис — добавьте его сюда и в local-down.ps1.
$services = @("gateway", "auth", "example", "notification", "billing", "analytics")

Write-Host "==> Starting services in watch mode..."
foreach ($service in $services) {
  Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendRoot'; bun run start:$($service):watch"
  # Пауза для gateway и auth: остальные при старте рассчитывают на их доступность.
  if ($service -in @("gateway", "auth")) { Start-Sleep -Seconds 2 }
}

Write-Host ""
Write-Host "==> Backend is up."
Write-Host "    Gateway:  http://localhost:5200/api"
Write-Host "    Swagger:  http://localhost:5201/api/docs"
Write-Host ""
Write-Host "    Фронтенд запускается отдельно:  cd frontend && bun run dev"
Write-Host "    Приложение целиком (через Traefik): http://localhost:8080"
Write-Host "    Дашборд Traefik:                   http://localhost:8081"
