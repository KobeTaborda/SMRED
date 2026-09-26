# SMRED · Sistema de Monitoreo de Red

Aplicación web para monitorear equipos de red: estado en línea, tiempo de respuesta y disponibilidad.

Esta guía explica cómo dejar SMRED funcionando en tu equipo con Windows, paso a paso.

---

## 1. Revisar el equipo

Abre el **Administrador de tareas** (`Ctrl + Shift + Esc`) → pestaña **Rendimiento** → **CPU**. Abajo a la derecha debe decir **Virtualización: Habilitado**. Si dice *Deshabilitado*, hay que activarla en la BIOS antes de continuar, porque Docker no funciona sin ella.

Se recomiendan al menos **8 GB de RAM** (16 GB es lo ideal).

## 2. Instalar los programas

Clic derecho en el botón de Inicio → **Terminal (Administrador)** y ejecuta:

```powershell
winget install -e --id Git.Git --accept-source-agreements --accept-package-agreements
winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements
winget install -e --id Microsoft.VisualStudioCode --accept-package-agreements
winget install -e --id Docker.DockerDesktop --accept-package-agreements
wsl --install --no-distribution
```

Cuando termine, **reinicia el equipo**.

Notas:

- Si `winget` no se reconoce, abre la Microsoft Store, busca **Instalador de aplicación**, actualízalo y vuelve a intentar.
- Si la instalación de Node.js falla con el código **1603**, revisa si ya lo tienes instalado con `node --version`. Se necesita la versión **22.22 o superior**.

## 3. Configurar Docker para que consuma poco

**3.1. Limitar la memoria.** En PowerShell ejecuta:

```powershell
notepad $env:USERPROFILE\.wslconfig
```

Acepta crear el archivo, pega esto, guarda y cierra:

```ini
[wsl2]
memory=4GB
processors=4
```

**3.2. Abrir Docker Desktop** desde el menú Inicio:

1. Acepta los términos.
2. En la pantalla de inicio de sesión, elige **Skip** (no necesitas cuenta).
3. Si pide actualizar WSL, acepta.
4. Espera a que abajo a la izquierda diga **Engine running**.

**3.3. Evitar que arranque solo.** En **Settings → General**, desmarca:

- *Start Docker Desktop when you sign in to your computer*
- *Open Docker Dashboard when Docker Desktop starts*

En **Resources → Advanced**, deja activado **Resource Saver**. Clic en **Apply & restart**.

Luego cierra Docker Desktop (clic derecho en la ballena junto al reloj → **Quit Docker Desktop**). Los scripts del proyecto lo abren cuando hace falta.

## 4. Configurar Git

Con tu nombre y el correo de tu cuenta de GitHub:

```powershell
git config --global user.name "Tu Nombre"
git config --global user.email "tu-correo-de-github@ejemplo.com"
git config --global init.defaultBranch main
git config --global core.autocrlf true
```

## 5. Descargar el proyecto

Usa una carpeta que **no** esté dentro de OneDrive, Documentos ni Escritorio (OneDrive intenta sincronizar miles de archivos y pone lento el equipo):

```powershell
mkdir C:\dev
cd C:\dev
git clone https://github.com/KobeTaborda/SMRED.git smred
cd smred
code .
```

La primera vez que uses Git con GitHub se abrirá el navegador para iniciar sesión.

Cuando VS Code pregunte si confías en los autores de la carpeta, responde **Sí, confío**. Luego aparecerá un aviso para instalar las **extensiones recomendadas**: acéptalo.

## 6. Crear tu configuración (`.env`)

En la terminal de VS Code (`Ctrl + ñ`):

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
copy .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Abre el archivo `.env` desde el panel izquierdo y:

1. Pega la clave que imprimió el último comando en `SESSION_SECRET=`.
2. Cambia las tres contraseñas: `DB_SA_PASSWORD`, `DB_APP_PASSWORD` y `SMRED_ADMIN_PASSWORD`.
3. En `SMRED_ADMIN_USERNAME` escribe el usuario con el que vas a entrar a la app.
4. Guarda con `Ctrl + S`.

