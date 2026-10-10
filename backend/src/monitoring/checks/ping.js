/**
 * Revisión por ping: latencia y paquetes perdidos usando el comando ping del sistema.
 */
import { spawn } from 'node:child_process'

/**
 * Argumentos del comando ping según el sistema. Funciona en Windows sin permisos de administrador.
 * Seguridad: se usa spawn con lista de argumentos (sin shell) y la dirección ya fue validada,
 * por lo que no es posible inyectar comandos.
 * @param {string} address
 * @param {{ attempts: number, timeoutMs: number, platform?: NodeJS.Platform }} options
 */
export function pingArgs(address, { attempts, timeoutMs, platform = process.platform }) {
  if (platform === 'win32') return ['-n', String(attempts), '-w', String(timeoutMs), address]
  if (platform === 'darwin') return ['-c', String(attempts), '-W', String(timeoutMs), address]
  return ['-c', String(attempts), '-W', String(Math.max(1, Math.ceil(timeoutMs / 1000))), address]
}

export function createPingProbe() {
  return {
    /** @returns {Promise<{ reachable: boolean, avgLatencyMs: number|null, packetLossPct: number }>} */
    ping(address, { attempts, timeoutMs }) {
      return new Promise((resolve) => {
        const child = spawn('ping', pingArgs(address, { attempts, timeoutMs }), { windowsHide: true })
        let output = ''
        // Tope de tiempo por si el comando se queda colgado
        const killer = setTimeout(() => child.kill(), attempts * (timeoutMs + 1000) + 2000)

        child.stdout.on('data', (chunk) => (output += chunk.toString('latin1')))
        child.on('error', () => {
          clearTimeout(killer)
          resolve({ reachable: false, avgLatencyMs: null, packetLossPct: 100 })
        })
        child.on('close', () => {
          clearTimeout(killer)
          resolve(parsePingOutput(output, attempts))
        })
      })
    },
  }
}

/*
 * Lectura de la salida del ping. Se basa en marcas que no dependen del idioma:
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
