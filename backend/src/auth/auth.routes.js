import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { z } from 'zod'
import { tooManyAttempts, unauthorized } from '../common/errors.js'
import { validateBody } from '../common/validate.js'
import { toUserResponse } from '../users/user.mappers.js'
import { CSRF_COOKIE, issueCsrfToken } from './csrf.js'
import { requireAuth } from './middleware.js'

const loginSchema = z.object({
  username: z.string({ error: 'El usuario es obligatorio.' }).trim().min(1, 'El usuario es obligatorio.').max(50),
  password: z.string({ error: 'La contraseña es obligatoria.' }).min(1, 'La contraseña es obligatoria.').max(72),
})

/**
 * @param {{ userService: any, loginAttempts: import('./login-attempts.js').LoginAttempts,
 *           config: any, sessionCookieName: string }} deps
 */
export function createAuthRouter({ userService, loginAttempts, config, sessionCookieName }) {
  const router = Router()
  const secure = config.isProduction

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
    const token = issueCsrfToken(req, res, { secure })
    res.json({ headerName: 'X-XSRF-TOKEN', token })
  })

  router.post('/login', loginLimiter, validateBody(loginSchema), async (req, res) => {
    const { username, password } = req.body

    const lockMs = loginAttempts.remainingLockMs(username)
    if (lockMs > 0) throw tooManyAttempts(Math.ceil(lockMs / 1000))

    const user = await userService.authenticate(username, password)
    if (!user) {
      loginAttempts.recordFailure(username)
      // Mensaje genérico: no revela si el usuario existe o está deshabilitado
      throw unauthorized('Usuario o contraseña incorrectos.')
    }
    loginAttempts.recordSuccess(username)

    // Nueva sesión al autenticar: evita ataques de fijación de sesión
    await regenerateSession(req)
    req.session.userId = user.id
    issueCsrfToken(req, res, { secure })
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

  return router
}

function regenerateSession(req) {
  return new Promise((resolve, reject) => req.session.regenerate((err) => (err ? reject(err) : resolve())))
}
