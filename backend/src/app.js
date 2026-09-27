import { existsSync } from 'node:fs'
import { join } from 'node:path'
import express from 'express'
import session from 'express-session'
import helmet from 'helmet'
import { createAuthRouter } from './auth/auth.routes.js'
import { csrfProtection } from './auth/csrf.js'
import { loadCurrentUser, requireAdmin, requireAdminForWrites, requireAuth, requirePasswordChangeFirst } from './auth/middleware.js'
import { apiNotFound, errorHandler } from './common/error-handler.js'
import { createHostRouter } from './hosts/host.routes.js'
import { createMonitoringRouter, createOverviewRouter } from './monitoring/monitoring.routes.js'
import { createUserRouter } from './users/user.routes.js'

export const SESSION_COOKIE = 'smred.sid'

/**
 * Construye la aplicación Express. Recibe todas sus dependencias (inyección de dependencias),
 * así los tests pueden usar repositorios en memoria sin necesitar SQL Server.
 */
export function createApp({ config, logger, userRepository, userService, hostService, pingMonitor, statsService, loginAttempts, sessionStore }) {
  const app = express()
  app.disable('x-powered-by')
  // En producción, detrás del proxy HTTPS de la nube. En desarrollo, detrás del proxy de Vite (en este mismo equipo):
  // así req.ip es la IP real del navegador, que usa el bloqueo por intentos fallidos.
  app.set('trust proxy', config.isProduction ? 1 : 'loopback')

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", 'data:'],
          styleSrc: ["'self'", "'unsafe-inline'"],
          fontSrc: ["'self'", 'data:'],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          // Pedir todo por HTTPS solo cuando el sitio se sirve por HTTPS
          upgradeInsecureRequests: config.https.enabled ? [] : null,
        },
      },
      // HSTS obliga al navegador a usar siempre HTTPS con este dominio. Solo en producción:
      // en localhost afectaría a cualquier otro proyecto que corras en tu equipo.
      strictTransportSecurity: config.isProduction,
    }),
  )
  app.use(express.json({ limit: '100kb' }))
  app.use(
    session({
      name: SESSION_COOKIE,
      secret: config.session.secret,
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      rolling: true, // cada petición renueva la expiración: la sesión vence tras X minutos de inactividad
      // secure 'auto': la cookie solo viaja cifrada cuando la conexión es HTTPS
      cookie: { httpOnly: true, sameSite: 'lax', secure: 'auto', maxAge: config.session.ttlMs },
    }),
  )

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

  const api = express.Router()
  api.use(csrfProtection)
  api.use(loadCurrentUser(userRepository))
  api.use(requirePasswordChangeFirst)
  api.use('/auth', createAuthRouter({ userService, loginAttempts, sessionCookieName: SESSION_COOKIE }))
  api.use('/users', requireAdmin, createUserRouter(userService, loginAttempts))
  api.use('/hosts', requireAdminForWrites, createHostRouter(hostService), createMonitoringRouter(pingMonitor, statsService))
  api.use('/overview', requireAuth, createOverviewRouter(statsService))
  api.use(apiNotFound)
  app.use('/api', api)

  // Producción: el mismo servidor entrega el frontend compilado (npm run build)
  if (existsSync(config.frontendDist)) {
    app.use(express.static(config.frontendDist, { index: false, maxAge: '1h' }))
    app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(join(config.frontendDist, 'index.html')))
  }

  app.use(errorHandler(logger))
  return app
}
