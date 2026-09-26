# Inicia todo lo necesario para trabajar en SMRED:
#   1. Docker Desktop (si está cerrado)
#   2. SQL Server
#   3. Backend y frontend (npm run dev)
# Uso, desde la raíz del proyecto:  .\scripts\iniciar.ps1
# Para terminar: Ctrl + C y luego .\scripts\detener.ps1

Set-Location (Split-Path $PSScriptRoot -Parent)

function Test-DockerListo {
    cmd /c "docker version --format {{.Server.Version}} >nul 2>&1"
    return $LASTEXITCODE -eq 0
}

if (-not (Test-Path ".env")) {
    Write-Host "Falta el archivo .env. Ejecuta: copy .env.example .env  y cambia las contraseñas." -ForegroundColor Red
    exit 1
}

if (-not (Test-DockerListo)) {
    Write-Host "Iniciando Docker Desktop (puede tardar hasta un minuto)..." -ForegroundColor Cyan
    cmd /c "docker desktop start >nul 2>&1"
    if ($LASTEXITCODE -ne 0) {
        Start-Process "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe"
    }
    $espera = 0
    while (-not (Test-DockerListo)) {
        Start-Sleep -Seconds 3
        $espera += 3
        if ($espera -ge 180) {
            Write-Host "Docker no respondió en 3 minutos. Ábrelo manualmente y vuelve a intentar." -ForegroundColor Red
            exit 1
        }
    }
}
Write-Host "Docker listo." -ForegroundColor Green

Write-Host "Levantando SQL Server (la primera vez descarga ~1.5 GB)..." -ForegroundColor Cyan
docker compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "No se pudo levantar SQL Server. Revisa el mensaje de arriba." -ForegroundColor Red
    exit 1
}

$espera = 0
do {
    Start-Sleep -Seconds 3
    $espera += 3
    $estado = cmd /c "docker inspect -f {{.State.Health.Status}} smred-sqlserver 2>nul"
} while ($estado -ne "healthy" -and $espera -lt 180)

if ($estado -ne "healthy") {
    Write-Host "SQL Server no quedó listo. Revisa con: docker compose logs sqlserver" -ForegroundColor Red
    exit 1
}
Write-Host "SQL Server listo." -ForegroundColor Green

if (-not (Test-Path "node_modules")) {
    Write-Host "Instalando dependencias (solo la primera vez)..." -ForegroundColor Cyan
    npm install
    if ($LASTEXITCODE -ne 0) { exit 1 }
}

Write-Host "Arrancando SMRED. Abre http://localhost:5173  (Ctrl + C para detener)" -ForegroundColor Green
npm run dev
