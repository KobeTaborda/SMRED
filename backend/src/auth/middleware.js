import { forbidden, unauthorized } from '../common/errors.js'

/**
 * Carga el usuario de la sesión en cada petición. La sesión deja de valer de inmediato si:
 * - la cuenta fue eliminada o deshabilitada, o
 * - la contraseña cambió después de abrir la sesión (token_version distinta).
 * @param {{ findById: (id: number) => Promise<any> }} userRepository
 */
export function loadCurrentUser(userRepository) {
  return async (req, _res, next) => {
    const userId = req.session?.userId
    if (!userId) return next()

    const user = await userRepository.findById(userId)
    const sameVersion = (req.session.tokenVersion ?? 0) === (user?.tokenVersion ?? 0)
    if (user?.enabled && sameVersion) {
      req.user = user
      return next()
    }
    delete req.session.userId
    delete req.session.tokenVersion
    next()
  }
}

/**
 * Mientras el usuario deba cambiar su contraseña, solo puede usar las rutas de /auth
 * (ver su cuenta, cambiar la contraseña, cerrar sesión). El resto responde 403.
 */
export function requirePasswordChangeFirst(req, _res, next) {
  if (req.user?.mustChangePassword && !req.path.startsWith('/auth/')) {
    return next(forbidden('Debes cambiar tu contraseña antes de continuar.', { code: 'PASSWORD_CHANGE_REQUIRED' }))
  }
  next()
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
