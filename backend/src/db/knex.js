import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import knex from 'knex'

export const MIGRATIONS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), 'migrations')

/** Configuración de Knex para SQL Server (driver tedious, 100 % JavaScript). */
export function knexConfig(dbConfig) {
  return {
    client: 'mssql',
    connection: {
      server: dbConfig.host,
      port: dbConfig.instanceName ? undefined : dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      encrypt: true,
      options: {
        // Certificado autofirmado en desarrollo local. En la nube (Azure SQL) debe ser false.
        trustServerCertificate: true,
        // Para SQL Server Express con instancia con nombre (ej. SQLEXPRESS)
        instanceName: dbConfig.instanceName,
        // Todas las fechas se guardan y leen en UTC
        useUTC: true,
      },
    },
    pool: { min: 0, max: 10 },
    migrations: { directory: MIGRATIONS_DIR, tableName: 'knex_migrations', loadExtensions: ['.js'] },
  }
}

/**
 * @param {object} dbConfig
 * @param {import('pino').Logger} [logger] los errores de conexión ya se reportan con un mensaje claro;
 *   el log interno de Knex se envía a nivel debug para no duplicar trazas.
 */
export function createDb(dbConfig, logger) {
  const config = knexConfig(dbConfig)
  if (logger) {
    const debug = (message) => logger.debug({ source: 'knex' }, String(message))
    config.log = { warn: debug, error: debug, deprecate: debug, debug }
  }
  return knex(config)
}