Reglas para las contraseñas:

- Mínimo 10 caracteres, con mayúsculas, minúsculas, números y al menos uno de estos símbolos: `- _ . * @ % +`
- No uses `$`, `#`, `!`, comillas ni espacios.

El archivo `.env` es personal: **nunca lo subas a GitHub** (ya está excluido en `.gitignore`).

## 7. Arrancar SMRED

```powershell
.\scripts\verificar-entorno.ps1
npm install
.\scripts\iniciar.ps1
```

- `verificar-entorno.ps1` revisa que tengas todo instalado. Todo debe salir en verde; Docker puede aparecer en amarillo como apagado, y es normal.
- `npm install` instala las librerías del proyecto.
- `iniciar.ps1` abre Docker, levanta SQL Server y arranca la aplicación.

La primera vez tarda varios minutos, porque descarga SQL Server (~1,5 GB). Cuando veas `API escuchando en http://localhost:3000` y `Local: http://localhost:5173/`, abre **http://localhost:5173** e inicia sesión con el usuario y la contraseña de administrador de tu `.env`.

Cada integrante tiene su **propia base de datos** en su equipo, así que tu usuario administrador es solo tuyo.

## 8. Rutina diaria

Para empezar a trabajar:

```powershell
cd C:\dev\smred
.\scripts\iniciar.ps1
```

Para terminar: `Ctrl + C` en la terminal y luego:

```powershell
.\scripts\detener.ps1
```

Esto apaga SQL Server y Docker y libera la memoria. Los datos se conservan para la próxima vez.

## 9. Actualizar el proyecto

Cuando haya cambios nuevos en GitHub:

```powershell
git pull
npm install
.\scripts\iniciar.ps1
```

Los cambios en la base de datos se aplican solos al arrancar.

## 10. Ver la base de datos (opcional)

Con la extensión **SQL Server** de VS Code: ícono de SQL Server en la barra lateral → **Add Connection**:

| Campo | Valor |
|---|---|
| Server name | `localhost` |
| Port | `1433` |
| Trust server certificate |  marcado |
| Authentication type | SQL Login |
| User name | el valor de `DB_APP_USER` en tu `.env` |
| Password | el valor de `DB_APP_PASSWORD` en tu `.env` |
| Database name | `smred` |

Úsala para consultar datos, no para modificarlos a mano.

## 11. Sin Docker: SQL Server Express

Si tu equipo no puede usar Docker:

1. Instala **SQL Server 2022 Express** y **SSMS**.
2. En *SQL Server Configuration Manager* → *Protocolos de SQLEXPRESS*, habilita **TCP/IP** y reinicia el servicio. Inicia también el servicio **SQL Server Browser**.
3. Abre `docker/sqlserver/init.sql` en SSMS, activa **Consulta → Modo SQLCMD**, agrega al inicio estas líneas (con tu contraseña) y ejecútalo:
   ```sql
   :setvar DB_NAME smred
   :setvar DB_APP_USER smred_app
   :setvar DB_APP_PASSWORD TuContraseña-2026
   ```
4. En tu `.env`, descomenta `DB_INSTANCE=SQLEXPRESS` y usa la misma contraseña en `DB_APP_PASSWORD`.
5. Arranca con `npm run dev` en lugar de `iniciar.ps1`.

## 12. Problemas comunes

| Síntoma | Solución |
|---|---|
| `No se puede cargar el archivo ... no está firmado digitalmente` | Ejecuta `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`. Si persiste: `Get-ChildItem .\scripts\*.ps1 \| Unblock-File` |

| `Configuración inválida: Falta ...` | No existe el `.env` en la carpeta del proyecto, o esa variable está vacía. |

