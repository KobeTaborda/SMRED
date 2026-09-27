/**
 * Bloqueo progresivo: cuenta cuántas veces se ha bloqueado un usuario desde un equipo,
 * para que cada bloqueo dure 5 minutos más que el anterior (5, 10, 15...).
 */

/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.raw('ALTER TABLE login_attempts ADD lock_count INT NOT NULL CONSTRAINT df_login_attempts_lock_count DEFAULT 0')
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.raw('ALTER TABLE login_attempts DROP CONSTRAINT df_login_attempts_lock_count')
  await knex.raw('ALTER TABLE login_attempts DROP COLUMN lock_count')
}
