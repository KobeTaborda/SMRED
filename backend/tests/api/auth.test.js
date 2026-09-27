import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import request from 'supertest'
import { ADMIN, Client, VIEWER, createTestApp } from '../helpers/test-app.js'

describe('API /api/auth', () => {
  let ctx
  beforeEach(async () => (ctx = await createTestApp()))

  it('rechaza peticiones que modifican datos sin token CSRF', async () => {
    const res = await request(ctx.app).post('/api/auth/login').send(ADMIN)
    assert.equal(res.status, 403)
    assert.equal(res.body.code, 'CSRF_INVALID')
  })

  it('inicia sesión y nunca devuelve el hash de la contraseña', async () => {
    const client = new Client(ctx.app)
    const res = await client.login(ADMIN)
    assert.equal(res.status, 200)
    assert.equal(res.body.username, 'admin')
    assert.equal(res.body.passwordHash, undefined)

    const me = await client.get('/api/auth/me')
    assert.equal(me.status, 200)
    assert.equal(me.body.role, 'ADMIN')
  })

  it('responde un error genérico con credenciales incorrectas', async () => {
    const client = new Client(ctx.app)
    const wrongPassword = await client.login({ username: 'admin', password: 'incorrecta' })
    const unknownUser = await client.login({ username: 'nadie', password: 'incorrecta' })
    assert.equal(wrongPassword.status, 401)
    assert.equal(wrongPassword.body.detail, unknownUser.body.detail)
  })

  it('bloquea la cuenta tras 5 intentos fallidos', async () => {
    const client = new Client(ctx.app)
    for (let i = 0; i < 5; i++) await client.login({ username: 'admin', password: 'incorrecta' })
    const res = await client.login(ADMIN) // ni siquiera la contraseña correcta entra
    assert.equal(res.status, 429)
    assert.ok(res.headers['retry-after'])
  })

  it('el bloqueo de un equipo no impide entrar desde otro', async () => {
    const attacker = new Client(ctx.app, '192.168.10.99')
    for (let i = 0; i < 5; i++) await attacker.login({ username: 'admin', password: 'incorrecta' })
    assert.equal((await attacker.login(ADMIN)).status, 429)

    const owner = new Client(ctx.app, '192.168.10.10')
    assert.equal((await owner.login(ADMIN)).status, 200)
  })

  it('valida el cuerpo del login', async () => {
    const res = await new Client(ctx.app).post('/api/auth/login', { username: '' })
    assert.equal(res.status, 400)
    assert.ok(res.body.errors.username)
    assert.ok(res.body.errors.password)
  })

  it('cierra la sesión', async () => {
    const client = new Client(ctx.app)
    await client.login(ADMIN)
    assert.equal((await client.post('/api/auth/logout')).status, 204)
    client.csrf = null
    assert.equal((await client.get('/api/auth/me')).status, 401)
  })

  it('responde 404 en formato Problem Details para rutas inexistentes', async () => {
    const res = await request(ctx.app).get('/api/no-existe')
    assert.equal(res.status, 404)
    assert.match(res.headers['content-type'], /problem\+json/)
  })
})

describe('API /api/auth/password', () => {
  let ctx
  beforeEach(async () => (ctx = await createTestApp()))

  it('el usuario cambia su contraseña y se cierran sus otras sesiones', async () => {
    const laptop = new Client(ctx.app)
    const phone = new Client(ctx.app)
    await laptop.login(ADMIN)
    await phone.login(ADMIN)

    const res = await laptop.put('/api/auth/password', { currentPassword: ADMIN.password, newPassword: 'Nueva-Clave-2026' })
    assert.equal(res.status, 200)

    assert.equal((await laptop.get('/api/auth/me')).status, 200) // la sesión que hizo el cambio sigue
    assert.equal((await phone.get('/api/auth/me')).status, 401) // la otra se cerró
    assert.equal((await new Client(ctx.app).login({ username: 'admin', password: 'Nueva-Clave-2026' })).status, 200)
  })

  it('rechaza una contraseña actual incorrecta o una nueva igual a la actual', async () => {
    const client = new Client(ctx.app)
    await client.login(ADMIN)
    const wrong = await client.put('/api/auth/password', { currentPassword: 'no-es-esta', newPassword: 'Nueva-Clave-2026' })
    assert.equal(wrong.status, 400)
    assert.ok(wrong.body.errors.currentPassword)
    const same = await client.put('/api/auth/password', { currentPassword: ADMIN.password, newPassword: ADMIN.password })
    assert.equal(same.status, 400)
    assert.ok(same.body.errors.newPassword)
  })

  it('una cuenta creada por un administrador debe cambiar la contraseña antes de usar la app', async () => {
    const admin = new Client(ctx.app)
    await admin.login(ADMIN)
    await admin.post('/api/users', { username: 'ferney', fullName: 'Ferney', password: 'Temporal-2026', role: 'VIEWER' })

    const ferney = new Client(ctx.app)
    const login = await ferney.login({ username: 'ferney', password: 'Temporal-2026' })
    assert.equal(login.body.mustChangePassword, true)

    const blocked = await ferney.get('/api/hosts')
    assert.equal(blocked.status, 403)
    assert.equal(blocked.body.code, 'PASSWORD_CHANGE_REQUIRED')

    const changed = await ferney.put('/api/auth/password', { currentPassword: 'Temporal-2026', newPassword: 'Mi-Clave-Propia-1' })
    assert.equal(changed.body.mustChangePassword, false)
    assert.equal((await ferney.get('/api/hosts')).status, 200)
  })

  it('restablecer la contraseña desbloquea una cuenta bloqueada por intentos fallidos', async () => {
    const viewer = new Client(ctx.app, '192.168.10.30')
    for (let i = 0; i < 5; i++) await viewer.login({ username: 'viewer', password: 'incorrecta' })
    assert.equal((await viewer.login(VIEWER)).status, 429)

    const admin = new Client(ctx.app, '192.168.10.10')
    await admin.login(ADMIN)
    const { id } = await ctx.userRepository.findByUsername('viewer')
    await admin.put(`/api/users/${id}/password`, { password: 'Temporal-Nueva-1' })

    assert.equal((await viewer.login({ username: 'viewer', password: 'Temporal-Nueva-1' })).status, 200)
  })

  it('restablecer la contraseña desde Usuarios cierra la sesión del usuario', async () => {
    const viewer = new Client(ctx.app)
    await viewer.login(VIEWER)
    const admin = new Client(ctx.app)
    await admin.login(ADMIN)
    const { id } = await ctx.userRepository.findByUsername('viewer')
    await admin.put(`/api/users/${id}/password`, { password: 'Restablecida-2026' })
    assert.equal((await viewer.get('/api/auth/me')).status, 401)
  })
})
