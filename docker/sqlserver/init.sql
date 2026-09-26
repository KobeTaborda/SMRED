-- Crea la base de datos y el usuario de la aplicación. Es idempotente: se puede ejecutar varias veces.
-- Variables (sqlcmd): DB_NAME, DB_APP_USER, DB_APP_PASSWORD
-- Sin Docker: ábrelo en SSMS, activa "Modo SQLCMD" (menú Consulta) y define las variables con :setvar.

IF DB_ID(N'$(DB_NAME)') IS NULL
BEGIN
    CREATE DATABASE [$(DB_NAME)];
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'$(DB_APP_USER)')
BEGIN
    CREATE LOGIN [$(DB_APP_USER)] WITH PASSWORD = N'$(DB_APP_PASSWORD)',
        CHECK_POLICY = ON, DEFAULT_DATABASE = [$(DB_NAME)];
END
ELSE
BEGIN
    -- Mantiene la contraseña sincronizada con el .env
    ALTER LOGIN [$(DB_APP_USER)] WITH PASSWORD = N'$(DB_APP_PASSWORD)';
END
GO

USE [$(DB_NAME)];
GO

IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'$(DB_APP_USER)')
BEGIN
    CREATE USER [$(DB_APP_USER)] FOR LOGIN [$(DB_APP_USER)];
END
GO

-- db_owner solo sobre ESTA base: Flyway necesita crear tablas. El usuario no tiene permisos en el servidor.
ALTER ROLE db_owner ADD MEMBER [$(DB_APP_USER)];
GO
