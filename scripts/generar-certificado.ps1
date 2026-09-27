# Crea un certificado HTTPS de confianza local para SMRED (con mkcert).
# El navegador lo acepta sin advertencias porque mkcert instala su propia autoridad solo en ESTE equipo.
# Uso, desde la raíz del proyecto:  .\scripts\generar-certificado.ps1

Set-Location (Split-Path $PSScriptRoot -Parent)

cmd /c "where mkcert >nul 2>&1"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Falta mkcert. Instálalo con:" -ForegroundColor Red
    Write-Host "    winget install -e --id FiloSottile.mkcert" -ForegroundColor Yellow
    Write-Host "Luego cierra y vuelve a abrir la terminal, y ejecuta de nuevo este script."
    exit 1
}

Write-Host "Registrando la autoridad local de mkcert (la primera vez Windows pide confirmar: responde Sí)..." -ForegroundColor Cyan
mkcert -install
if ($LASTEXITCODE -ne 0) { exit 1 }

New-Item -ItemType Directory -Force -Path "certs" | Out-Null
mkcert -cert-file "certs\smred.pem" -key-file "certs\smred-key.pem" localhost 127.0.0.1 ::1
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host ""
Write-Host "Certificado creado en certs\ (no se sube a GitHub)." -ForegroundColor Green
Write-Host "Si la app estaba abierta, deténla (Ctrl + C) y arráncala de nuevo con .\scripts\iniciar.ps1" -ForegroundColor Green
Write-Host "SMRED quedará en https://localhost:5173" -ForegroundColor Green
