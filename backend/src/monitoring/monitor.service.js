import pLimit from 'p-limit'
import { degradedThresholdFor, evaluateStatus } from './status-evaluator.js'

const DAY_MS = 86_400_000

const MAX_MESSAGE = 300 // tamaño de la columna message / last_message

/**
 * Ejecuta las revisiones de todos los hosts. p-limit evita lanzar demasiadas a la vez.
 * @param {{ probe: { check: (host: any, config: any) => Promise<import('./checks/index.js').CheckResult> } } & Record<string, any>} deps
 */
export function createMonitor({ hostService, recordRepository, probe, config, logger, now = () => new Date() }) {
  async function check(host) {
    const result = await probe.check(host, config)
    const threshold = degradedThresholdFor(host, config)
    const status = evaluateStatus(result, threshold)
    const checkedAt = now()
    const warnings = []
    if (result.reachable && result.avgLatencyMs > threshold) {
      warnings.push(`Respuesta lenta: ${Math.round(result.avgLatencyMs)} ms (lo normal es menos de ${threshold} ms).`)
    }
    const message = [result.message, ...warnings].filter(Boolean).join(' ').slice(0, MAX_MESSAGE) || null
    const record = toRecord(result, message)

    await recordRepository.insert({ hostId: host.id, ...record, checkedAt })
    await hostService.recordCheck(host.id, {
      status,
      latencyMs: result.avgLatencyMs,
      message,
      sslExpiresAt: result.sslExpiresAt ?? null,
      checkedAt,
    })

    return { hostId: host.id, status, ...record, checkedAt: checkedAt.toISOString() }
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
      logger.debug({ hosts: hosts.length, ms: Date.now() - started }, 'Ciclo de revisiones completado')
    },

    /** Verificación manual (botón "Verificar"). */
    async checkNow(hostId) {
      return check(await hostService.get(hostId))
    },

    async latest(hostId, limit) {
      await hostService.get(hostId)
      return recordRepository.findLatest(hostId, Math.min(Math.max(Math.trunc(limit) || 10, 1), 100))
    },

    async history(hostId, hours) {
      await hostService.get(hostId) // 404 si no existe
      return recordRepository.findByHostSince(hostId, new Date(now().getTime() - clampHours(hours) * 3_600_000))
    },

    async purgeOld() {
      const cutoff = new Date(now().getTime() - config.retentionDays * DAY_MS)
      return recordRepository.deleteOlderThan(cutoff)
    },
  }
}

/** Entre 1 hora y 7 días; 24 h por defecto. */
const clampHours = (hours) => Math.min(Math.max(Math.trunc(hours) || 24, 1), 168)

/** Lo que se guarda en el historial de cada revisión. */
const toRecord = (result, message) => ({
  reachable: result.reachable,
  latencyMs: result.avgLatencyMs,
  packetLossPct: result.packetLossPct,
  jitterMs: result.jitterMs ?? null,
  timings: result.timings ?? null,
  statusCode: result.statusCode ?? null,
  message,
})
