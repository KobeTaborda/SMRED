import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import request from 'supertest'
import { ADMIN, Client, createTestApp } from '../helpers/test-app.js'

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
