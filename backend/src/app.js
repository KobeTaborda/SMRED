import { existsSync } from 'node:fs'
import { join } from 'node:path'
import express from 'express'
import session from 'express-session'
import helmet from 'helmet'
import { createAuthRouter } from './auth/auth.routes.js'
import { csrfProtection } from './auth/csrf.js'
import { loadCurrentUser, requireAdmin, requireAdminForWrites, requireAuth } from './auth/middleware.js'
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
  // Detrás de un proxy HTTPS en la nube, para que las cookies "secure" funcionen
  if (config.isProduction) app.set('trust proxy', 1)

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
        },
      },
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
      cookie: { httpOnly: true, sameSite: 'lax', secure: config.isProduction, maxAge: config.session.ttlMs },
    }),
  )

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

  const api = express.Router()
  api.use(csrfProtection)
  api.use(loadCurrentUser(userRepository))
  api.use('/auth', createAuthRouter({ userService, loginAttempts, config, sessionCookieName: SESSION_COOKIE }))
  api.use('/users', requireAdmin, createUserRouter(userService))
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
