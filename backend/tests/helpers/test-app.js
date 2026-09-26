import session from 'express-session'
import request from 'supertest'
import pino from 'pino'
import { createApp } from '../../src/app.js'
import { LoginAttempts } from '../../src/auth/login-attempts.js'
import { createHostService } from '../../src/hosts/host.service.js'
import { createPingMonitor } from '../../src/monitoring/ping-monitor.service.js'
import { createStatsService } from '../../src/monitoring/stats.js'
import { createUserService } from '../../src/users/user.service.js'
import { createFakeHostRepository, createFakePingRepository, createFakeProbe, createFakeUserRepository } from './fakes.js'
import { EventEmitter } from 'node:events'

export const ADMIN = { username: 'admin', password: 'Admin-Password-1', fullName: 'Admin', role: 'ADMIN' }
export const VIEWER = { username: 'viewer', password: 'Viewer-Password-1', fullName: 'Viewer', role: 'VIEWER' }

const config = {
  isProduction: false,
  session: { secret: 'x'.repeat(32), ttlMs: 30 * 60_000 },
  monitoring: { attempts: 3, timeoutMs: 1000, degradedLatencyMs: 200, maxConcurrency: 5, retentionDays: 7, intervalMs: 30_000 },
  frontendDist: '/ruta/que/no/existe',
}

/** Crea la app completa con dependencias en memoria y dos usuarios (admin y viewer). */
export async function createTestApp() {
  const logger = pino({ level: 'silent' })
  const userRepository = createFakeUserRepository()
  const userService = createUserService(userRepository, { bcryptRounds: 4, logger })
  const events = new EventEmitter()
  const hostService = createHostService(createFakeHostRepository(), { logger, events })
  const pingRepository = createFakePingRepository()
  const probe = createFakeProbe()
  const pingMonitor = createPingMonitor({ hostService, pingRepository, probe, config: config.monitoring, logger })
  const statsService = createStatsService({ hostService, pingRepository, config: config.monitoring })
  const loginAttempts = new LoginAttempts({ maxAttempts: 5, lockMs: 15 * 60_000 })

  await userService.create(ADMIN)
  await userService.create(VIEWER)

  const app = createApp({
    config, logger, userRepository, userService, hostService, pingMonitor, statsService, loginAttempts,
    sessionStore: new session.MemoryStore(),
  })
  return { app, userService, userRepository, probe, pingRepository, events }
}

/**
 * Cliente que se comporta como el navegador: guarda cookies y envía el token CSRF.
 */
export class Client {
  constructor(app) {
    this.agent = request.agent(app)
    this.csrf = null
  }

  track(res) {
    const cookies = res.headers['set-cookie'] ?? []
    for (const cookie of cookies) {
      const match = /^XSRF-TOKEN=([^;]*)/.exec(cookie)
      if (match) this.csrf = decodeURIComponent(match[1])
    }
    return res
  }

  async ensureCsrf() {
    if (!this.csrf) this.track(await this.agent.get('/api/auth/csrf'))
  }

  async get(path) {
    return this.track(await this.agent.get(path))
  }

  async send(method, path, body) {
    await this.ensureCsrf()
    let req = this.agent[method](path).set('X-XSRF-TOKEN', this.csrf)
    if (body !== undefined) req = req.send(body)
    return this.track(await req)
  }

  post(path, body) {
    return this.send('post', path, body)
  }
  put(path, body) {
    return this.send('put', path, body)
  }
  delete(path) {
    return this.send('delete', path)
  }

  async login({ username, password }) {
    return this.post('/api/auth/login', { username, password })
  }
}

export async function loggedInClient(app, user) {
  const client = new Client(app)
  const res = await client.login(user)
  if (res.status !== 200) throw new Error(`Login falló para ${user.username}: ${res.status}`)
  return client
}
