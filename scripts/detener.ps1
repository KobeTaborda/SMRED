# Apaga SQL Server y Docker para liberar toda la memoria que usan.
# Uso, desde la raíz del proyecto:  .\scripts\detener.ps1

Set-Location (Split-Path $PSScriptRoot -Parent)

cmd /c "docker version --format {{.Server.Version}} >nul 2>&1"
if ($LASTEXITCODE -eq 0) {
    Write-Host "Deteniendo SQL Server (los datos se conservan)..." -ForegroundColor Cyan
    docker compose stop

    Write-Host "Cerrando Docker Desktop..." -ForegroundColor Cyan
    cmd /c "docker desktop stop >nul 2>&1"
}

Get-Process "Docker Desktop" -ErrorAction SilentlyContinue | Stop-Process -Force
# Apaga la máquina virtual de WSL que usa Docker (proceso "VmmemWSL" en el Administrador de tareas)
cmd /c "wsl --shutdown >nul 2>&1"

Write-Host "Listo. Docker y SQL Server ya no consumen memoria." -ForegroundColor Green
