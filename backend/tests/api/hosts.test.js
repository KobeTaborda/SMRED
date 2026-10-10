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
    assert.match(check.body.message, /Respuesta lenta: 350 ms \(lo normal es menos de 200 ms\)/)

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

describe('API /api/hosts con tipos de revisión', () => {
  let ctx, admin
  beforeEach(async () => {
    ctx = await createTestApp()
    admin = await loggedInClient(ctx.app, ADMIN)
  })

  const WEB = { name: 'TdeA', address: 'https://TDEA.edu.co', type: 'WEBSITE', checkType: 'HTTP', keyword: 'Bienvenidos' }

  it('crea una revisión web y normaliza la URL', async () => {
    const res = await admin.post('/api/hosts', WEB)
    assert.equal(res.status, 201)
    assert.equal(res.body.address, 'https://tdea.edu.co/')
    assert.equal(res.body.checkType, 'HTTP')
    assert.equal(res.body.keyword, 'Bienvenidos')
    assert.equal(res.body.port, null)
  })

  it('pide el puerto en una revisión TCP', async () => {
    const res = await admin.post('/api/hosts', { name: 'SQL', address: '10.0.0.21', type: 'SERVER', checkType: 'TCP' })
    assert.equal(res.status, 400)
    assert.match(res.body.errors.port, /puerto/)
  })

  it('permite revisar el mismo equipo de varias formas, pero no repetir la misma revisión', async () => {
    const base = { name: 'Servidor', address: '10.0.0.21', type: 'SERVER' }
    assert.equal((await admin.post('/api/hosts', base)).status, 201)
    assert.equal((await admin.post('/api/hosts', { ...base, checkType: 'TCP', port: 3389 })).status, 201)
    assert.equal((await admin.post('/api/hosts', { ...base, checkType: 'TCP', port: 1433 })).status, 201)
    const dup = await admin.post('/api/hosts', { ...base, checkType: 'TCP', port: '3389' })
    assert.equal(dup.status, 409)
    assert.match(dup.body.detail, /puerto 3389/)
  })

  it('al cambiar lo que se revisa, el estado vuelve a "sin verificar"', async () => {
    const { body: host } = await admin.post('/api/hosts', { name: 'Servidor', address: '10.0.0.21', type: 'SERVER' })
    await admin.post(`/api/hosts/${host.id}/check`)
    assert.equal((await admin.get(`/api/hosts/${host.id}`)).body.status, 'UP')

    const renamed = await admin.put(`/api/hosts/${host.id}`, { name: 'Servidor BD', address: '10.0.0.21', type: 'SERVER' })
    assert.equal(renamed.body.status, 'UP') // solo cambió el nombre
    const changed = await admin.put(`/api/hosts/${host.id}`, { name: 'Servidor BD', address: '10.0.0.21', type: 'SERVER', checkType: 'TCP', port: 1433 })
    assert.equal(changed.body.status, 'UNKNOWN')
  })

  it('guarda el mensaje, el código y el desglose de tiempos de una revisión web', async () => {
    const { body: host } = await admin.post('/api/hosts', WEB)
    const timings = { dnsMs: 12, connectMs: 30, tlsMs: 45, ttfbMs: 210 }
    ctx.probe.set('https://tdea.edu.co/', {
      reachable: true, avgLatencyMs: 320, packetLossPct: 0, statusCode: 200, timings, message: '200 OK.',
      sslExpiresAt: new Date(Date.now() + 5 * 86_400_000),
    })
    const check = await admin.post(`/api/hosts/${host.id}/check`)
    assert.equal(check.body.status, 'UP') // 320 ms está bajo el umbral web
    assert.match(check.body.message, /200 OK\. El certificado SSL vence en [45] días\./)

    const detail = (await admin.get(`/api/hosts/${host.id}`)).body
    assert.ok(detail.sslExpiresAt)
    assert.match(detail.lastMessage, /certificado/)

    const [last] = (await admin.get(`/api/hosts/${host.id}/pings?limit=1`)).body
    assert.deepEqual(last.timings, timings)
    assert.equal(last.statusCode, 200)

    const stats = (await admin.get(`/api/hosts/${host.id}/stats`)).body
    assert.equal(stats.degradedLatencyMs, 1000)
  })

  it('el umbral propio del equipo manda sobre el general', async () => {
    const { body: host } = await admin.post('/api/hosts', { name: 'Switch', address: '10.0.0.2', type: 'SWITCH', degradedMs: 5 })
    ctx.probe.set('10.0.0.2', { reachable: true, avgLatencyMs: 8, packetLossPct: 0 })
    assert.equal((await admin.post(`/api/hosts/${host.id}/check`)).body.status, 'DEGRADED')
  })

  it('el administrador traza la ruta; un usuario de solo lectura no puede', async () => {
    const { body: host } = await admin.post('/api/hosts', WEB)
    const res = await admin.post(`/api/hosts/${host.id}/traceroute`)
    assert.equal(res.status, 200)
    assert.equal(res.body.target, 'tdea.edu.co')
    assert.equal(res.body.hops.length, 2)
    assert.deepEqual(ctx.tracerouteRunner.calls, ['tdea.edu.co'])

    const viewer = await loggedInClient(ctx.app, VIEWER)
    assert.equal((await viewer.post(`/api/hosts/${host.id}/traceroute`)).status, 403)
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
      ctx.recordRepository.records.push({
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
      { checks: 4, availabilityPct: 75, avgLatencyMs: 20, maxLatencyMs: 30, maxLatencyAt: undefined, packetLossPct: 25, avgJitterMs: null },
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

  it('la tendencia general solo cuenta pings: una página web lenta no la distorsiona', async () => {
    const web = (await admin.post('/api/hosts', { name: 'Sitio', address: 'https://ejemplo.edu.co/', type: 'WEBSITE', checkType: 'HTTP' })).body
    ctx.recordRepository.records.push({ hostId: web.id, reachable: true, latencyMs: 900, packetLossPct: 0, checkedAt: new Date(Date.now() - 30 * 60_000) })
    const res = await admin.get('/api/overview')
    const values = res.body.latencyTrend.map((p) => p.avgLatencyMs).filter((v) => v != null)
    assert.ok(values.length > 0)
    assert.ok(values.every((v) => v <= 30), `valores: ${values}`)
  })
})
