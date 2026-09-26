/**
 * Regla pura para decidir el estado de un host a partir del resultado del ping.
 * @param {{ reachable: boolean, avgLatencyMs: number|null, packetLossPct: number }} result
 * @param {number} degradedLatencyMs
 * @returns {'UP'|'DEGRADED'|'DOWN'}
 */
export function evaluateStatus(result, degradedLatencyMs) {
  if (!result.reachable) return 'DOWN'
  const slow = result.avgLatencyMs != null && result.avgLatencyMs > degradedLatencyMs
  return slow || result.packetLossPct > 0 ? 'DEGRADED' : 'UP'
}
