import assert from 'node:assert/strict'
import { createServer as createTcpServer } from 'node:net'
import { after, before, describe, it } from 'node:test'
import { createTcpProbe } from '../../../src/monitoring/checks/tcp.js'

describe('Revisión de puerto TCP', () => {
  let server, port
  const probe = createTcpProbe()
  before(async () => {
    server = createTcpServer((socket) => socket.end())
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    port = server.address().port
  })
  after(() => server.close())

  it('pasa si el puerto acepta conexiones', async () => {
    const r = await probe.check('127.0.0.1', port, { timeoutMs: 2000 })
    assert.equal(r.reachable, true)
    assert.equal(r.message, `Puerto ${port} abierto.`)
    assert.ok(r.avgLatencyMs >= 0)
  })

  it('falla si el puerto está cerrado', async () => {
    const r = await probe.check('127.0.0.1', 1, { timeoutMs: 2000 })
    assert.equal(r.reachable, false)
    assert.match(r.message, /puerto está cerrado/)
  })
})
