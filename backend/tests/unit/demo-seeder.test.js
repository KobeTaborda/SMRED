import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { DEMO_HOSTS, DEMO_USERS, seedDemoData } from '../../src/demo/demo-seeder.js'
import { createHostService } from '../../src/hosts/host.service.js'
import { createUserService } from '../../src/users/user.service.js'
import { createFakeHostRepository, createFakeUserRepository } from '../helpers/fakes.js'

const logger = { info() {}, warn() {} }

function setup() {
  const userService = createUserService(createFakeUserRepository(), { bcryptRounds: 4, logger })
  const hostService = createHostService(createFakeHostRepository(), { logger })
  return { userService, hostService, seed: (isProduction = false) => seedDemoData({ userService, hostService, isProduction, logger }) }
}

describe('seedDemoData', () => {
  it('crea la cuenta del profesor (debe cambiar la contraseña) y los hosts de prueba', async () => {
    const { userService, hostService, seed } = setup()
    await seed()

    const profesor = (await userService.list()).find((u) => u.username === 'profesor')
    assert.equal(profesor.role, 'ADMIN')
    assert.equal(profesor.mustChangePassword, true)
    assert.ok(await userService.authenticate('profesor', DEMO_USERS[0].password))

    const addresses = (await hostService.list()).map((h) => h.address).sort()
    assert.deepEqual(addresses, DEMO_HOSTS.map((h) => h.address).sort())
  })

  it('es idempotente: arrancar varias veces no duplica nada', async () => {
    const { userService, hostService, seed } = setup()
    await seed()
    await seed()
    assert.equal((await userService.list()).length, DEMO_USERS.length)
    assert.equal((await hostService.list()).length, DEMO_HOSTS.length)
  })

  it('no reinicia la contraseña de una cuenta que ya existe', async () => {
    const { userService, seed } = setup()
    await seed()
    const profesor = (await userService.list()).find((u) => u.username === 'profesor')
    await userService.resetPassword(profesor.id, 'Otra-Clave-2026')
    await seed()
    assert.equal(await userService.authenticate('profesor', DEMO_USERS[0].password), null)
    assert.ok(await userService.authenticate('profesor', 'Otra-Clave-2026'))
  })

  it('vuelve a crear un host de prueba que alguien borró', async () => {
    const { hostService, seed } = setup()
    await seed()
    const google = (await hostService.list()).find((h) => h.address === '8.8.8.8')
    await hostService.remove(google.id)
    await seed()
    assert.ok((await hostService.list()).some((h) => h.address === '8.8.8.8'))
  })

  it('no hace nada en producción', async () => {
    const { userService, hostService, seed } = setup()
    await seed(true)
    assert.equal((await userService.list()).length, 0)
    assert.equal((await hostService.list()).length, 0)
  })
})
