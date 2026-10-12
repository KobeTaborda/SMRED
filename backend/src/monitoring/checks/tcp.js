/** Revisión por puerto TCP: comprueba que un servicio esté escuchando. */
import { connect } from 'node:net'
import { isValidHostAddress } from '../../hosts/host-address.js'
import { failed, networkErrorMessage, round1, seconds } from './network-errors.js'

/**
 * Intenta abrir una conexión y la cierra de inmediato.
 * No envía datos, así que no afecta al servicio revisado.
 */
export function createTcpProbe() {
  return {
    /**
     * @param {string} address
     * @param {number} port
     * @param {{ timeoutMs: number }} options
     * @returns {Promise<import('./index.js').CheckResult>}
     */
    check(address, port, { timeoutMs }) {
      return new Promise((resolve) => {
        const started = performance.now()
        let lookedUpAt = null
        let settled = false
        const socket = connect({ host: address, port })

        const finish = (result) => {
          if (settled) return
          settled = true
          clearTimeout(timer)
          socket.destroy()
          resolve(result)
        }
        const timer = setTimeout(() => finish(failed(`El puerto ${port} no respondió en ${seconds(timeoutMs)}.`)), timeoutMs)

        // "lookup" solo ocurre si la dirección es un nombre: separa el tiempo del DNS del de la conexión
        socket.once('lookup', () => (lookedUpAt = performance.now()))
        socket.once('connect', () => {
          const connectedAt = performance.now()
          finish({
            reachable: true,
            avgLatencyMs: round1(connectedAt - started),
            packetLossPct: 0,
            timings: {
              dnsMs: lookedUpAt ? round1(lookedUpAt - started) : null,
              connectMs: round1(connectedAt - (lookedUpAt ?? started)),
              tlsMs: null,
              ttfbMs: null,
            },
            message: `Puerto ${port} abierto.`,
          })
        })
        socket.once('error', (err) => finish(failed(networkErrorMessage(err))))
      })
    },
  }
}

/** @type {import('./index.js').CheckDefinition} */
export const tcpCheck = {
  type: 'TCP',
  name: 'puerto',
  available: true,
  fields: ['port'],
  addressError: 'Ingresa una IP válida (ej. 192.168.1.1) o un nombre de host (ej. servidor.local).',
  isValidAddress: isValidHostAddress,
  validate: (host) => (host.port == null ? [{ path: 'port', message: 'Indica el puerto (ej. 443).' }] : []),
  slowThresholdMs: (config) => config.degradedLatencyMs,
  createRunner() {
    const probe = createTcpProbe()
    return { run: (host, config) => probe.check(host.address, host.port, { timeoutMs: config.timeoutMs }) }
  },
}
