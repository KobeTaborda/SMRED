/**
 * Mejoras de seguridad:
 * - users.token_version: sube cada vez que cambia la contraseña. Las sesiones guardan la versión
 *   con la que se abrieron; si no coincide, se cierran (así un cambio de contraseña expulsa
 *   a quien la estuviera usando en otro equipo).
 * - users.must_change_password: obliga a cambiar la contraseña al entrar (cuentas nuevas o restablecidas).
 * - login_attempts: intentos fallidos guardados en la BD, para que el bloqueo sobreviva a reinicios.
 */

/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.raw(`
    ALTER TABLE users ADD
      token_version        INT NOT NULL CONSTRAINT df_users_token_version DEFAULT 0,
      must_change_password BIT NOT NULL CONSTRAINT df_users_must_change DEFAULT 0`)

  await knex.raw(`
    CREATE TABLE login_attempts (
      attempt_key      NVARCHAR(200) NOT NULL CONSTRAINT pk_login_attempts PRIMARY KEY,
      failures         INT           NOT NULL,
      first_failure_at DATETIME2(3)  NOT NULL,
      locked_until     DATETIME2(3)  NULL,
      updated_at       DATETIME2(3)  NOT NULL
    )`)
  await knex.raw('CREATE INDEX ix_login_attempts_updated ON login_attempts (updated_at)')
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.raw('DROP TABLE IF EXISTS login_attempts')
  await knex.raw('ALTER TABLE users DROP CONSTRAINT df_users_token_version, df_users_must_change')
  await knex.raw('ALTER TABLE users DROP COLUMN token_version, must_change_password')
}
