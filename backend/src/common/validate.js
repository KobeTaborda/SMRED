/**
 * Middleware que valida y normaliza req.body con un esquema de Zod.
 * Si falla, el ZodError llega al manejador central y responde 400 con los errores por campo.
 * @param {import('zod').ZodType} schema
 */
export function validateBody(schema) {
  return (req, _res, next) => {
    req.body = schema.parse(req.body ?? {})
    next()
  }
}

/** Convierte :id en número entero positivo o responde 404. */
export function parseId(value) {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}
