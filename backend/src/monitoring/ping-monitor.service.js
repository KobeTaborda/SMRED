import pLimit from 'p-limit'
import { evaluateStatus } from './status-evaluator.js'

const DAY_MS = 86_400_000

/**
 * Orquesta las verificaciones por ping.
 * Node atiende muchos pings a la vez sin hilos extra (E/S asíncrona); p-limit solo evita
 * lanzar cientos de procesos ping simultáneos si hay muchos hosts.
 */
export function createPingMonitor({ hostService, pingRepository, probe, config, logger, now = () => new Date() }) {
  async function check(host) {
    const result = await probe.ping(host.address, { attempts: config.attempts, timeoutMs: config.timeoutMs })
    const status = evaluateStatus(result, config.degradedLatencyMs)
    const checkedAt = now()

    await pingRepository.insert({ hostId: host.id, ...pickResult(result), checkedAt })
    await hostService.recordCheck(host.id, { status, latencyMs: result.avgLatencyMs, checkedAt })

    return { hostId: host.id, status, ...pickResult(result), checkedAt: checkedAt.toISOString() }
  }

  return {
    /** Verifica en paralelo todos los hosts con monitoreo activo. */
    async checkAll() {
      const hosts = await hostService.listMonitored()
      if (hosts.length === 0) return
      const started = Date.now()
      const limit = pLimit(config.maxConcurrency)

      const results = await Promise.allSettled(hosts.map((host) => limit(() => check(host))))
      results.forEach((result, i) => {
        if (result.status === 'rejected') {
          logger.warn({ err: result.reason, host: hosts[i].address }, 'Falló la verificación de un host')
        }
      })
      logger.debug({ hosts: hosts.length, ms: Date.now() - started }, 'Ciclo de ping completado')
    },

    /** Verificación manual (botón "Verificar"). */
    async checkNow(hostId) {
      return check(await hostService.get(hostId))
    },

    async latest(hostId, limit) {
      await hostService.get(hostId)
      return pingRepository.findLatest(hostId, Math.min(Math.max(Math.trunc(limit) || 10, 1), 100))
    },

    async history(hostId, hours) {
      await hostService.get(hostId) // 404 si no existe
      return pingRepository.findByHostSince(hostId, new Date(now().getTime() - clampHours(hours) * 3_600_000))
    },

    async purgeOld() {
      const cutoff = new Date(now().getTime() - config.retentionDays * DAY_MS)
      return pingRepository.deleteOlderThan(cutoff)
    },
  }
}

/** Entre 1 hora y 7 días; 24 h por defecto. */
const clampHours = (hours) => Math.min(Math.max(Math.trunc(hours) || 24, 1), 168)

const pickResult = ({ reachable, avgLatencyMs, packetLossPct }) => ({ reachable, latencyMs: avgLatencyMs, packetLossPct })
