/**
 * Guarda desde cuándo cada host está en su estado actual,
 * para mostrar mensajes como "No responde desde las 14:25".
 */

/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.raw('ALTER TABLE hosts ADD status_changed_at DATETIME2(3) NULL')
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.raw('ALTER TABLE hosts DROP COLUMN status_changed_at')
}
