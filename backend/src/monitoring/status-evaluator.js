import { getCheck } from './checks/index.js'

/**
 * Regla pura para decidir el estado de un host a partir del resultado de una revisión.
 * @param {{ reachable: boolean, avgLatencyMs: number|null, packetLossPct: number }} result
 * @param {number} degradedLatencyMs
 * @returns {'UP'|'DEGRADED'|'DOWN'}
 */
export function evaluateStatus(result, degradedLatencyMs) {
  if (!result.reachable) return 'DOWN'
  const slow = result.avgLatencyMs != null && result.avgLatencyMs > degradedLatencyMs
  return slow || result.packetLossPct > 0 ? 'DEGRADED' : 'UP'
}

/**
 * Umbral de "lento": el del host o, si no tiene, el general de su tipo de revisión.
 * @param {{ degradedMs?: number|null, checkType?: string }} host
 * @param {{ degradedLatencyMs: number, httpDegradedLatencyMs?: number }} config
 */
export function degradedThresholdFor(host, config) {
  if (host.degradedMs) return host.degradedMs
  return getCheck(host.checkType).slowThresholdMs?.(config) ?? config.degradedLatencyMs
}

const DAY_MS = 86_400_000

/**
 * Días que le quedan al certificado SSL (negativo si ya venció), o null si no hay certificado.
 * @param {Date|string|null} expiresAt
 * @param {Date} now
 */
export function certificateDaysLeft(expiresAt, now) {
  if (!expiresAt) return null
  return Math.floor((new Date(expiresAt).getTime() - now.getTime()) / DAY_MS)
}

/**
 * Avisos que no cambian el estado (por ejemplo, un certificado por vencer).
 * @param {{ sslExpiresAt?: Date|null }} result
 * @param {{ sslWarningDays?: number, now: Date }} options
 */
export function checkWarnings(result, { sslWarningDays = 14, now }) {
  const days = certificateDaysLeft(result.sslExpiresAt ?? null, now)
  if (days == null || days > sslWarningDays) return []
  return [days <= 0 ? 'El certificado SSL vence hoy.' : `El certificado SSL vence en ${days} ${days === 1 ? 'día' : 'días'}.`]
}
