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

describe('LoginAttempts (bloqueo progresivo)', () => {
  const MIN = 60_000
  const setup = () => {
    let now = 1_000_000_000
    const attempts = new LoginAttempts({
      repository: createMemoryAttemptRepository(),
      maxAttempts: 4,
      lockStepMs: 5 * MIN,
      windowMs: 15 * MIN,
      resetAfterMs: 24 * 60 * MIN,
      now: () => now,
    })
    const fail = async (times, ip = IP_A, user = 'admin') => {
      for (let i = 0; i < times; i++) await attempts.recordFailure(user, ip)
    }
    return { attempts, fail, advance: (ms) => (now += ms) }
  }
  const IP_A = '192.168.10.50'
  const IP_B = '192.168.10.77'

  it('3 fallos no bloquean; el cuarto bloquea 5 minutos (sin distinguir mayúsculas)', async () => {
    const { attempts, fail } = setup()
    await fail(3)
    assert.equal(await attempts.remainingLockMs('admin', IP_A), 0)
    await attempts.recordFailure('ADMIN', IP_A)
    assert.equal(await attempts.remainingLockMs('admin', IP_A), 5 * MIN)
  })

  it('cada ciclo de bloqueo suma 5 minutos: 5, 10, 15, 20', async () => {
    const { attempts, fail, advance } = setup()
    for (const expected of [5, 10, 15, 20]) {
      await fail(4)
      assert.equal(await attempts.remainingLockMs('admin', IP_A), expected * MIN, `ciclo de ${expected} min`)
      advance(expected * MIN) // esperar a que termine el bloqueo
      assert.equal(await attempts.remainingLockMs('admin', IP_A), 0)
    }
  })

  it('el bloqueo es por equipo: otro equipo puede seguir entrando', async () => {
    const { attempts, fail } = setup()
    await fail(4, IP_B)
    assert.ok((await attempts.remainingLockMs('admin', IP_B)) > 0)
    assert.equal(await attempts.remainingLockMs('admin', IP_A), 0)
  })

  it('los fallos espaciados en el tiempo no se acumulan', async () => {
    const { attempts, fail, advance } = setup()
    await fail(3)
    advance(20 * MIN) // pasó la ventana de 15 minutos
    await fail(1)
    assert.equal(await attempts.remainingLockMs('admin', IP_A), 0)
  })

  it('un login exitoso reinicia la escalada', async () => {
    const { attempts, fail, advance } = setup()
    await fail(4) // primer bloqueo: 5 min
    advance(5 * MIN)
    await attempts.recordSuccess('admin', IP_A)
    await fail(4)
    assert.equal(await attempts.remainingLockMs('admin', IP_A), 5 * MIN) // vuelve a 5, no a 10
  })

  it('tras un día sin fallos, la escalada vuelve a empezar', async () => {
    const { attempts, fail, advance } = setup()
    await fail(4)
    advance(5 * MIN)
    await fail(4) // segundo bloqueo: 10 min
    advance(25 * 60 * MIN)
    await fail(4)
    assert.equal(await attempts.remainingLockMs('admin', IP_A), 5 * MIN)
  })

  it('restablecer la contraseña (clearUser) borra la escalada en todos los equipos', async () => {
    const { attempts, fail } = setup()
    await fail(4, IP_A)
    await fail(4, IP_B)
    await attempts.clearUser('Admin')
    assert.equal(await attempts.remainingLockMs('admin', IP_A), 0)
    assert.equal(await attempts.remainingLockMs('admin', IP_B), 0)
  })

  it('la limpieza diaria conserva los bloqueos vigentes y borra los viejos', async () => {
    const { attempts, fail, advance } = setup()
    await fail(4, IP_A, 'viejo')
    advance(25 * 60 * MIN)
    await fail(4, IP_A, 'reciente')
    assert.equal(await attempts.purgeStale(), 1)
    assert.ok((await attempts.remainingLockMs('reciente', IP_A)) > 0)
  })
})
