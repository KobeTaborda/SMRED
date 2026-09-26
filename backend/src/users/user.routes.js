import { Router } from 'express'
import { notFound } from '../common/errors.js'
import { parseId, validateBody } from '../common/validate.js'
import { toUserResponse } from './user.mappers.js'
import { createUserSchema, resetPasswordSchema, updateUserSchema } from './user.schemas.js'

/** Gestión de usuarios. El acceso de solo ADMIN se aplica al montar el router (app.js). */
export function createUserRouter(userService) {
  const router = Router()

  router.param('id', (req, _res, next, value) => {
    req.userId = parseId(value)
    if (!req.userId) return next(notFound(`El usuario con id ${value} no existe.`))
    next()
  })

  router.get('/', async (_req, res) => {
    res.json((await userService.list()).map(toUserResponse))
  })

  router.post('/', validateBody(createUserSchema), async (req, res) => {
    res.status(201).json(toUserResponse(await userService.create(req.body)))
  })

  router.put('/:id', validateBody(updateUserSchema), async (req, res) => {
    res.json(toUserResponse(await userService.update(req.userId, req.body, req.user)))
  })

  router.put('/:id/password', validateBody(resetPasswordSchema), async (req, res) => {
    await userService.resetPassword(req.userId, req.body.password)
    res.status(204).end()
  })

  router.delete('/:id', async (req, res) => {
    await userService.remove(req.userId, req.user)
    res.status(204).end()
  })

  return router
}
