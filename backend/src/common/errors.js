/**
 * Errores de la aplicación. El manejador central los convierte en respuestas
 * RFC 9457 (Problem Details): { status, title, detail, code?, errors? }.
 */
export class AppError extends Error {
  /**
   * @param {number} status
   * @param {string} title
   * @param {string} detail
   * @param {Record<string, unknown>} [extra]
   */
  constructor(status, title, detail, extra = {}) {
    super(detail)
    this.status = status
    this.title = title
    this.extra = extra
  }
}

export const badRequest = (detail, extra) => new AppError(400, 'Datos inválidos', detail, extra)
export const unauthorized = (detail = 'Inicia sesión para continuar.') => new AppError(401, 'No autenticado', detail)
export const forbidden = (detail = 'No tienes permisos para esta acción.', extra) => new AppError(403, 'Acceso denegado', detail, extra)
export const notFound = (detail) => new AppError(404, 'Recurso no encontrado', detail)
export const conflict = (detail) => new AppError(409, 'Conflicto', detail)
export const businessRule = (detail) => new AppError(422, 'Operación no permitida', detail)
export const tooManyAttempts = (retryAfterSeconds) =>
  new AppError(
    429,
    'Cuenta bloqueada temporalmente',
    `Demasiados intentos fallidos. Intenta de nuevo en ${Math.max(1, Math.ceil(retryAfterSeconds / 60))} min.`,
    { retryAfterSeconds },
  )
