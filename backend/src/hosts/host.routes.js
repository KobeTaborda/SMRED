import { Router } from 'express'
import { notFound } from '../common/errors.js'
import { parseId, validateBody } from '../common/validate.js'
import { toHostResponse } from './host.mappers.js'
import { hostSchema } from './host.schemas.js'

/** Lectura para cualquier usuario autenticado; escritura solo ADMIN (se aplica en app.js). */
export function createHostRouter(hostService) {
  const router = Router()

  router.param('id', (req, _res, next, value) => {
    req.hostId = parseId(value)
    if (!req.hostId) return next(notFound(`El host con id ${value} no existe.`))
    next()
  })

  router.get('/', async (_req, res) => {
    res.json((await hostService.list()).map(toHostResponse))
  })

  router.get('/:id', async (req, res) => {
    res.json(toHostResponse(await hostService.get(req.hostId)))
  })

  router.post('/', validateBody(hostSchema), async (req, res) => {
    res.status(201).json(toHostResponse(await hostService.create(req.body)))
  })

  router.put('/:id', validateBody(hostSchema), async (req, res) => {
    res.json(toHostResponse(await hostService.update(req.hostId, req.body)))
  })

  router.delete('/:id', async (req, res) => {
    await hostService.remove(req.hostId)
    res.status(204).end()
  })

  return router
}
