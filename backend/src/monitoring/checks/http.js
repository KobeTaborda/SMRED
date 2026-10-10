/**
 * Revisión de páginas web: código de respuesta, texto esperado, tiempo por fase y
 * vencimiento del certificado SSL.
 */
import http from 'node:http'
import https from 'node:https'
import { parseHttpUrl } from '../../hosts/host-address.js'
import { failed, networkErrorMessage, round1, seconds } from './network-errors.js'

const MAX_REDIRECTS = 5
const MAX_BODY_BYTES = 1024 * 1024 // la palabra clave se busca en el primer MB de la página
const REDIRECT_CODES = new Set([301, 302, 303, 307, 308])
const HEADERS = { 'User-Agent': 'SMRED/1.0 (monitoreo de red)', Accept: 'text/html,application/json;q=0.9,*/*;q=0.8' }

/**
 * Hace UNA petición GET y mide cada fase con los eventos del socket:
 * DNS (lookup) → conexión TCP (connect) → cifrado (secureConnect) → primer byte (response) → fin.
 * agent: false obliga a abrir una conexión nueva en cada revisión; si se reutilizara
 * una conexión abierta, las fases de DNS, conexión y TLS no se medirían.
 * @param {URL} url
 * @param {{ deadline: number, readBody: boolean }} options
 */
function requestOnce(url, { deadline, readBody }) {
  return new Promise((resolve, reject) => {
    const client = url.protocol === 'https:' ? https : http
    const t = { start: performance.now(), lookup: null, connect: null, secure: null, response: null }
    let certificate = null

    const req = client.request(url, { method: 'GET', headers: HEADERS, agent: false }, (res) => {
      t.response = performance.now()
      const chunks = []
      let size = 0
      res.on('data', (chunk) => {
        if (!readBody || size >= MAX_BODY_BYTES) return
        chunks.push(chunk)
        size += chunk.length
      })
      res.on('end', () => {
        clearTimeout(timer)
        const end = performance.now()
        const tlsEnd = t.secure ?? t.connect ?? t.start
        resolve({
          statusCode: res.statusCode,
          location: res.headers.location,
          body: readBody ? Buffer.concat(chunks).subarray(0, MAX_BODY_BYTES).toString('utf8') : '',
          totalMs: end - t.start,
          timings: {
            dnsMs: t.lookup ? round1(t.lookup - t.start) : null,
            connectMs: t.connect ? round1(t.connect - (t.lookup ?? t.start)) : null,
            tlsMs: t.secure && t.connect ? round1(t.secure - t.connect) : null,
            ttfbMs: round1(t.response - tlsEnd),
          },
          certificate,
        })
      })
      res.on('error', reject)
    })

    req.on('socket', (socket) => {
      socket.once('lookup', () => (t.lookup = performance.now()))
      socket.once('connect', () => (t.connect = performance.now()))
      socket.once('secureConnect', () => {
        t.secure = performance.now()
        const cert = socket.getPeerCertificate()
        if (cert?.valid_to) certificate = { validTo: new Date(cert.valid_to), issuer: cert.issuer?.O ?? cert.issuer?.CN ?? null }
      })
    })
    req.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
    const timer = setTimeout(() => req.destroy(Object.assign(new Error('timeout'), { code: 'SMRED_TIMEOUT' })), Math.max(deadline - performance.now(), 1))
    req.end()
  })
}

/**
 * Revisión HTTP/HTTPS de una página o API.
 * - Sigue hasta 5 redirecciones (http → https, dominio → www), salvo que el código esperado
 *   sea justamente una redirección.
 * - Pasa si el código es el esperado (o cualquier 2xx/3xx si no se indicó uno) y,
 *   si hay palabra clave, si la página la contiene (sin distinguir mayúsculas).
 * - El certificado SSL se valida igual que en un navegador: si está vencido o no es de
 *   confianza, la petición falla y se explica por qué.
 */
export function createHttpProbe() {
  return {
    /**
     * @param {string} address URL completa
     * @param {{ timeoutMs: number, expectedStatus?: number | null, keyword?: string | null }} options
     * @returns {Promise<import('./index.js').CheckResult>}
     */
    async check(address, { timeoutMs, expectedStatus = null, keyword = null }) {
      const deadline = performance.now() + timeoutMs
      const followRedirects = !(expectedStatus && REDIRECT_CODES.has(expectedStatus))
      let url = new URL(address)
      let totalMs = 0
      let redirects = 0
      let response

      try {
        for (;;) {
          response = await requestOnce(url, { deadline, readBody: Boolean(keyword) })
          totalMs += response.totalMs
          const next = followRedirects && REDIRECT_CODES.has(response.statusCode) && response.location
          if (!next || redirects >= MAX_REDIRECTS) break
          url = new URL(response.location, url)
          if (url.protocol !== 'http:' && url.protocol !== 'https:') break
          redirects++
        }
      } catch (err) {
        if (err.code === 'SMRED_TIMEOUT') return failed(`La página no respondió en ${seconds(timeoutMs)}.`)
        return failed(networkErrorMessage(err))
      }

      const { statusCode, timings, certificate } = response
      const statusText = `${statusCode} ${http.STATUS_CODES[statusCode] ?? ''}`.trim()
      const viaRedirects = redirects ? ` (tras ${redirects} ${redirects === 1 ? 'redirección' : 'redirecciones'})` : ''
      const result = {
        avgLatencyMs: round1(totalMs),
        statusCode,
        timings,
        sslExpiresAt: certificate?.validTo ?? null,
      }

      const statusOk = expectedStatus ? statusCode === expectedStatus : statusCode >= 200 && statusCode < 400
      if (!statusOk) {
        const expected = expectedStatus ? `; se esperaba ${expectedStatus}` : ''
        return { ...result, reachable: false, packetLossPct: 100, message: `La página respondió ${statusText}${expected}${viaRedirects}.` }
      }
      if (keyword && !response.body.toLowerCase().includes(keyword.toLowerCase())) {
        return { ...result, reachable: false, packetLossPct: 100, message: `Respondió ${statusText}, pero no contiene el texto "${keyword}".` }
      }
      return { ...result, reachable: true, packetLossPct: 0, message: `${statusText}${viaRedirects}.` }
    },
  }
}

/** @type {import('./index.js').CheckDefinition} */
export const httpCheck = {
  type: 'HTTP',
  name: 'página web',
  available: true,
  fields: ['expectedStatus', 'keyword'],
  addressError: 'Ingresa la dirección completa de la página, con http:// o https:// (ej. https://tdea.edu.co/).',
  isValidAddress: (address) => parseHttpUrl(address) !== null,
  // https://tdea.edu.co y https://tdea.edu.co/ deben contar como la misma dirección
  normalizeAddress: (address) => parseHttpUrl(address).toString(),
  networkTarget: (host) => parseHttpUrl(host.address)?.hostname.replace(/^\[(.*)\]$/, '$1') ?? '',
  // Una página tarda bastante más que un ping, por eso tiene su propio umbral
  slowThresholdMs: (config) => config.httpDegradedLatencyMs ?? 1000,
  createRunner() {
    const probe = createHttpProbe()
    return {
      run: (host, config) =>
        probe.check(host.address, { timeoutMs: config.httpTimeoutMs ?? 10_000, expectedStatus: host.expectedStatus, keyword: host.keyword }),
    }
  },
}