| `No se pudo conectar a SQL Server` | Docker Desktop no está abierto o el contenedor no arrancó: revisa con `docker compose ps`. |

| `Login failed for user 'smred_app'` | Cambiaste la contraseña en `.env` después de crear la base: ejecuta `docker compose up sqlserver-init`. |

| El contenedor `sqlserver` se reinicia una y otra vez | `DB_SA_PASSWORD` no cumple las reglas de contraseña de SQL Server. |

| `Port 1433 is already allocated` | Hay otro SQL Server instalado. Cambia `DB_PORT=1434` en tu `.env`. |

| `Port 5173 is in use` | La app ya está abierta en otra terminal. Ciérrala con `Ctrl + C` o cierra esa terminal. |

| `Failed to resolve import ...` | Faltan librerías: ejecuta `npm install`. |

| Todos los equipos aparecen *Sin respuesta* | Revisa que el firewall de la red permita ping (ICMP). Prueba con `ping 8.8.8.8` en la terminal. |



## 13. API 

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/health` | Público | Estado del servicio |
| GET | `/api/auth/csrf` | Público | Entrega el token CSRF |
| POST | `/api/auth/login` | Público | Inicia sesión |
| POST | `/api/auth/logout` | Autenticado | Cierra sesión |
| GET | `/api/auth/me` | Autenticado | Usuario actual |
| GET | `/api/hosts` | Autenticado | Lista de hosts con estado |
| GET | `/api/hosts/:id` | Autenticado | Detalle de un host |
| GET | `/api/hosts/:id/pings?hours=24` | Autenticado | Historial de ping (máx. 168 h) |
| GET | `/api/hosts/:id/pings?limit=6` | Autenticado | Últimas N revisiones |
| GET | `/api/hosts/:id/stats?period=24h` | Autenticado | Disponibilidad, latencias y franjas (`24h` o `7d`) |
| GET | `/api/overview` | Autenticado | Tendencia de latencia de toda la red (últimas 2 h) |
| POST | `/api/hosts` | ADMIN | Crear host |
| PUT | `/api/hosts/:id` | ADMIN | Editar host |
| DELETE | `/api/hosts/:id` | ADMIN | Eliminar host (y su historial) |
| POST | `/api/hosts/:id/check` | ADMIN | Verificar ahora |
| GET / POST | `/api/users` | ADMIN | Listar / crear usuarios |
| PUT / DELETE | `/api/users/:id` | ADMIN | Editar / eliminar usuario |
| PUT | `/api/users/:id/password` | ADMIN | Restablecer contraseña |

Las peticiones que modifican datos requieren el header `X-XSRF-TOKEN`. Los errores siempre llegan como [Problem Details (RFC 9457)](https://www.rfc-editor.org/rfc/rfc9457): `{ status, title, detail, errors? }`.


## 14. Organización **por funcionalidad**: cada módulo tiene sus rutas, reglas de negocio y acceso a datos juntos.


```
backend/src/
├── config/       Variables de entorno (validadas con Zod) y logger
├── db/           Conexión Knex y migraciones (esquema de SQL Server)
├── common/       Errores (Problem Details), validación, utilidades
├── auth/         Login, sesión en BD, CSRF, bloqueo por intentos, permisos
├── users/        Usuarios y roles (ADMIN / VIEWER)
├── hosts/        Dispositivos monitoreados + evento de cambio de estado
├── monitoring/   Ping periódico, historial y limpieza automática
├── app.js        Arma la app Express (recibe sus dependencias)
└── server.js     Punto de entrada: conecta BD, migra y arranca

frontend/src/
├── lib/          Cliente HTTP (sesión + CSRF), React Query, formatos
├── components/   Layout (barra, fondo de luces, logo, tema) y componentes de interfaz
└── features/     auth · dashboard · hosts (lista y detalle) · users
```

Cada módulo sigue el mismo patrón: `*.routes.js` (HTTP) → `*.service.js` (reglas) → `*.repository.js` (SQL).