import cron from 'node-cron'

/**
 * Tareas periódicas:
 * - Ping a todos los hosts. Se usa setTimeout encadenado (no setInterval) para que un ciclo
 *   nunca empiece antes de que termine el anterior, aunque la red esté lenta.
 * - Limpieza diaria de historial viejo y sesiones vencidas.
 */
export function startScheduler({ pingMonitor, sessionStore, loginAttempts, config, logger }) {
  let stopped = false
  let timer

  const runPingCycle = async () => {
    try {
      await pingMonitor.checkAll()
    } catch (err) {
      logger.error({ err }, 'Error en el ciclo de ping')
    } finally {
      if (!stopped) timer = setTimeout(runPingCycle, config.intervalMs)
    }
  }
  timer = setTimeout(runPingCycle, config.initialDelayMs)

  const cleanupTask = cron.schedule(config.cleanupCron, async () => {
    try {
      const pings = await pingMonitor.purgeOld()
      const sessions = await sessionStore.clearExpired()
      const attempts = loginAttempts ? await loginAttempts.purgeStale() : 0
      logger.info({ pings, sessions, attempts }, 'Limpieza diaria completada')
    } catch (err) {
      logger.error({ err }, 'Error en la limpieza diaria')
    }
  })

  logger.info({ everySeconds: config.intervalMs / 1000 }, 'Monitoreo iniciado')

  return {
    async stop() {
      stopped = true
      clearTimeout(timer)
      await cleanupTask.stop()
    },
  }
}
