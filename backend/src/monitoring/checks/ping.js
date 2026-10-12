/**
 * Revisión por ping: latencia, paquetes perdidos y jitter usando el comando ping del sistema.
 */
import { spawn } from 'node:child_process'
import { isValidHostAddress } from '../../hosts/host-address.js'

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
    /** @returns {Promise<{ reachable: boolean, avgLatencyMs: number|null, packetLossPct: number, jitterMs: number|null }>} */
    ping(address, { attempts, timeoutMs }) {
      return new Promise((resolve) => {
        const child = spawn('ping', pingArgs(address, { attempts, timeoutMs }), { windowsHide: true })
        let output = ''
        // Tope de tiempo por si el comando se queda colgado
        const killer = setTimeout(() => child.kill(), attempts * (timeoutMs + 1000) + 2000)

        child.stdout.on('data', (chunk) => (output += chunk.toString('latin1')))
        child.on('error', () => {
          clearTimeout(killer)
          resolve({ reachable: false, avgLatencyMs: null, packetLossPct: 100, jitterMs: null })
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
 * @returns {{ reachable: boolean, avgLatencyMs: number|null, packetLossPct: number, jitterMs: number|null }}
 */
export function parsePingOutput(output, attempts) {
  const latencies = []
  for (const line of output.split(/\r?\n/)) {
    if (!TTL.test(line)) continue
    const match = LATENCY.exec(line)
    latencies.push(match ? Number(match[1].replace(',', '.')) : 0)
  }

  const received = Math.min(latencies.length, attempts)
  if (received === 0) return { reachable: false, avgLatencyMs: null, packetLossPct: 100, jitterMs: null }

  const replies = latencies.slice(0, received)
  const avg = replies.reduce((sum, ms) => sum + ms, 0) / received
  return {
    reachable: true,
    avgLatencyMs: round1(avg),
    packetLossPct: Math.round(((attempts - received) * 100) / attempts),
    jitterMs: jitterOf(replies),
  }
}

/**
 * Variación de la latencia (jitter): promedio de la diferencia entre respuestas seguidas.
 * 10, 12, 11 ms → (2 + 1) / 2 = 1,5 ms. Con menos de dos respuestas no se puede calcular.
 * @param {number[]} latencies
 */
export function jitterOf(latencies) {
  if (latencies.length < 2) return null
  let total = 0
  for (let i = 1; i < latencies.length; i++) total += Math.abs(latencies[i] - latencies[i - 1])
  return round1(total / (latencies.length - 1))
}

const round1 = (value) => Math.round(value * 10) / 10

/** Frase para el resultado del ping, que el comando del sistema no trae. */
export function pingMessage({ reachable, packetLossPct }, attempts) {
  if (!reachable) return `No respondió a ninguno de los ${attempts} pings.`
  if (packetLossPct === 0) return `Respondió a los ${attempts} pings.`
  const lost = Math.round((packetLossPct * attempts) / 100)
  return `Se perdieron ${lost} de ${attempts} pings.`
}

/** @type {import('./index.js').CheckDefinition} */
export const pingCheck = {
  type: 'PING',
  name: 'ping',
  available: true,
  addressError: 'Ingresa una IP válida (ej. 192.168.1.1) o un nombre de host (ej. servidor.local).',
  isValidAddress: isValidHostAddress,
  slowThresholdMs: (config) => config.degradedLatencyMs,
  createRunner() {
    const probe = createPingProbe()
    return {
      async run(host, config) {
        const result = await probe.ping(host.address, { attempts: config.attempts, timeoutMs: config.timeoutMs })
        return { ...result, message: pingMessage(result, config.attempts) }
      },
    }
  },
}
