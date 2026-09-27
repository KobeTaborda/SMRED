import { readFileSync } from 'node:fs'
import { createServer } from 'node:https'
import { createApp } from './app.js'
import { createLoginAttemptRepository } from './auth/login-attempt.repository.js'
import { LoginAttempts } from './auth/login-attempts.js'
import { SqlSessionStore } from './auth/session-store.js'
import { loadConfig } from './config/env.js'
import { createLogger } from './config/logger.js'
import { createDb } from './db/knex.js'
import { createHostRepository } from './hosts/host.repository.js'
import { createHostService } from './hosts/host.service.js'
import { createPingMonitor } from './monitoring/ping-monitor.service.js'
import { createPingProbe } from './monitoring/ping-probe.js'
import { createPingRepository } from './monitoring/ping.repository.js'
import { createStatsService } from './monitoring/stats.js'
import { startScheduler } from './monitoring/scheduler.js'
import { seedInitialAdmin } from './users/admin-seeder.js'
import { createUserRepository } from './users/user.repository.js'
import { createUserService } from './users/user.service.js'

async function main() {
  const config = loadConfig()
  const logger = createLogger(config)
  const db = createDb(config.db, logger)
  if (config.session.isExampleSecret) {
    logger.warn('SESSION_SECRET tiene el valor de ejemplo. Genera uno propio (ver .env.example).')
  }

  try {
    await db.raw('SELECT 1')
  } catch (err) {
    logger.fatal(
      { reason: err.message },
      `No se pudo conectar a SQL Server en ${config.db.host}:${config.db.port}. ` +
        '¿Está corriendo? (docker compose up -d) ¿Coinciden usuario y contraseña con el .env?',
    )
    await db.destroy()
    process.exit(1)
  }

  if (config.db.migrateOnStart) {
    const [, applied] = await db.migrate.latest()
    if (applied.length) logger.info({ applied }, 'Migraciones aplicadas')
  }

  // Composición: aquí se conectan todas las piezas
  const userRepository = createUserRepository(db)
  const userService = createUserService(userRepository, { bcryptRounds: config.security.bcryptRounds, logger })
  const hostService = createHostService(createHostRepository(db), { logger })
  const pingRepository = createPingRepository(db)
  const statsService = createStatsService({ hostService, pingRepository, config: config.monitoring })
  const pingMonitor = createPingMonitor({
    hostService,
    pingRepository,
    probe: createPingProbe(),
    config: config.monitoring,
    logger,
  })
  const sessionStore = new SqlSessionStore(db, { ttlMs: config.session.ttlMs, logger })
  const loginAttempts = new LoginAttempts({
    repository: createLoginAttemptRepository(db),
    maxAttempts: config.security.maxLoginAttempts,
    lockStepMs: config.security.lockStepMs,
    windowMs: config.security.failureWindowMs,
    resetAfterMs: config.security.lockResetAfterMs,
  })

  await seedInitialAdmin({ userService, seedAdmin: config.seedAdmin, logger })

  const app = createApp({ config, logger, userRepository, userService, hostService, pingMonitor, statsService, loginAttempts, sessionStore })
  const onListen = (protocol) => () => logger.info(`API escuchando en ${protocol}://localhost:${config.port}`)
  let server
  if (config.https.enabled) {
    const tls = { cert: readFileSync(config.https.certFile), key: readFileSync(config.https.keyFile) }
    server = createServer(tls, app).listen(config.port, onListen('https'))
  } else {
    logger.warn('Sin certificado en certs/: la API usa HTTP. Para activar HTTPS ejecuta scripts/generar-certificado.ps1')
    server = app.listen(config.port, onListen('http'))
  }
  const scheduler = startScheduler({ pingMonitor, sessionStore, loginAttempts, config: config.monitoring, logger })

  // Apagado ordenado: termina las peticiones en curso y cierra las conexiones a la BD
  const shutdown = async (signal) => {
    logger.info({ signal }, 'Deteniendo el servidor…')
    await scheduler.stop()
    server.close(async () => {
      await db.destroy()
      process.exit(0)
    })
    setTimeout(() => process.exit(1), 10_000).unref()
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main().catch((err) => {
  console.error(err.message ?? err)
  process.exit(1)
})
