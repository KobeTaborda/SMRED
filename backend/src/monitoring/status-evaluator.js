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
