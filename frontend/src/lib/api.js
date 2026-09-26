/**
 * Cliente HTTP único de la app.
 * - Envía la cookie de sesión (mismo origen).
 * - Añade el token CSRF (cookie XSRF-TOKEN → header X-XSRF-TOKEN) en peticiones que modifican datos.
 * - Convierte los errores Problem Details del backend en ApiError.
 */

/**
 * @typedef {object} ProblemDetail
 * @property {number} status
 * @property {string} [title]
 * @property {string} [detail]
 * @property {string} [code]
 * @property {Record<string, string>} [errors]
 */

export class ApiError extends Error {
  /**
   * @param {number} status
   * @param {ProblemDetail | null} problem
   */
  constructor(status, problem) {
    super(problem?.detail ?? `Error ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.problem = problem
  }

  /** Errores por campo, para mostrarlos junto a cada input del formulario. */
  get fieldErrors() {
    return this.problem?.errors ?? {}
  }
}

const CSRF_COOKIE = 'XSRF-TOKEN'
const CSRF_HEADER = 'X-XSRF-TOKEN'

function readCookie(name) {
  const match = document.cookie.split('; ').find((row) => row.startsWith(`${name}=`))
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null
}

async function fetchCsrfToken() {
  await fetch('/api/auth/csrf', { credentials: 'same-origin' })
  return readCookie(CSRF_COOKIE)
}

async function request(path, method, body, csrfToken) {
  const headers = { Accept: 'application/json' }
  if (csrfToken) headers[CSRF_HEADER] = csrfToken
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  return fetch(`/api${path}`, {
    method,
    headers,
    credentials: 'same-origin',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

/**
 * @template T
 * @param {string} path ruta relativa a /api, ej. "/hosts"
 * @param {{ method?: 'GET'|'POST'|'PUT'|'DELETE', body?: unknown }} [options]
 * @returns {Promise<T>}
 */
export async function api(path, { method = 'GET', body } = {}) {
  const mutating = method !== 'GET'
  let token = mutating ? (readCookie(CSRF_COOKIE) ?? (await fetchCsrfToken())) : null
  let response = await request(path, method, body, token)

  // Si la sesión venció, el token guardado ya no sirve: se pide uno nuevo y se reintenta una vez
  if (mutating && response.status === 403) {
    const problem = await response.clone().json().catch(() => null)
    if (problem?.code === 'CSRF_INVALID') {
      token = await fetchCsrfToken()
      response = await request(path, method, body, token)
    }
  }

  const isJson = response.headers.get('content-type')?.includes('json') ?? false
  const data = response.status === 204 || !isJson ? null : await response.json()

  if (!response.ok) throw new ApiError(response.status, data)
  return data
}

/** Mensaje legible para mostrar al usuario a partir de cualquier error. */
export function errorMessage(error) {
  if (error instanceof ApiError) return error.message
  if (error instanceof TypeError) return 'No se pudo conectar con el servidor. ¿Está corriendo el backend?'
  return 'Ocurrió un error inesperado.'
}
