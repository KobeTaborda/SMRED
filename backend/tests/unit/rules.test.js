import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createMemoryAttemptRepository, LoginAttempts } from '../../src/auth/login-attempts.js'
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
    const attempts = new LoginAttempts({ repository: createMemoryAttemptRepository(), maxAttempts: 3, lockMs: 15 * 60_000, now: () => now })
    return { attempts, advance: (ms) => (now += ms) }
  }
  const IP_A = '192.168.10.50'
  const IP_B = '192.168.10.77'

  it('bloquea al llegar al máximo, sin distinguir mayúsculas', async () => {
    const { attempts } = setup()
    await attempts.recordFailure('admin', IP_A)
    await attempts.recordFailure('admin', IP_A)
    assert.equal(await attempts.remainingLockMs('admin', IP_A), 0)
    await attempts.recordFailure('ADMIN', IP_A)
    assert.equal(await attempts.remainingLockMs('admin', IP_A), 15 * 60_000)
  })

  it('el bloqueo es por equipo: otro equipo puede seguir entrando', async () => {
    const { attempts } = setup()
    for (let i = 0; i < 3; i++) await attempts.recordFailure('admin', IP_B)
    assert.ok((await attempts.remainingLockMs('admin', IP_B)) > 0)
    assert.equal(await attempts.remainingLockMs('admin', IP_A), 0)
  })

  it('desbloquea cuando vence el tiempo', async () => {
    const { attempts, advance } = setup()
    for (let i = 0; i < 3; i++) await attempts.recordFailure('admin', IP_A)
    advance(16 * 60_000)
    assert.equal(await attempts.remainingLockMs('admin', IP_A), 0)
  })

  it('los fallos espaciados en el tiempo no se acumulan', async () => {
    const { attempts, advance } = setup()
    await attempts.recordFailure('admin', IP_A)
    await attempts.recordFailure('admin', IP_A)
    advance(20 * 60_000) // pasó la ventana de 15 minutos
    await attempts.recordFailure('admin', IP_A)
    assert.equal(await attempts.remainingLockMs('admin', IP_A), 0)
  })

  it('un login exitoso reinicia el contador', async () => {
    const { attempts } = setup()
    await attempts.recordFailure('admin', IP_A)
    await attempts.recordFailure('admin', IP_A)
    await attempts.recordSuccess('admin', IP_A)
    await attempts.recordFailure('admin', IP_A)
    assert.equal(await attempts.remainingLockMs('admin', IP_A), 0)
  })
})
