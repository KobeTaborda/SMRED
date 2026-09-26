import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import request from 'supertest'
import { ADMIN, VIEWER, createTestApp, loggedInClient } from '../helpers/test-app.js'

const ROUTER = { name: 'Router principal', address: '192.168.1.1', type: 'ROUTER', location: 'Sala 2' }

describe('API /api/hosts', () => {
  let ctx, admin
  beforeEach(async () => {
    ctx = await createTestApp()
    admin = await loggedInClient(ctx.app, ADMIN)
  })

  it('exige sesión', async () => {
    assert.equal((await request(ctx.app).get('/api/hosts')).status, 401)
  })

  it('el administrador crea, edita y elimina hosts', async () => {
    const created = await admin.post('/api/hosts', ROUTER)
    assert.equal(created.status, 201)
    assert.equal(created.body.status, 'UNKNOWN')
    assert.equal(created.body.monitoringEnabled, true)
    assert.equal(created.body.description, null)

    const updated = await admin.put(`/api/hosts/${created.body.id}`, { ...ROUTER, name: 'Router core' })
    assert.equal(updated.body.name, 'Router core')

    assert.equal((await admin.delete(`/api/hosts/${created.body.id}`)).status, 204)
    assert.equal((await admin.get(`/api/hosts/${created.body.id}`)).status, 404)
  })

  it('valida la dirección y reporta el error por campo', async () => {
    const res = await admin.post('/api/hosts', { ...ROUTER, address: '999.1.1.1' })
    assert.equal(res.status, 400)
    assert.match(res.body.errors.address, /IP válida/)
  })

  it('rechaza direcciones duplicadas', async () => {
    await admin.post('/api/hosts', ROUTER)
    const res = await admin.post('/api/hosts', { ...ROUTER, name: 'Otro' })
    assert.equal(res.status, 409)
  })

  it('un usuario de solo lectura puede ver pero no modificar', async () => {
    await admin.post('/api/hosts', ROUTER)
    const viewer = await loggedInClient(ctx.app, VIEWER)
    assert.equal((await viewer.get('/api/hosts')).body.length, 1)
    assert.equal((await viewer.post('/api/hosts', { ...ROUTER, address: '10.0.0.1' })).status, 403)
  })

  it('verificar ahora actualiza el estado, guarda historial y emite el evento', async () => {
    const { body: host } = await admin.post('/api/hosts', ROUTER)
    const events = []
    ctx.events.on('status-changed', (e) => events.push(e))
    ctx.probe.set(ROUTER.address, { reachable: true, avgLatencyMs: 350, packetLossPct: 0 })

    const check = await admin.post(`/api/hosts/${host.id}/check`)
    assert.equal(check.status, 200)
    assert.equal(check.body.status, 'DEGRADED')

    const detail = await admin.get(`/api/hosts/${host.id}`)
    assert.equal(detail.body.status, 'DEGRADED')
    assert.equal(detail.body.lastLatencyMs, 350)

    const pings = await admin.get(`/api/hosts/${host.id}/pings?hours=1`)
    assert.equal(pings.body.length, 1)
    assert.deepEqual(events.map((e) => [e.previous, e.current]), [['UNKNOWN', 'DEGRADED']])
  })

  it('responde 404 con ids inválidos', async () => {
    assert.equal((await admin.get('/api/hosts/abc')).status, 404)
  })
})

describe('API de estadísticas', () => {
  let ctx, admin, host
  beforeEach(async () => {
    ctx = await createTestApp()
    admin = await loggedInClient(ctx.app, ADMIN)
    host = (await admin.post('/api/hosts', { name: 'Servidor BD', address: '10.0.0.21', type: 'SERVER' })).body
    const now = Date.now()
    // 3 respuestas (10, 20, 30 ms) y 1 fallo en la última hora
    for (const [minutesAgo, reachable, latencyMs] of [[50, true, 10], [40, true, 20], [30, true, 30], [20, false, null]]) {
      ctx.pingRepository.records.push({
        hostId: host.id, reachable, latencyMs, packetLossPct: reachable ? 0 : 100, checkedAt: new Date(now - minutesAgo * 60_000),
      })
    }
  })

  it('resume disponibilidad, latencias y franjas de 24 horas', async () => {
    const res = await admin.get(`/api/hosts/${host.id}/stats?period=24h`)
    assert.equal(res.status, 200)
    assert.equal(res.body.degradedLatencyMs, 200)
    assert.deepEqual(
      { ...res.body.summary, maxLatencyAt: undefined },
      { checks: 4, availabilityPct: 75, avgLatencyMs: 20, maxLatencyMs: 30, maxLatencyAt: undefined, packetLossPct: 25 },
    )
    assert.ok(res.body.buckets.length >= 48)
    assert.ok(res.body.buckets.some((b) => b.checks > 0))
  })

  it('devuelve las últimas verificaciones, de la más reciente a la más antigua', async () => {
    const res = await admin.get(`/api/hosts/${host.id}/pings?limit=2`)
    assert.equal(res.body.length, 2)
    assert.equal(res.body[0].reachable, false)
  })

  it('registra desde cuándo el host está en su estado actual', async () => {
    await admin.post(`/api/hosts/${host.id}/check`)
    const detail = await admin.get(`/api/hosts/${host.id}`)
    assert.ok(detail.body.statusChangedAt)
  })

  it('entrega la tendencia general para el panel', async () => {
    const res = await admin.get('/api/overview')
    assert.equal(res.status, 200)
    assert.equal(res.body.intervalSeconds, 30)
    assert.ok(res.body.latencyTrend.length >= 24 && res.body.latencyTrend.length <= 25)
  })
})
