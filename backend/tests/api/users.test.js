import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import { ADMIN, VIEWER, createTestApp, loggedInClient } from '../helpers/test-app.js'

describe('API /api/users', () => {
  let ctx, admin
  beforeEach(async () => {
    ctx = await createTestApp()
    admin = await loggedInClient(ctx.app, ADMIN)
  })

  const idOf = async (username) => (await ctx.userRepository.findByUsername(username)).id

  it('solo el administrador accede', async () => {
    const viewer = await loggedInClient(ctx.app, VIEWER)
    assert.equal((await viewer.get('/api/users')).status, 403)
    assert.equal((await admin.get('/api/users')).status, 200)
  })

  it('crea usuarios y el nuevo usuario puede iniciar sesión', async () => {
    const res = await admin.post('/api/users', { username: 'sebastian', fullName: 'Sebastian', password: 'Password-Seguro-1', role: 'VIEWER' })
    assert.equal(res.status, 201)
    await loggedInClient(ctx.app, { username: 'sebastian', password: 'Password-Seguro-1' })
  })

  it('valida contraseña corta y usuario duplicado', async () => {
    const short = await admin.post('/api/users', { username: 'nuevo', fullName: 'N', password: 'corta', role: 'VIEWER' })
    assert.equal(short.status, 400)
    assert.ok(short.body.errors.password)
    const duplicate = await admin.post('/api/users', { username: 'VIEWER', fullName: 'V', password: 'Password-Seguro-1', role: 'VIEWER' })
    assert.equal(duplicate.status, 409)
  })

  it('no permite eliminarse a sí mismo ni quitarse el rol de admin', async () => {
    const adminId = await idOf('admin')
    assert.equal((await admin.delete(`/api/users/${adminId}`)).status, 422)
    const demote = await admin.put(`/api/users/${adminId}`, { fullName: 'Admin', role: 'VIEWER', enabled: true })
    assert.equal(demote.status, 422)
  })

  it('deshabilitar una cuenta cierra su sesión de inmediato', async () => {
    const viewer = await loggedInClient(ctx.app, VIEWER)
    assert.equal((await viewer.get('/api/hosts')).status, 200)
    await admin.put(`/api/users/${await idOf('viewer')}`, { fullName: 'Viewer', role: 'VIEWER', enabled: false })
    assert.equal((await viewer.get('/api/hosts')).status, 401)
  })

  it('restablece la contraseña', async () => {
    const res = await admin.put(`/api/users/${await idOf('viewer')}/password`, { password: 'Nueva-Password-1' })
    assert.equal(res.status, 204)
    await loggedInClient(ctx.app, { username: 'viewer', password: 'Nueva-Password-1' })
  })
})
