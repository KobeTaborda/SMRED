/**
 * Estadísticas para la vista de detalle y el panel de inicio.
 * La agregación pesada la hace SQL Server (ping.repository); aquí solo se arman las series.
 */

export const PERIODS = {
  '24h': { hours: 24, bucketMinutes: 30 },
  '7d': { hours: 168, bucketMinutes: 240 },
}

const round1 = (value) => (value == null ? null : Math.round(value * 10) / 10)

/**
 * Estado de una franja: sin datos, sin respuesta (mayoría de fallos), lento o en línea.
 * @param {{ checks: number, ok: number, avgLatencyMs: number|null }} bucket
 * @param {number} degradedLatencyMs
 */
export function bucketStatus(bucket, degradedLatencyMs) {
  if (!bucket || bucket.checks === 0) return 'UNKNOWN'
  if (bucket.ok / bucket.checks < 0.5) return 'DOWN'
  if (bucket.ok < bucket.checks || (bucket.avgLatencyMs ?? 0) > degradedLatencyMs) return 'DEGRADED'
  return 'UP'
}

/**
 * Inicio de la ventana alineado a la franja, para que las barras no "bailen" en cada recarga.
 * @returns {{ since: Date, count: number, bucketMs: number }}
 */
export function windowFor(now, hours, bucketMinutes) {
  const bucketMs = bucketMinutes * 60_000
  const since = new Date(Math.floor((now.getTime() - hours * 3_600_000) / bucketMs) * bucketMs)
  const count = Math.ceil((now.getTime() - since.getTime()) / bucketMs)
  return { since, count, bucketMs }
}

/** Completa las franjas sin datos para que la serie sea continua. */
export function fillBuckets(rows, { since, count, bucketMs, degradedLatencyMs }) {
  const byIndex = new Map(rows.map((row) => [row.bucket, row]))
  return Array.from({ length: count }, (_, i) => {
    const row = byIndex.get(i)
    return {
      start: new Date(since.getTime() + i * bucketMs).toISOString(),
      checks: row?.checks ?? 0,
      availabilityPct: row?.checks ? round1((row.ok / row.checks) * 100) : null,
      avgLatencyMs: round1(row?.avgLatencyMs ?? null),
      maxLatencyMs: round1(row?.maxLatencyMs ?? null),
      status: bucketStatus(row, degradedLatencyMs),
    }
  })
}

export function createStatsService({ hostService, pingRepository, config, now = () => new Date() }) {
  return {
    async hostStats(hostId, periodKey) {
      await hostService.get(hostId) // 404 si no existe
      const period = PERIODS[periodKey] ?? PERIODS['24h']
      const { since, count, bucketMs } = windowFor(now(), period.hours, period.bucketMinutes)

      const [summary, rows] = await Promise.all([
        pingRepository.summarySince(hostId, since),
        pingRepository.bucketsSince({ hostId, since, bucketMinutes: period.bucketMinutes }),
      ])

      return {
        period: PERIODS[periodKey] ? periodKey : '24h',
        degradedLatencyMs: config.degradedLatencyMs,
        summary: {
          checks: summary.checks,
          availabilityPct: summary.checks ? round1((summary.ok / summary.checks) * 100) : null,
          avgLatencyMs: round1(summary.avgLatencyMs),
          maxLatencyMs: round1(summary.maxLatencyMs),
          maxLatencyAt: summary.maxLatencyAt,
          packetLossPct: round1(summary.avgLossPct),
        },
        buckets: fillBuckets(rows, { since, count, bucketMs, degradedLatencyMs: config.degradedLatencyMs }),
      }
    },

    /** Tendencia de latencia de toda la red (últimas 2 horas, franjas de 5 minutos). */
    async overview() {
      const { since, count, bucketMs } = windowFor(now(), 2, 5)
      const rows = await pingRepository.bucketsSince({ since, bucketMinutes: 5 })
      return {
        intervalSeconds: Math.round(config.intervalMs / 1000),
        degradedLatencyMs: config.degradedLatencyMs,
        latencyTrend: fillBuckets(rows, { since, count, bucketMs, degradedLatencyMs: config.degradedLatencyMs }).map(
          ({ start, avgLatencyMs }) => ({ start, avgLatencyMs }),
        ),
      }
    },
  }
}
