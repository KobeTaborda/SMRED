import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { z } from 'zod'
import { tooManyAttempts, unauthorized } from '../common/errors.js'
import { validateBody } from '../common/validate.js'
import { toUserResponse } from '../users/user.mappers.js'
import { changeOwnPasswordSchema } from '../users/user.schemas.js'
import { CSRF_COOKIE, issueCsrfToken } from './csrf.js'
import { requireAuth } from './middleware.js'

const loginSchema = z.object({
  username: z.string({ error: 'El usuario es obligatorio.' }).trim().min(1, 'El usuario es obligatorio.').max(50),
  password: z.string({ error: 'La contraseña es obligatoria.' }).min(1, 'La contraseña es obligatoria.').max(72),
})

/**
 * @param {{ userService: any, loginAttempts: import('./login-attempts.js').LoginAttempts,
 *           sessionCookieName: string }} deps
 */
export function createAuthRouter({ userService, loginAttempts, sessionCookieName }) {
  const router = Router()

  // Segunda capa contra fuerza bruta: límite por IP (la primera es el bloqueo por usuario)
  const loginLimiter = rateLimit({
    windowMs: 15 * 60_000,
    limit: 30,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, _res, next) => next(tooManyAttempts(15 * 60)),
  })

  /** La SPA lo llama al iniciar para obtener la cookie XSRF-TOKEN. */
  router.get('/csrf', (req, res) => {
    const token = issueCsrfToken(req, res)
    res.json({ headerName: 'X-XSRF-TOKEN', token })
  })

  router.post('/login', loginLimiter, validateBody(loginSchema), async (req, res) => {
    const { username, password } = req.body

    const lockMs = await loginAttempts.remainingLockMs(username, req.ip)
    if (lockMs > 0) throw tooManyAttempts(Math.ceil(lockMs / 1000))

    const user = await userService.authenticate(username, password)
    if (!user) {
      await loginAttempts.recordFailure(username, req.ip)
      // Mensaje genérico: no revela si el usuario existe o está deshabilitado
      throw unauthorized('Usuario o contraseña incorrectos.')
    }
    await loginAttempts.recordSuccess(username, req.ip)

    await startSession(req, res, user)
    res.json(toUserResponse(user))
  })

  router.post('/logout', (req, res, next) => {
    req.session.destroy((err) => {
      if (err) return next(err)
      res.clearCookie(sessionCookieName, { path: '/' })
      res.clearCookie(CSRF_COOKIE, { path: '/' })
      res.status(204).end()
    })
  })

  router.get('/me', requireAuth, (req, res) => {
    res.json(toUserResponse(req.user))
  })

  /**
   * El usuario cambia su propia contraseña. Se cierran sus sesiones en otros equipos
   * (sube token_version) y esta sesión continúa con un id nuevo.
   */
  router.put('/password', loginLimiter, requireAuth, validateBody(changeOwnPasswordSchema), async (req, res) => {
    const updated = await userService.changeOwnPassword(req.user, req.body.currentPassword, req.body.newPassword)
    await startSession(req, res, updated)
    res.json(toUserResponse(updated))
  })

  return router
}

/** Nueva sesión al autenticar o cambiar la contraseña: evita ataques de fijación de sesión. */
async function startSession(req, res, user) {
  await regenerateSession(req)
  req.session.userId = user.id
  req.session.tokenVersion = user.tokenVersion
  issueCsrfToken(req, res)
}

function regenerateSession(req) {
  return new Promise((resolve, reject) => req.session.regenerate((err) => (err ? reject(err) : resolve())))
}
