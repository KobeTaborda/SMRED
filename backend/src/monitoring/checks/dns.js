/** Revisión DNS: que el dominio resuelva y, si se indica, a la IP esperada. */
import { isIP } from 'node:net'
import { Resolver } from 'node:dns/promises'
import { isValidDomainName } from '../../hosts/host-address.js'
import { failed, round1, seconds } from './network-errors.js'

const DNS_ERRORS = {
  ENOTFOUND: 'El nombre no existe (el dominio no está registrado o está mal escrito).',
  ENODATA: 'El nombre existe pero no tiene direcciones IP configuradas.',
  ESERVFAIL: 'El servidor DNS no pudo resolver el nombre.',
  EREFUSED: 'El servidor DNS rechazó la consulta.',
  ECONNREFUSED: 'No se pudo contactar al servidor DNS.',
}

/** Misma forma de escribir una IP (IPv6 en minúsculas) para poder compararlas. */
const normalizeIp = (ip) => (isIP(ip) === 6 ? ip.toLowerCase() : ip)

/**
 * Revisión DNS: consulta las direcciones IPv4 e IPv6 del nombre a los servidores DNS
 * configurados en el equipo donde corre SMRED, y mide cuánto tarda la respuesta.
 * Si se indica una IP esperada, falla cuando el nombre apunta a otra (cambio inesperado
 * de configuración o un DNS alterado).
 * @param {{ createResolver?: (options: { timeout: number, tries: number }) => Pick<Resolver, 'resolve4' | 'resolve6'> }} [deps]
 */
export function createDnsProbe({ createResolver = (options) => new Resolver(options) } = {}) {
  return {
    /**
     * @param {string} name
     * @param {{ timeoutMs: number, expectedIp?: string | null }} options
     * @returns {Promise<import('./index.js').CheckResult>}
     */
    async check(name, { timeoutMs, expectedIp }) {
      const resolver = createResolver({ timeout: timeoutMs, tries: 1 })
      const started = performance.now()
      const [v4, v6] = await Promise.allSettled([resolver.resolve4(name), resolver.resolve6(name)])
      const elapsed = round1(performance.now() - started)

      const addresses = [v4, v6].flatMap((r) => (r.status === 'fulfilled' ? r.value : [])).map(normalizeIp)
      if (addresses.length === 0) {
        const err = v4.status === 'rejected' ? v4.reason : v6.status === 'rejected' ? v6.reason : null
        if (err?.code === 'ETIMEOUT') return failed(`El servidor DNS no respondió en ${seconds(timeoutMs)}.`)
        return failed(DNS_ERRORS[err?.code] ?? `No se pudo resolver el nombre (${err?.code ?? 'sin respuesta'}).`)
      }

      const shown = addresses.length > 3 ? `${addresses.slice(0, 3).join(', ')} y ${addresses.length - 3} más` : addresses.join(', ')
      const timings = { dnsMs: elapsed, connectMs: null, tlsMs: null, ttfbMs: null }
      if (expectedIp && !addresses.includes(normalizeIp(expectedIp))) {
        return { reachable: false, avgLatencyMs: elapsed, packetLossPct: 100, timings, message: `Resuelve a ${shown}, no a la IP esperada ${expectedIp}.` }
      }
      return { reachable: true, avgLatencyMs: elapsed, packetLossPct: 0, timings, message: `Resuelve a ${shown}.` }
    },
  }
}

/** @type {import('./index.js').CheckDefinition} */
export const dnsCheck = {
  type: 'DNS',
  name: 'DNS',
  available: true,
  fields: ['expectedIp'],
  addressError: 'Ingresa un nombre de dominio (ej. tdea.edu.co). Una IP no necesita revisión DNS.',
  isValidAddress: isValidDomainName,
  validate: (host) =>
    host.expectedIp && !isIP(host.expectedIp) ? [{ path: 'expectedIp', message: 'Ingresa una IP válida (ej. 200.12.180.5).' }] : [],
  slowThresholdMs: (config) => config.degradedLatencyMs,
  createRunner() {
    const probe = createDnsProbe()
    return { run: (host, config) => probe.check(host.address, { timeoutMs: config.timeoutMs, expectedIp: host.expectedIp }) }
  },
}
