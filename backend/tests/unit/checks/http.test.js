import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { after, before, describe, it } from 'node:test'
import { createHttpProbe } from '../../../src/monitoring/checks/http.js'

/** Servidor HTTP local con una ruta por caso, para probar sin depender de internet. */
function startHttpServer() {
  const server = createServer((req, res) => {
    if (req.url === '/ok') return res.end('<h1>Bienvenidos a la TdeA</h1>')
    if (req.url === '/error') return (res.statusCode = 500), res.end('falló')
    if (req.url === '/redirect') return res.writeHead(301, { Location: '/ok' }).end()
    if (req.url === '/slow') return setTimeout(() => res.end('tarde'), 500)
    res.statusCode = 404
    res.end()
  })
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)))
}

describe('Revisión HTTP', () => {
  let server, base
  const probe = createHttpProbe()
  before(async () => {
    server = await startHttpServer()
    base = `http://127.0.0.1:${server.address().port}`
  })
  after(() => server.close())

  it('pasa con 200 y mide las fases de la petición', async () => {
    const r = await probe.check(`${base}/ok`, { timeoutMs: 2000 })
    assert.equal(r.reachable, true)
    assert.equal(r.statusCode, 200)
    assert.equal(r.message, '200 OK.')
    assert.ok(r.avgLatencyMs >= 0)
    assert.equal(r.timings.dnsMs, null) // es una IP: no hubo consulta DNS
    assert.ok(r.timings.connectMs >= 0 && r.timings.ttfbMs >= 0)
    assert.equal(r.timings.tlsMs, null) // http, sin cifrado
  })

  it('encuentra la palabra clave sin distinguir mayúsculas', async () => {
    const r = await probe.check(`${base}/ok`, { timeoutMs: 2000, keyword: 'bienvenidos' })
    assert.equal(r.reachable, true)
  })

  it('falla si la palabra clave no está, explicando por qué', async () => {
    const r = await probe.check(`${base}/ok`, { timeoutMs: 2000, keyword: 'Matrículas' })
    assert.equal(r.reachable, false)
    assert.match(r.message, /no contiene el texto "Matrículas"/)
  })

  it('falla con un error 500', async () => {
    const r = await probe.check(`${base}/error`, { timeoutMs: 2000 })
    assert.equal(r.reachable, false)
    assert.equal(r.statusCode, 500)
    assert.match(r.message, /500 Internal Server Error/)
  })

  it('compara con el código esperado', async () => {
    const r = await probe.check(`${base}/no-existe`, { timeoutMs: 2000, expectedStatus: 404 })
    assert.equal(r.reachable, true)
    const r2 = await probe.check(`${base}/ok`, { timeoutMs: 2000, expectedStatus: 204 })
    assert.equal(r2.reachable, false)
    assert.match(r2.message, /se esperaba 204/)
  })

  it('sigue redirecciones, salvo que se espere justamente la redirección', async () => {
    const followed = await probe.check(`${base}/redirect`, { timeoutMs: 2000 })
    assert.equal(followed.statusCode, 200)
    assert.match(followed.message, /tras 1 redirección/)
    const kept = await probe.check(`${base}/redirect`, { timeoutMs: 2000, expectedStatus: 301 })
    assert.equal(kept.statusCode, 301)
    assert.equal(kept.reachable, true)
  })

  it('falla si la página tarda más que el tiempo máximo', async () => {
    const r = await probe.check(`${base}/slow`, { timeoutMs: 200 })
    assert.equal(r.reachable, false)
    assert.equal(r.message, 'La página no respondió en 0,2 s.')
  })

  it('explica una conexión rechazada', async () => {
    const r = await probe.check('http://127.0.0.1:1/', { timeoutMs: 2000 })
    assert.equal(r.reachable, false)
    assert.match(r.message, /Conexión rechazada/)
  })
})
