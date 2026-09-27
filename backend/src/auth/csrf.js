import { randomBytes, timingSafeEqual } from 'node:crypto'
import { forbidden } from '../common/errors.js'

/**
 * Protección CSRF con "synchronizer token":
 * - El token se guarda en la sesión (servidor) y se entrega al navegador en la cookie legible XSRF-TOKEN.
 * - El frontend lo devuelve en el header X-XSRF-TOKEN en cada petición que modifica datos.
 * - Otro sitio no puede leer la cookie, así que no puede falsificar el header.
 */
export const CSRF_COOKIE = 'XSRF-TOKEN'
export const CSRF_HEADER = 'x-xsrf-token'
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/** Crea (si no existe) el token de la sesión y lo envía en la cookie. */
export function issueCsrfToken(req, res) {
  req.session.csrfToken ??= randomBytes(32).toString('base64url')
  // secure = true cuando la conexión es HTTPS: la cookie nunca viaja sin cifrar
  res.cookie(CSRF_COOKIE, req.session.csrfToken, { httpOnly: false, sameSite: 'lax', secure: req.secure, path: '/' })
  return req.session.csrfToken
}

export function csrfProtection(req, _res, next) {
  if (SAFE_METHODS.has(req.method)) return next()

  const expected = req.session?.csrfToken
  const provided = req.get(CSRF_HEADER)
  if (!expected || !provided || !safeEqual(expected, provided)) {
    return next(forbidden('Token de seguridad inválido o vencido. Recarga la página.', { code: 'CSRF_INVALID' }))
  }
  next()
}

function safeEqual(a, b) {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB)
}
