import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { parsePingOutput } from '../../src/monitoring/ping-parser.js'
import { pingArgs } from '../../src/monitoring/ping-probe.js'

const WINDOWS_ES = `
Haciendo ping a 8.8.8.8 con 32 bytes de datos:
Respuesta desde 8.8.8.8: bytes=32 tiempo=15ms TTL=117
Respuesta desde 8.8.8.8: bytes=32 tiempo=17ms TTL=117
Respuesta desde 8.8.8.8: bytes=32 tiempo=16ms TTL=117

Estadísticas de ping para 8.8.8.8:
    Paquetes: enviados = 3, recibidos = 3, perdidos = 0
    (0% perdidos),`

const WINDOWS_EN_PARTIAL = `
Pinging 192.168.1.1 with 32 bytes of data:
Reply from 192.168.1.1: bytes=32 time<1ms TTL=64
Request timed out.
Reply from 192.168.1.1: bytes=32 time=2ms TTL=64`

const WINDOWS_ES_UNREACHABLE = `
Haciendo ping a 192.168.1.50 con 32 bytes de datos:
Respuesta desde 192.168.1.10: Host de destino inaccesible.
Respuesta desde 192.168.1.10: Host de destino inaccesible.
Tiempo de espera agotado para esta solicitud.`

const LINUX = `
PING 1.1.1.1 (1.1.1.1) 56(84) bytes of data.
64 bytes from 1.1.1.1: icmp_seq=1 ttl=57 time=10.4 ms
64 bytes from 1.1.1.1: icmp_seq=2 ttl=57 time=11.6 ms
64 bytes from 1.1.1.1: icmp_seq=3 ttl=57 time=12.2 ms

--- 1.1.1.1 ping statistics ---
3 packets transmitted, 3 received, 0% packet loss, time 2003ms`

describe('parsePingOutput', () => {
  it('interpreta Windows en español', () => {
    assert.deepEqual(parsePingOutput(WINDOWS_ES, 3), { reachable: true, avgLatencyMs: 16, packetLossPct: 0 })
  })

  it('interpreta pérdida parcial y "time<1ms" en Windows en inglés', () => {
    assert.deepEqual(parsePingOutput(WINDOWS_EN_PARTIAL, 3), { reachable: true, avgLatencyMs: 1.5, packetLossPct: 33 })
  })

  it('no confunde "Host de destino inaccesible" con una respuesta real', () => {
    assert.deepEqual(parsePingOutput(WINDOWS_ES_UNREACHABLE, 3), { reachable: false, avgLatencyMs: null, packetLossPct: 100 })
  })

  it('interpreta Linux con decimales', () => {
    assert.deepEqual(parsePingOutput(LINUX, 3), { reachable: true, avgLatencyMs: 11.4, packetLossPct: 0 })
  })

  it('salida vacía = inalcanzable', () => {
    assert.equal(parsePingOutput('', 3).reachable, false)
  })
})

describe('pingArgs', () => {
  it('usa -n y -w (ms) en Windows', () => {
    assert.deepEqual(pingArgs('8.8.8.8', { attempts: 3, timeoutMs: 2000, platform: 'win32' }), ['-n', '3', '-w', '2000', '8.8.8.8'])
  })

  it('usa -c y -W (segundos) en Linux', () => {
    assert.deepEqual(pingArgs('8.8.8.8', { attempts: 3, timeoutMs: 2000, platform: 'linux' }), ['-c', '3', '-W', '2', '8.8.8.8'])
  })
})
