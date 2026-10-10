import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import pino from 'pino'
import { parseTracerouteOutput } from '../../src/monitoring/traceroute/traceroute.parser.js'
import { createTracerouteService, tracerouteCommand } from '../../src/monitoring/traceroute/traceroute.service.js'

const WINDOWS_ES = `
Traza a la dirección dns.google [8.8.8.8]
sobre un máximo de 15 saltos:

  1    <1 ms    <1 ms    <1 ms  192.168.1.1
  2     *        *        *     Tiempo de espera agotado para esta solicitud.
  3    12 ms    11 ms    13 ms  10.20.30.1
  4    15 ms     *       17 ms  8.8.8.8

Traza completa.`

const LINUX = `traceroute to 1.1.1.1 (1.1.1.1), 15 hops max, 60 byte packets
 1  192.168.0.1  0.512 ms  0.488 ms  0.470 ms
 2  * * *
 3  1.1.1.1  10.204 ms  10.180 ms  10.322 ms`

describe('parseTracerouteOutput', () => {
  it('interpreta tracert de Windows en español, con saltos sin respuesta', () => {
    assert.deepEqual(parseTracerouteOutput(WINDOWS_ES), [
      { hop: 1, address: '192.168.1.1', latencyMs: 1, lostProbes: 0 },
      { hop: 2, address: null, latencyMs: null, lostProbes: 3 },
      { hop: 3, address: '10.20.30.1', latencyMs: 12, lostProbes: 0 },
      { hop: 4, address: '8.8.8.8', latencyMs: 16, lostProbes: 1 },
    ])
  })

  it('interpreta traceroute de Linux con decimales', () => {
    const hops = parseTracerouteOutput(LINUX)
    assert.equal(hops.length, 3)
    assert.deepEqual(hops[0], { hop: 1, address: '192.168.0.1', latencyMs: 0.5, lostProbes: 0 })
    assert.deepEqual(hops[1], { hop: 2, address: null, latencyMs: null, lostProbes: 3 })
    assert.equal(hops[2].address, '1.1.1.1')
  })

  it('ignora encabezados y líneas vacías', () => {
    assert.deepEqual(parseTracerouteOutput('Traza a 8.8.8.8\n\nTraza completa.'), [])
  })
})

describe('tracerouteCommand', () => {
  it('usa tracert sin resolver nombres en Windows', () => {
    assert.deepEqual(tracerouteCommand('8.8.8.8', { platform: 'win32' }), {
      command: 'tracert', args: ['-d', '-h', '15', '-w', '1000', '8.8.8.8'],
    })
  })
  it('usa traceroute -n en Linux', () => {
    assert.equal(tracerouteCommand('8.8.8.8', { platform: 'linux' }).command, 'traceroute')
  })
})

describe('createTracerouteService', () => {
  const logger = pino({ level: 'silent' })
  const hosts = {
    1: { id: 1, name: 'TdeA', checkType: 'HTTP', address: 'https://tdea.edu.co/' },
    2: { id: 2, name: 'Router', checkType: 'PING', address: '192.168.1.1' },
  }
  const hostService = { get: async (id) => hosts[id] }

  it('traza hacia el servidor de la página, no hacia la URL', async () => {
    const targets = []
    const service = createTracerouteService({ hostService, logger, runner: { run: async (t) => (targets.push(t), '') } })
    await service.trace(1)
    assert.deepEqual(targets, ['tdea.edu.co'])
  })

  it('no permite dos trazados al mismo equipo a la vez', async () => {
    let release
    const runner = { run: () => new Promise((resolve) => (release = () => resolve(''))) }
    const service = createTracerouteService({ hostService, logger, runner })
    const first = service.trace(2)
    await new Promise((resolve) => setImmediate(resolve))
    await assert.rejects(service.trace(2), (err) => err.status === 409)
    release()
    await first
  })
})
