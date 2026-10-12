import { Router } from 'express'
import { notFound } from '../common/errors.js'
import { parseId } from '../common/validate.js'

/** Rutas bajo /api/hosts/:id. Los POST (revisar ahora, trazar ruta) son solo ADMIN (regla de escritura en app.js). */
export function createMonitoringRouter(monitor, statsService, tracerouteService) {
  const router = Router({ mergeParams: true })

  router.param('id', (req, _res, next, value) => {
    req.hostId = parseId(value)
    if (!req.hostId) return next(notFound(`El host con id ${value} no existe.`))
    next()
  })

  router.post('/:id/check', async (req, res) => {
    res.json(await monitor.checkNow(req.hostId))
  })

  /** ?limit=N devuelve las últimas N; si no, las de las últimas ?hours=24 horas. */
  router.get('/:id/pings', async (req, res) => {
    if (req.query.limit) {
      return res.json(await monitor.latest(req.hostId, Number(req.query.limit)))
    }
    res.json(await monitor.history(req.hostId, Number(req.query.hours ?? 24)))
  })

  /** Trazado de ruta bajo demanda: puede tardar hasta un minuto y no se guarda. */
  router.post('/:id/traceroute', async (req, res) => {
    res.json(await tracerouteService.trace(req.hostId))
  })

  router.get('/:id/stats', async (req, res) => {
    res.json(await statsService.hostStats(req.hostId, String(req.query.period ?? '24h')))
  })

  return router
}

/** GET /api/overview: datos generales para el panel de inicio. */
export function createOverviewRouter(statsService) {
  const router = Router()
  router.get('/', async (_req, res) => res.json(await statsService.overview()))
  return router
}
