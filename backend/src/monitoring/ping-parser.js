/**
 * Interpreta la salida del comando ping del sistema operativo.
 *
 * Se basa en marcas que no dependen del idioma:
 * - Una respuesta válida siempre contiene "TTL=" (Windows) o "ttl=" (Linux/macOS).
 *   Así se descartan líneas como "Host de destino inaccesible", que no son respuestas reales.
 * - La latencia es el número seguido de "ms" tras "=" o "<" ("tiempo=15ms", "time=15.2 ms", "time<1ms").
 */
const TTL = /ttl=/i
const LATENCY = /[=<]\s*(\d+(?:[.,]\d+)?)\s*ms/i

/**
 * @param {string} output salida completa del comando
 * @param {number} attempts número de paquetes enviados
 * @returns {{ reachable: boolean, avgLatencyMs: number|null, packetLossPct: number }}
 */
export function parsePingOutput(output, attempts) {
  const latencies = []
  for (const line of output.split(/\r?\n/)) {
    if (!TTL.test(line)) continue
    const match = LATENCY.exec(line)
    latencies.push(match ? Number(match[1].replace(',', '.')) : 0)
  }

  const received = Math.min(latencies.length, attempts)
  if (received === 0) return { reachable: false, avgLatencyMs: null, packetLossPct: 100 }

  const avg = latencies.slice(0, received).reduce((sum, ms) => sum + ms, 0) / received
  return {
    reachable: true,
    avgLatencyMs: Math.round(avg * 10) / 10,
    packetLossPct: Math.round(((attempts - received) * 100) / attempts),
  }
}
