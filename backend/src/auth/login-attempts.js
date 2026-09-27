/**
 * Bloqueo temporal y PROGRESIVO tras varios intentos fallidos (freno a ataques de fuerza bruta).
 *
 * - El contador es por USUARIO + EQUIPO DE ORIGEN (IP). Si alguien escribe mal tu contraseña
 *   desde otro equipo, se bloquea él, no tú: puedes seguir entrando desde el tuyo.
 * - Cada ciclo de bloqueo dura más que el anterior: con los valores por defecto, 4 intentos
 *   fallidos bloquean 5 minutos; los siguientes 4, 10 minutos; luego 15, y así sucesivamente.
 * - La escalada vuelve a empezar al iniciar sesión correctamente, cuando un administrador
 *   restablece la contraseña, o tras un día sin intentos fallidos.
 * - Los intentos se guardan en la base de datos (tabla login_attempts): el bloqueo sobrevive a reinicios.
 *
 * @typedef {{ failures: number, firstFailureAt: number, lockedUntil: number | null, lockCount: number, lastFailureAt: number }} AttemptEntry
 * @typedef {{
 *   get: (key: string) => Promise<AttemptEntry | null>,
 *   save: (key: string, entry: AttemptEntry) => Promise<void>,
 *   delete: (key: string) => Promise<void>,
 *   deleteStale: (before: number, now: number) => Promise<number>,
 *   deleteByUsername: (username: string) => Promise<void>,
 * }} AttemptRepository
 */
export class LoginAttempts {
  /**
   * @param {{
   *   repository: AttemptRepository,
   *   maxAttempts: number,   // fallos que disparan un bloqueo
   *   lockStepMs: number,    // duración del primer bloqueo; cada ciclo suma esta misma cantidad
   *   windowMs: number,      // los fallos deben ocurrir dentro de esta ventana para acumularse
   *   resetAfterMs: number,  // sin fallos durante este tiempo, la escalada vuelve a empezar
   *   now?: () => number,
   * }} options
   */
  constructor({ repository, maxAttempts, lockStepMs, windowMs, resetAfterMs, now = Date.now }) {
    this.repository = repository
    this.maxAttempts = maxAttempts
    this.lockStepMs = lockStepMs
    this.windowMs = windowMs
    this.resetAfterMs = resetAfterMs
    this.now = now
  }

  static normalize(username) {
    return String(username).trim().toLowerCase()
  }

  static key(username, ip) {
    return `${LoginAttempts.normalize(username)}|${ip || 'desconocido'}`.slice(0, 200)
  }

  /** Milisegundos de bloqueo restantes para este usuario desde este equipo, o 0. */
  async remainingLockMs(username, ip) {
    const entry = await this.repository.get(LoginAttempts.key(username, ip))
    if (!entry?.lockedUntil) return 0
    // Al vencer el bloqueo NO se borra el registro: hay que recordar cuántos ciclos van
    return Math.max(0, entry.lockedUntil - this.now())
  }

  async recordFailure(username, ip) {
    const key = LoginAttempts.key(username, ip)
    const now = this.now()
    const entry = await this.repository.get(key)

    // Un día sin fallos: se olvidan los bloqueos anteriores
    const forgotten = !entry || now - entry.lastFailureAt > this.resetAfterMs
    const lockCount = forgotten ? 0 : entry.lockCount
    // El conteo de fallos empieza de nuevo tras cada bloqueo, o si pasó la ventana de tiempo
    const lockEnded = entry?.lockedUntil != null && entry.lockedUntil <= now
    const freshCount = forgotten || lockEnded || now - entry.firstFailureAt > this.windowMs

    const failures = freshCount ? 1 : entry.failures + 1
    const locks = failures >= this.maxAttempts ? lockCount + 1 : lockCount

    await this.repository.save(key, {
      failures,
      firstFailureAt: freshCount ? now : entry.firstFailureAt,
      lockCount: locks,
      lockedUntil: failures >= this.maxAttempts ? now + this.lockStepMs * locks : null,
      lastFailureAt: now,
    })
  }

  async recordSuccess(username, ip) {
    await this.repository.delete(LoginAttempts.key(username, ip))
  }

  /** Quita el bloqueo del usuario en todos los equipos (cuando un administrador restablece su contraseña). */
  async clearUser(username) {
    await this.repository.deleteByUsername(LoginAttempts.normalize(username))
  }

  /** Borra registros sin fallos recientes ni bloqueo vigente. Lo llama la limpieza diaria. */
  async purgeStale() {
    const now = this.now()
    return this.repository.deleteStale(now - this.resetAfterMs, now)
  }
}

/** Repositorio en memoria: para tests. */
export function createMemoryAttemptRepository() {
  const entries = new Map()
  return {
    async get(key) {
      return entries.has(key) ? { ...entries.get(key) } : null
    },
    async save(key, entry) {
      entries.set(key, { ...entry })
    },
    async delete(key) {
      entries.delete(key)
    },
    async deleteByUsername(username) {
      for (const key of entries.keys()) if (key.startsWith(`${username}|`)) entries.delete(key)
    },
    async deleteStale(before, now) {
      let removed = 0
      for (const [key, entry] of entries) {
        const lockActive = entry.lockedUntil !== null && entry.lockedUntil > now
        if (entry.lastFailureAt < before && !lockActive) {
          entries.delete(key)
          removed++
        }
      }
      return removed
    },
  }
}
