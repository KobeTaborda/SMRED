/**
 * Esquema inicial de SMRED.
 * Regla: nunca edites una migración ya aplicada. Para cambios crea una nueva con:
 *   npm run db:make -- nombre_del_cambio
 *
 * Se usa SQL de SQL Server directamente para que el esquema sea explícito y fácil de revisar.
 * Todas las fechas en UTC (DATETIME2).
 */

/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.raw(`
    CREATE TABLE users (
      id            INT IDENTITY(1,1) NOT NULL CONSTRAINT pk_users PRIMARY KEY,
      username      NVARCHAR(50)  NOT NULL CONSTRAINT uq_users_username UNIQUE,
      password_hash NVARCHAR(100) NOT NULL,
      full_name     NVARCHAR(100) NOT NULL,
      role          NVARCHAR(20)  NOT NULL CONSTRAINT ck_users_role CHECK (role IN ('ADMIN', 'VIEWER')),
      enabled       BIT           NOT NULL CONSTRAINT df_users_enabled DEFAULT 1,
      created_at    DATETIME2(3)  NOT NULL CONSTRAINT df_users_created DEFAULT SYSUTCDATETIME(),
      updated_at    DATETIME2(3)  NOT NULL CONSTRAINT df_users_updated DEFAULT SYSUTCDATETIME()
    )`)

  await knex.raw(`
    CREATE TABLE hosts (
      id                 INT IDENTITY(1,1) NOT NULL CONSTRAINT pk_hosts PRIMARY KEY,
      name               NVARCHAR(100) NOT NULL,
      address            NVARCHAR(255) NOT NULL CONSTRAINT uq_hosts_address UNIQUE,
      host_type          NVARCHAR(20)  NOT NULL
        CONSTRAINT ck_hosts_type CHECK (host_type IN ('SERVER', 'ROUTER', 'SWITCH', 'FIREWALL', 'WORKSTATION', 'OTHER')),
      location           NVARCHAR(100) NULL,
      description        NVARCHAR(500) NULL,
      monitoring_enabled BIT           NOT NULL CONSTRAINT df_hosts_monitoring DEFAULT 1,
      status             NVARCHAR(20)  NOT NULL CONSTRAINT df_hosts_status DEFAULT 'UNKNOWN'
        CONSTRAINT ck_hosts_status CHECK (status IN ('UNKNOWN', 'UP', 'DEGRADED', 'DOWN')),
      last_latency_ms    FLOAT         NULL,
      last_checked_at    DATETIME2(3)  NULL,
      last_seen_at       DATETIME2(3)  NULL,
      created_at         DATETIME2(3)  NOT NULL CONSTRAINT df_hosts_created DEFAULT SYSUTCDATETIME(),
      updated_at         DATETIME2(3)  NOT NULL CONSTRAINT df_hosts_updated DEFAULT SYSUTCDATETIME()
    )`)

  await knex.raw(`
    CREATE TABLE ping_records (
      id              INT IDENTITY(1,1) NOT NULL CONSTRAINT pk_ping_records PRIMARY KEY,
      host_id         INT          NOT NULL
        CONSTRAINT fk_ping_records_host FOREIGN KEY REFERENCES hosts (id) ON DELETE CASCADE,
      reachable       BIT          NOT NULL,
      latency_ms      FLOAT        NULL,
      packet_loss_pct INT          NOT NULL,
      checked_at      DATETIME2(3) NOT NULL
    )`)
  await knex.raw('CREATE INDEX ix_ping_records_host_checked ON ping_records (host_id, checked_at)')
  await knex.raw('CREATE INDEX ix_ping_records_checked ON ping_records (checked_at)')

  // Sesiones persistentes: reiniciar el servidor no cierra la sesión de los usuarios
  await knex.raw(`
    CREATE TABLE sessions (
      sid        NVARCHAR(128) NOT NULL CONSTRAINT pk_sessions PRIMARY KEY,
      data       NVARCHAR(MAX) NOT NULL,
      expires_at DATETIME2(3)  NOT NULL
    )`)
  await knex.raw('CREATE INDEX ix_sessions_expires ON sessions (expires_at)')
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.raw('DROP TABLE IF EXISTS sessions')
  await knex.raw('DROP TABLE IF EXISTS ping_records')
  await knex.raw('DROP TABLE IF EXISTS hosts')
  await knex.raw('DROP TABLE IF EXISTS users')
}
