import { toIso } from '../common/mappers.js'

/** @param {import('knex').Knex} db */
export function createCheckRecordRepository(db) {
  const table = () => db('ping_records')

  const COLUMNS = [
    'checked_at', 'reachable', 'latency_ms', 'packet_loss_pct', 'jitter_ms',
    'dns_ms', 'connect_ms', 'tls_ms', 'ttfb_ms', 'status_code', 'message',
  ]

  const toRecord = (row) => ({
    checkedAt: toIso(row.checked_at),
    reachable: Boolean(row.reachable),
    latencyMs: row.latency_ms,
    packetLossPct: row.packet_loss_pct,
    jitterMs: row.jitter_ms,
    timings:
      row.dns_ms == null && row.connect_ms == null && row.ttfb_ms == null
        ? null
        : { dnsMs: row.dns_ms, connectMs: row.connect_ms, tlsMs: row.tls_ms, ttfbMs: row.ttfb_ms },
    statusCode: row.status_code,
    message: row.message,
  })

  return {
    async insert({ hostId, reachable, latencyMs, packetLossPct, jitterMs = null, timings = null, statusCode = null, message = null, checkedAt }) {
      await table().insert({
        host_id: hostId,
        reachable,
        latency_ms: latencyMs,
        packet_loss_pct: packetLossPct,
        jitter_ms: jitterMs,
        dns_ms: timings?.dnsMs ?? null,
        connect_ms: timings?.connectMs ?? null,
        tls_ms: timings?.tlsMs ?? null,
        ttfb_ms: timings?.ttfbMs ?? null,
        status_code: statusCode,
        message,
        checked_at: checkedAt,
      })
    },

    async findByHostSince(hostId, since) {
      const rows = await table()
        .where({ host_id: hostId })
        .andWhere('checked_at', '>', since)
        .orderBy('checked_at')
        .select(COLUMNS)
      return rows.map(toRecord)
    },

    /** Las últimas N verificaciones de un host, de la más reciente a la más antigua. */
    async findLatest(hostId, limit) {
      const rows = await table()
        .where({ host_id: hostId })
        .orderBy('checked_at', 'desc')
        .limit(limit)
        .select(COLUMNS)
      return rows.map(toRecord)
    },

    /** Resumen de un host desde una fecha: total, respuestas, latencia promedio y máxima, pérdida. */
    async summarySince(hostId, since) {
      const [row] = await table()
        .where({ host_id: hostId })
        .andWhere('checked_at', '>', since)
        .select(
          db.raw('COUNT(*) AS checks'),
          db.raw('SUM(CASE WHEN reachable = 1 THEN 1 ELSE 0 END) AS ok'),
          db.raw('AVG(latency_ms) AS avg_latency'),
          db.raw('MAX(latency_ms) AS max_latency'),
          db.raw('AVG(CAST(packet_loss_pct AS FLOAT)) AS avg_loss'),
          db.raw('AVG(jitter_ms) AS avg_jitter'),
        )
      const slowest = await table()
        .where({ host_id: hostId })
        .andWhere('checked_at', '>', since)
        .whereNotNull('latency_ms')
        .orderBy('latency_ms', 'desc')
        .first('checked_at')
      return {
        checks: Number(row.checks),
        ok: Number(row.ok ?? 0),
        avgLatencyMs: row.avg_latency,
        maxLatencyMs: row.max_latency,
        avgLossPct: row.avg_loss,
        avgJitterMs: row.avg_jitter,
        maxLatencyAt: slowest ? toIso(slowest.checked_at) : null,
      }
    },

    /**
     * Agrupa las verificaciones en franjas de N minutos contadas desde `since`.
     * Sin hostId, agrupa todos los hosts (tendencia general de la red); hostIds limita a esos hosts.
     * La subconsulta evita repetir en GROUP BY una expresión con parámetros (SQL Server no la acepta).
     */
    async bucketsSince({ hostId, hostIds, since, bucketMinutes }) {
      if (hostIds && hostIds.length === 0) return []
      const inner = table()
        .select(
          db.raw('DATEDIFF(MINUTE, ?, checked_at) / ? AS bucket', [since, bucketMinutes]),
          'reachable',
          'latency_ms',
        )
        .where('checked_at', '>=', since)
      if (hostId) inner.andWhere({ host_id: hostId })
      if (hostIds) inner.whereIn('host_id', hostIds)

      const rows = await db
        .from(inner.as('t'))
        .select(
          'bucket',
          db.raw('COUNT(*) AS checks'),
          db.raw('SUM(CASE WHEN reachable = 1 THEN 1 ELSE 0 END) AS ok'),
          db.raw('AVG(latency_ms) AS avg_latency'),
          db.raw('MAX(latency_ms) AS max_latency'),
        )
        .groupBy('bucket')
        .orderBy('bucket')
      return rows.map((row) => ({
        bucket: Number(row.bucket),
        checks: Number(row.checks),
        ok: Number(row.ok ?? 0),
        avgLatencyMs: row.avg_latency,
        maxLatencyMs: row.max_latency,
      }))
    },

    /** @returns {Promise<number>} filas eliminadas */
    async deleteOlderThan(cutoff) {
      return table().where('checked_at', '<', cutoff).del()
    },
  }
}
