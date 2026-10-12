/**
 * Tipos de revisión (PING, TCP, HTTP, DNS) y sus opciones en hosts, y los datos extra de cada
 * revisión en ping_records. Los hosts existentes quedan como PING. La dirección deja de ser
 * única sola: ahora lo es junto con el tipo y el puerto.
 */

/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.raw(`
    ALTER TABLE hosts ADD
      check_type      NVARCHAR(10)  NOT NULL CONSTRAINT df_hosts_check_type DEFAULT 'PING',
      port            INT           NULL,
      expected_status INT           NULL,
      keyword         NVARCHAR(200) NULL,
      expected_ip     NVARCHAR(45)  NULL,
      degraded_ms     INT           NULL,
      last_message    NVARCHAR(300) NULL,
      ssl_expires_at  DATETIME2(3)  NULL`)

  await knex.raw(`
    ALTER TABLE hosts ADD
      CONSTRAINT ck_hosts_check_type CHECK (check_type IN ('PING', 'TCP', 'HTTP', 'DNS')),
      CONSTRAINT ck_hosts_port CHECK (port IS NULL OR port BETWEEN 1 AND 65535),
      CONSTRAINT ck_hosts_expected_status CHECK (expected_status IS NULL OR expected_status BETWEEN 100 AND 599),
      CONSTRAINT ck_hosts_degraded_ms CHECK (degraded_ms IS NULL OR degraded_ms BETWEEN 1 AND 60000)`)

  await knex.raw('ALTER TABLE hosts DROP CONSTRAINT ck_hosts_type')
  await knex.raw(`
    ALTER TABLE hosts ADD CONSTRAINT ck_hosts_type
      CHECK (host_type IN ('SERVER', 'ROUTER', 'SWITCH', 'FIREWALL', 'WORKSTATION', 'WEBSITE', 'OTHER'))`)

  // SQL Server trata los NULL de port como iguales: "PING 8.8.8.8" solo puede existir una vez
  await knex.raw('ALTER TABLE hosts DROP CONSTRAINT uq_hosts_address')
  await knex.raw('CREATE UNIQUE INDEX uq_hosts_check_target ON hosts (check_type, address, port)')

  await knex.raw(`
    ALTER TABLE ping_records ADD
      jitter_ms   FLOAT         NULL,
      dns_ms      FLOAT         NULL,
      connect_ms  FLOAT         NULL,
      tls_ms      FLOAT         NULL,
      ttfb_ms     FLOAT         NULL,
      status_code INT           NULL,
      message     NVARCHAR(300) NULL`)
}

/**
 * Falla si hay dos hosts con la misma dirección o de tipo WEBSITE: hay que borrarlos antes.
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  await knex.raw(`
    ALTER TABLE ping_records DROP COLUMN
      jitter_ms, dns_ms, connect_ms, tls_ms, ttfb_ms, status_code, message`)

  await knex.raw('DROP INDEX uq_hosts_check_target ON hosts')
  await knex.raw('ALTER TABLE hosts ADD CONSTRAINT uq_hosts_address UNIQUE (address)')

  await knex.raw('ALTER TABLE hosts DROP CONSTRAINT ck_hosts_type')
  await knex.raw(`
    ALTER TABLE hosts ADD CONSTRAINT ck_hosts_type
      CHECK (host_type IN ('SERVER', 'ROUTER', 'SWITCH', 'FIREWALL', 'WORKSTATION', 'OTHER'))`)

  await knex.raw(`
    ALTER TABLE hosts DROP CONSTRAINT
      ck_hosts_check_type, ck_hosts_port, ck_hosts_expected_status, ck_hosts_degraded_ms, df_hosts_check_type`)
  await knex.raw(`
    ALTER TABLE hosts DROP COLUMN
      check_type, port, expected_status, keyword, expected_ip, degraded_ms, last_message, ssl_expires_at`)
}
