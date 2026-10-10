import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createDnsProbe } from '../../../src/monitoring/checks/dns.js'

describe('Revisión DNS', () => {
  /** Resolver falso: respuestas fijas por tipo de registro, sin consultar la red. */
  const resolverWith = ({ v4 = [], v6 = [], error = null }) => () => ({
    resolve4: async () => {
      if (error) throw Object.assign(new Error(error), { code: error })
      return v4
    },
    resolve6: async () => {
      if (error) throw Object.assign(new Error(error), { code: error })
      return v6
    },
  })

  it('lista las IP a las que resuelve el nombre', async () => {
    const probe = createDnsProbe({ createResolver: resolverWith({ v4: ['200.1.2.3'], v6: ['2001:DB8::1'] }) })
    const r = await probe.check('tdea.edu.co', { timeoutMs: 1000 })
    assert.equal(r.reachable, true)
    assert.equal(r.message, 'Resuelve a 200.1.2.3, 2001:db8::1.')
  })

  it('falla si no resuelve a la IP esperada', async () => {
    const probe = createDnsProbe({ createResolver: resolverWith({ v4: ['200.1.2.3'] }) })
    const r = await probe.check('tdea.edu.co', { timeoutMs: 1000, expectedIp: '10.0.0.1' })
    assert.equal(r.reachable, false)
    assert.match(r.message, /no a la IP esperada 10\.0\.0\.1/)
  })

  it('explica cuando el nombre no existe', async () => {
    const probe = createDnsProbe({ createResolver: resolverWith({ error: 'ENOTFOUND' }) })
    const r = await probe.check('no-existe.tdea.edu.co', { timeoutMs: 1000 })
    assert.equal(r.reachable, false)
    assert.match(r.message, /El nombre no existe/)
  })

  it('explica cuando el servidor DNS no responde', async () => {
    const probe = createDnsProbe({ createResolver: resolverWith({ error: 'ETIMEOUT' }) })
    const r = await probe.check('tdea.edu.co', { timeoutMs: 1000 })
    assert.equal(r.message, 'El servidor DNS no respondió en 1 s.')
  })
})
