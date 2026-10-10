import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { CHECK_TYPES, CHECKS, createCheckRunner, getCheck } from '../../../src/monitoring/checks/index.js'
import { hostSchema } from '../../../src/hosts/host.schemas.js'
import { degradedThresholdFor } from '../../../src/monitoring/status-evaluator.js'

describe('Registro de revisiones', () => {
  it('SNMP y Agente están registrados como próximamente y no se ejecutan', () => {
    assert.equal(getCheck('SNMP').available, false)
    assert.equal(getCheck('AGENT').available, false)
    assert.deepEqual(CHECK_TYPES, ['PING'])
  })

  it('cada revisión disponible define lo necesario para validarse y ejecutarse', () => {
    for (const check of CHECKS.filter((c) => c.available)) {
      assert.equal(typeof check.isValidAddress, 'function', check.type)
      assert.ok(check.addressError, check.type)
      assert.equal(typeof check.createRunner, 'function', check.type)
      assert.equal(typeof check.slowThresholdMs, 'function', check.type)
    }
  })

  it('la API rechaza una revisión próxima con un mensaje claro', () => {
    const r = hostSchema.safeParse({ name: 'Switch', address: '10.0.0.2', type: 'SWITCH', checkType: 'SNMP' })
    assert.equal(r.success, false)
    assert.equal(r.error.issues[0].message, 'Esta revisión estará disponible próximamente.')
  })

  it('guarda como null los campos que no usa la revisión elegida', () => {
    const host = hostSchema.parse({ name: 'Router', address: '10.0.0.1', type: 'ROUTER', port: 1433, keyword: 'TdeA', expectedIp: '1.1.1.1' })
    assert.equal(host.checkType, 'PING')
    assert.equal(host.port, null)
    assert.equal(host.keyword, null)
    assert.equal(host.expectedIp, null)
  })

  it('cada tipo define su umbral de lento', () => {
    const config = { degradedLatencyMs: 200, httpDegradedLatencyMs: 1000 }
    assert.equal(degradedThresholdFor({ checkType: 'PING' }, config), 200)
  })
})

describe('createCheckRunner', () => {
  const calls = []
  const fake = (type, result = { reachable: true, avgLatencyMs: 1, packetLossPct: 0 }) => ({
    run: async (host, config) => (calls.push([type, host, config]), result),
  })
  const runner = createCheckRunner({ runners: { PING: fake('PING') } })
  const config = { attempts: 3, timeoutMs: 2000, httpTimeoutMs: 10_000 }

  it('ejecuta la revisión que corresponde a cada host', async () => {
    await runner.check({ address: '8.8.8.8' }, config) // sin tipo = ping
    assert.deepEqual(calls.map((c) => c[0]), ['PING'])
  })

  it('no ejecuta revisiones próximas', () => {
    assert.throws(() => runner.check({ checkType: 'SNMP', address: '10.0.0.2' }, config), /todavía no está disponible/)
  })
})
