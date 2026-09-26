import { spawn } from 'node:child_process'
import { parsePingOutput } from './ping-parser.js'

/**
 * Ejecuta el comando ping del sistema. Funciona en Windows sin permisos de administrador.
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
