import { ZodError } from 'zod'
import { AppError } from './errors.js'

/** Convierte los errores de Zod en { campo: mensaje } para mostrarlos junto a cada input. */
function zodFieldErrors(error) {
  const errors = {}
  for (const issue of error.issues) {
    const field = issue.path.join('.') || '_'
    errors[field] ??= issue.message
  }
  return errors
}

function sendProblem(res, status, title, detail, extra = {}) {
  res.status(status).type('application/problem+json').json({ status, title, detail, ...extra })
}

export function apiNotFound(req, _res, next) {
  next(new AppError(404, 'Recurso no encontrado', `La ruta ${req.method} ${req.originalUrl} no existe.`))
}

/** Manejador central de errores: una sola forma de responder errores en toda la API. */
export function errorHandler(logger) {
  // Express reconoce el manejador de errores porque recibe 4 parámetros
  return (err, req, res, _next) => {
    if (err instanceof AppError) {
      if (err.extra.retryAfterSeconds) res.set('Retry-After', String(err.extra.retryAfterSeconds))
      return sendProblem(res, err.status, err.title, err.message, err.extra)
    }
    if (err instanceof ZodError) {
      return sendProblem(res, 400, 'Datos inválidos', 'Revisa los campos marcados.', { errors: zodFieldErrors(err) })
    }
    if (err.type === 'entity.parse.failed') {
      return sendProblem(res, 400, 'Datos inválidos', 'El cuerpo de la petición no es JSON válido.')
    }
    if (err.type === 'entity.too.large') {
      return sendProblem(res, 413, 'Petición demasiado grande', 'El cuerpo de la petición excede el tamaño permitido.')
    }
    logger.error({ err, method: req.method, url: req.originalUrl }, 'Error no controlado')
    return sendProblem(res, 500, 'Error interno', 'Ocurrió un error inesperado. Revisa los logs del servidor.')
  }
}
