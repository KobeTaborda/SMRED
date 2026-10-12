import { spawn } from 'node:child_process'
import { AppError, businessRule, conflict } from '../../common/errors.js'
import { isValidHostAddress } from '../../hosts/host-address.js'
import { networkTargetOf } from '../checks/index.js'
import { parseTracerouteOutput } from './traceroute.parser.js'

const MAX_HOPS = 15
const WAIT_MS = 1000

/**
 * Comando y argumentos según el sistema. -d / -n evita traducir cada IP a nombre,
 * que en Windows hace el trazado varias veces más lento.
 * Seguridad: spawn con lista de argumentos (sin shell) y destino ya validado.
 * @param {string} target
 * @param {{ maxHops?: number, waitMs?: number, platform?: NodeJS.Platform }} [options]
 */
export function tracerouteCommand(target, { maxHops = MAX_HOPS, waitMs = WAIT_MS, platform = process.platform } = {}) {
  if (platform === 'win32') return { command: 'tracert', args: ['-d', '-h', String(maxHops), '-w', String(waitMs), target] }
  return {
    command: 'traceroute',
    args: ['-n', '-m', String(maxHops), '-w', String(Math.max(1, Math.ceil(waitMs / 1000))), '-q', '3', target],
  }
}

export function createTracerouteRunner() {
  return {
    /** @param {string} target @returns {Promise<string>} salida del comando */
    run(target) {
      const { command, args } = tracerouteCommand(target)
      return new Promise((resolve, reject) => {
        const child = spawn(command, args, { windowsHide: true })
        let output = ''
        // Tope de tiempo por si el comando se queda colgado (15 saltos × 3 sondas × 1 s + margen)
        const killer = setTimeout(() => child.kill(), MAX_HOPS * 3 * WAIT_MS + 10_000)
        child.stdout.on('data', (chunk) => (output += chunk.toString('latin1')))
        child.on('error', (err) => {
          clearTimeout(killer)
          if (err.code === 'ENOENT') {
            const install = command === 'traceroute' ? ' En Linux se instala con: sudo apt install traceroute' : ''
            reject(new AppError(503, 'Comando no disponible', `El servidor no tiene el comando ${command}.${install}`))
          } else reject(err)
        })
        child.on('close', () => {
          clearTimeout(killer)
          resolve(output)
        })
      })
    },
  }
}

/**
 * Traceroute bajo demanda (no se guarda). Puede tardar hasta un minuto, así que se permite
 * uno por equipo y pocos a la vez.
 */
export function createTracerouteService({ hostService, runner, logger, maxConcurrent = 2 }) {
  const running = new Set()

  return {
    async trace(hostId) {
      const host = await hostService.get(hostId) // 404 si no existe
      const target = networkTargetOf(host)
      if (!isValidHostAddress(target)) throw businessRule('La dirección de este equipo no permite trazar la ruta.')
      if (running.has(hostId)) throw conflict('Ya hay un trazado de ruta en curso para este equipo.')
      if (running.size >= maxConcurrent) throw businessRule('Hay otros trazados de ruta en curso. Intenta de nuevo en un momento.')

      running.add(hostId)
      const started = Date.now()
      try {
        const hops = parseTracerouteOutput(await runner.run(target))
        logger.info({ host: host.name, target, hops: hops.length, ms: Date.now() - started }, 'Trazado de ruta completado')
        return { target, hops, durationMs: Date.now() - started }
      } finally {
        running.delete(hostId)
      }
    },
  }
}
