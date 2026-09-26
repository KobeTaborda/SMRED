import { forbidden, unauthorized } from '../common/errors.js'

/**
 * Carga el usuario de la sesión en cada petición. Si fue eliminado o deshabilitado,
 * la sesión se invalida de inmediato (no hay que esperar a que venza).
 * @param {{ findById: (id: number) => Promise<any> }} userRepository
 */
export function loadCurrentUser(userRepository) {
  return async (req, _res, next) => {
    const userId = req.session?.userId
    if (!userId) return next()

    const user = await userRepository.findById(userId)
    if (user?.enabled) {
      req.user = user
      return next()
    }
    delete req.session.userId
    next()
  }
}

export function requireAuth(req, _res, next) {
  if (!req.user) return next(unauthorized())
  next()
}

export function requireAdmin(req, _res, next) {
  if (!req.user) return next(unauthorized())
  if (req.user.role !== 'ADMIN') return next(forbidden())
  next()
}

/** Regla general de la API: cualquier usuario autenticado lee; solo ADMIN crea, edita o borra. */
export function requireAdminForWrites(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD') return requireAuth(req, res, next)
  return requireAdmin(req, res, next)
}
