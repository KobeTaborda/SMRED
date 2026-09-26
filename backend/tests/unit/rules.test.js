import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { LoginAttempts } from '../../src/auth/login-attempts.js'
import { isValidHostAddress } from '../../src/hosts/host-address.js'
import { evaluateStatus } from '../../src/monitoring/status-evaluator.js'

describe('evaluateStatus', () => {
  it('DOWN si no responde', () => assert.equal(evaluateStatus({ reachable: false, avgLatencyMs: null, packetLossPct: 100 }, 200), 'DOWN'))
  it('UP si responde rápido y sin pérdida', () => assert.equal(evaluateStatus({ reachable: true, avgLatencyMs: 12, packetLossPct: 0 }, 200), 'UP'))
  it('DEGRADED si la latencia supera el umbral', () => assert.equal(evaluateStatus({ reachable: true, avgLatencyMs: 350, packetLossPct: 0 }, 200), 'DEGRADED'))
  it('DEGRADED si hay pérdida parcial', () => assert.equal(evaluateStatus({ reachable: true, avgLatencyMs: 20, packetLossPct: 33 }, 200), 'DEGRADED'))
})

describe('isValidHostAddress', () => {
  for (const address of ['8.8.8.8', '192.168.1.1', 'servidor.local', 'google.com', 'router-01', '::1', '2001:db8::1']) {
    it(`acepta ${address}`, () => assert.equal(isValidHostAddress(address), true))
  }
  for (const address of ['999.1.1.1', '1.2.3', '-n', '-router', 'host_con_guion_bajo', 'http://google.com', '8.8.8.8; del *', '2001:zz::1']) {
    it(`rechaza ${address}`, () => assert.equal(isValidHostAddress(address), false))
  }
})

describe('LoginAttempts', () => {
  const setup = () => {
    let now = 1_000_000
    const attempts = new LoginAttempts({ maxAttempts: 3, lockMs: 15 * 60_000, now: () => now })
    return { attempts, advance: (ms) => (now += ms) }
  }

  it('bloquea al llegar al máximo, sin distinguir mayúsculas', () => {
    const { attempts } = setup()
    attempts.recordFailure('admin')
    attempts.recordFailure('admin')
    assert.equal(attempts.remainingLockMs('admin'), 0)
    attempts.recordFailure('ADMIN')
    assert.equal(attempts.remainingLockMs('admin'), 15 * 60_000)
  })

  it('desbloquea cuando vence el tiempo', () => {
    const { attempts, advance } = setup()
    for (let i = 0; i < 3; i++) attempts.recordFailure('admin')
    advance(16 * 60_000)
    assert.equal(attempts.remainingLockMs('admin'), 0)
  })

  it('un login exitoso reinicia el contador', () => {
    const { attempts } = setup()
    attempts.recordFailure('admin')
    attempts.recordFailure('admin')
    attempts.recordSuccess('admin')
    attempts.recordFailure('admin')
    assert.equal(attempts.remainingLockMs('admin'), 0)
  })
})
