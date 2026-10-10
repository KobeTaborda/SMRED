/**
 * Tipos de revisión disponibles. Cada uno está en su propio archivo de esta carpeta.
 * SNMP y agente están registrados pero deshabilitados (available: false) hasta implementarlos.
 */
import { agentCheck } from './agent.js'
import { dnsCheck } from './dns.js'
import { httpCheck } from './http.js'
import { pingCheck } from './ping.js'
import { snmpCheck } from './snmp.js'
import { tcpCheck } from './tcp.js'

/**
 * Resultado de cualquier revisión.
 *
 * @typedef {object} CheckTimings
 * @property {number|null} dnsMs     resolver el nombre
 * @property {number|null} connectMs abrir la conexión TCP
 * @property {number|null} tlsMs     negociar el cifrado (solo HTTPS)
 * @property {number|null} ttfbMs    esperar el primer byte de la respuesta (solo HTTP)
 *
 * @typedef {object} CheckResult
 * @property {boolean} reachable       la revisión pasó (respondió y cumplió lo esperado)
 * @property {number|null} avgLatencyMs tiempo de respuesta (promedio de los pings, o el tiempo total)
 * @property {number} packetLossPct    0 o 100 en revisiones de un solo intento
 * @property {number|null} [jitterMs]  variación entre pings seguidos (solo PING)
 * @property {CheckTimings|null} [timings]
 * @property {number|null} [statusCode] código HTTP
 * @property {string|null} [message]   explicación corta para mostrar
 * @property {Date|null} [sslExpiresAt] vencimiento del certificado (solo HTTPS)
 *
 * @typedef {'port' | 'expectedStatus' | 'keyword' | 'expectedIp'} CheckField campos opcionales del host
 *
 * @typedef {object} CheckDefinition
 * @property {string} type                valor de hosts.check_type
 * @property {string} name                nombre para mensajes ("revisión de puerto")
 * @property {boolean} available
 * @property {CheckField[]} [fields]      campos que usa; los demás se guardan como null
 * @property {(address: string) => boolean} [isValidAddress]
 * @property {string} [addressError]
 * @property {(host: any) => { path: string, message: string }[]} [validate] reglas extra
 * @property {(address: string) => string} [normalizeAddress]
 * @property {(host: any) => string} [networkTarget] destino del traceroute (por defecto, la dirección)
 * @property {(config: any) => number} [slowThresholdMs] umbral general de "lento"
 * @property {() => { run: (host: any, config: any) => Promise<CheckResult> }} [createRunner]
 */

/** @type {CheckDefinition[]} */
export const CHECKS = [pingCheck, tcpCheck, httpCheck, dnsCheck, snmpCheck, agentCheck]

/** Todos los tipos, incluidos los próximos. */
export const ALL_CHECK_TYPES = CHECKS.map((c) => c.type)

/** Solo los que ya funcionan. */
export const CHECK_TYPES = CHECKS.filter((c) => c.available).map((c) => c.type)

/** Todos los campos opcionales que puede usar alguna revisión. @type {CheckField[]} */
export const CHECK_FIELDS = ['port', 'expectedStatus', 'keyword', 'expectedIp']

/** @param {string} [type] @returns {CheckDefinition} */
export function getCheck(type = 'PING') {
  const check = CHECKS.find((c) => c.type === type)
  if (!check) throw new Error(`Tipo de revisión desconocido: ${type}`)
  return check
}

/** Equipo de red detrás de un host, para el trazado de ruta. */
export const networkTargetOf = (host) => getCheck(host.checkType).networkTarget?.(host) ?? host.address

/**
 * Ejecuta la revisión que corresponde a cada host.
 * @param {{ runners?: Partial<Record<string, { run: (host: any, config: any) => Promise<CheckResult> }>> }} [options]
 *   runners permite reemplazar la ejecución de un tipo (en los tests).
 */
export function createCheckRunner({ runners = {} } = {}) {
  const active = Object.fromEntries(CHECKS.filter((c) => c.available).map((c) => [c.type, runners[c.type] ?? c.createRunner()]))
  return {
    /** @returns {Promise<CheckResult>} */
    check(host, config) {
      const runner = active[host.checkType ?? 'PING']
      if (!runner) throw new Error(`La revisión ${host.checkType} todavía no está disponible.`)
      return runner.run(host, config)
    },
  }
}
