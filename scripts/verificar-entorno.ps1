# Verifica que el PC tenga lo necesario para correr SMRED.
# Uso (PowerShell, desde la raíz del proyecto):  .\scripts\verificar-entorno.ps1

Set-Location (Split-Path $PSScriptRoot -Parent)

# Ejecuta un comando y dice si funcionó, según su código de salida (0 = correcto)
function Test-Comando($nombre, $comando, $ayuda) {
    $salida = cmd /c "$comando 2>&1"
    if ($LASTEXITCODE -eq 0) {
        $primeraLinea = $salida | Select-Object -First 1
        Write-Host "[OK]    $nombre -> $primeraLinea" -ForegroundColor Green
        return $true
    }
    Write-Host "[FALTA] $nombre. $ayuda" -ForegroundColor Red
    return $false
}

$ok = $true
if (-not (Test-Comando "Git"           "git --version"    "Instala con: winget install Git.Git")) { $ok = $false }
if (-not (Test-Comando "Node.js"       "node --version"   "Instala con: winget install OpenJS.NodeJS.LTS")) { $ok = $false }
if (-not (Test-Comando "npm"           "npm --version"    "Viene con Node.js: reinstala Node")) { $ok = $false }
if (-not (Test-Comando "Docker"        "docker --version" "Instala con: winget install Docker.DockerDesktop")) { $ok = $false }

# Docker activo es opcional aquí: iniciar.ps1 lo enciende solo
$dockerActivo = cmd /c "docker version --format {{.Server.Version}} 2>&1"
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK]    Docker encendido -> motor $dockerActivo" -ForegroundColor Green
} else {
    Write-Host "[INFO]  Docker está apagado. No pasa nada: iniciar.ps1 lo enciende." -ForegroundColor Yellow
}

$versionNode = (cmd /c "node --version 2>&1") -replace '^v', ''
if ($versionNode -match '^\d+\.\d+\.\d+$' -and [version]$versionNode -lt [version]'22.22.0') {
    Write-Host "[FALTA] Node.js $versionNode es muy antiguo. Se necesita 22.22 o superior." -ForegroundColor Red
    $ok = $false
}

if ((Test-Path "certs\smred.pem") -and (Test-Path "certs\smred-key.pem")) {
    Write-Host "[OK]    HTTPS activo (certificado en certs\)" -ForegroundColor Green
} else {
    Write-Host "[INFO]  Sin certificado: SMRED usará HTTP. Para activar HTTPS: .\scripts\generar-certificado.ps1" -ForegroundColor Yellow
}

if (Test-Path ".env") {
    Write-Host "[OK]    Archivo .env encontrado" -ForegroundColor Green
} else {
    Write-Host "[FALTA] Archivo .env. Ejecuta: copy .env.example .env  y cambia las contraseñas" -ForegroundColor Red
    $ok = $false
}

if ($ok) {
    Write-Host "`nTodo listo. Ahora ejecuta: .\scripts\iniciar.ps1" -ForegroundColor Cyan
} else {
    Write-Host "`nInstala lo que falta, cierra y vuelve a abrir la terminal, y ejecuta de nuevo este script." -ForegroundColor Yellow
}
