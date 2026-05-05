@echo off
echo ==========================================
echo  Generando certificado SSL para SMRED
echo ==========================================

REM Crear carpeta para el certificado
mkdir src\main\resources\keystore 2>nul

REM Generar certificado autofirmado con keytool (incluido en JDK)
keytool -genkeypair ^
  -alias smred ^
  -keyalg RSA ^
  -keysize 2048 ^
  -storetype PKCS12 ^
  -keystore src\main\resources\keystore\smred-keystore.p12 ^
  -validity 365 ^
  -storepass smred2026 ^
  -dname "CN=localhost, OU=SMRED, O=TdeA, L=Medellin, S=Antioquia, C=CO"

echo.
echo ==========================================
echo  Certificado generado correctamente en:
echo  src/main/resources/keystore/smred-keystore.p12
echo ==========================================
echo.
echo  Ahora ejecuta el sistema con:
echo  run.bat
echo.
pause
