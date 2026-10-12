const IPV4 = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g
const IPV6 = /\b[0-9a-f]{0,4}(?::[0-9a-f]{0,4}){2,7}\b/gi
const TIME = /(?:<\s*)?(\d+(?:[.,]\d+)?)\s*ms/gi

/**
 * @typedef {object} Hop
 * @property {number} hop        número de salto (1 = el primer router)
 * @property {string|null} address IP del router, o null si no respondió
 * @property {number|null} latencyMs promedio de las respuestas de ese salto
 * @property {number} lostProbes sondas sin respuesta en ese salto ("*")
 */

/**
 * Interpreta la salida de tracert (Windows, cualquier idioma) y traceroute (Linux/macOS).
 * Cada salto es una línea que empieza con su número; de ella se toman los tiempos ("12 ms",
 * "<1 ms"), los "*" de las sondas perdidas y la última IP. Los textos como "Tiempo de espera
 * agotado" se ignoran, por eso no depende del idioma del sistema.
 * @param {string} output
 * @returns {Hop[]}
 */
export function parseTracerouteOutput(output) {
  const hops = []
  for (const line of output.split(/\r?\n/)) {
    const match = /^\s*(\d{1,2})\s+(.+)$/.exec(line)
    if (!match) continue
    const rest = match[2]
    const times = [...rest.matchAll(TIME)].map((m) => Number(m[1].replace(',', '.')))
    const ips = [...(rest.match(IPV4) ?? []), ...(rest.match(IPV6) ?? []).filter((ip) => ip.includes('::') || ip.split(':').length > 3)]
    hops.push({
      hop: Number(match[1]),
      address: ips.at(-1) ?? null,
      latencyMs: times.length ? Math.round((times.reduce((a, b) => a + b, 0) / times.length) * 10) / 10 : null,
      lostProbes: (rest.match(/\*/g) ?? []).length,
    })
  }
  return hops
}
